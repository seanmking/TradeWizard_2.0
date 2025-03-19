/**
 * TradeWizard LLM-based Product Analyzer
 * Uses LLM to extract products from website content
 */

const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('./logger');

/**
 * Detect products using LLM analysis of HTML content
 * @param {Array} htmlContents - Array of objects with url and html properties
 * @returns {Array} - Detected products with high confidence
 */
async function detectLlmProducts(htmlContents) {
  if (!Array.isArray(htmlContents) || htmlContents.length === 0) {
    logger.warn('No HTML content provided for LLM product detection');
    return [];
  }
  
  // Check if OpenAI API key is configured
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OpenAI API key not configured. Skipping LLM product detection.');
    return [];
  }
  
  try {
    logger.info(`Starting LLM-based product detection for ${htmlContents.length} pages`);
    
    const allProducts = [];
    
    // Process each page separately for better accuracy
    for (const { url, html } of htmlContents) {
      if (!html) continue;
      
      try {
        // Extract content from HTML
        const processedHtml = prepareHtmlForAnalysis(html);
        
        // Build the prompt for this specific page
        const prompt = buildEnhancedProductDetectionPrompt(url, processedHtml);
        
        // Call OpenAI API
        const pageProducts = await callOpenAiApi(prompt);
        
        // Add URL to each product
        pageProducts.forEach(product => {
          product.sourceUrl = url;
          // Ensure required fields exist
          product.name = product.name || 'Unknown Product';
          product.description = product.description || '';
          product.images = product.images || [];
          // Normalize confidence to a number between 0 and 1
          if (typeof product.confidence === 'string') {
            product.confidence = normalizeConfidence(product.confidence);
          }
        });
        
        // Add these products to our collection
        allProducts.push(...pageProducts);
        
        logger.info(`Extracted ${pageProducts.length} products from ${url}`);
      } catch (error) {
        logger.warn(`Error processing ${url}: ${error.message}`);
      }
    }
    
    // Deduplicate products
    const uniqueProducts = deduplicateProducts(allProducts);
    
    logger.info(`Final LLM product count: ${uniqueProducts.length}`);
    return uniqueProducts;
  } catch (error) {
    logger.error(`Error in LLM product detection: ${error.message}`);
    return [];
  }
}

/**
 * Prepare HTML for analysis by cleaning and simplifying it
 */
function prepareHtmlForAnalysis(html) {
  try {
    const $ = cheerio.load(html);
    
    // Remove elements unlikely to contain product information
    $('script, style, noscript, svg, iframe, meta').remove();
    
    // Find product-related sections and prioritize them
    let productSections = $('div[class*="product"], section[class*="product"], div[class*="catalog"], .products, .shop, .store');
    
    // If no specific product sections found, use the main content
    if (productSections.length === 0) {
      productSections = $('main, #main, .main-content, .content');
    }
    
    // If still nothing, use the body
    if (productSections.length === 0) {
      productSections = $('body');
    }
    
    // Extract the HTML of product sections
    const sectionHtml = productSections.html() || $('body').html();
    
    // Return clean HTML, limited to a reasonable size
    return sectionHtml ? sectionHtml.substring(0, 15000) : '';
  } catch (error) {
    logger.warn(`Error preparing HTML: ${error.message}`);
    return html.substring(0, 15000); // Fallback to truncated raw HTML
  }
}

/**
 * Build an enhanced prompt for OpenAI to identify products
 * @param {string} url - URL of the page
 * @param {string} html - Processed HTML content
 * @returns {string} - Formatted prompt
 */
function buildEnhancedProductDetectionPrompt(url, html) {
  return `You are a product extraction specialist tasked with identifying products or services offered by a business on their website.

URL: ${url}

TASK:
1. Carefully analyze the HTML below to identify all products or services
2. For each product, extract:
   - name: The product name
   - description: A brief description
   - price: The price (if available)
   - category: Product category or type
   - images: Array of image URLs if present in the HTML
   - attributes: Any additional attributes (size, color, material, etc.)

INSTRUCTIONS:
- Focus only on actual products or services, not navigation elements or website features
- Include all product details you can find, especially unique features
- Assign a confidence score (high, medium, low) based on how clearly this is a product
- If you're unsure if something is a product, include it with low confidence

RESPONSE FORMAT:
Return a valid JSON array containing product objects. The response MUST be valid JSON that can be parsed with JSON.parse().
[
  {
    "name": "Product Name",
    "description": "Description of the product",
    "price": "Price (if available)",
    "category": "Product category",
    "images": ["image_url_1", "image_url_2"],
    "attributes": {"key1": "value1", "key2": "value2"},
    "confidence": "high|medium|low"
  },
  ...
]

HTML CONTENT:
${html}`;
}

/**
 * Call OpenAI API to analyze content
 * @param {string} prompt - Prompt for the LLM
 * @returns {Array} - Extracted products
 */
async function callOpenAiApi(prompt) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: model,
      messages: [
        { 
          role: 'system', 
          content: 'You are a product identification expert that returns valid, parseable JSON. Always respond with a complete JSON array, even if empty.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" } // For newer models that support this
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Extract the response content
    const content = response.data.choices[0].message.content.trim();
    
    // Parse JSON from the response
    try {
      // Find JSON array in the response
      let jsonContent = content;
      
      // If the content is wrapped in a JSON object (common with response_format: json_object)
      if (content.startsWith('{') && content.endsWith('}')) {
        const parsed = JSON.parse(content);
        // Check if there's a products array or similar in the response
        if (parsed.products && Array.isArray(parsed.products)) {
          return parsed.products;
        } else if (parsed.results && Array.isArray(parsed.results)) {
          return parsed.results;
        } else if (parsed.data && Array.isArray(parsed.data)) {
          return parsed.data;
        }
        
        // If we can't find an obvious array property, look for any array
        for (const key in parsed) {
          if (Array.isArray(parsed[key])) {
            return parsed[key];
          }
        }
        
        // If still nothing, the whole response might be structured differently
        return []; // Return empty array as fallback
      }
      
      // Check if content is a JSON array
      if (content.startsWith('[') && content.endsWith(']')) {
        const products = JSON.parse(content);
        if (Array.isArray(products)) {
          logger.info(`Successfully extracted ${products.length} products using LLM`);
          return products;
        }
      }
      
      // Try to find JSON array in the response
      const jsonMatch = content.match(/\[\s*\{.+\}\s*\]/s);
      if (jsonMatch) {
        const products = JSON.parse(jsonMatch[0]);
        if (Array.isArray(products)) {
          logger.info(`Successfully extracted ${products.length} products from matched JSON`);
          return products;
        }
      }
      
      // If we got here, we couldn't find a valid JSON array
      logger.warn('Could not extract valid JSON array from LLM response');
      return [];
    } catch (parseError) {
      logger.error(`Failed to parse LLM response as JSON: ${parseError.message}`);
      logger.debug(`Response content: ${content}`);
      return [];
    }
  } catch (error) {
    logger.error(`Error calling OpenAI API: ${error.message}`);
    return [];
  }
}

/**
 * Convert string confidence levels to numeric values
 */
function normalizeConfidence(confidence) {
  if (typeof confidence === 'number') return confidence;
  
  const confidenceStr = String(confidence).toLowerCase();
  if (confidenceStr.includes('high')) return 0.9;
  if (confidenceStr.includes('medium')) return 0.6;
  if (confidenceStr.includes('low')) return 0.3;
  return 0.5; // Default
}

/**
 * Remove duplicate products based on name similarity
 */
function deduplicateProducts(products) {
  const uniqueProducts = [];
  const seenNames = new Set();
  
  for (const product of products) {
    const normalizedName = product.name.toLowerCase().trim();
    
    // Check if we've seen a similar name
    let isDuplicate = false;
    for (const seenName of seenNames) {
      if (areSimilarNames(normalizedName, seenName)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      seenNames.add(normalizedName);
      uniqueProducts.push(product);
    }
  }
  
  return uniqueProducts;
}

/**
 * Check if two product names are similar
 */
function areSimilarNames(name1, name2) {
  // If one is a substring of the other
  if (name1.includes(name2) || name2.includes(name1)) {
    return true;
  }
  
  // Calculate word overlap
  const words1 = name1.split(/\s+/);
  const words2 = name2.split(/\s+/);
  
  let matchCount = 0;
  for (const word1 of words1) {
    if (word1.length < 3) continue; // Skip short words
    if (words2.some(word2 => word2 === word1)) {
      matchCount++;
    }
  }
  
  // If more than 50% of words match
  return matchCount > 0 && matchCount / Math.min(words1.length, words2.length) > 0.5;
}

module.exports = {
  detectLlmProducts
}; 
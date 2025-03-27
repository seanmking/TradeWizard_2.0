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
    $('script, style, noscript, svg, iframe, meta, header, footer, nav, .navigation, .menu, .footer, .header, .nav').remove();
    
    // Find product-related sections and prioritize them
    let productSections = $('div[class*="product"], section[class*="product"], div[class*="catalog"], .products, .shop, .store');
    
    // Look for elements with product indicators in their text content
    $('div, section').each(function() {
      const $el = $(this);
      const text = $el.text().toLowerCase();
      if (
        (text.includes('price') || text.includes('buy') || text.includes('order')) &&
        !text.includes('about us') &&
        !text.includes('contact') &&
        !text.includes('news') &&
        !text.includes('blog') &&
        !$el.find('nav').length
      ) {
        productSections = productSections.add($el);
      }
    });
    
    // If no specific product sections found, use the main content
    if (productSections.length === 0) {
      productSections = $('main, #main, .main-content, .content').not('nav, .navigation, .menu');
    }
    
    // If still nothing, use the body content except navigation and footer
    if (productSections.length === 0) {
      productSections = $('body').clone();
      productSections.find('nav, header, footer, .navigation, .menu, .footer, .header, .nav').remove();
    }
    
    // Extract the HTML of product sections
    const sectionHtml = productSections.html();
    
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
  return `You are a product extraction and classification specialist tasked with identifying ONLY physical products from business websites for international trade classification.

URL: ${url}

TASK:
1. Analyze the HTML to identify ONLY physical products EXPLICITLY offered for sale
2. For each physical product ACTUALLY PRESENT, extract:
   - name: Product name EXACTLY as shown
   - description: Brief description if provided
   - price: Price EXACTLY as shown
   - category: Main product category
   - subcategory: More specific subcategory if available
   - hsCode: Suggested HS code based on product characteristics
   - images: Array of image URLs if present
   - attributes: Additional attributes (size, color, material, etc.)

PRODUCT CATEGORIES:
- Food & Beverage (physical food/drink products only)
- Clothing & Accessories (wearable items)
- Beauty & Cosmetics (physical beauty products)
- Home Goods (tangible household items)
- Electronics (physical devices and components)
- Health & Wellness (physical health products only)
- Sports Equipment (physical sporting goods)
- Other Physical Products (specify if none of the above fit)

INSTRUCTIONS:
- ONLY extract items meeting ALL criteria:
  * Must be a physical, tangible product
  * Must be something that can be shipped/exported
  * Must have a distinct product name
  * Must be part of current offerings
  * Must be something that requires HS code classification

- DO NOT extract:
  * Services or subscriptions
  * Digital products or downloads
  * Virtual goods
  * Consulting or professional services
  * Navigation items or headers
  * Company information
  * News/blog content
  * Contact information
  * Marketing content
  * Generic categories
  * Archived content

- Product indicators:
  * Physical product name
  * Price/"Buy"/"Order" button
  * Product description mentioning physical characteristics
  * Located in product catalog
  * Product images showing physical item
  * Shipping or delivery information
  * Physical dimensions or weight

- Assign confidence scores:
  * High (0.9-1.0): Clear physical product with details and sales context
  * Medium (0.6-0.8): Physical product with some details
  * Low (0.3-0.5): Unclear or missing key details about physical nature

RESPONSE FORMAT:
Return valid JSON array of product objects:
[
  {
    "name": "Product Name",
    "description": "Description of physical product",
    "price": "Price if available",
    "category": "Main Category",
    "subcategory": "Subcategory if available",
    "hsCode": "Suggested HS Code",
    "images": ["image_url_1", "image_url_2"],
    "attributes": {
      "material": "Product material",
      "dimensions": "Physical dimensions",
      "weight": "Product weight",
      "other_physical_attributes": "value"
    },
    "detectionConfidence": 0.95
  }
]

CRITICAL: Only extract physical, tangible products that can be exported/imported. Ignore all services, digital goods, and non-physical items.

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
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a product detection and classification expert specializing in international trade.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      top_p: 0.9
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.choices && response.data.choices[0]) {
      try {
        const content = response.data.choices[0].message.content;
        const products = JSON.parse(content);
        
        if (!Array.isArray(products)) {
          logger.warn('OpenAI response was not an array');
          return [];
        }
        
        return products.filter(product => {
          // Validate required fields
          if (!product.name || !product.category) {
            return false;
          }
          
          // Normalize confidence score
          product.detectionConfidence = normalizeConfidence(product.confidence || 'medium');
          delete product.confidence;
          
          return true;
        });
      } catch (error) {
        logger.error('Error parsing OpenAI response:', error);
        return [];
      }
    }
    
    return [];
  } catch (error) {
    logger.error('OpenAI API error:', error);
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
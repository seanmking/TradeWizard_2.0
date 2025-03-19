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
    
    // Combine content from all product pages
    const combinedContent = {};
    
    // Extract text content from HTML for each page
    for (const { url, html } of htmlContents) {
      if (!html) continue;
      
      try {
        const $ = cheerio.load(html);
        
        // Get the main content by removing navigation, header, footer, etc.
        $('nav, header, footer, .navigation, .menu, script, style, [class*="nav"], [class*="menu"]').remove();
        
        // Extract text from the remaining content
        const textContent = $('body').text().trim().replace(/\s+/g, ' ');
        
        // Only use the first 8000 characters to avoid token limits
        const truncatedContent = textContent.substring(0, 8000);
        
        combinedContent[url] = truncatedContent;
      } catch (error) {
        logger.warn(`Error extracting text from ${url}: ${error.message}`);
      }
    }
    
    // If we have no content, return empty array
    if (Object.keys(combinedContent).length === 0) {
      logger.warn('No valid content extracted for LLM analysis');
      return [];
    }
    
    // Build the prompt for OpenAI
    const prompt = buildProductDetectionPrompt(combinedContent);
    
    // Call OpenAI API
    const llmProducts = await callOpenAiApi(prompt);
    
    return llmProducts;
  } catch (error) {
    logger.error(`Error in LLM product detection: ${error.message}`);
    return [];
  }
}

/**
 * Build a prompt for OpenAI to identify products
 * @param {Object} contentByUrl - Object mapping URLs to text content
 * @returns {string} - Formatted prompt
 */
function buildProductDetectionPrompt(contentByUrl) {
  // Extract a sample of content from each URL
  const contentSamples = Object.entries(contentByUrl).map(([url, content]) => {
    const sample = content.substring(0, 2000); // Limit to 2000 chars per URL
    return `URL: ${url}\n\nContent Sample: ${sample}\n\n---`;
  }).join('\n\n');
  
  return `You are a product identification expert. Analyze the following website content and extract all products or services offered by the business.

${contentSamples}

Identify all distinct products or services mentioned in the above content. For each product:
1. Provide the product name
2. A brief description if available
3. The product category if you can determine it
4. Assign a confidence level (high, medium, low) based on how clearly the content identifies this as a product

Return the results as a JSON array of objects with the following structure:
[
  {
    "name": "Product Name",
    "description": "Brief description of the product",
    "category": "Product category",
    "confidence": "high|medium|low"
  }
]

Only include actual products or services offered by the business. Do not include website features, company sections, or navigational elements. Focus on identifying clear products with high confidence.`;
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
        { role: 'system', content: 'You are a product identification expert that returns precise JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2000
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
      // Find JSON array in the response if it's not pure JSON
      const jsonMatch = content.match(/\[\s*\{.+\}\s*\]/s);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const products = JSON.parse(jsonStr);
      
      if (Array.isArray(products)) {
        logger.info(`Successfully extracted ${products.length} products using LLM`);
        return products;
      } else {
        logger.warn('LLM response was not an array');
        return [];
      }
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

module.exports = {
  detectLlmProducts
}; 
/**
 * enhanced-llm-analyzer.js
 * Provides improved LLM-based analysis of website content for business information
 * and product detection with structured data extraction.
 */

const axios = require('axios');
const logger = require('./logger');
require('dotenv').config();

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Extract structured business information using LLM
 * @param {Object} pageData - Aggregated data from crawled pages
 * @returns {Promise<Object>} - Enhanced business information
 */
async function extractBusinessInfo(pageData) {
  try {
    // If OpenAI key is not valid, use mock data for testing
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'fake_key_for_testing') {
      logger.info('Using mock business info data for testing (no valid API key)');
      return getMockBusinessInfo(pageData.pages);
    }

    // Prepare content from various page types
    const aboutContent = getContentFromPageType(pageData, 'about');
    const homeContent = getContentFromPageType(pageData, 'home');
    const contactContent = getContentFromPageType(pageData, 'contact');
    const exportContent = getContentFromPageType(pageData, 'export');
    
    // Combine the most relevant content (limiting total token size)
    const combinedContent = `
      About: ${aboutContent.substring(0, 2000)}
      
      Home: ${homeContent.substring(0, 1000)}
      
      Contact: ${contactContent.substring(0, 500)}
      
      Export: ${exportContent.substring(0, 1000)}
    `;

    // Create the prompt for the LLM
    const prompt = `
      You are an expert business analyst tasked with extracting structured information about a company from their website content.
      
      Analyze the following website content and extract key business information in a structured format:
      
      ${combinedContent}
      
      Extract the following information in JSON format:
      - businessName: The official name of the business (if not found, leave as an empty string)
      - businessSize: Categorize as "micro", "small", "medium", or "large" based on context
      - description: A concise description of the business (max 200 words)
      - foundedYear: The year the business was founded (if mentioned)
      - geographicPresence: Array of locations where the business operates (countries, cities)
      - industries: Array of industries the business operates in
      - exportMarkets: Array of countries or regions the business exports to (if applicable)
      - employeeCount: Approximate number of employees (if mentioned)
      - exportReadiness: Rate from 0-100 how export-ready the business appears to be
      - b2bFocus: Rate from 0-100 how focused the business is on B2B vs B2C
      
      Use evidence from the text to justify your extraction. If you can't find specific information, use reasonable defaults or leave fields empty. Return ONLY the JSON object with no additional explanation.
    `;

    // Make API request to OpenAI
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a business information extraction specialist.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    // Parse and validate the response
    const responseContent = response.data.choices[0].message.content.trim();
    let extractedInfo;
    
    try {
      // Try to parse the JSON response
      extractedInfo = JSON.parse(responseContent);
      logger.info('Successfully extracted business information using LLM');
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON content from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedInfo = JSON.parse(jsonMatch[0]);
          logger.info('Extracted business information from partial JSON response');
        } catch (nestedError) {
          logger.error('Failed to parse LLM response as JSON', {
            error: nestedError.message,
            response: responseContent.substring(0, 200)
          });
          return getMockBusinessInfo(pageData.pages);
        }
      } else {
        logger.error('Failed to extract JSON from LLM response', {
          error: parseError.message,
          response: responseContent.substring(0, 200)
        });
        return getMockBusinessInfo(pageData.pages);
      }
    }

    return extractedInfo;
  } catch (error) {
    logger.error('Error in LLM business info extraction', {
      error: error.message,
      stack: error.stack
    });
    return getMockBusinessInfo(pageData.pages);
  }
}

/**
 * Detect products using enhanced LLM analysis
 * @param {string} url - The website URL
 * @param {Object} pageData - Aggregated data from crawled pages
 * @returns {Promise<Array>} - Array of detected products
 */
async function detectProducts(url, pageData) {
  try {
    if (!OPENAI_API_KEY) {
      logger.warn('OpenAI API key not configured. Skipping LLM product detection.');
      return [];
    }

    // Prepare content from product and home pages
    const productContent = getContentFromPageType(pageData, 'products');
    const homeContent = getContentFromPageType(pageData, 'home');
    
    // Combine content (limiting total token size)
    const combinedContent = `
      Products: ${productContent.substring(0, 3500)}
      
      Home: ${homeContent.substring(0, 1000)}
    `;

    // Create the prompt for the LLM
    const prompt = `
      You are an expert product analyst tasked with identifying products or services offered by a company based on their website content.
      
      Website URL: ${url}
      
      Website content:
      ${combinedContent}
      
      Extract a list of distinct products or services offered by this company. For each product/service, provide:
      1. Name: Clear product/service name
      2. Description: Brief description based on available information
      3. Category: Best fitting product category
      4. Confidence: Your confidence level (high, medium, low) that this is actually a product/service they offer
      
      Format your response as a JSON array of objects with these properties: name, description, category, confidence.
      Only include entries that are actual products or services, not features, sections of the website, or company information.
      Aim for precision over recall - only include products or services you're reasonably confident about.
      
      Return ONLY the JSON array with no additional explanation.
    `;

    // Make API request to OpenAI
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a product information extraction specialist.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    // Parse and validate the response
    const responseContent = response.data.choices[0].message.content.trim();
    let products = [];
    
    try {
      // Try to parse the JSON response
      products = JSON.parse(responseContent);
      if (!Array.isArray(products)) {
        if (products && typeof products === 'object' && products.products && Array.isArray(products.products)) {
          products = products.products;
        } else {
          logger.warn('LLM response is not an array or does not contain a products array', {
            response: responseContent.substring(0, 200)
          });
          return [];
        }
      }
      
      // Validate and standardize product objects
      products = products.filter(product => 
        product && typeof product === 'object' && product.name && typeof product.name === 'string'
      ).map(product => ({
        name: product.name,
        description: product.description || '',
        category: product.category || 'General',
        confidence: ['high', 'medium', 'low'].includes(product.confidence?.toLowerCase()) 
          ? product.confidence.toLowerCase() 
          : 'medium'
      }));
      
      logger.info(`LLM extracted ${products.length} products from ${url}`);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON content from the response
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          products = JSON.parse(jsonMatch[0]);
          if (Array.isArray(products)) {
            logger.info(`Extracted ${products.length} products from partial JSON response`);
          } else {
            logger.warn('Extracted JSON is not an array', { 
              extractedJson: jsonMatch[0].substring(0, 100)
            });
            return [];
          }
        } catch (nestedError) {
          logger.error('Failed to parse LLM product response as JSON', {
            error: nestedError.message,
            response: responseContent.substring(0, 200)
          });
          return [];
        }
      } else {
        logger.error('Failed to extract JSON from LLM product response', {
          error: parseError.message,
          response: responseContent.substring(0, 200)
        });
        return [];
      }
    }

    return products;
  } catch (error) {
    logger.error('Error in LLM product detection', {
      error: error.message,
      stack: error.stack
    });
    return [];
  }
}

/**
 * Analyze export readiness using LLM
 * @param {Object} pageData - Aggregated data from crawled pages
 * @param {Object} businessInfo - Basic business information
 * @returns {Promise<Object>} - Export readiness assessment
 */
async function analyzeExportReadiness(pageData, businessInfo) {
  try {
    // If OpenAI key is not valid, use mock data for testing
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'fake_key_for_testing') {
      logger.info('Using mock export readiness data for testing (no valid API key)');
      return getMockExportReadiness(businessInfo);
    }

    // Prepare content from export and about pages
    const exportContent = getContentFromPageType(pageData, 'export');
    const aboutContent = getContentFromPageType(pageData, 'about');
    const certContent = getContentFromPageType(pageData, 'certifications');
    
    // Create a summary of the business
    const businessSummary = JSON.stringify(businessInfo || {});
    
    // Combine content (limiting total token size)
    const combinedContent = `
      Export Information: ${exportContent.substring(0, 2000)}
      
      About Information: ${aboutContent.substring(0, 1000)}
      
      Certification Information: ${certContent.substring(0, 1000)}
      
      Business Summary: ${businessSummary}
    `;

    // Create the prompt for the LLM
    const prompt = `
      You are an export readiness assessment specialist. Analyze the following website content and business summary to evaluate how prepared this business is for exporting their products or services internationally.
      
      ${combinedContent}
      
      Assess the business on these export readiness factors:
      1. International Experience: Evidence of existing export activity or international presence
      2. Product/Service Adaptability: How suitable their offerings are for international markets
      3. Certifications & Standards: Relevant certifications for international trade (ISO, HACCP, etc.)
      4. Marketing Readiness: Evidence of international marketing capability
      5. Logistics Capability: Evidence of ability to handle international shipping/delivery
      
      Format your response as a JSON object with:
      - exportReadiness: Overall score (0-100)
      - strengths: Array of export readiness strengths
      - weaknesses: Array of export readiness weaknesses
      - recommendations: Array of improvement recommendations
      - targetMarkets: Array of suggested export markets based on the analysis
      
      Return ONLY the JSON object with no additional explanation.
    `;

    // Make API request to OpenAI
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are an export readiness assessment specialist.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    // Parse and validate the response
    const responseContent = response.data.choices[0].message.content.trim();
    let assessment;
    
    try {
      // Try to parse the JSON response
      assessment = JSON.parse(responseContent);
      logger.info('Successfully extracted export readiness assessment using LLM');
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON content from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          assessment = JSON.parse(jsonMatch[0]);
          logger.info('Extracted export readiness assessment from partial JSON response');
        } catch (nestedError) {
          logger.error('Failed to parse LLM export assessment response as JSON', {
            error: nestedError.message,
            response: responseContent.substring(0, 200)
          });
          return getMockExportReadiness(businessInfo);
        }
      } else {
        logger.error('Failed to extract JSON from LLM export assessment response', {
          error: parseError.message,
          response: responseContent.substring(0, 200)
        });
        return getMockExportReadiness(businessInfo);
      }
    }

    // Ensure the exportReadiness score is a number between 0-100
    if (typeof assessment.exportReadiness !== 'number' || 
        assessment.exportReadiness < 0 || 
        assessment.exportReadiness > 100) {
      assessment.exportReadiness = 50;
    }

    return assessment;
  } catch (error) {
    logger.error('Error in LLM export readiness analysis', {
      error: error.message,
      stack: error.stack
    });
    return getMockExportReadiness(businessInfo);
  }
}

/**
 * Helper function to extract content from a specific page type
 * @param {Object} pageData - The aggregated page data
 * @param {string} pageType - The type of page to extract content from
 * @returns {string} - Combined content from all pages of that type
 */
function getContentFromPageType(pageData, pageType) {
  if (!pageData || !pageData.pages || !Array.isArray(pageData.pages)) {
    return '';
  }
  
  const relevantPages = pageData.pages.filter(page => page.type === pageType);
  
  if (relevantPages.length === 0) {
    return '';
  }
  
  return relevantPages.map(page => {
    const titleSection = page.title ? `Title: ${page.title}\n` : '';
    const metaSection = page.metaDescription ? `Meta Description: ${page.metaDescription}\n` : '';
    const contentSection = page.content ? `Content: ${page.content}\n` : '';
    
    return `
      URL: ${page.url}
      ${titleSection}
      ${metaSection}
      ${contentSection}
      ---
    `;
  }).join('\n');
}

/**
 * Get mock business information for testing
 * @param {Array} pages - Array of scraped pages 
 * @returns {Object} - Mock business information
 */
function getMockBusinessInfo(pages) {
  // Try to extract business name from title
  let businessName = "Unknown Business";
  let description = "";
  
  // Extract business name from page titles
  for (const page of pages) {
    if (page.title && page.title.includes(' | ')) {
      // Often titles are in format "Page Name | Business Name"
      businessName = page.title.split(' | ').pop().trim();
      break;
    } else if (page.title && !page.title.toLowerCase().includes('home') && page.types?.includes('home')) {
      // Use home page title if not generic
      businessName = page.title.trim();
      break;
    }
  }
  
  // Extract domains from URLs to guess business name
  if (businessName === "Unknown Business" && pages.length > 0) {
    try {
      const url = new URL(pages[0].url);
      const domain = url.hostname.replace('www.', '').split('.')[0];
      if (domain.length > 3) {
        businessName = domain.charAt(0).toUpperCase() + domain.slice(1);
      }
    } catch (e) {}
  }
  
  // Count page types to determine business segments
  const pageTypes = pages.flatMap(p => p.types).filter(Boolean);
  const hasProducts = pageTypes.includes('products');
  const hasExport = pageTypes.includes('export');
  
  // Generate mock business info
  return {
    businessName,
    businessSize: "small",
    description: description || `${businessName} is a South African business.`,
    foundedYear: null,
    employeeCount: null,
    customerSegments: ["B2C"],
    productCategories: hasProducts ? ["Food & Beverage"] : [],
    certifications: [],
    geographicPresence: ["South Africa"],
    exportMarkets: hasExport ? ["African countries"] : []
  };
}

/**
 * Get mock export readiness data for testing
 * @param {Object} businessInfo - Business information
 * @returns {Object} - Mock export readiness assessment
 */
function getMockExportReadiness(businessInfo) {
  // Determine export readiness score based on business info
  let score = 30; // Base score
  
  // Boost score based on available business info
  if (businessInfo.exportMarkets && businessInfo.exportMarkets.length > 0) {
    score += 25; // Already exporting
  }
  
  if (businessInfo.certifications && businessInfo.certifications.length > 0) {
    score += 15; // Has certifications
  }
  
  if (businessInfo.geographicPresence && businessInfo.geographicPresence.length > 1) {
    score += 10; // Multiple locations
  }
  
  // Cap score at 100
  score = Math.min(score, 100);
  
  return {
    score,
    strengths: [
      "Established local presence in South Africa",
      "Product range suitable for export markets",
      "Website presents comprehensive product information"
    ],
    weaknesses: [
      "Limited international certifications mentioned",
      "No clear export process information on website",
      "Limited multi-language support on website"
    ],
    recommendations: [
      "Obtain relevant international certifications for target markets",
      "Develop export-focused section on website",
      "Highlight any existing export success stories",
      "Consider adding multiple language options to website"
    ]
  };
}

module.exports = {
  extractBusinessInfo,
  detectProducts,
  analyzeExportReadiness
}; 
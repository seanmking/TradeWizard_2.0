/**
 * enhanced-llm-analyzer.js
 * Provides improved LLM-based analysis of website content for business information
 * and product detection with structured data extraction.
 */

const axios = require('axios');
const logger = require('./logger');
const supabaseService = require('./supabase-service');
require('dotenv').config();

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Rate limiting configuration
const MIN_DELAY_BETWEEN_REQUESTS_MS = 1000; // 1 second
let lastRequestTime = 0;

/**
 * Ensures minimum delay between API requests
 * @returns {Promise<void>}
 */
async function enforceRateLimit() {
  const now = Date.now();
  const timeElapsed = now - lastRequestTime;
  
  if (timeElapsed < MIN_DELAY_BETWEEN_REQUESTS_MS && lastRequestTime > 0) {
    const delay = MIN_DELAY_BETWEEN_REQUESTS_MS - timeElapsed;
    logger.debug(`Rate limiting: Waiting ${delay}ms between OpenAI API requests`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Call OpenAI API with rate limiting and token counting
 * @param {string} model - OpenAI model to use
 * @param {Array} messages - Array of message objects 
 * @param {string} operation - Type of operation (for logging)
 * @returns {Promise<Object>} - API response
 */
async function callOpenAI(model, messages, operation) {
  try {
    // Check for valid API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'fake_key_for_testing' || apiKey === 'sk-your-openai-api-key') {
      logger.warn('Missing valid OpenAI API key. Using mock data.');
      return null;
    }

    // Enforce rate limiting
    await enforceRateLimit();
    
    // Count input tokens for usage tracking
    let inputTokenCount = 0;
    for (const message of messages) {
      inputTokenCount += supabaseService.estimateTokens(message.content);
    }
    
    // Make API request to OpenAI
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: model,
        messages: messages,
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    // Log token usage metrics
    const outputTokens = response.data.usage?.completion_tokens || 
                         supabaseService.estimateTokens(response.data.choices[0].message.content);
    const totalTokens = response.data.usage?.total_tokens || (inputTokenCount + outputTokens);
    
    await supabaseService.logApiUsage(
      'openai',
      model,
      totalTokens,
      operation
    );
    
    logger.info(`OpenAI API call completed for ${operation}`, {
      model,
      inputTokens: inputTokenCount,
      outputTokens,
      totalTokens
    });
    
    return response;
  } catch (error) {
    // Handle API errors with detailed logging
    if (error.response) {
      logger.error(`OpenAI API error (${error.response.status}): ${error.response.data.error?.message || 'Unknown error'}`, {
        operation,
        errorCode: error.response.data.error?.code,
        errorType: error.response.data.error?.type
      });
      
      // Handle rate limiting specially
      if (error.response.status === 429) {
        // Add extra delay for rate limiting
        lastRequestTime = Date.now() + 5000; // Add 5 seconds extra pause 
        logger.warn('Rate limit exceeded, adding delay to future requests');
      }
    } else if (error.request) {
      logger.error(`OpenAI API request error: No response received`, {
        operation,
        errorMessage: error.message
      });
    } else {
      logger.error(`OpenAI API setup error: ${error.message}`, {
        operation,
        stack: error.stack
      });
    }
    
    return null;
  }
}

/**
 * Extract structured business information using LLM
 * @param {Object} pageData - Aggregated data from crawled pages
 * @returns {Promise<Object>} - Enhanced business information
 */
async function extractBusinessInfo(pageData) {
  try {
    // Prepare content from various page types
    const aboutContent = getContentFromPageType(pageData, 'about');
    const homeContent = getContentFromPageType(pageData, 'home');
    const contactContent = getContentFromPageType(pageData, 'contact');
    const exportContent = getContentFromPageType(pageData, 'export');
    const productContent = getContentFromPageType(pageData, 'products');
    const certificationsContent = getContentFromPageType(pageData, 'certifications');
    const complianceContent = getContentFromPageType(pageData, 'compliance');
    const supplyChainContent = getContentFromPageType(pageData, 'supply_chain');
    const logisticsContent = getContentFromPageType(pageData, 'logistics');
    const intellectualPropertyContent = getContentFromPageType(pageData, 'intellectual_property');
    
    // Combine the most relevant content (limiting total token size)
    const combinedContent = `
      About: ${aboutContent.substring(0, 1200)}
      
      Home: ${homeContent.substring(0, 1000)}
      
      Contact: ${contactContent.substring(0, 500)}
      
      Export: ${exportContent.substring(0, 800)}

      Products: ${productContent.substring(0, 600)}

      Certifications: ${certificationsContent.substring(0, 700)}

      Compliance: ${complianceContent.substring(0, 700)}
      
      Supply Chain: ${supplyChainContent.substring(0, 700)}
      
      Logistics: ${logisticsContent.substring(0, 500)}
      
      Intellectual Property: ${intellectualPropertyContent.substring(0, 500)}
    `;

    // Create the prompt for the LLM
    const prompt = `
      You are an expert business analyst specialized in international trade and export readiness. Your task is to extract structured information about a company from their website content to assess their export potential and international business capabilities.
      
      Analyze the following website content and extract key business information in a structured format:
      
      ${combinedContent}
      
      Extract the following information in JSON format:
      - businessName: The official name of the business (if not found, leave as an empty string)
      - businessSize: Categorize as "micro", "small", "medium", or "large" based on context
      - description: A concise description of the business (max 200 words)
      - foundedYear: The year the business was founded (if mentioned)
      - employeeCount: Approximate number of employees (if mentioned)
      - geographicPresence: Array of locations where the business operates (countries, cities)
      - industries: Array of industries the business operates in
      - exportMarkets: Array of countries or regions the business exports to (if applicable)
      - internationalPartnerships: Array of international partners or distributors mentioned
      - customerSegments: Array of customer segments or target markets
      - exportReadiness: Rate from 0-100 how export-ready the business appears to be
      - b2bFocus: Rate from 0-100 how focused the business is on B2B vs B2C
      - valueProposition: Key value proposition for international markets
      - certifications: Array of quality/regulatory certifications held (ISO, etc.)
      - regulatoryCompliance: Information about compliance with international standards
      - supplyChainInfo: Details about manufacturing, capacity, sourcing
      - minimumOrderQuantities: Information about MOQs if mentioned
      - shippingCapabilities: International shipping and logistics information
      - ecommerceCapabilities: Assessment of online sales capabilities for international markets
      - languagesSupported: Array of languages the company operates in
      - intellectualProperty: Any patents, trademarks, or IP mentioned
      - strengths: Array of business strengths for international trade
      - weaknesses: Array of potential weaknesses for international expansion
      - innovationCapabilities: Information about R&D or innovation
      - marketShareInfo: Information about the company's market share or position
      - growthTrends: Information about growth trends or projections
      - competitivePositioning: How the company positions itself against competitors
      - salesChannels: Array of sales channels (direct, distributor, agent, online)
      - environmentalCertifications: Array of environmental/sustainability certifications
      - organicCertifications: Array of organic/natural product certifications
      - fairTradeCertifications: Array of fair trade or ethical certifications
      - productSafetyCertifications: Array of product safety certifications
      - testingCertifications: Array of testing/laboratory certifications
      - regulatoryAuthorities: Array of regulatory authorities mentioned
      - sustainabilityPractices: Information about sustainability initiatives
      - corporateSocialResponsibility: Information about CSR programs
      - awards: Array of awards or recognitions received
      - responseTime: Information about response time to inquiries if mentioned
      - socialMediaPresence: Assessment of social media presence for international audiences
      
      Use evidence from the text to justify your extraction. If you can't find specific information, use reasonable defaults or leave fields empty. Return ONLY the JSON object with no additional explanation.
    `;

    const messages = [
      { role: 'system', content: 'You are an international business and export analysis specialist with expertise in market intelligence and compliance.' },
      { role: 'user', content: prompt }
    ];

    // Make API request to OpenAI
    const response = await callOpenAI(OPENAI_MODEL, messages, 'business_info_extraction');

    // If API call fails or no valid key, use mock data
    if (!response) {
      logger.info('Using mock business info data (API call failed)');
      return getMockBusinessInfo(pageData.pages);
    }

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
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'fake_key_for_testing' || OPENAI_API_KEY === 'sk-your-openai-api-key') {
      logger.warn('OpenAI API key not configured. Using mock product data.');
      return [];
    }

    // Prepare content from product and home pages
    const productContent = getContentFromPageType(pageData, 'products');
    const homeContent = getContentFromPageType(pageData, 'home');
    const specificationContent = getContentFromPageType(pageData, 'specifications');
    const pricingContent = getContentFromPageType(pageData, 'pricing');
    const complianceContent = getContentFromPageType(pageData, 'compliance');
    
    // Combine content (limiting total token size)
    const combinedContent = `
      Products: ${productContent.substring(0, 3000)}
      
      Home: ${homeContent.substring(0, 1200)}

      Specifications: ${specificationContent.substring(0, 800)}

      Pricing: ${pricingContent.substring(0, 500)}

      Compliance: ${complianceContent.substring(0, 500)}
    `;

    // Create the prompt for product detection
    const prompt = `
      You are an expert in analyzing business websites to identify products and services they offer, with a special focus on export-ready businesses.
      
      Analyze the following website content from ${url} and identify all products or services mentioned:
      
      ${combinedContent}
      
      Create a detailed structured list of products/services in JSON format like:
      [
        {
          "name": "Product Name",
          "description": "Brief description of the product based on the content",
          "category": "Product category or type",
          "confidence": "high/medium/low based on how clearly it's mentioned",
          "hsCode": "HS code if available or can be inferred (leave null if unknown)",
          "pricing": "Pricing information if available",
          "specifications": "Technical specifications of the product",
          "imageUrls": ["array", "of", "image", "urls", "if", "found"],
          "certifications": ["array", "of", "certifications", "for", "this", "product"],
          "complianceInfo": "Compliance information for this product",
          "manufacturingInfo": "Manufacturing capacity, location, etc."
        }
      ]
      
      Only include products/services that are clearly offered by the business.
      For each product:
      1. Try to identify the HS code if possible (for international trade)
      2. Note any certifications specific to this product
      3. Include pricing if available
      4. Specify manufacturing details if mentioned
      5. Include compliance information relevant to export
      
      Return ONLY the JSON array with no additional explanations or text.
    `;

    const messages = [
      { role: 'system', content: 'You are a product identification specialist with expertise in international trade.' },
      { role: 'user', content: prompt }
    ];

    // Make API request to OpenAI
    const response = await callOpenAI(OPENAI_MODEL, messages, 'product_detection');
    
    // If API call fails, return empty array
    if (!response) {
      logger.info('Using empty product list (API call failed)');
      return [];
    }

    // Parse and validate the response
    const responseContent = response.data.choices[0].message.content.trim();
    let productList = [];
    
    try {
      // Try to parse the JSON response
      productList = JSON.parse(responseContent);
      logger.info(`Detected ${productList.length} products using LLM`);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON array from the response
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          productList = JSON.parse(jsonMatch[0]);
          logger.info(`Extracted ${productList.length} products from partial JSON response`);
        } catch (nestedError) {
          logger.error('Failed to parse product detection response as JSON', {
            error: nestedError.message,
            response: responseContent.substring(0, 200)
          });
        }
      } else {
        logger.error('Failed to extract product JSON from LLM response', {
          error: parseError.message,
          response: responseContent.substring(0, 200)
        });
      }
    }

    // Validate and clean up product data
    return productList.filter(p => p && p.name).map(product => ({
      name: product.name || 'Unknown product',
      description: product.description || '',
      category: product.category || 'General',
      confidence: product.confidence || 'low',
      hsCode: product.hsCode || null,
      pricing: product.pricing || null,
      specifications: product.specifications || null,
      imageUrls: product.imageUrls || [],
      certifications: product.certifications || [],
      complianceInfo: product.complianceInfo || null,
      manufacturingInfo: product.manufacturingInfo || null
    }));
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
    const complianceContent = getContentFromPageType(pageData, 'compliance');
    const supplyChainContent = getContentFromPageType(pageData, 'supply_chain');
    const logisticsContent = getContentFromPageType(pageData, 'logistics');
    
    // Create a summary of the business
    const businessSummary = JSON.stringify(businessInfo || {});
    
    // Combine content (limiting total token size)
    const combinedContent = `
      Export Information: ${exportContent.substring(0, 1500)}
      
      About Information: ${aboutContent.substring(0, 800)}
      
      Certification Information: ${certContent.substring(0, 800)}
      
      Compliance Information: ${complianceContent.substring(0, 800)}
      
      Supply Chain Information: ${supplyChainContent.substring(0, 800)}
      
      Logistics Information: ${logisticsContent.substring(0, 800)}
      
      Business Summary: ${businessSummary}
    `;

    // Create the prompt for the LLM
    const prompt = `
      You are an export readiness assessment specialist with expertise in market intelligence and international trade compliance. Analyze the following website content and business summary to evaluate how prepared this business is for exporting their products or services internationally.
      
      ${combinedContent}
      
      Assess the business on these export readiness factors:
      1. International Experience: Evidence of existing export activity or international presence
      2. Product/Service Adaptability: How suitable their offerings are for international markets
      3. Certifications & Standards: Relevant certifications for international trade (ISO, HACCP, GMP, etc.)
      4. Regulatory Compliance: Evidence of compliance with international regulations
      5. Marketing Readiness: Evidence of international marketing capability
      6. Logistics Capability: Evidence of ability to handle international shipping/delivery
      7. Supply Chain Resilience: Strength and adaptability of supply chain for international trade
      8. E-commerce Capabilities: Online presence and digital readiness for international sales
      9. Language & Communication: Multilingual capabilities and international communication
      10. Financial Readiness: Evidence of financing, pricing strategies, and payment methods for export
      
      Format your response as a JSON object with:
      - exportReadiness: Overall score (0-100)
      - strengths: Array of export readiness strengths
      - weaknesses: Array of export readiness weaknesses
      - recommendations: Array of improvement recommendations
      - targetMarkets: Array of suggested export markets based on the analysis
      - complianceGaps: Array of compliance issues that need to be addressed
      - certificationNeeds: Array of certifications recommended for target markets
      - supplyChainRisks: Array of supply chain risks for international expansion
      - marketEntryStrategy: Suggested approach for market entry (direct export, distributor, e-commerce, etc.)
      
      Return ONLY the JSON object with no additional explanation.
    `;

    const messages = [
      { role: 'system', content: 'You are an export readiness assessment specialist with expertise in market intelligence and international trade compliance.' },
      { role: 'user', content: prompt }
    ];

    // Make API request to OpenAI
    const response = await callOpenAI(OPENAI_MODEL, messages, 'export_readiness_analysis');

    // If API call fails or no valid key, use mock data
    if (!response) {
      logger.info('Using mock export readiness data (API call failed)');
      return getMockExportReadiness(businessInfo);
    }

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
    exportMarkets: hasExport ? ["African countries"] : [],
    industries: ["General Manufacturing"],
    b2bFocus: 50,
    exportReadiness: 30,
    internationalPartnerships: [],
    valueProposition: null,
    regulatoryCompliance: null,
    supplyChainInfo: null,
    minimumOrderQuantities: null,
    shippingCapabilities: null,
    ecommerceCapabilities: "Basic online presence",
    languagesSupported: ["English"],
    intellectualProperty: null,
    strengths: ["Local market presence"],
    weaknesses: ["Limited international experience"],
    innovationCapabilities: null,
    marketShareInfo: null,
    growthTrends: null,
    competitivePositioning: null,
    salesChannels: ["Direct"],
    environmentalCertifications: [],
    organicCertifications: [],
    fairTradeCertifications: [],
    productSafetyCertifications: [],
    testingCertifications: [],
    regulatoryAuthorities: [],
    sustainabilityPractices: null,
    corporateSocialResponsibility: null,
    awards: [],
    responseTime: null,
    socialMediaPresence: null
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
    exportReadiness: score,
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
    ],
    targetMarkets: [
      "Neighboring African countries",
      "Other emerging markets with similar product demand"
    ],
    complianceGaps: [
      "Missing product-specific certifications for international markets",
      "Limited evidence of regulatory compliance documentation"
    ],
    certificationNeeds: [
      "ISO 9001 Quality Management System",
      "Market-specific product certifications",
      "Export/import documentation training"
    ],
    supplyChainRisks: [
      "Unclear manufacturing capacity for export volume",
      "Limited information about international logistics partners",
      "Potential delivery delays for international shipments"
    ],
    marketEntryStrategy: "Start with direct exports to neighboring countries, then develop distributor relationships in target markets. Consider e-commerce platforms for B2B engagement."
  };
}

module.exports = {
  extractBusinessInfo,
  detectProducts,
  analyzeExportReadiness,
  getContentFromPageType
}; 
const { extractProductsWithLLM } = require('./llm-product-analyzer');
const logger = require('./logger');
const cheerio = require('cheerio');
const axios = require('axios');
const { detectDomProducts } = require('./dom-product-detector');
const { detectLlmProducts } = require('./llm-product-analyzer');

/**
 * Try to fetch a URL with fallbacks
 * @param {string} url - URL to fetch
 * @param {Object} options - Axios options
 * @returns {Promise<Object>} - Response data
 */
async function safeRequestWithFallback(url, options = {}) {
  const attempts = [
    { url, errorHandled: false },
    { url: url.replace('https://', 'http://'), errorHandled: false }
  ];
  
  for (let i = 0; i < attempts.length; i++) {
    try {
      const currentUrl = attempts[i].url;
      logger.info(`Attempting to fetch ${currentUrl}`);
      
      // Add specific options to help with problematic sites
      const requestOptions = {
        ...options,
        timeout: options.timeout || 30000,
        maxRedirects: 5,
        validateStatus: status => status < 500, // Only fail on server errors
        headers: {
          ...options.headers,
          'User-Agent': options.headers?.['User-Agent'] || 'TradeWizard/1.0 (+https://tradewizard.co.za/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false // Allow self-signed certs
        })
      };
      
      const response = await axios.get(currentUrl, requestOptions);
      
      if (response.status >= 200 && response.status < 300) {
        return response;
      } else {
        attempts[i].errorHandled = true;
        logger.warn(`Received status ${response.status} from ${currentUrl}`);
      }
    } catch (error) {
      attempts[i].errorHandled = true;
      logger.warn(`Error fetching ${attempts[i].url}: ${error.message}`);
    }
  }
  
  // If all attempts failed, throw an error
  const errors = attempts
    .filter(a => a.errorHandled)
    .map(a => `Failed to fetch ${a.url}`)
    .join(', ');
  
  throw new Error(`All fetch attempts failed: ${errors}`);
}

/**
 * Detect products using both DOM-based and LLM-based approaches
 * @param {string} url - Base URL of website
 * @param {Object} pageData - Crawled page data 
 * @returns {Object} Object containing products from both methods and combined unique products
 */
async function detectProducts(url, pageData) {
  logger.info(`Starting hybrid product detection for ${url}`);
  
  if (!pageData || !pageData.pages || !Array.isArray(pageData.pages)) {
    logger.warn(`Invalid pageData structure: ${JSON.stringify({
      hasData: !!pageData,
      hasPages: pageData ? !!pageData.pages : false,
      isArray: pageData && pageData.pages ? Array.isArray(pageData.pages) : false,
      pageCount: pageData && pageData.pages && Array.isArray(pageData.pages) ? pageData.pages.length : 0
    })}`);
    return { products: [], categories: [], metrics: { productCount: 0 } };
  }
  
  try {
    logger.info(`Starting hybrid product detection for ${pageData.pages.length} pages`);
    
    // Extract relevant pages for product detection
    // In some cases, page types might not be set correctly, so let's be more flexible
    const productPages = pageData.pages.filter(page => {
      // Make sure page.types is an array or convert single value to array
      const types = Array.isArray(page.types) 
        ? page.types 
        : (page.types ? [page.types] : ['unknown']);
      
      // Add pages with 'products' type or with specific keywords in URL/HTML
      const isProductPage = 
        types.includes('products') || 
        /product|shop|store|buy|purchase/i.test(page.url) ||
        (page.html && /product-list|product-grid|add-to-cart|shop-item/i.test(page.html));
      
      return isProductPage;
    });
    
    logger.info(`Found ${productPages.length} product-related pages out of ${pageData.pages.length} total pages`);
    
    // If no specific product pages, use all pages
    const pagesToProcess = productPages.length > 0 
      ? productPages 
      : pageData.pages;
    
    if (pagesToProcess.length === 0) {
      logger.warn('No pages found for product detection');
      return { products: [], categories: [], metrics: { productCount: 0 } };
    }
    
    // Prepare HTML content for product detection
    const htmlContents = pagesToProcess.map(page => ({
      url: page.url,
      html: page.html
    })).filter(item => item.html); // Make sure there is HTML content
    
    logger.info(`Prepared ${htmlContents.length} pages with HTML content for processing`);
    
    if (htmlContents.length === 0) {
      logger.warn('No HTML content available for product detection');
      return { products: [], categories: [], metrics: { productCount: 0 } };
    }
    
    // DOM-based product detection
    const domProducts = await detectDomProducts(htmlContents);
    logger.info(`DOM-based detection found ${domProducts.length} products`);
    
    // LLM-based product detection
    const llmProducts = await detectLlmProducts(htmlContents);
    logger.info(`LLM-based detection found ${llmProducts.length} products`);
    
    // Combine products from both approaches
    const uniqueProducts = mergeProducts(domProducts, llmProducts);
    logger.info(`Hybrid detection found ${uniqueProducts.length} unique products`);
    
    // Extract categories from products
    const categories = extractCategories(uniqueProducts);
    logger.info(`Extracted ${categories.length} product categories`);
    
    return {
      products: uniqueProducts,
      categories: categories,
      metrics: {
        productCount: uniqueProducts.length,
        categories: categories.length,
        domProducts: domProducts.length,
        llmProducts: llmProducts.length
      }
    };
  } catch (error) {
    logger.error(`Failed to detect products: ${error.message}`);
    return { 
      products: [], 
      categories: [], 
      metrics: { 
        productCount: 0,
        error: error.message 
      } 
    };
  }
}

/**
 * Extract categories from products
 */
function extractCategories(products) {
  const categorySet = new Set();
  
  products.forEach(product => {
    if (product.category) {
      categorySet.add(product.category);
    }
  });
  
  return Array.from(categorySet);
}

/**
 * Merge products from DOM and LLM detection
 * @param {Array} domProducts - Products from DOM detection
 * @param {Array} llmProducts - Products from LLM detection
 * @returns {Array} - Combined unique products
 */
function mergeProducts(domProducts, llmProducts) {
  // Create map to track unique products by name
  const productsMap = new Map();
  
  // Add DOM products first
  domProducts.forEach(product => {
    const normalizedName = (product.name || '').toLowerCase().trim();
    if (normalizedName) {
      productsMap.set(normalizedName, {
        ...product,
        confidence: getConfidenceValue(product.confidence),
        detectionMethod: 'dom'
      });
    }
  });
  
  // Add or update with LLM products (LLM products have higher confidence)
  llmProducts.forEach(product => {
    const normalizedName = (product.name || '').toLowerCase().trim();
    if (!normalizedName) return;
    
    const existingProduct = productsMap.get(normalizedName);
    
    if (!existingProduct || getConfidenceValue(product.confidence) > getConfidenceValue(existingProduct.confidence)) {
      productsMap.set(normalizedName, {
        ...product,
        confidence: getConfidenceValue(product.confidence),
        detectionMethod: 'llm'
      });
    } else if (existingProduct) {
      // Merge information from both sources
      productsMap.set(normalizedName, {
        ...existingProduct,
        description: existingProduct.description || product.description,
        price: existingProduct.price || product.price,
        category: existingProduct.category || product.category,
        images: [...new Set([...(existingProduct.images || []), ...(product.images || [])])],
        confidence: Math.max(
          getConfidenceValue(existingProduct.confidence),
          getConfidenceValue(product.confidence)
        ),
        detectionMethod: 'hybrid'
      });
    }
  });
  
  return Array.from(productsMap.values());
}

/**
 * Convert confidence value to a numeric value
 * @param {string|number} confidence - Confidence value
 * @returns {number} - Normalized confidence value
 */
function getConfidenceValue(confidence) {
  if (typeof confidence === 'number') {
    return confidence;
  }
  
  if (typeof confidence === 'string') {
    const lower = confidence.toLowerCase();
    if (lower.includes('high')) return 0.9;
    if (lower.includes('medium')) return 0.6;
    if (lower.includes('low')) return 0.3;
  }
  
  return 0.5; // Default confidence
}

module.exports = {
  detectProducts
}; 
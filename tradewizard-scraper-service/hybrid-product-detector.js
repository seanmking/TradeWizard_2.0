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
  
  // Add timeout protection
  const TIMEOUT = 30000; // 30 seconds
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Product detection timed out')), TIMEOUT);
  });
  
  try {
    if (!pageData || !pageData.pages || !Array.isArray(pageData.pages)) {
      logger.warn('Invalid pageData structure:', {
        hasData: !!pageData,
        hasPages: pageData ? !!pageData.pages : false,
        isArray: pageData && pageData.pages ? Array.isArray(pageData.pages) : false,
        pageCount: pageData && pageData.pages && Array.isArray(pageData.pages) ? pageData.pages.length : 0
      });
      return { products: [], categories: [], metrics: { productCount: 0 } };
    }
    
    // Extract relevant pages for product detection
    const productPages = pageData.pages.filter(page => {
      logger.debug(`Analyzing page ${page.url}`);
      
      // Make sure page.types is an array or convert single value to array
      const types = Array.isArray(page.types) 
        ? page.types 
        : (page.types ? [page.types] : ['unknown']);
      
      // Add pages with 'products' type or with specific keywords in URL/HTML
      const isProductPage = 
        types.includes('products') || 
        /product|shop|store|buy|purchase/i.test(page.url) ||
        (page.html && /product-list|product-grid|add-to-cart|shop-item/i.test(page.html));
      
      logger.debug(`Page ${page.url} is product page: ${isProductPage}`);
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
    })).filter(item => item.html);
    
    logger.info(`Prepared ${htmlContents.length} pages with HTML content for processing`);
    
    // Race against timeout
    const detectionPromise = Promise.race([
      timeoutPromise,
      (async () => {
        // Start with DOM-based detection as it's faster
        logger.info('Starting DOM-based product detection...');
        const domProducts = await detectDomProducts(htmlContents);
        logger.info(`DOM-based detection found ${domProducts.length} products`);
        
        // Only use LLM if DOM detection found few or no products
        let llmProducts = [];
        if (domProducts.length < 3) {
          logger.info('Few DOM products found, trying LLM detection...');
          llmProducts = await detectLlmProducts(htmlContents);
          logger.info(`LLM-based detection found ${llmProducts.length} products`);
        }
        
        // Combine products
        const uniqueProducts = mergeProducts(domProducts, llmProducts);
        logger.info(`Combined detection found ${uniqueProducts.length} unique products`);
        
        // Extract categories
        const categories = extractCategories(uniqueProducts);
        
        return {
          products: uniqueProducts,
          categories,
          metrics: {
            productCount: uniqueProducts.length,
            categories: categories.length,
            domProducts: domProducts.length,
            llmProducts: llmProducts.length,
            detectionMethod: llmProducts.length > 0 ? 'hybrid' : 'dom-only'
          }
        };
      })()
    ]);
    
    return await detectionPromise;
  } catch (error) {
    logger.error('Failed to detect products:', error);
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
  const productsMap = new Map();
  
  const isValidProduct = (product) => {
    if (!product || typeof product !== 'object') return false;
    
    // Safely handle null/undefined values
    const name = (product.name || '').toString().trim();
    
    // Basic name validation
    if (!name || name.length < 2) return false;
    
    // Skip obvious navigation/structural elements
    if (/^(home|menu|about|contact|page|category)$/i.test(name)) return false;
    if (/\.(html|php|aspx|jsp|xml)$/i.test(name)) return false;
    
    // Skip common website sections
    const nonProductTerms = /^(navigation|footer|header|sidebar|main menu|search|login|register)$/i;
    if (nonProductTerms.test(name)) return false;
    
    // Check if it's likely a physical product
    const productIndicators = [
      // Has a description
      product.description && product.description.length > 0,
      
      // Has an image
      Array.isArray(product.images) && product.images.length > 0,
      
      // Has a price
      product.price && product.price.length > 0,
      
      // Name indicates physical product
      /\b(pack|set|kit|box|bottle|jar|can|bag|piece|unit|kg|ml|g|liter)\b/i.test(name),
      
      // Name contains product attributes
      /\b(size|color|weight|material|dimension|brand|model|style)\b/i.test(name),
      
      // Has physical attributes
      product.attributes && (
        product.attributes.weight ||
        product.attributes.dimensions ||
        product.attributes.material ||
        product.attributes.size
      ),
      
      // Has a category that suggests physical product
      product.category && /\b(food|beverage|clothing|electronics|home|beauty|sports|equipment)\b/i.test(product.category)
    ];
    
    // Consider it valid if it has at least ONE strong indicator
    return productIndicators.filter(Boolean).length >= 1;
  };

  // First process DOM products as they're more reliable for structure
  if (Array.isArray(domProducts)) {
    domProducts.forEach(product => {
      try {
        if (!isValidProduct(product)) return;
        
        const normalizedName = (product.name || '').toString().toLowerCase().trim();
        if (!normalizedName) return;
        
        productsMap.set(normalizedName, {
          name: product.name,
          description: product.description || '',
          images: Array.isArray(product.images) ? product.images : [],
          category: product.category || '',
          confidence: getConfidenceValue(product.confidence),
          detectionMethod: 'dom'
        });
      } catch (error) {
        logger.warn(`Error processing DOM product: ${error.message}`);
      }
    });
  }
  
  // Then add LLM products, which might have better semantic understanding
  if (Array.isArray(llmProducts)) {
    llmProducts.forEach(product => {
      try {
        if (!isValidProduct(product)) return;
        
        const normalizedName = (product.name || '').toString().toLowerCase().trim();
        if (!normalizedName) return;
        
        const existing = productsMap.get(normalizedName);
        if (!existing) {
          productsMap.set(normalizedName, {
            name: product.name,
            description: product.description || '',
            images: Array.isArray(product.images) ? product.images : [],
            category: product.category || '',
            confidence: getConfidenceValue(product.confidence) + 0.1,
            detectionMethod: 'llm'
          });
        } else {
          // Merge with existing product
          productsMap.set(normalizedName, {
            ...existing,
            description: product.description || existing.description,
            category: product.category || existing.category,
            confidence: Math.max(
              getConfidenceValue(existing.confidence),
              getConfidenceValue(product.confidence) + 0.1
            ),
            detectionMethod: `${existing.detectionMethod},llm`
          });
        }
      } catch (error) {
        logger.warn(`Error processing LLM product: ${error.message}`);
      }
    });
  }
  
  // Final cleanup and sorting
  const products = Array.from(productsMap.values())
    .filter(product => {
      // Must have either a description or image
      return product.description || (Array.isArray(product.images) && product.images.length > 0);
    })
    .sort((a, b) => getConfidenceValue(b.confidence) - getConfidenceValue(a.confidence));
  
  logger.info(`Merged ${products.length} products from ${productsMap.size} candidates`);
  return products;
}

/**
 * Convert confidence values to numeric scores
 */
function getConfidenceValue(confidence) {
  if (typeof confidence === 'number') {
    return confidence;
  }
  
  const confidenceStr = String(confidence).toLowerCase();
  if (confidenceStr.includes('high')) return 0.9;
  if (confidenceStr.includes('medium')) return 0.6;
  if (confidenceStr.includes('low')) return 0.3;
  return 0.5;
}

module.exports = {
  detectProducts
}; 
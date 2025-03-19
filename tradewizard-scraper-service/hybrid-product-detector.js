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
 * @param {Array} pages - Array of page objects from the crawler
 * @returns {Object} Object containing products from both methods and combined unique products
 */
async function detectProducts(pages) {
  logger.info(`Starting hybrid product detection for ${pages.length} pages`);
  
  if (!Array.isArray(pages) || pages.length === 0) {
    logger.warn('No pages provided for product detection');
    return { domProducts: [], llmProducts: [], products: [] };
  }
  
  try {
    // Extract relevant pages for product detection
    const productPages = pages.filter(page => {
      // Make sure page.types is an array
      const types = Array.isArray(page.types) ? page.types : [page.types].filter(Boolean);
      return types.includes('products');
    });
    
    if (productPages.length === 0) {
      logger.info('No product pages found for detection');
      return { domProducts: [], llmProducts: [], products: [] };
    }
    
    // Prepare HTML content for product detection
    const htmlContents = productPages.map(page => ({
      url: page.url,
      html: page.html
    }));
    
    // DOM-based product detection
    const domProducts = await detectDomProducts(htmlContents);
    logger.info(`DOM-based detection found ${domProducts.length} products`);
    
    // LLM-based product detection
    const llmProducts = await detectLlmProducts(htmlContents);
    logger.info(`LLM-based detection found ${llmProducts.length} products`);
    
    // Combine products from both approaches
    const uniqueProducts = mergeProducts(domProducts, llmProducts);
    logger.info(`Hybrid detection found ${uniqueProducts.length} unique products`);
    
    return {
      domProducts,
      llmProducts,
      products: uniqueProducts
    };
  } catch (error) {
    logger.error(`Failed to detect products: ${error.message}`);
    return { domProducts: [], llmProducts: [], products: [] };
  }
}

/**
 * Extract products from the DOM using various selectors and heuristics
 * @param {Object} $ - Cheerio instance
 * @returns {Array} - Extracted products
 */
function extractDOMProducts($) {
  const products = [];
  
  // Product container selectors (common patterns in e-commerce sites)
  const productSelectors = [
    '.product', '.product-item', '.item', '.prod-item',
    '[class*="product"]', '[class*="Product"]',
    '.service', '.service-item', '[class*="service"]',
    '.offering', '.solution',
    // Woocommerce
    '.products li', '.woocommerce-product-gallery',
    // Shopify
    '.product-card', '.product-grid-item',
    // Generic
    '.card:has(h3, h4)', '.box:has(h3, h4)', 
    'section:has(h2:contains("Product"), h2:contains("Service"))'
  ];
  
  // Look for product containers
  productSelectors.forEach(selector => {
    try {
      $(selector).each((i, el) => {
        const product = extractProductFromElement($, el);
        if (product && product.name) {
          products.push(product);
        }
      });
    } catch (error) {
      // Skip errors for individual selectors
    }
  });
  
  // If no products found, try looser detection based on headings and images
  if (products.length === 0) {
    try {
      // Look for heading + image/description patterns
      $('h2, h3, h4').each((i, el) => {
        const heading = $(el);
        const headingText = heading.text().trim();
        
        // Skip very short headings or navigational elements
        if (headingText.length < 3 || heading.closest('nav, footer, header').length > 0) {
          return;
        }
        
        // Check if this heading has an image or paragraph nearby
        const parent = heading.parent();
        const hasImage = parent.find('img').length > 0;
        const hasDescription = parent.find('p').length > 0;
        
        if (hasImage || hasDescription) {
          const description = parent.find('p').first().text().trim();
          const image = parent.find('img').first().attr('src') || '';
          
          products.push({
            name: headingText,
            description: description,
            image: image,
            confidence: 'low'
          });
        }
      });
    } catch (error) {
      // Skip errors in fallback detection
    }
  }
  
  return products;
}

/**
 * Extract product data from a DOM element
 * @param {Object} $ - Cheerio instance
 * @param {Object} element - DOM element
 * @returns {Object|null} - Product data or null
 */
function extractProductFromElement($, element) {
  const el = $(element);
  
  // Skip elements that are too small or likely navigation
  if (el.height < 50 || el.closest('nav, menu, .navigation').length > 0) {
    return null;
  }
  
  // Find product name
  const nameSelectors = [
    'h2', 'h3', 'h4', '.title', '.name', '.product-title', 
    '.product-name', '[class*="title"]', '[class*="name"]'
  ];
  
  let name = '';
  for (const selector of nameSelectors) {
    const nameEl = el.find(selector).first();
    if (nameEl.length > 0) {
      name = nameEl.text().trim();
      break;
    }
  }
  
  // Skip if no name found
  if (!name) return null;
  
  // Find product description
  const descSelectors = [
    'p', '.description', '.desc', '.product-description',
    '.details', '.info', '[class*="description"]'
  ];
  
  let description = '';
  for (const selector of descSelectors) {
    const descEl = el.find(selector).first();
    if (descEl.length > 0) {
      description = descEl.text().trim();
      break;
    }
  }
  
  // Find product image
  const imgEl = el.find('img').first();
  const image = imgEl.length > 0 ? imgEl.attr('src') || '' : '';
  
  // Find product price if available
  const priceSelectors = [
    '.price', '.product-price', '[class*="price"]'
  ];
  
  let price = '';
  for (const selector of priceSelectors) {
    const priceEl = el.find(selector).first();
    if (priceEl.length > 0) {
      price = priceEl.text().trim();
      break;
    }
  }
  
  // Set confidence based on available data
  let confidence = 'medium';
  if (!description) {
    confidence = 'low';
  } else if (description.length > 50 && image) {
    confidence = 'high';
  }
  
  return {
    name,
    description,
    image,
    price,
    confidence
  };
}

/**
 * Merge products from DOM and LLM approaches, removing duplicates
 * @param {Array} domProducts - Products detected by DOM approach
 * @param {Array} llmProducts - Products detected by LLM approach
 * @returns {Array} - Merged unique products
 */
function mergeProducts(domProducts, llmProducts) {
  // Create a map of products by name for checking duplicates
  const productMap = new Map();
  
  // Add DOM products first
  domProducts.forEach(product => {
    const normalizedName = (product.name || '').toLowerCase().trim();
    if (normalizedName) {
      productMap.set(normalizedName, {
        ...product,
        confidence: product.confidence || 'medium',
        source: 'dom'
      });
    }
  });
  
  // Add or merge LLM products
  llmProducts.forEach(product => {
    const normalizedName = (product.name || '').toLowerCase().trim();
    if (!normalizedName) return;
    
    if (productMap.has(normalizedName)) {
      // Merge with existing product
      const existingProduct = productMap.get(normalizedName);
      
      productMap.set(normalizedName, {
        ...existingProduct,
        // Prefer LLM description if it's longer
        description: (product.description && product.description.length > (existingProduct.description?.length || 0))
          ? product.description
          : existingProduct.description,
        // Use highest confidence
        confidence: getHigherConfidence(existingProduct.confidence, product.confidence),
        // Update source
        source: 'both'
      });
    } else {
      // Add new product
      productMap.set(normalizedName, {
        ...product,
        confidence: product.confidence || 'low',
        source: 'llm'
      });
    }
  });
  
  // Convert map to array
  return Array.from(productMap.values());
}

/**
 * Determine the higher confidence level
 * @param {string} conf1 - First confidence level
 * @param {string} conf2 - Second confidence level
 * @returns {string} - Higher confidence level
 */
function getHigherConfidence(conf1, conf2) {
  const levels = { 'high': 3, 'medium': 2, 'low': 1 };
  const level1 = levels[conf1?.toLowerCase()] || 1;
  const level2 = levels[conf2?.toLowerCase()] || 1;
  
  return level1 >= level2
    ? conf1?.toLowerCase() || 'low'
    : conf2?.toLowerCase() || 'low';
}

module.exports = {
  detectProducts,
  extractDOMProducts,
  mergeProducts
}; 
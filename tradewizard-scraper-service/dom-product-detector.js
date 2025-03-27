/**
 * TradeWizard DOM-based Product Detector
 * Detects products from HTML content using DOM analysis
 */

const cheerio = require('cheerio');
const logger = require('./logger');

/**
 * Detect products from HTML content using DOM-based techniques
 * @param {Array} htmlContents - Array of objects with url and html properties
 * @returns {Array} - Detected products with properties
 */
function detectDomProducts(htmlContents) {
  logger.info(`Starting DOM-based product detection on ${htmlContents.length} pages`);
  
  if (!Array.isArray(htmlContents) || htmlContents.length === 0) {
    logger.warn('No HTML content provided for DOM product detection');
    return [];
  }
  
  const allProducts = [];
  
  for (const { url, html } of htmlContents) {
    if (!html) continue;
    
    try {
      logger.info(`Analyzing DOM structure for products in ${url}`);
      
      const $ = cheerio.load(html);
      
      // Log the page structure to understand what we're working with
      logger.debug(`Page structure summary for ${url}:
        - Total elements: ${$('*').length}
        - Potential product containers: ${$('[class*="product"], [class*="item"], .card, [id*="product"]').length}
        - Images: ${$('img').length}
        - Links: ${$('a').length}
        - Headers: ${$('h1, h2, h3, h4').length}
      `);
      
      // Try multiple detection strategies
      const products = [];
      
      // Strategy 1: Look for common product containers
      const productContainers = extractProductContainers($, url);
      products.push(...productContainers);
      logger.info(`Found ${productContainers.length} products using container strategy on ${url}`);
      
      // Strategy 2: Look for product grids/lists
      const productGridItems = extractProductGridItems($, url);
      products.push(...productGridItems);
      logger.info(`Found ${productGridItems.length} products using grid/list strategy on ${url}`);
      
      // Strategy 3: Look for heading + image + text patterns
      const headingImagePairs = extractHeadingImagePairs($, url);
      products.push(...headingImagePairs);
      logger.info(`Found ${headingImagePairs.length} products using heading/image strategy on ${url}`);
      
      // Add URL to all products
      for (const product of products) {
        product.sourceUrl = url;
        // For relative URLs, make them absolute
        if (product.url && !product.url.startsWith('http')) {
          product.url = new URL(product.url, url).toString();
        }
        if (product.images) {
          product.images = product.images.map(imgUrl => 
            imgUrl.startsWith('http') ? imgUrl : new URL(imgUrl, url).toString()
          );
        }
      }
      
      // Add products from this page to the overall collection
      allProducts.push(...products);
      
    } catch (error) {
      logger.error(`Error in DOM detection for ${url}: ${error.message}`);
    }
  }
  
  // Deduplicate products
  const uniqueProducts = [];
  const seen = new Set();
  
  for (const product of allProducts) {
    const key = `${product.name}|${product.sourceUrl}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueProducts.push(product);
    }
  }
  
  logger.info(`DOM-based detection found ${uniqueProducts.length} unique products across all pages`);
  return uniqueProducts;
}

/**
 * Extract products from common container elements
 */
function extractProductContainers($, url) {
  const products = [];
  
  // Common product container selectors
  const selectors = [
    '.product', '.product-item', '.product-card', 
    '.woocommerce-product', '.shopify-product',
    '[class*="product-"]', '[class*="product_"]',
    '.item:has(img)', '.card:has(img, h2, h3, .price)',
    '.service, .service-item', '.offering',
    // WooCommerce specific
    '.products li', 
    // Shopify specific
    '.product-grid-item',
    // Generic listings
    'ul.products > li', '.product-list > div',
    '.items > div', '.grid > div:has(img, h3)'
  ];
  
  // Try each selector
  selectors.forEach(selector => {
    try {
      $(selector).each((i, el) => {
        const $el = $(el);
        
        // Skip elements that are too small or likely navigation elements
        if ($el.find('img').length === 0 && $el.find('h1, h2, h3, h4, .title, .name').length === 0) {
          return;
        }
        
        // Extract product data
        const product = {
          name: extractName($el),
          description: extractDescription($el),
          price: extractPrice($el),
          images: extractImages($el),
          detectionMethod: 'dom-container',
          confidence: 0.7
        };
        
        // Only add if we found at least a name
        if (product.name) {
          products.push(product);
        }
      });
    } catch (error) {
      logger.warn(`Error with selector "${selector}": ${error.message}`);
    }
  });
  
  return products;
}

/**
 * Extract products from grid or list layouts
 */
function extractProductGridItems($, url) {
  const products = [];
  
  // 1. Find potential grids or lists
  const gridContainers = [
    '.grid', '.products', '.product-grid', '.product-list',
    '.items', '.listing', 'ul.products', '.card-group',
    '.row:has(> div > img)', '.row:has(> div[class*="col"] > img)'
  ];
  
  gridContainers.forEach(gridSelector => {
    try {
      $(gridSelector).each((i, grid) => {
        const $grid = $(grid);
        
        // 2. Get all immediate children that could be grid items
        const $items = $grid.children('div, li, article');
        
        // If we have multiple similar structured items, it's likely a product grid
        if ($items.length > 1) {
          logger.debug(`Found potential product grid with ${$items.length} items using "${gridSelector}"`);
          
          $items.each((j, item) => {
            const $item = $(item);
            
            // Extract product data
            const product = {
              name: extractName($item),
              description: extractDescription($item),
              price: extractPrice($item),
              images: extractImages($item),
              url: $item.find('a').attr('href'),
              detectionMethod: 'dom-grid',
              confidence: 0.6
            };
            
            // Only add if we found at least a name
            if (product.name) {
              products.push(product);
            }
          });
        }
      });
    } catch (error) {
      logger.warn(`Error with grid selector "${gridSelector}": ${error.message}`);
    }
  });
  
  return products;
}

/**
 * Extract products based on heading + image patterns
 */
function extractHeadingImagePairs($, url) {
  const products = [];
  
  // Look for heading elements that might indicate products
  $('h1, h2, h3, h4').each((i, heading) => {
    const $heading = $(heading);
    const headingText = $heading.text().trim();
    
    // Skip very short headings or ones that are likely navigation/UI elements
    if (headingText.length < 3 || 
        $heading.closest('nav, header, footer, .menu, .navigation').length > 0 ||
        /^(home|about|contact|news|gallery|partners|our|your|how|food|family|menu|services)$/i.test(headingText) ||
        headingText.toLowerCase().includes('welcome') ||
        headingText.toLowerCase().includes('contact us')) {
      return;
    }
    
    // Look for images near the heading
    const $parent = $heading.parent();
    const $grandparent = $parent.parent();
    const $section = $heading.closest('section, article, div.section');
    
    // Check surrounding elements for images
    const nearbyContainers = [$parent, $grandparent, $section].filter(Boolean);
    
    for (const $container of nearbyContainers) {
      const $img = $container.find('img').first();
      
      // Skip if image is too small (likely an icon) or has certain classes/attributes
      if ($img.length > 0) {
        const imgSrc = $img.attr('src') || '';
        const imgClass = $img.attr('class') || '';
        const imgAlt = $img.attr('alt') || '';
        
        // Skip icons, logos, and decorative images
        if (imgSrc.includes('icon') || 
            imgSrc.includes('logo') || 
            imgClass.includes('icon') || 
            imgClass.includes('logo') || 
            imgAlt.toLowerCase().includes('icon') || 
            imgAlt.toLowerCase().includes('logo')) {
          continue;
        }
        
        // Look for price patterns or "buy" buttons to confirm it's a product
        const priceText = extractPriceText($container);
        const hasBuyButton = $container.find('a, button').filter((i, el) => {
          const text = $(el).text().toLowerCase();
          return text.includes('buy') || 
                 text.includes('add to cart') || 
                 text.includes('purchase') ||
                 text.includes('shop now');
        }).length > 0;
        
        // Only consider it a product if it has a price or buy button
        if (priceText || hasBuyButton) {
          const product = {
            name: headingText,
            description: extractDescription($container),
            price: priceText,
            images: [$img.attr('src')].filter(Boolean),
            detectionMethod: 'dom-heading-image',
            confidence: hasBuyButton ? 0.8 : 0.6
          };
          
          // Add to products list
          products.push(product);
          break; // Only extract one product per heading
        }
      }
    }
  });
  
  return products;
}

/**
 * Extract product name from element
 */
function extractName($el) {
  // Try common name selectors
  const selectors = [
    'h1', 'h2', 'h3', 'h4', 
    '.title', '.name', '.product-title', '.product-name',
    '[class*="title"]', '[class*="name"]', 'a[class*="product"]'
  ];
  
  for (const selector of selectors) {
    const $name = $el.find(selector).first();
    if ($name.length > 0) {
      const name = $name.text().trim();
      if (name && name.length > 2) {
        return name;
      }
    }
  }
  
  // If no name found through selectors, use text of first link
  const $link = $el.find('a').first();
  if ($link.length > 0) {
    const name = $link.text().trim();
    if (name && name.length > 2 && !name.includes('Read more')) {
      return name;
    }
  }
  
  return '';
}

/**
 * Extract product description from element
 */
function extractDescription($el) {
  // Try common description selectors
  const selectors = [
    'p', '.description', '.desc', '.product-description',
    '.excerpt', '.summary', '[class*="description"]', '[class*="desc"]'
  ];
  
  for (const selector of selectors) {
    const $desc = $el.find(selector).first();
    if ($desc.length > 0) {
      return $desc.text().trim();
    }
  }
  
  // If no specific description element, get text from container except headings and links
  const $clone = $el.clone();
  $clone.find('h1, h2, h3, h4, h5, h6, a, button, .price, script, style').remove();
  const text = $clone.text().trim();
  
  if (text && text.length > 10) {
    return text;
  }
  
  return '';
}

/**
 * Extract price from element
 */
function extractPrice($el) {
  // Try common price selectors
  const selectors = [
    '.price', '.product-price', '[class*="price"]',
    'span:contains("£"), span:contains("$"), span:contains("€")',
    'div:contains("£"), div:contains("$"), div:contains("€")'
  ];
  
  for (const selector of selectors) {
    try {
      const $price = $el.find(selector).first();
      if ($price.length > 0) {
        return $price.text().trim();
      }
    } catch (error) {
      // Skip this selector if there's an error
    }
  }
  
  return extractPriceText($el);
}

/**
 * Extract price by looking for price patterns in text
 */
function extractPriceText($el) {
  const text = $el.text();
  
  // Look for common price patterns
  const patterns = [
    /\$\s*\d+(\.\d{1,2})?/,          // $XX.XX
    /£\s*\d+(\.\d{1,2})?/,           // £XX.XX
    /€\s*\d+(\.\d{1,2})?/,           // €XX.XX
    /\d+(\.\d{1,2})?\s*(USD|EUR|GBP)/, // XX.XX USD/EUR/GBP
    /\w+\s+\d+(\.\d{1,2})?/,         // Price: XX.XX
    /from\s+\$\s*\d+(\.\d{1,2})?/i,  // from $XX.XX
    /from\s+£\s*\d+(\.\d{1,2})?/i,   // from £XX.XX
    /from\s+€\s*\d+(\.\d{1,2})?/i    // from €XX.XX
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return '';
}

/**
 * Extract images from element
 */
function extractImages($el) {
  const images = [];
  
  // Try to find images
  $el.find('img').each((i, img) => {
    const src = $(img).attr('src');
    const dataSrc = $(img).attr('data-src');
    
    if (src && !src.includes('data:image') && !src.includes('blank.gif')) {
      images.push(src);
    } else if (dataSrc) {
      images.push(dataSrc);
    }
  });
  
  // Also look for background images in style attributes
  $el.find('[style*="background"]').each((i, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/background(?:-image)?\s*:\s*url\(['"]?([^'")]+)['"]?\)/i);
    
    if (match && match[1]) {
      images.push(match[1]);
    }
  });
  
  return images;
}

module.exports = {
  detectDomProducts
}; 
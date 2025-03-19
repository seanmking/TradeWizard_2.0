/**
 * TradeWizard DOM-based Product Detector
 * Detects products from HTML content using DOM analysis
 */

const cheerio = require('cheerio');
const logger = require('./logger');

/**
 * Detect products from HTML content using DOM analysis
 * @param {Array} htmlContents - Array of objects with url and html properties
 * @returns {Array} - Detected products
 */
async function detectDomProducts(htmlContents) {
  if (!Array.isArray(htmlContents) || htmlContents.length === 0) {
    logger.warn('No HTML content provided for DOM product detection');
    return [];
  }
  
  try {
    logger.info(`Starting DOM-based product detection for ${htmlContents.length} pages`);
    
    const allProducts = [];
    
    // Process each HTML content
    for (const { url, html } of htmlContents) {
      if (!html) {
        logger.warn(`No HTML content for ${url}, skipping DOM product detection`);
        continue;
      }
      
      // Load HTML into cheerio
      const $ = cheerio.load(html);
      
      // Extract products using DOM patterns
      const productsFromPage = extractProductsFromDOM($, url);
      
      if (productsFromPage.length > 0) {
        logger.info(`Found ${productsFromPage.length} products from ${url} using DOM analysis`);
        allProducts.push(...productsFromPage);
      }
    }
    
    // Process the products to split combined names and normalize
    const processedProducts = splitCombinedProducts(allProducts);
    
    // Remove duplicates
    const uniqueProducts = deduplicateProducts(processedProducts);
    
    logger.info(`DOM-based detection found ${uniqueProducts.length} unique products after processing`);
    return uniqueProducts;
  } catch (error) {
    logger.error(`Error in DOM product detection: ${error.message}`);
    return [];
  }
}

/**
 * Extract products from DOM using common patterns
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {string} url - URL of the page
 * @returns {Array} - Extracted products
 */
function extractProductsFromDOM($, url) {
  const products = [];
  
  // Product pattern 1: Product cards with clear structure
  $('.product, [class*="product"], .item, [class*="item"]').each((i, el) => {
    const $el = $(el);
    
    // Skip if this is part of a navigation or menu
    if ($el.parents('nav, header, footer, [class*="menu"], [class*="navigation"]').length > 0) {
      return;
    }
    
    const name = $el.find('h2, h3, h4, .title, .name, [class*="title"], [class*="name"]').first().text().trim();
    const description = $el.find('p, .description, [class*="description"]').first().text().trim();
    const image = $el.find('img').attr('src') || '';
    const price = $el.find('.price, [class*="price"]').first().text().trim();
    
    if (name && name.length > 2) {
      products.push({
        name,
        description: description || '',
        image: normalizeImageUrl(image, url),
        price: price || '',
        category: detectCategory($, $el),
        confidence: 'medium'
      });
    }
  });
  
  // Product pattern 2: Tables with product listings
  $('table').each((i, table) => {
    const headers = [];
    let nameIndex = -1;
    let descIndex = -1;
    let priceIndex = -1;
    
    // Extract table headers
    $(table).find('th').each((i, th) => {
      const header = $(th).text().trim().toLowerCase();
      headers.push(header);
      
      if (header.includes('product') || header.includes('name') || header.includes('item')) {
        nameIndex = i;
      } else if (header.includes('description') || header.includes('detail')) {
        descIndex = i;
      } else if (header.includes('price') || header.includes('cost')) {
        priceIndex = i;
      }
    });
    
    // Process table rows if we found a name column
    if (nameIndex >= 0) {
      $(table).find('tr').each((i, tr) => {
        // Skip header row
        if (i === 0 && headers.length > 0) return;
        
        const cells = $(tr).find('td');
        
        if (cells.length > nameIndex) {
          const name = $(cells[nameIndex]).text().trim();
          const description = descIndex >= 0 && cells.length > descIndex ? $(cells[descIndex]).text().trim() : '';
          const price = priceIndex >= 0 && cells.length > priceIndex ? $(cells[priceIndex]).text().trim() : '';
          
          if (name && name.length > 2) {
            products.push({
              name,
              description,
              image: '',
              price,
              category: detectCategory($, $(tr)),
              confidence: 'medium'
            });
          }
        }
      });
    }
  });
  
  // Product pattern 3: Lists of products
  $('ul, ol').each((i, list) => {
    const $list = $(list);
    
    // Skip navigation lists
    if ($list.parents('nav, header, footer, [class*="menu"], [class*="navigation"]').length > 0) {
      return;
    }
    
    // Check if this is likely a product list
    const listText = $list.text().toLowerCase();
    const isPotentialProductList = /product|item|offering|service|solution/.test(listText);
    
    if (isPotentialProductList) {
      $list.find('li').each((i, li) => {
        const $li = $(li);
        
        // Get name from strong/bold text or first text node
        let name = $li.find('strong, b').first().text().trim();
        if (!name) {
          name = $li.clone().children().remove().end().text().trim();
        }
        if (!name) {
          name = $li.text().trim();
        }
        
        // Get description from the rest of the content
        let description = '';
        if ($li.find('p').length > 0) {
          description = $li.find('p').first().text().trim();
        } else if (name !== $li.text().trim()) {
          description = $li.text().trim().replace(name, '').trim();
        }
        
        if (name && name.length > 2 && !/^[0-9.]+$/.test(name)) {
          products.push({
            name,
            description,
            image: '',
            price: '',
            category: detectCategory($, $li),
            confidence: 'low' // Lower confidence for list-based detection
          });
        }
      });
    }
  });
  
  // Product pattern 4: Heading followed by description
  $('h2, h3, h4').each((i, heading) => {
    const $heading = $(heading);
    
    // Skip navigation or footer headings
    if ($heading.parents('nav, header, footer, [class*="menu"], [class*="navigation"]').length > 0) {
      return;
    }
    
    const headingText = $heading.text().trim();
    if (!headingText || headingText.length < 3) return;
    
    // Check if this heading is likely a product
    const isPotentialProduct = /product|item|offering|service|solution/i.test(headingText) || 
                              $heading.parents('[class*="product"], [class*="item"]').length > 0;
    
    if (isPotentialProduct) {
      let description = '';
      let $nextEl = $heading.next();
      
      // Get description from next paragraph or div
      if ($nextEl.is('p, div')) {
        description = $nextEl.text().trim();
      }
      
      products.push({
        name: headingText,
        description,
        image: $heading.parent().find('img').first().attr('src') || '',
        price: '',
        category: detectCategory($, $heading),
        confidence: 'low'
      });
    }
  });
  
  return products;
}

/**
 * Split any products with combined names into separate products
 * @param {Array} products - Products that might have combined names
 * @returns {Array} - Array with split products
 */
function splitCombinedProducts(products) {
  const result = [];
  
  for (const product of products) {
    const name = product.name;
    
    // Check for product names that might contain multiple products
    if (name.includes(' and ') || name.includes(' & ') || name.includes(',')) {
      // Split the name
      const parts = name.split(/\s+(?:and|&|,)\s+/i);
      
      // Create separate products for each part
      for (const part of parts) {
        const cleanName = part.trim().replace(/Order\s+Your\s+|Today$|Get\s+|Buy\s+/gi, '');
        
        if (cleanName && cleanName.length > 3) {
          result.push({
            ...product,
            name: cleanName
          });
        }
      }
    } else {
      // Clean up the product name anyway
      const cleanName = name.replace(/Order\s+Your\s+|Today$|Get\s+|Buy\s+/gi, '').trim();
      if (cleanName && cleanName.length > 0) {
        result.push({
          ...product,
          name: cleanName
        });
      } else {
        result.push(product); // Keep original if cleaning creates empty name
      }
    }
  }
  
  return result;
}

/**
 * Remove duplicate products
 * @param {Array} products - Products list that might contain duplicates
 * @returns {Array} - Deduplicated products
 */
function deduplicateProducts(products) {
  const uniqueProducts = new Map();
  
  // Process products to identify duplicates
  for (const product of products) {
    const normalizedName = normalizeProductName(product.name);
    
    if (uniqueProducts.has(normalizedName)) {
      // Merge with existing product
      const existing = uniqueProducts.get(normalizedName);
      
      // Use longer description
      if (product.description && product.description.length > (existing.description?.length || 0)) {
        existing.description = product.description;
      }
      
      // Use image if available
      if (product.image && !existing.image) {
        existing.image = product.image;
      }
      
      // Use price if available
      if (product.price && !existing.price) {
        existing.price = product.price;
      }
      
      // Use category if available
      if (product.category && !existing.category) {
        existing.category = product.category;
      }
    } else {
      // Add new product
      uniqueProducts.set(normalizedName, { ...product });
    }
  }
  
  return Array.from(uniqueProducts.values());
}

/**
 * Normalize product name for comparison
 * @param {string} name - Raw product name
 * @returns {string} - Normalized product name
 */
function normalizeProductName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect product category from context
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {Cheerio} $el - Element to check
 * @returns {string} - Detected category
 */
function detectCategory($, $el) {
  // Check for explicit category
  const $category = $el.closest('[class*="category"], [class*="catalog"], [class*="department"]');
  if ($category.length > 0) {
    const categoryHeader = $category.find('h2, h3, h4, .title').first().text().trim();
    if (categoryHeader) {
      return categoryHeader;
    }
  }
  
  // Check parent elements for category hints
  const parentText = $el.parent().find('h2, h3, h4').first().text().trim();
  if (parentText && parentText !== $el.text().trim()) {
    return parentText;
  }
  
  // Check for breadcrumbs
  const $breadcrumbs = $('.breadcrumbs, .breadcrumb, [class*="breadcrumb"]');
  if ($breadcrumbs.length > 0) {
    const lastCrumb = $breadcrumbs.find('li').last().prev().text().trim();
    if (lastCrumb) {
      return lastCrumb;
    }
  }
  
  return '';
}

/**
 * Normalize image URL to absolute URL
 * @param {string} imageUrl - Image URL
 * @param {string} baseUrl - Base URL for relative paths
 * @returns {string} - Normalized image URL
 */
function normalizeImageUrl(imageUrl, baseUrl) {
  if (!imageUrl) return '';
  
  try {
    // Try to normalize URL
    return new URL(imageUrl, baseUrl).href;
  } catch (error) {
    // Return as is if URL is invalid
    return imageUrl;
  }
}

module.exports = {
  detectDomProducts,
  extractProductsFromDOM,
  splitCombinedProducts,
  deduplicateProducts
}; 
/**
 * DOM-based Product Detector Service
 * 
 * Analyzes website DOM structure to identify and extract product information
 * using pattern recognition and heuristics.
 */

import * as cheerio from 'cheerio';
import { ProductInfo } from '../types';

export interface ProductDetectionResult {
  products: ProductInfo[];
  confidence: number;
  method: string;
  metrics: {
    totalElements: number;
    productElements: number;
    detectionTime: number;
  };
}

export class DomProductDetectorService {
  /**
   * Detect products from HTML content using DOM analysis
   * @param html HTML content to analyze
   * @returns Product detection results with confidence and metrics
   */
  public detectProducts(html: string): ProductDetectionResult {
    const startTime = Date.now();
    const $ = cheerio.load(html);
    
    // Initialize results
    let products: ProductInfo[] = [];
    let confidence = 0;
    let method = 'unknown';
    
    // First try to detect via Schema.org markup (highest confidence)
    const schemaProducts = this.detectProductsViaSchema($);
    if (schemaProducts.length > 0) {
      products = schemaProducts;
      confidence = 0.9; // High confidence for schema-based detection
      method = 'schema';
    } else {
      // Try to detect via common e-commerce patterns
      const ecommerceProducts = this.detectProductsViaEcommercePatterns($);
      if (ecommerceProducts.length > 0) {
        products = ecommerceProducts;
        confidence = 0.7; // Medium confidence for pattern-based detection
        method = 'ecommerce-pattern';
      } else {
        // Try to detect via repeating structures (less reliable)
        const repeatingProducts = this.detectProductsViaRepeatingStructures($);
        if (repeatingProducts.length > 0) {
          products = repeatingProducts;
          confidence = 0.5; // Lower confidence for structure-based detection
          method = 'repeating-structure';
        } else {
          // Last resort: try to find image-text pairs
          const imageTextProducts = this.detectProductsViaImageTextPairs($);
          if (imageTextProducts.length > 0) {
            products = imageTextProducts;
            confidence = 0.3; // Lowest confidence
            method = 'image-text-pair';
          }
        }
      }
    }
    
    // Calculate metrics
    const endTime = Date.now();
    const metrics = {
      totalElements: $('*').length,
      productElements: products.length,
      detectionTime: endTime - startTime
    };
    
    // Apply confidence adjustments based on metrics
    if (products.length > 0) {
      // Adjust confidence based on product count and quality
      const qualityFactor = this.calculateProductQualityFactor(products);
      confidence = Math.min(0.95, confidence * qualityFactor);
    } else {
      confidence = 0;
    }
    
    return {
      products,
      confidence,
      method,
      metrics
    };
  }

  /**
   * Detect products using Schema.org markup (highest reliability)
   * @param $ Cheerio instance
   * @returns Array of products
   */
  private detectProductsViaSchema($: cheerio.CheerioAPI): ProductInfo[] {
    const products: ProductInfo[] = [];
    
    // Find elements with Product schema
    $('[itemtype="http://schema.org/Product"], [itemtype="https://schema.org/Product"]').each((_, element) => {
      const $element = $(element);
      
      // Extract product name
      const name = $element.find('[itemprop="name"]').first().text().trim();
      
      // Extract product price
      let price = '';
      const priceElement = $element.find('[itemprop="price"]').first();
      if (priceElement.length) {
        price = priceElement.text().trim() || priceElement.attr('content') || '';
      }
      
      // Extract product description
      const description = $element.find('[itemprop="description"]').first().text().trim();
      
      // Extract product category
      const category = $element.find('[itemprop="category"]').first().text().trim();
      
      if (name) {
        products.push({
          name,
          price,
          description,
          category
        });
      }
    });
    
    // Also check for JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonText = $(element).html() || '';
        const jsonData = JSON.parse(jsonText);
        
        // Check if this is Product data
        if (
          jsonData && 
          (jsonData['@type'] === 'Product' || 
           (Array.isArray(jsonData['@graph']) && 
            jsonData['@graph'].some((item: any) => item['@type'] === 'Product')))
        ) {
          // Handle direct Product
          if (jsonData['@type'] === 'Product') {
            const product = this.extractProductFromJsonLd(jsonData);
            if (product && product.name) {
              products.push(product);
            }
          } 
          // Handle @graph with multiple items
          else if (Array.isArray(jsonData['@graph'])) {
            for (const item of jsonData['@graph']) {
              if (item['@type'] === 'Product') {
                const product = this.extractProductFromJsonLd(item);
                if (product && product.name) {
                  products.push(product);
                }
              }
            }
          }
        }
      } catch (error) {
        // JSON parsing error, skip this script tag
        console.error('Error parsing JSON-LD:', error);
      }
    });
    
    return products;
  }

  /**
   * Extract product information from JSON-LD structured data
   * @param jsonData JSON-LD data object
   * @returns Product info or null if invalid
   */
  private extractProductFromJsonLd(jsonData: any): ProductInfo | null {
    if (!jsonData || typeof jsonData !== 'object') {
      return null;
    }
    
    // Extract product name
    const name = jsonData.name || '';
    
    // Extract product price
    let price = '';
    if (jsonData.offers) {
      const offers = Array.isArray(jsonData.offers) ? jsonData.offers[0] : jsonData.offers;
      price = offers.price || '';
      if (price && offers.priceCurrency) {
        price = `${offers.priceCurrency} ${price}`;
      }
    }
    
    // Extract product description
    const description = jsonData.description || '';
    
    // Extract product category
    const category = jsonData.category || '';
    
    if (name) {
      return {
        name,
        price,
        description,
        category
      };
    }
    
    return null;
  }

  /**
   * Detect products using common e-commerce HTML patterns
   * @param $ Cheerio instance
   * @returns Array of products
   */
  private detectProductsViaEcommercePatterns($: cheerio.CheerioAPI): ProductInfo[] {
    const products: ProductInfo[] = [];
    
    // Common product selectors used by e-commerce platforms
    const productSelectors = [
      '.product', 
      '.product-item', 
      '.item.product',
      '.product-container',
      '.product-card',
      '.product-box',
      '.product-tile',
      '.product-grid-item',
      '.woocommerce-product',
      '.shopify-product',
      '.products-grid .item',
      '.collection-item'
    ];
    
    // Try each selector and stop when we find products
    for (const selector of productSelectors) {
      $(selector).each((_, element) => {
        const product = this.extractProductFromElement($, element);
        if (product && product.name) {
          products.push(product);
        }
      });
      
      // If we found products with this selector, stop trying others
      if (products.length > 0) {
        break;
      }
    }
    
    return products;
  }

  /**
   * Extract product information from a DOM element
   * @param $ Cheerio instance
   * @param element DOM element potentially containing product info
   * @returns Product info or null if not a valid product
   */
  private extractProductFromElement($: cheerio.CheerioAPI, element: cheerio.Element): ProductInfo | null {
    const $element = $(element);
    
    // Extract product name - try various common selectors
    let name = '';
    const nameSelectors = [
      '.product-name', '.product-title', 
      '.item-title', '.product-item-name',
      'h2.title', 'h3.title', 'h4.title',
      '[itemprop="name"]', 
      'h2 a', 'h3 a', 'h4 a'
    ];
    
    for (const selector of nameSelectors) {
      const nameText = $element.find(selector).first().text().trim();
      if (nameText) {
        name = nameText;
        break;
      }
    }
    
    // If no name found, try the direct heading
    if (!name) {
      name = $element.find('h2, h3, h4, h5').first().text().trim();
    }
    
    // Try to extract price
    let price = '';
    const priceSelectors = [
      '.price', '.product-price', '.item-price',
      '.special-price', '[itemprop="price"]',
      '.current-price', '.sale-price'
    ];
    
    for (const selector of priceSelectors) {
      const priceElement = $element.find(selector).first();
      if (priceElement.length) {
        price = priceElement.text().trim();
        break;
      }
    }
    
    // If no price found through selectors, try to find price patterns in text
    if (!price) {
      const text = $element.text();
      const priceMatch = text.match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
      if (priceMatch) {
        price = priceMatch[0];
      }
    }
    
    // Try to extract description
    let description = '';
    const descSelectors = [
      '.description', '.product-description',
      '.short-description', '[itemprop="description"]',
      '.product-short-description', '.item-description'
    ];
    
    for (const selector of descSelectors) {
      const descText = $element.find(selector).first().text().trim();
      if (descText) {
        description = descText;
        break;
      }
    }
    
    // Try to extract category
    let category = '';
    const categorySelectors = [
      '.category', '[itemprop="category"]',
      '.product-category', '.item-category'
    ];
    
    for (const selector of categorySelectors) {
      const categoryText = $element.find(selector).first().text().trim();
      if (categoryText) {
        category = categoryText;
        break;
      }
    }
    
    // If we have at least a name, return the product
    if (name) {
      return {
        name,
        price,
        description,
        category
      };
    }
    
    return null;
  }

  /**
   * Detect products by analyzing repeating DOM structures
   * @param $ Cheerio instance
   * @returns Array of products
   */
  private detectProductsViaRepeatingStructures($: cheerio.CheerioAPI): ProductInfo[] {
    const products: ProductInfo[] = [];
    
    // Look for containers with multiple children that could be product listings
    const potentialContainers = [
      '.products', '.product-list', '.product-grid',
      '.items', '.item-list', '.collection', 
      '.catalog', '.category-products'
    ];
    
    for (const containerSelector of potentialContainers) {
      const $container = $(containerSelector).first();
      
      // Skip if no container found
      if (!$container.length) continue;
      
      // Get direct children that could be product items
      const $children = $container.children();
      
      // Skip if too few children (not likely to be a product grid)
      if ($children.length < 2) continue;
      
      // Analyze first few children to detect if they might be product items
      let validProductCount = 0;
      
      // Check up to 5 items or all items, whichever is fewer
      const maxCheck = Math.min(5, $children.length);
      
      for (let i = 0; i < maxCheck; i++) {
        const $child = $($children[i]);
        
        // Count elements with image and text elements
        const hasImage = $child.find('img').length > 0;
        const hasHeading = $child.find('h1, h2, h3, h4, h5, h6, strong, b').length > 0;
        const hasPricePattern = !!$child.text().match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
        
        // If has image and either heading or price, count as potential product
        if (hasImage && (hasHeading || hasPricePattern)) {
          validProductCount++;
        }
      }
      
      // If majority of checked items appear to be products, process all children
      if (validProductCount >= Math.ceil(maxCheck * 0.6)) {
        $children.each((_, child) => {
          const product = this.extractProductFromRepeatingElement($, child);
          if (product && product.name) {
            products.push(product);
          }
        });
        
        // If we found products, exit loop
        if (products.length > 0) {
          break;
        }
      }
    }
    
    return products;
  }

  /**
   * Extract product from an element in a repeating structure
   * @param $ Cheerio instance
   * @param element DOM element
   * @returns Product info or null if not a valid product
   */
  private extractProductFromRepeatingElement($: cheerio.CheerioAPI, element: cheerio.Element): ProductInfo | null {
    const $element = $(element);
    
    // Check if this element has the basic structure we expect for a product
    const hasImage = $element.find('img').length > 0;
    
    // Skip if no image (a product listing almost always has an image)
    if (!hasImage) return null;
    
    // Try to find a name (headings, strong elements, etc.)
    let name = '';
    const $headings = $element.find('h1, h2, h3, h4, h5, h6, strong, b');
    
    if ($headings.length > 0) {
      name = $($headings[0]).text().trim();
    } else {
      // No explicit heading, use image alt as fallback
      const $img = $element.find('img').first();
      name = $img.attr('alt') || '';
    }
    
    // Try to find a price (look for price pattern in text)
    const text = $element.text();
    const priceMatch = text.match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
    const price = priceMatch ? priceMatch[0] : '';
    
    // Use text content excluding the name and price as the description
    let description = text
      .replace(name, '')
      .replace(price, '')
      .trim()
      .replace(/\s+/g, ' '); // Normalize whitespace
    
    // Limit description length
    if (description.length > 150) {
      description = description.substring(0, 147) + '...';
    }
    
    // If we have a name, return the product
    if (name) {
      return {
        name,
        price,
        description,
        category: ''
      };
    }
    
    return null;
  }

  /**
   * Detect products by finding image + text pairs
   * @param $ Cheerio instance
   * @returns Array of products
   */
  private detectProductsViaImageTextPairs($: cheerio.CheerioAPI): ProductInfo[] {
    const products: ProductInfo[] = [];
    
    // Look for elements containing both images and text content
    // that could potentially be products
    $('div, li, article, section').each((_, element) => {
      const $element = $(element);
      
      // Skip elements that are too large (likely containers, not product items)
      if ($element.find('*').length > 100) return;
      
      // Check if element contains an image
      const $image = $element.find('img');
      if (!$image.length) return;
      
      // Check if element contains text with potential product name patterns
      const text = $element.text().trim();
      
      // Skip if too short or too long text
      if (text.length < 5 || text.length > 500) return;
      
      // Check for price pattern
      const hasPricePattern = !!text.match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
      
      // Check for common product words or patterns
      const hasProductIndicators = /buy|shop|add.?to.?cart|product|item|price/i.test(text);
      
      // If has price pattern or product indicators, treat as potential product
      if (hasPricePattern || hasProductIndicators) {
        // Extract product information
        let name = '';
        
        // Try to find a heading
        const $heading = $element.find('h1, h2, h3, h4, h5, h6, strong, b');
        if ($heading.length) {
          name = $heading.first().text().trim();
        } else {
          // Use image alt as fallback
          name = $image.attr('alt') || '';
          
          // Or try to extract a potential name using patterns
          if (!name) {
            // Look for capitalized words that could be a title
            const nameMatch = text.match(/([A-Z][a-z]+(\s+[A-Za-z0-9]+){1,5})/);
            if (nameMatch) {
              name = nameMatch[0].trim();
            }
          }
        }
        
        // Extract price
        const priceMatch = text.match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
        const price = priceMatch ? priceMatch[0] : '';
        
        // Construct description from remaining text
        let description = text;
        if (name) description = description.replace(name, '');
        if (price) description = description.replace(price, '');
        description = description.trim().replace(/\s+/g, ' ');
        
        // Limit description length
        if (description.length > 150) {
          description = description.substring(0, 147) + '...';
        }
        
        if (name) {
          products.push({
            name,
            price,
            description,
            category: ''
          });
        }
      }
    });
    
    return products;
  }

  /**
   * Calculate a quality factor based on product information completeness
   * @param products Array of detected products
   * @returns Quality factor (0.0-1.5)
   */
  private calculateProductQualityFactor(products: ProductInfo[]): number {
    if (products.length === 0) return 0;
    
    const totalScore = products.reduce((score, product) => {
      let productScore = 0;
      
      // Score based on field completeness
      if (product.name) productScore += 0.4;
      if (product.price) productScore += 0.3;
      if (product.description) productScore += 0.2;
      if (product.category) productScore += 0.1;
      
      // Bonus for high quality names (not too short, not too long)
      if (product.name && product.name.length > 3 && product.name.length < 100) {
        productScore += 0.1;
      }
      
      // Bonus for price in expected format
      if (product.price && /^(\D?\d+([.,]\d{2})?)$/.test(product.price)) {
        productScore += 0.1;
      }
      
      return score + productScore;
    }, 0);
    
    // Calculate average score and apply scaling
    // More products with good data = higher confidence
    const averageScore = totalScore / products.length;
    
    // Adjust based on number of products found
    // Too few or too many products might indicate issues
    let countFactor = 1.0;
    if (products.length < 3) {
      countFactor = 0.8; // Lower confidence for very few products
    } else if (products.length > 30) {
      countFactor = 0.9; // Slightly lower confidence for too many products
    } else if (products.length >= 5 && products.length <= 20) {
      countFactor = 1.2; // Bonus for ideal range of products
    }
    
    return averageScore * countFactor;
  }
}

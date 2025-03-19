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
        if (price) break;
      }
    }
    
    // If still no price, look for price patterns in the text
    if (!price) {
      const text = $element.text();
      const priceMatch = text.match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
      if (priceMatch) {
        price = priceMatch[0];
      }
    }
    
    // Try to extract description
    let description = '';
    const descriptionSelectors = [
      '.description', '.product-description', 
      '.item-description', '[itemprop="description"]',
      '.short-description', 'p.desc'
    ];
    
    for (const selector of descriptionSelectors) {
      const descText = $element.find(selector).first().text().trim();
      if (descText) {
        description = descText;
        break;
      }
    }
    
    // If no description found, try the first paragraph
    if (!description) {
      description = $element.find('p').first().text().trim();
    }
    
    // Try to extract category
    let category = '';
    const categorySelectors = [
      '.category', '[itemprop="category"]', 
      '.product-category', '.product-type'
    ];
    
    for (const selector of categorySelectors) {
      const catText = $element.find(selector).first().text().trim();
      if (catText) {
        category = catText;
        break;
      }
    }
    
    // If we have a name, consider this a valid product
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
   * Detect products by analyzing repeating structures in the DOM
   * @param $ Cheerio instance
   * @returns Array of products
   */
  private detectProductsViaRepeatingStructures($: cheerio.CheerioAPI): ProductInfo[] {
    const products: ProductInfo[] = [];
    
    // Find potential container elements
    const containerSelectors = [
      '.products', '.items', '.collection', 
      '.grid', '.product-grid', '.product-list',
      'ul.products', 'div.products', '.product-container'
    ];
    
    for (const containerSelector of containerSelectors) {
      const $container = $(containerSelector).first();
      
      if ($container.length) {
        // Find children that might be product items
        const children = $container.children();
        
        // We need at least 2 similar items to consider it a product list
        if (children.length >= 2) {
          // Get the tag name of the first child to check for consistency
          const firstChildTagName = children.first().prop('tagName')?.toLowerCase();
          
          // Count items with the same tag
          let sameTagCount = 0;
          
          children.each((_, child) => {
            const tagName = $(child).prop('tagName')?.toLowerCase();
            if (tagName === firstChildTagName) {
              sameTagCount++;
            }
          });
          
          // If most children have the same tag, consider it a repeating structure
          if (sameTagCount / children.length > 0.7) {
            // Extract product info from each child
            children.each((_, child) => {
              // Check if child has both image and text
              const hasImage = $(child).find('img').length > 0;
              const hasText = $(child).text().trim().length > 10; // Arbitrary threshold
              
              if (hasImage && hasText) {
                const product = this.extractProductFromElement($, child);
                if (product && product.name) {
                  products.push(product);
                }
              }
            });
            
            // If we found products, break out of the containerSelector loop
            if (products.length > 0) {
              break;
            }
          }
        }
      }
    }
    
    return products;
  }

  /**
   * Detect products based on image-text pairs (lowest confidence method)
   * @param $ Cheerio instance
   * @returns Array of products
   */
  private detectProductsViaImageTextPairs($: cheerio.CheerioAPI): ProductInfo[] {
    const products: ProductInfo[] = [];
    
    // Find elements with both images and text that might be products
    $('div, article, section, li').each((_, element) => {
      const $element = $(element);
      
      // Check if this element has an image
      const $img = $element.find('img');
      if ($img.length === 0) return;
      
      // Check if element has enough text to be considered a product
      const text = $element.text().trim();
      if (text.length < 10) return;
      
      // Check for price patterns in the text
      const hasPricePattern = !!text.match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
      
      // Check if the image has an alt text that might be a product name
      const altText = $img.attr('alt')?.trim();
      const imgHasProductName = altText && altText.length > 3;
      
      // Check if there's a heading element
      const hasHeading = $element.find('h1, h2, h3, h4, h5').length > 0;
      
      // Heuristic: element with image + price pattern + heading is likely a product
      if ((hasPricePattern && (hasHeading || imgHasProductName))) {
        // Try to extract product information
        let name = '';
        
        // Try to get name from heading
        if (hasHeading) {
          name = $element.find('h1, h2, h3, h4, h5').first().text().trim();
        } 
        // Fallback to image alt text
        else if (imgHasProductName) {
          name = altText || '';
        }
        
        // Extract price
        let price = '';
        const priceMatch = text.match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
        if (priceMatch) {
          price = priceMatch[0];
        }
        
        // Create a basic description from text
        const description = text
          .replace(name, '')
          .replace(price, '')
          .trim()
          .substring(0, 100); // Limit to first 100 chars
        
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
   * Calculate a quality factor for the detected products
   * @param products Array of detected products
   * @returns Quality factor from 0 to 1.2
   */
  private calculateProductQualityFactor(products: ProductInfo[]): number {
    if (products.length === 0) return 0;
    
    // Count how many products have each field
    let nameCount = 0;
    let priceCount = 0;
    let descriptionCount = 0;
    let categoryCount = 0;
    
    products.forEach(product => {
      if (product.name) nameCount++;
      if (product.price) priceCount++;
      if (product.description) descriptionCount++;
      if (product.category) categoryCount++;
    });
    
    // Calculate completion rates
    const nameCompletionRate = nameCount / products.length;
    const priceCompletionRate = priceCount / products.length;
    const descriptionCompletionRate = descriptionCount / products.length;
    const categoryCompletionRate = categoryCount / products.length;
    
    // Calculate weighted quality factor
    // Name and price are most important, description and category less so
    const qualityFactor = 
      (nameCompletionRate * 0.5) +
      (priceCompletionRate * 0.3) +
      (descriptionCompletionRate * 0.1) +
      (categoryCompletionRate * 0.1);
    
    // Bonus for having many products (more likely to be accurate)
    const productCountBonus = Math.min(0.2, products.length / 20);
    
    return qualityFactor + productCountBonus;
  }

  /**
   * Try to identify HS codes for detected products
   * @param products Array of products to analyze
   * @returns Products with HS codes where possible
   */
  public enrichWithHSCodes(products: ProductInfo[]): ProductInfo[] {
    // This is a placeholder for future integration with HS code lookup
    // In a real implementation, this would use a database or API lookup
    
    // Simple rules-based approach for demo purposes
    const enriched = products.map(product => {
      const productCopy = { ...product };
      
      // Extract keywords from product name and category
      const keywords = [
        ...(product.name?.toLowerCase().split(/\s+/) || []),
        ...(product.category?.toLowerCase().split(/\s+/) || [])
      ];
      
      // Simple keyword mapping to HS codes (extremely simplified)
      if (keywords.some(k => ['coffee', 'tea', 'mate'].includes(k))) {
        productCopy.hsCode = '0901';
      } else if (keywords.some(k => ['fruit', 'vegetable', 'fresh'].includes(k))) {
        productCopy.hsCode = '0701';
      } else if (keywords.some(k => ['clothing', 'apparel', 'wear', 'shirt', 'pants'].includes(k))) {
        productCopy.hsCode = '6101';
      } else if (keywords.some(k => ['furniture', 'chair', 'table', 'bed'].includes(k))) {
        productCopy.hsCode = '9401';
      }
      
      return productCopy;
    });
    
    return enriched;
  }
}

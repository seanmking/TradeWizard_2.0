/**
 * Web Scraper Service
 * 
 * Responsible for fetching and parsing website content to extract relevant data
 * including product information, company details, and metadata.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { WebsiteData, ProductInfo } from '../types';

export class WebScraperService {
  /**
   * Scrapes a website and returns the structured content
   * @param url URL of the website to scrape
   * @returns Structured website data
   */
  public async scrapeWebsite(url: string): Promise<WebsiteData> {
    try {
      // Fetch website content
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'TradeWizard-Bot/1.0 (+https://tradewizard.com/bot)',
          'Accept': 'text/html',
        },
        timeout: 15000, // 15 second timeout
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract basic metadata
      const title = $('title').text().trim();
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';
      
      // Extract all links
      const links: string[] = [];
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          links.push(href);
        }
      });

      // Extract images
      const images = [];
      $('img').each((_, element) => {
        const imgUrl = $(element).attr('src');
        const alt = $(element).attr('alt') || '';
        if (imgUrl && !imgUrl.match(/^data:/)) { // Skip data URLs
          images.push({
            url: imgUrl,
            alt: alt
          });
        }
      });

      // Extract other metadata
      const metadata: Record<string, string> = {};
      $('meta').each((_, element) => {
        const name = $(element).attr('name') || $(element).attr('property');
        const content = $(element).attr('content');
        if (name && content) {
          metadata[name] = content;
        }
      });

      // Extract the page content
      const content = $('body').text().replace(/\\s+/g, ' ').trim();

      // Construct the result
      const result: WebsiteData = {
        url,
        title,
        description,
        content,
        links,
        images,
        metadata
      };

      return result;
    } catch (error: any) {
      console.error(`Error scraping website ${url}:`, error.message);
      throw new Error(`Failed to scrape website: ${error.message}`);
    }
  }

  /**
   * Specialized method for scraping products from a website
   * @param url URL of the website to scrape for products
   * @returns Array of detected products
   */
  public async scrapeProducts(url: string): Promise<ProductInfo[]> {
    try {
      const websiteData = await this.scrapeWebsite(url);
      return this.extractProductsFromWebsiteData(websiteData);
    } catch (error: any) {
      console.error(`Error scraping products from ${url}:`, error.message);
      throw new Error(`Failed to scrape products: ${error.message}`);
    }
  }

  /**
   * Extracts products from website HTML
   * @param html Raw HTML content
   * @returns Array of detected products
   */
  public extractProductsFromHTML(html: string): ProductInfo[] {
    const $ = cheerio.load(html);
    const products: ProductInfo[] = [];

    // Common product container patterns and selectors
    const productSelectors = [
      // Ecommerce platforms and standard patterns
      '.product', 
      '.product-item', 
      '.item.product', 
      '.product-container',
      '[itemtype="http://schema.org/Product"]',
      '.product-card',
      '.product-box',
      '.product-grid-item',
      '.woocommerce-product',
      // Generic patterns
      '[class*="product"]',
      '.item'
    ];

    // Try to find product containers using common selectors
    for (const selector of productSelectors) {
      $(selector).each((_, element) => {
        const product = this.extractProductFromElement($, element);
        if (product && product.name) {
          products.push(product);
        }
      });
      
      // If we've found products with this selector, stop searching
      if (products.length > 0) {
        break;
      }
    }

    // If no products found with common selectors, try to find via product schema
    if (products.length === 0) {
      $('[itemtype*="Product"], [typeof*="Product"]').each((_, element) => {
        const product = this.extractProductFromElement($, element);
        if (product && product.name) {
          products.push(product);
        }
      });
    }

    // If still no products, try to find products using image-text pairs
    if (products.length === 0) {
      const potentialProducts = this.extractProductsFromImageTextPairs($);
      products.push(...potentialProducts);
    }

    return this.removeDuplicateProducts(products);
  }

  /**
   * Extract products from the website data object
   * @param websiteData WebsiteData object
   * @returns Array of detected products
   */
  private extractProductsFromWebsiteData(websiteData: WebsiteData): ProductInfo[] {
    // Simulate HTML content from the fetched data (for demo purposes)
    const $ = cheerio.load(`
      <html>
        <head>
          <title>${websiteData.title}</title>
          <meta name="description" content="${websiteData.description || ''}">
        </head>
        <body>
          ${websiteData.content}
        </body>
      </html>
    `);

    const products: ProductInfo[] = [];

    // Use basic text parsing for product detection
    // This is a fallback approach when HTML structure analysis fails
    const lines = websiteData.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for patterns like product names followed by prices
      const productNameMatch = line.match(/([A-Z][a-z]+(\s+[A-Za-z0-9]+){1,5})/);
      const priceMatch = line.match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
      
      if (productNameMatch && priceMatch) {
        products.push({
          name: productNameMatch[0],
          price: priceMatch[0],
          description: lines[i+1]?.trim() || ''
        });
      }
    }

    // Try to extract products from metadata if available
    if (websiteData.metadata && websiteData.metadata['product:title']) {
      products.push({
        name: websiteData.metadata['product:title'],
        price: websiteData.metadata['product:price:amount'] || '',
        description: websiteData.metadata['product:description'] || ''
      });
    }

    return this.removeDuplicateProducts(products);
  }

  /**
   * Extract a product from a DOM element
   * @param $ Cheerio instance
   * @param element DOM element that potentially contains product info
   * @returns Extracted product or null if not found
   */
  private extractProductFromElement($: cheerio.CheerioAPI, element: cheerio.Element): ProductInfo | null {
    const $element = $(element);
    
    // Try to find product name
    let name = $element.find('.product-name, .product-title, h2, h3, h4').first().text().trim();
    if (!name) {
      name = $element.find('[itemprop="name"]').first().text().trim();
    }
    if (!name) {
      name = $element.find('a').first().text().trim();
    }

    // Try to find product price
    let price = '';
    const priceElement = $element.find('.price, .product-price, [itemprop="price"]').first();
    if (priceElement.length) {
      price = priceElement.text().trim();
    } else {
      // Look for price patterns in text
      const text = $element.text();
      const priceMatch = text.match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
      if (priceMatch) {
        price = priceMatch[0];
      }
    }

    // Try to find product description
    let description = $element.find('.product-description, .description, [itemprop="description"]').first().text().trim();
    if (!description) {
      description = $element.find('p').first().text().trim();
    }

    // Try to find product category
    let category = $element.find('.category, [itemprop="category"]').first().text().trim();
    
    if (name) {
      return { name, price, description, category };
    }
    
    return null;
  }

  /**
   * Extract products by looking for image and text pairs
   * @param $ Cheerio instance
   * @returns Array of potential products
   */
  private extractProductsFromImageTextPairs($: cheerio.CheerioAPI): ProductInfo[] {
    const products: ProductInfo[] = [];
    
    // Look for elements with both image and text (common product pattern)
    $('div, li, article').each((_, element) => {
      const $element = $(element);
      
      // Check if element contains an image
      const hasImage = $element.find('img').length > 0;
      
      // Check if element contains text (name, price patterns)
      const text = $element.text().trim();
      const hasPricePattern = !!text.match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
      const hasNamePattern = !!text.match(/([A-Z][a-z]+(\s+[A-Za-z0-9]+){1,5})/);
      
      if (hasImage && (hasPricePattern || hasNamePattern)) {
        const imgElement = $element.find('img').first();
        const imgAlt = imgElement.attr('alt') || '';
        const imgSrc = imgElement.attr('src') || '';
        
        let name = '';
        // Try to extract name from headings or strong text
        const headingText = $element.find('h1, h2, h3, h4, h5, h6, strong').first().text().trim();
        if (headingText) {
          name = headingText;
        } else if (imgAlt) {
          // Use image alt text as fallback for name
          name = imgAlt;
        } else {
          // Extract potential name using regex
          const nameMatch = text.match(/([A-Z][a-z]+(\s+[A-Za-z0-9]+){1,5})/);
          if (nameMatch) {
            name = nameMatch[0];
          }
        }
        
        // Extract price using regex
        const priceMatch = text.match(/(\$|R|€|£)?(\d+([.,]\d{2})?)/);
        const price = priceMatch ? priceMatch[0] : '';
        
        if (name) {
          products.push({
            name,
            price,
            description: text.replace(name, '').replace(price, '').trim()
          });
        }
      }
    });
    
    return products;
  }

  /**
   * Remove duplicate products from the array
   * @param products Array of products that may contain duplicates
   * @returns Array with duplicates removed
   */
  private removeDuplicateProducts(products: ProductInfo[]): ProductInfo[] {
    const uniqueProducts: ProductInfo[] = [];
    const seenNames = new Set<string>();
    
    for (const product of products) {
      if (product.name && !seenNames.has(product.name.toLowerCase())) {
        seenNames.add(product.name.toLowerCase());
        uniqueProducts.push(product);
      }
    }
    
    return uniqueProducts;
  }

  /**
   * Extract metadata from a website
   * @param html Website HTML content
   * @returns Record of metadata key-value pairs
   */
  public extractMetadata(html: string): Record<string, string> {
    const $ = cheerio.load(html);
    const metadata: Record<string, string> = {};
    
    // Extract meta tags
    $('meta').each((_, element) => {
      const name = $(element).attr('name') || $(element).attr('property');
      const content = $(element).attr('content');
      if (name && content) {
        metadata[name] = content;
      }
    });
    
    return metadata;
  }

  /**
   * Analyze the complexity of a website structure
   * @param html Website HTML content
   * @returns Object with complexity metrics
   */
  public analyzeStructure(html: string): { complexity: 'simple' | 'moderate' | 'complex', metrics: Record<string, number> } {
    const $ = cheerio.load(html);
    
    // Count various elements to determine complexity
    const metrics = {
      elementCount: $('*').length,
      nestingDepth: this.calculateMaxNestingDepth($),
      scriptCount: $('script').length,
      styleCount: $('style, link[rel="stylesheet"]').length,
      iframeCount: $('iframe').length,
      tableCount: $('table').length
    };
    
    // Determine overall complexity
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    
    if (metrics.elementCount > 1000 || metrics.nestingDepth > 10 || metrics.scriptCount > 10) {
      complexity = 'complex';
    } else if (metrics.elementCount > 500 || metrics.nestingDepth > 7 || metrics.scriptCount > 5) {
      complexity = 'moderate';
    }
    
    return { complexity, metrics };
  }

  /**
   * Calculate the maximum nesting depth of HTML elements
   * @param $ Cheerio instance
   * @returns Maximum nesting depth
   */
  private calculateMaxNestingDepth($: cheerio.CheerioAPI): number {
    let maxDepth = 0;
    
    function calculateDepth(element: cheerio.Element, currentDepth: number): void {
      maxDepth = Math.max(maxDepth, currentDepth);
      
      // Recursively process child elements
      $(element).children().each((_, child) => {
        calculateDepth(child, currentDepth + 1);
      });
    }
    
    // Start from body with depth 0
    calculateDepth($('body')[0], 0);
    
    return maxDepth;
  }

  /**
   * Detect contact information from website content
   * @param html Website HTML content
   * @returns Object with contact details
   */
  public detectContactInfo(html: string): { emails: string[], phones: string[], addresses: string[] } {
    const $ = cheerio.load(html);
    const text = $('body').text();
    
    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex) || [];
    
    // Extract phone numbers
    const phoneRegex = /(\+\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/g;
    const phones = text.match(phoneRegex) || [];
    
    // Extract addresses (basic pattern)
    const addressRegex = /\d+\s+[A-Za-z\s,]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)\b/g;
    const addresses = text.match(addressRegex) || [];
    
    return { emails, phones, addresses };
  }
}

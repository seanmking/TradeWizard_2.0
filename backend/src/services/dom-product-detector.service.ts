import { JSDOM } from 'jsdom';
import logger from '../utils/logger';

/**
 * Product information structure with confidence scores
 */
export interface DetectedProduct {
  name: string;
  description?: string;
  price?: string;
  currency?: string;
  imageUrl?: string;
  specifications?: Record<string, string>;
  category?: string;
  attributes?: Record<string, string>;
  url?: string;
  confidence: number;
}

/**
 * Service for extracting product information from HTML using DOM-based methods
 */
export class DomProductDetector {
  /**
   * Analyze HTML to detect products
   */
  public detectProducts(html: string, baseUrl: string): DetectedProduct[] {
    try {
      logger.info('Detecting products from DOM');
      
      const dom = new JSDOM(html, { url: baseUrl });
      const document = dom.window.document;
      
      // Try different detection strategies
      let products: DetectedProduct[] = [];
      
      // Strategy 1: Structured product markup (Schema.org)
      products = this.detectSchemaOrgProducts(document, baseUrl);
      
      // If no products found with Schema.org, try common product patterns
      if (products.length === 0) {
        products = this.detectCommonProductPatterns(document, baseUrl);
      }
      
      // If still no products, try OpenGraph patterns which might indicate product pages
      if (products.length === 0) {
        products = this.detectOpenGraphProducts(document, baseUrl);
      }
      
      // Resolve relative URLs and clean up data
      return this.normalizeProducts(products, baseUrl);
    } catch (error) {
      logger.error('Error in DOM product detection:', error);
      return [];
    }
  }

  /**
   * Detect products using Schema.org markup
   */
  private detectSchemaOrgProducts(document: Document, baseUrl: string): DetectedProduct[] {
    const products: DetectedProduct[] = [];
    
    try {
      // Look for JSON-LD schema
      const jsonldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      
      jsonldScripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent || '{}');
          
          // Check if it's a product or has products
          if (
            data['@type'] === 'Product' || 
            (Array.isArray(data['@graph']) && data['@graph'].some(item => item['@type'] === 'Product'))
          ) {
            const productData = data['@type'] === 'Product' 
              ? data 
              : data['@graph'].find(item => item['@type'] === 'Product');
            
            if (productData) {
              // Extract offer information
              let price = '';
              let currency = '';
              
              if (productData.offers) {
                const offer = Array.isArray(productData.offers) 
                  ? productData.offers[0] 
                  : productData.offers;
                
                price = offer.price || '';
                currency = offer.priceCurrency || '';
              }
              
              products.push({
                name: productData.name || '',
                description: productData.description || '',
                price,
                currency,
                imageUrl: Array.isArray(productData.image) 
                  ? productData.image[0] 
                  : productData.image || '',
                category: productData.category || '',
                url: productData.url || baseUrl,
                confidence: 0.9 // High confidence for structured data
              });
            }
          }
        } catch (e) {
          logger.warn('Error parsing JSON-LD:', e);
        }
      });
      
      // Look for microdata
      const productElements = document.querySelectorAll('[itemtype="http://schema.org/Product"]');
      
      productElements.forEach(element => {
        const name = this.getItemProp(element, 'name');
        const description = this.getItemProp(element, 'description');
        const imageUrl = this.getItemProp(element, 'image');
        const url = this.getItemProp(element, 'url');
        
        // Get price from nested offer
        const offerElement = element.querySelector('[itemtype="http://schema.org/Offer"]');
        let price = '';
        let currency = '';
        
        if (offerElement) {
          price = this.getItemProp(offerElement, 'price');
          currency = this.getItemProp(offerElement, 'priceCurrency');
        }
        
        if (name) {
          products.push({
            name,
            description,
            price,
            currency,
            imageUrl,
            url: url || baseUrl,
            confidence: 0.85 // High confidence for microdata
          });
        }
      });
    } catch (error) {
      logger.error('Error detecting Schema.org products:', error);
    }
    
    return products;
  }

  /**
   * Helper method to get itemprop values from microdata
   */
  private getItemProp(element: Element, propName: string): string {
    const propElement = element.querySelector(`[itemprop="${propName}"]`);
    
    if (!propElement) return '';
    
    // Check for content attribute first (meta tags use this)
    const contentAttr = propElement.getAttribute('content');
    if (contentAttr) return contentAttr;
    
    // For images, check src
    if (propElement.tagName === 'IMG') {
      return propElement.getAttribute('src') || '';
    }
    
    // For links, check href
    if (propElement.tagName === 'A') {
      return propElement.getAttribute('href') || '';
    }
    
    // Default to text content
    return propElement.textContent?.trim() || '';
  }

  /**
   * Detect products using common HTML patterns
   */
  private detectCommonProductPatterns(document: Document, baseUrl: string): DetectedProduct[] {
    const products: DetectedProduct[] = [];
    
    try {
      // Common product container class names
      const productSelectors = [
        '.member', // Added for Browns Foods structure
        '.product', 
        '.product-item', 
        '.product-card', 
        '.item-product',
        '[data-product-id]', 
        '.woocommerce-product-gallery',
        '.productContainer'
      ];
      
      // Try selectors one by one
      for (const selector of productSelectors) {
        const elements = document.querySelectorAll(selector);
        
        if (elements.length > 0) {
          elements.forEach(element => {
            // Common selectors for product details
            const name = this.getTextFromSelector(element, [
              'h4', // Added for Browns Foods structure
              '.product-title', 
              '.product-name', 
              'h1.name', 
              'h1.title'
            ]);
            
            const description = this.getTextFromSelector(element, [
              'span', // Added for Browns Foods structure
              '.product-description', 
              '.description',
              '.product-short-description',
              '#product-description'
            ]);
            
            const price = this.getTextFromSelector(element, [
              '.price', 
              '.product-price', 
              '.amount',
              '.current-price'
            ]);
            
            const imageUrl = this.getAttributeFromSelector(element, 'src', [
              'img.img-fluid', // Added for Browns Foods structure
              '.product-image img', 
              '.product-img img',
              '.woocommerce-product-gallery__image img'
            ]);
            
            // Only add if we have a valid product name and it's not a navigation item
            if (name && !this.isNavigationItem(name, description)) {
              products.push({
                name,
                description,
                imageUrl,
                url: baseUrl,
                confidence: 0.8 // Increased confidence for pattern matching
              });
            }
          });
          
          // If we found products, break out of the loop
          if (products.length > 0) {
            break;
          }
        }
      }
      
      // If no product containers found, check if the page itself is a product
      if (products.length === 0) {
        // Product page patterns
        const productPageSelectors = [
          '#product-page', 
          '.product-page', 
          '.product-details',
          '.product-info'
        ];
        
        for (const selector of productPageSelectors) {
          const element = document.querySelector(selector);
          
          if (element) {
            const name = this.getTextFromSelector(document, [
              'h1.product-title', 
              'h1.product-name', 
              '.product-title',
              'h1:first-of-type'
            ]);
            
            const description = this.getTextFromSelector(document, [
              '.product-description', 
              '#product-description',
              '.description'
            ]);
            
            const price = this.getTextFromSelector(document, [
              '.product-price', 
              '.price',
              '.amount',
              '.current-price'
            ]);
            
            const imageUrl = this.getAttributeFromSelector(document, 'src', [
              '.product-image img', 
              '.product-img img',
              '.woocommerce-product-gallery__image img',
              '.main-product-image img'
            ]);
            
            if (name) {
              products.push({
                name,
                description,
                price,
                imageUrl,
                url: baseUrl,
                confidence: 0.65 // Medium confidence for product page
              });
            }
            
            break;
          }
        }
      }
    } catch (error) {
      logger.error('Error detecting products from common patterns:', error);
    }
    
    return products;
  }

  /**
   * Helper method to determine if an item is a navigation element rather than a product
   */
  private isNavigationItem(name: string, description: string): boolean {
    const navigationKeywords = [
      'home', 'about', 'contact', 'menu', 'navigation', 'partners', 'news',
      'gallery', 'articles', 'story', 'video', 'preparations'
    ];
    
    const lowerName = name.toLowerCase();
    const lowerDesc = description?.toLowerCase() || '';
    
    return navigationKeywords.some(keyword => 
      lowerName.includes(keyword) || lowerDesc.includes(keyword)
    );
  }

  /**
   * Helper to get text content from multiple possible selectors
   */
  private getTextFromSelector(parent: Element | Document, selectors: string[]): string {
    for (const selector of selectors) {
      try {
        const element = parent.querySelector(selector);
        if (element && element.textContent) {
          return element.textContent.trim();
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    return '';
  }

  /**
   * Helper to get attribute from multiple possible selectors
   */
  private getAttributeFromSelector(parent: Element | Document, attr: string, selectors: string[]): string {
    for (const selector of selectors) {
      try {
        const element = parent.querySelector(selector);
        if (element) {
          return element.getAttribute(attr) || '';
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    return '';
  }

  /**
   * Detect products using OpenGraph meta tags
   */
  private detectOpenGraphProducts(document: Document, baseUrl: string): DetectedProduct[] {
    try {
      // Check if OpenGraph indicates this is a product
      const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute('content');
      
      // If explicitly a product or other indicators
      if (ogType === 'product' || ogType === 'og:product') {
        const name = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
        const description = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
        const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
        const url = document.querySelector('meta[property="og:url"]')?.getAttribute('content') || baseUrl;
        
        // Look for price in meta tags (non-standard but common)
        const price = document.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"]')?.getAttribute('content') || '';
        const currency = document.querySelector('meta[property="product:price:currency"], meta[property="og:price:currency"]')?.getAttribute('content') || '';
        
        if (name) {
          return [{
            name,
            description,
            price,
            currency,
            imageUrl,
            url,
            confidence: 0.6 // Medium-low confidence for OpenGraph
          }];
        }
      }
    } catch (error) {
      logger.error('Error detecting OpenGraph products:', error);
    }
    
    return [];
  }

  /**
   * Clean and normalize product data
   */
  private normalizeProducts(products: DetectedProduct[], baseUrl: string): DetectedProduct[] {
    return products.map(product => {
      // Resolve relative URLs
      if (product.imageUrl && !product.imageUrl.startsWith('http')) {
        product.imageUrl = new URL(product.imageUrl, baseUrl).toString();
      }
      
      if (product.url && !product.url.startsWith('http')) {
        product.url = new URL(product.url, baseUrl).toString();
      }
      
      // Clean up price format
      if (product.price) {
        // Remove currency symbols and extra spaces
        product.price = product.price.replace(/[^\d.,]/g, '').trim();
      }
      
      return product;
    });
  }
}

export default new DomProductDetector();

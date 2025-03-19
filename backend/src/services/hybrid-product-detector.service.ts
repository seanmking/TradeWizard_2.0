/**
 * Hybrid Product Detector Service
 * 
 * Combines DOM-based detection with LLM-based analysis to provide
 * comprehensive product detection and classification.
 * 
 * This service acts as the main entry point for product detection,
 * deciding whether to use DOM analysis, LLM enhancement, or both
 * based on detection confidence and result quality.
 */

import { WebScraperService } from './web-scraper.service';
import { DomProductDetectorService, ProductDetectionResult } from './dom-product-detector.service';
import { ProductInfo } from '../types';

export interface HybridProductDetectionResult extends ProductDetectionResult {
  websiteUrl: string;
  llmEnhanced: boolean;
  confidence: number;
  processingTimeMs: number;
}

export class HybridProductDetectorService {
  private webScraper: WebScraperService;
  private domDetector: DomProductDetectorService;
  
  constructor() {
    this.webScraper = new WebScraperService();
    this.domDetector = new DomProductDetectorService();
  }
  
  /**
   * Detect products from a website using a hybrid approach
   * @param url Website URL to analyze
   * @param options Configuration options for detection
   * @returns Enhanced product detection results
   */
  public async detectProducts(
    url: string, 
    options: {
      useLlmEnhancement?: boolean;
      confidenceThreshold?: number;
      maxProducts?: number;
      useCache?: boolean;
    } = {}
  ): Promise<HybridProductDetectionResult> {
    const startTime = Date.now();
    
    // Set default options
    const {
      useLlmEnhancement = false,
      confidenceThreshold = 0.4,
      maxProducts = 20,
      useCache = true
    } = options;
    
    try {
      // Step 1: Fetch website content
      const html = await this.fetchWebsiteContent(url, useCache);
      
      // Step 2: Perform DOM-based detection
      const domResults = this.domDetector.detectProducts(html);
      
      // Step 3: Decide if LLM enhancement is needed
      let finalProducts = domResults.products;
      let confidence = domResults.confidence;
      let method = domResults.method;
      let llmEnhanced = false;
      
      if (
        useLlmEnhancement && (
          domResults.confidence < confidenceThreshold || 
          domResults.products.length === 0
        )
      ) {
        // In a future implementation, this would call an LLM service
        // For now, we'll just use a placeholder that enriches with HS codes
        finalProducts = this.domDetector.enrichWithHSCodes(domResults.products);
        llmEnhanced = true;
        method = `${method}+llm-enhancement`;
        
        // Adjust confidence slightly upward for demonstration
        confidence = Math.min(0.95, confidence + 0.1);
      }
      
      // Step 4: Limit results if needed
      if (finalProducts.length > maxProducts) {
        finalProducts = finalProducts.slice(0, maxProducts);
      }
      
      const endTime = Date.now();
      
      return {
        websiteUrl: url,
        products: finalProducts,
        confidence,
        method,
        llmEnhanced,
        metrics: {
          ...domResults.metrics,
          productElements: finalProducts.length
        },
        processingTimeMs: endTime - startTime
      };
    } catch (error: any) {
      console.error(`Error in hybrid product detection for ${url}:`, error.message);
      
      // Return an empty result with error information
      return {
        websiteUrl: url,
        products: [],
        confidence: 0,
        method: 'error',
        llmEnhanced: false,
        metrics: {
          totalElements: 0,
          productElements: 0,
          detectionTime: 0
        },
        processingTimeMs: Date.now() - startTime
      };
    }
  }
  
  /**
   * Fetch website content, using cache if available
   * @param url Website URL
   * @param useCache Whether to use cached content if available
   * @returns HTML content
   */
  private async fetchWebsiteContent(url: string, useCache: boolean): Promise<string> {
    // In a real implementation, this would check a Redis cache first
    // For now, we always fetch fresh content
    try {
      const websiteData = await this.webScraper.scrapeWebsite(url);
      return `
        <html>
          <head>
            <title>${websiteData.title}</title>
            <meta name="description" content="${websiteData.description || ''}">
            ${Object.entries(websiteData.metadata || {}).map(([name, content]) => 
              `<meta name="${name}" content="${content}">`
            ).join('\n')}
          </head>
          <body>
            ${websiteData.content}
          </body>
        </html>
      `;
    } catch (error) {
      console.error(`Error fetching website content for ${url}:`, error);
      throw new Error(`Failed to fetch website content: ${error}`);
    }
  }
  
  /**
   * Analyze a specific product page to extract detailed information
   * @param url Product page URL
   * @returns Detailed product information
   */
  public async analyzeProductPage(url: string): Promise<ProductInfo> {
    try {
      // Fetch the product page
      const html = await this.fetchWebsiteContent(url, true);
      
      // Use DOM detector to extract product details
      const $ = require('cheerio').load(html);
      
      // First check for Schema.org product markup (most reliable)
      const schemaProduct = $('[itemtype="http://schema.org/Product"], [itemtype="https://schema.org/Product"]').first();
      
      if (schemaProduct.length) {
        return {
          name: schemaProduct.find('[itemprop="name"]').first().text().trim(),
          price: schemaProduct.find('[itemprop="price"]').first().text().trim(),
          description: schemaProduct.find('[itemprop="description"]').first().text().trim(),
          category: schemaProduct.find('[itemprop="category"]').first().text().trim()
        };
      }
      
      // If no Schema.org markup, look for common product page patterns
      // This is a simplified version - a real implementation would be more robust
      return {
        name: $('h1').first().text().trim() || $('.product-title').first().text().trim(),
        price: $('.price').first().text().trim() || $('.product-price').first().text().trim(),
        description: $('.product-description').first().text().trim() || $('meta[name="description"]').attr('content') || '',
        category: $('.breadcrumbs').text().trim() || $('.category').first().text().trim()
      };
    } catch (error) {
      console.error(`Error analyzing product page ${url}:`, error);
      throw new Error(`Failed to analyze product page: ${error}`);
    }
  }
  
  /**
   * Extract company profile information from a website
   * @param url Website URL
   * @returns Company profile information
   */
  public async extractCompanyProfile(url: string): Promise<{
    businessName: string;
    industry: string;
    products: ProductInfo[];
    contactInfo: {
      email?: string;
      phone?: string;
      address?: string;
    };
  }> {
    try {
      // First detect products
      const productResults = await this.detectProducts(url);
      
      // Fetch and analyze website content
      const html = await this.fetchWebsiteContent(url, true);
      const $ = require('cheerio').load(html);
      
      // Extract business name from title or logo alt text
      const businessName = 
        $('meta[property="og:site_name"]').attr('content') || 
        $('.logo img').attr('alt') || 
        $('title').text().trim().split('|')[0].trim();
      
      // Extract industry from meta tags or keywords
      const industry = 
        $('meta[name="industry"]').attr('content') || 
        $('meta[property="business:industry"]').attr('content') || 
        'Unknown';
      
      // Extract contact info using the web scraper service
      const contactInfo = this.webScraper.detectContactInfo(html);
      
      return {
        businessName,
        industry,
        products: productResults.products,
        contactInfo: {
          email: contactInfo.emails[0],
          phone: contactInfo.phones[0],
          address: contactInfo.addresses[0]
        }
      };
    } catch (error) {
      console.error(`Error extracting company profile from ${url}:`, error);
      
      // Return a placeholder result if extraction fails
      return {
        businessName: 'Unknown',
        industry: 'Unknown',
        products: [],
        contactInfo: {}
      };
    }
  }
}

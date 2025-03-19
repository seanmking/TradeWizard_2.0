/**
 * Web Scraper Service
 * 
 * Service for fetching and analyzing website content, with a focus on
 * detecting products from SME websites using a hybrid approach (DOM + LLM).
 */

import * as cheerio from 'cheerio';
import axios from 'axios';
import { ProductDetectionResult } from '../types/product-detection.types';
import { HybridProductDetector } from './hybrid-product-detector.service';

/**
 * Configuration options for the web scraper
 */
export interface WebScraperConfig {
  // User agent to use for HTTP requests
  userAgent: string;
  
  // Timeout in milliseconds
  timeout: number;
  
  // Whether to follow redirects
  followRedirects: boolean;
  
  // Maximum depth for handling redirects
  maxRedirects: number;
  
  // Whether to use a proxy
  useProxy: boolean;
  
  // Proxy configuration (if useProxy is true)
  proxyConfig?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

/**
 * Default scraper configuration
 */
const DEFAULT_CONFIG: WebScraperConfig = {
  userAgent: 'TradeWizard/1.0 (+https://tradewizard.co.za)',
  timeout: 15000, // 15 seconds
  followRedirects: true,
  maxRedirects: 5,
  useProxy: false
};

/**
 * Web Scraper Service
 * 
 * Service for fetching and analyzing website content, particularly for
 * detecting products and extracting structured information from SME websites.
 */
export class WebScraperService {
  private config: WebScraperConfig;
  private productDetector: HybridProductDetector;
  
  constructor(config: Partial<WebScraperConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.productDetector = new HybridProductDetector();
  }
  
  /**
   * Scrape a website and detect products
   */
  public async scrapeProducts(url: string): Promise<ProductDetectionResult> {
    try {
      // Fetch the HTML content
      const html = await this.fetchHtml(url);
      
      // Use the hybrid detector to identify products
      return await this.productDetector.detectProducts(url, html);
    } catch (error) {
      console.error(`Error scraping products from ${url}:`, error);
      return {
        products: [],
        categories: [],
        metrics: {
          productCount: 0,
          tokensUsed: 0,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
  
  /**
   * Fetch HTML content from a URL
   */
  private async fetchHtml(url: string): Promise<string> {
    try {
      // Configure request options
      const options = {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: this.config.timeout,
        maxRedirects: this.config.maxRedirects,
        validateStatus: (status: number) => status >= 200 && status < 300,
        proxy: this.config.useProxy && this.config.proxyConfig ? {
          host: this.config.proxyConfig.host,
          port: this.config.proxyConfig.port,
          auth: this.config.proxyConfig.auth
        } : undefined
      };
      
      // Make the request
      const response = await axios.get(url, options);
      
      // Return the HTML content
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`HTTP error ${error.response.status}: ${error.response.statusText}`);
        } else if (error.request) {
          throw new Error(`Network error: No response received - ${error.message}`);
        }
      }
      
      throw error; // Re-throw other errors
    }
  }
  
  /**
   * Extract basic metadata from HTML content
   */
  public extractMetadata(html: string): {
    title: string;
    description: string;
    keywords: string[];
    ogTags: Record<string, string>;
  } {
    const $ = cheerio.load(html);
    
    // Extract basic metadata
    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    
    // Extract keywords
    const keywordsStr = $('meta[name="keywords"]').attr('content') || '';
    const keywords = keywordsStr
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);
    
    // Extract Open Graph tags
    const ogTags: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property');
      const content = $(el).attr('content');
      
      if (property && content) {
        ogTags[property.replace('og:', '')] = content;
      }
    });
    
    return {
      title,
      description,
      keywords,
      ogTags
    };
  }
  
  /**
   * Extract content structure to help determine website complexity
   */
  public analyzeStructure(html: string): {
    complexity: number;
    elementCount: number;
    headingCount: number;
    imageCount: number;
    listCount: number;
    tableCount: number;
    formCount: number;
    scriptCount: number;
    styleCount: number;
    maxNestingDepth: number;
  } {
    const $ = cheerio.load(html);
    
    // Element counts
    const elementCount = $('*').length;
    const headingCount = $('h1, h2, h3, h4, h5, h6').length;
    const imageCount = $('img').length;
    const listCount = $('ul, ol').length;
    const tableCount = $('table').length;
    const formCount = $('form').length;
    const scriptCount = $('script').length;
    const styleCount = $('style').length + $('link[rel="stylesheet"]').length;
    
    // Calculate maximum nesting depth
    let maxNestingDepth = 0;
    
    // Sample elements to estimate depth
    $('body *').each((_, element) => {
      let depth = 0;
      let current = element;
      
      while (current.parent) {
        depth++;
        current = current.parent;
        
        // Break early for very deep trees
        if (depth > 50) break;
      }
      
      maxNestingDepth = Math.max(maxNestingDepth, depth);
    });
    
    // Estimate complexity (normalized to 0-1 scale)
    const complexity = this.calculateComplexity(
      elementCount,
      headingCount,
      imageCount,
      listCount,
      tableCount,
      formCount,
      scriptCount,
      styleCount,
      maxNestingDepth
    );
    
    return {
      complexity,
      elementCount,
      headingCount,
      imageCount,
      listCount,
      tableCount,
      formCount,
      scriptCount,
      styleCount,
      maxNestingDepth
    };
  }
  
  /**
   * Calculate website complexity score
   */
  private calculateComplexity(
    elementCount: number,
    headingCount: number,
    imageCount: number,
    listCount: number,
    tableCount: number,
    formCount: number,
    scriptCount: number,
    styleCount: number,
    maxNestingDepth: number
  ): number {
    // Normalize component factors (0-1 scale)
    const normalizedElementCount = Math.min(1.0, elementCount / 5000);
    const normalizedHeadingCount = Math.min(1.0, headingCount / 50);
    const normalizedImageCount = Math.min(1.0, imageCount / 100);
    const normalizedListCount = Math.min(1.0, listCount / 30);
    const normalizedTableCount = Math.min(1.0, tableCount / 20);
    const normalizedFormCount = Math.min(1.0, formCount / 10);
    const normalizedScriptCount = Math.min(1.0, scriptCount / 30);
    const normalizedStyleCount = Math.min(1.0, styleCount / 20);
    const normalizedDepth = Math.min(1.0, maxNestingDepth / 30);
    
    // Calculate weighted complexity score
    const complexity = (
      normalizedElementCount * 0.25 +
      normalizedHeadingCount * 0.05 +
      normalizedImageCount * 0.1 +
      normalizedListCount * 0.05 +
      normalizedTableCount * 0.1 +
      normalizedFormCount * 0.05 +
      normalizedScriptCount * 0.15 +
      normalizedStyleCount * 0.1 +
      normalizedDepth * 0.15
    );
    
    return Math.min(1.0, complexity);
  }
  
  /**
   * Detect contact information on a website
   */
  public detectContactInfo(html: string): {
    emails: string[];
    phones: string[];
    addresses: string[];
    socialLinks: Record<string, string>;
  } {
    const $ = cheerio.load(html);
    
    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const htmlText = $('body').text();
    const emails = (htmlText.match(emailRegex) || [])
      .filter((email, index, self) => self.indexOf(email) === index); // Deduplicate
    
    // Extract phone numbers (simple pattern)
    const phoneRegex = /(?:\+\d{1,3}[- ]?)?\(?(?:\d{2,3})\)?[- ]?\d{3,4}[- ]?\d{3,4}/g;
    const phones = (htmlText.match(phoneRegex) || [])
      .filter((phone, index, self) => self.indexOf(phone) === index); // Deduplicate
    
    // Extract addresses (simplified approach)
    const addresses: string[] = [];
    $('address').each((_, el) => {
      const address = $(el).text().trim();
      if (address) {
        addresses.push(address);
      }
    });
    
    // Look for common address patterns in other elements
    $('p, div').each((_, el) => {
      const text = $(el).text().trim();
      // Simple heuristic: contains postal code pattern and some location indicators
      if ((text.match(/\b\d{4,5}\b/) || text.match(/\b[A-Z]{2}\s\d{5}\b/)) &&
          (text.includes('Street') || text.includes('Avenue') || text.includes('Road') || 
           text.includes('Lane') || text.includes('Drive') || text.includes('Boulevard'))) {
        addresses.push(text);
      }
    });
    
    // Extract social media links
    const socialLinks: Record<string, string> = {};
    
    // Common social media domains
    const socialDomains = [
      { name: 'facebook', pattern: /facebook\.com/ },
      { name: 'twitter', pattern: /twitter\.com|x\.com/ },
      { name: 'instagram', pattern: /instagram\.com/ },
      { name: 'linkedin', pattern: /linkedin\.com/ },
      { name: 'youtube', pattern: /youtube\.com|youtu\.be/ },
      { name: 'pinterest', pattern: /pinterest\.com/ },
      { name: 'tiktok', pattern: /tiktok\.com/ }
    ];
    
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      
      if (href) {
        for (const domain of socialDomains) {
          if (domain.pattern.test(href) && !socialLinks[domain.name]) {
            socialLinks[domain.name] = href;
            break;
          }
        }
      }
    });
    
    return {
      emails,
      phones,
      addresses,
      socialLinks
    };
  }
}

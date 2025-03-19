/**
 * Hybrid Product Detector Service
 * 
 * Combines DOM-based product detection with fallback to LLM-based analysis
 * when DOM methods have low confidence or detect few products.
 */

import { WebScraperService } from './web-scraper.service';
import { DomProductDetectorService, ProductDetectionResult } from './dom-product-detector.service';
import { ProductInfo } from '../types';

export interface HybridProductDetectionResult {
  products: ProductInfo[];
  confidence: number;
  method: string;
  metrics: {
    detectionTime: number;
    domConfidence?: number;
    llmConfidence?: number;
    usedLlm: boolean;
    productCount: number;
  };
  url: string;
}

export class HybridProductDetectorService {
  private webScraper: WebScraperService;
  private domDetector: DomProductDetectorService;
  
  // Cache to store detection results by URL and avoid redundant processing
  private cache: Map<string, { result: HybridProductDetectionResult, timestamp: number }> = new Map();
  // Cache expiration time (24 hours)
  private cacheExpirationMs = 24 * 60 * 60 * 1000;
  
  constructor() {
    this.webScraper = new WebScraperService();
    this.domDetector = new DomProductDetectorService();
  }
  
  /**
   * Detect products from a URL using a hybrid approach
   * @param url URL to analyze
   * @param options Configuration options
   * @returns Product detection results
   */
  public async detectProducts(
    url: string,
    options: {
      useLlm?: boolean;
      forceFresh?: boolean;
      domConfidenceThreshold?: number;
      minProducts?: number;
    } = {}
  ): Promise<HybridProductDetectionResult> {
    const startTime = Date.now();
    
    // Set default options
    const {
      useLlm = true,
      forceFresh = false,
      domConfidenceThreshold = 0.6,
      minProducts = 3
    } = options;
    
    // Check cache first if not forcing fresh results
    if (!forceFresh) {
      const cachedResult = this.getCachedResult(url);
      if (cachedResult) {
        console.log(`Using cached product detection results for ${url}`);
        return cachedResult;
      }
    }
    
    try {
      // First step: scrape the website
      const html = await this.fetchWebsiteHtml(url);
      
      // Second step: analyze with DOM-based detector
      const domResult = this.domDetector.detectProducts(html);
      
      // Initialize results with DOM detection
      let products = domResult.products;
      let confidence = domResult.confidence;
      let method = domResult.method;
      let usedLlm = false;
      
      // If DOM detection has low confidence or found few products,
      // and LLM usage is enabled, try to enhance with LLM
      if (useLlm && (domResult.confidence < domConfidenceThreshold || domResult.products.length < minProducts)) {
        // For now, just log this as Phase 2 will implement LLM enhancement
        console.log(`DOM detection had low confidence (${domResult.confidence}) or found few products (${domResult.products.length}). Would use LLM enhancement in Phase 2.`);
        
        // In Phase 2, we would call LLM-based analysis here and potentially merge results
        // For now, we'll just use DOM results
      }
      
      const endTime = Date.now();
      
      // Construct the final result
      const result: HybridProductDetectionResult = {
        products,
        confidence,
        method,
        metrics: {
          detectionTime: endTime - startTime,
          domConfidence: domResult.confidence,
          usedLlm,
          productCount: products.length
        },
        url
      };
      
      // Cache the result for future use
      this.cacheResult(url, result);
      
      return result;
    } catch (error: any) {
      console.error(`Error detecting products from ${url}:`, error.message);
      throw new Error(`Failed to detect products: ${error.message}`);
    }
  }
  
  /**
   * Fetch website HTML content
   * @param url URL to fetch
   * @returns HTML content
   */
  private async fetchWebsiteHtml(url: string): Promise<string> {
    try {
      const websiteData = await this.webScraper.scrapeWebsite(url);
      
      // Simulate HTML content from the fetched data
      // This is a temporary solution until we have proper HTML content
      const html = `
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
      
      return html;
    } catch (error: any) {
      console.error(`Error fetching website HTML from ${url}:`, error.message);
      throw new Error(`Failed to fetch website HTML: ${error.message}`);
    }
  }
  
  /**
   * Get cached result for a URL if it exists and is not expired
   * @param url URL to check in cache
   * @returns Cached result or undefined if not found or expired
   */
  private getCachedResult(url: string): HybridProductDetectionResult | undefined {
    const cached = this.cache.get(url);
    
    if (cached) {
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - cached.timestamp < this.cacheExpirationMs) {
        return cached.result;
      } else {
        // Cache expired, remove it
        this.cache.delete(url);
      }
    }
    
    return undefined;
  }
  
  /**
   * Cache a detection result for a URL
   * @param url URL to cache
   * @param result Result to cache
   */
  private cacheResult(url: string, result: HybridProductDetectionResult): void {
    this.cache.set(url, {
      result,
      timestamp: Date.now()
    });
    
    // Implement cache size limiting
    this.limitCacheSize();
  }
  
  /**
   * Limit the cache size to prevent memory issues
   * Removes oldest entries if cache gets too large
   */
  private limitCacheSize(): void {
    const maxCacheSize = 100; // Maximum number of entries in the cache
    
    if (this.cache.size > maxCacheSize) {
      // Get and sort entries by timestamp
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest entries until we're back at the limit
      const entriesToRemove = entries.slice(0, this.cache.size - maxCacheSize);
      for (const [url] of entriesToRemove) {
        this.cache.delete(url);
      }
    }
  }
  
  /**
   * Clear the cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   * @returns Cache size and hit rate
   */
  public getCacheStats(): { size: number, maxSize: number, expirationTimeHours: number } {
    return {
      size: this.cache.size,
      maxSize: 100, // Same as maxCacheSize in limitCacheSize()
      expirationTimeHours: this.cacheExpirationMs / (1000 * 60 * 60)
    };
  }
  
  /**
   * Clean up expired cache entries
   * @returns Number of entries removed
   */
  public cleanupCache(): number {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [url, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.cacheExpirationMs) {
        this.cache.delete(url);
        removedCount++;
      }
    }
    
    return removedCount;
  }
}

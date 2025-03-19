/**
 * Hybrid Product Detector Service
 * 
 * This service combines DOM-based detection with optional LLM analysis
 * to identify products on SME websites.
 */

import * as cheerio from 'cheerio';
import { EnhancedProduct, ProductDetectionResult, ProductAnalysisMetrics } from '../types/product-detection.types';
import { DomProductDetector } from '../utils/dom-product-detector';

interface DetectionContext {
  $: cheerio.CheerioAPI;
  url: string;
  startTime: number;
  metrics: ProductAnalysisMetrics;
  domDetectionComplete: boolean;
  llmDetectionComplete: boolean;
}

/**
 * Configuration for the hybrid product detector
 */
export interface ProductDetectorConfig {
  // Whether to use LLM enhancement
  useLlm: boolean;
  
  // Maximum token budget for LLM calls
  maxTokens: number;
  
  // Minimum confidence for products detected via DOM
  minDomConfidence: number;
  
  // Cache settings
  cacheTtl: number;
  
  // Website complexity thresholds
  complexityThresholds: {
    simple: number;
    medium: number;
    complex: number;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ProductDetectorConfig = {
  useLlm: true,
  maxTokens: 1000,
  minDomConfidence: 0.6,
  cacheTtl: 86400, // 24 hours
  complexityThresholds: {
    simple: 0.3,   // Simple websites
    medium: 0.6,   // Medium complexity
    complex: 0.9   // Complex websites
  }
};

/**
 * Hybrid Product Detector Service
 * Combines DOM-based detection with optional LLM enhancement
 */
export class HybridProductDetector {
  private config: ProductDetectorConfig;
  private domDetector: DomProductDetector;
  
  constructor(config: Partial<ProductDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.domDetector = new DomProductDetector();
  }
  
  /**
   * Detect products from a URL or HTML content
   */
  async detectProducts(url: string, html: string): Promise<ProductDetectionResult> {
    try {
      // Initialize detection context
      const context: DetectionContext = {
        $: cheerio.load(html),
        url,
        startTime: Date.now(),
        metrics: {
          productCount: 0,
          tokensUsed: 0,
          confidence: 0,
          totalTime: 0
        },
        domDetectionComplete: false,
        llmDetectionComplete: false
      };
      
      // Determine website complexity
      const complexity = this.determineWebsiteComplexity(context.$);
      
      // First attempt: DOM-based detection
      const domResults = await this.detectWithDOM(html);
      context.domDetectionComplete = true;
      
      let products = domResults.products;
      context.metrics.productCount = products.length;
      context.metrics.confidence = this.calculateAverageConfidence(products);
      
      // If DOM detection found sufficient products with good confidence,
      // we may skip the LLM enhancement
      const shouldUseLlm = this.shouldUseLlm(products, complexity);
      
      // Second attempt (if needed): LLM enhancement
      if (shouldUseLlm && this.config.useLlm) {
        const llmResults = await this.enhanceWithLlm(html, products, complexity);
        context.llmDetectionComplete = true;
        
        // If LLM found products where DOM detector didn't,
        // use the LLM results instead
        if (llmResults.products.length > 0) {
          if (products.length === 0 || 
              (llmResults.products.length > products.length && this.calculateAverageConfidence(llmResults.products) > this.calculateAverageConfidence(products))) {
            products = llmResults.products;
          } else {
            // Otherwise, enhance the DOM products with LLM insights
            products = this.mergeProductResults(products, llmResults.products);
          }
        }
        
        // Update metrics
        context.metrics.tokensUsed = llmResults.metrics.tokensUsed;
        context.metrics.productCount = products.length;
        context.metrics.confidence = this.calculateAverageConfidence(products);
      }
      
      // Calculate final metrics
      context.metrics.totalTime = Date.now() - context.startTime;
      
      // Extract categories and ensure they are included in the result
      const categories = this.extractCategories(products);
      
      // Create the result object with all required properties
      const result: ProductDetectionResult = {
        products: products,
        categories: categories || [],
        metrics: context.metrics
      };
      
      return result;
    } catch (error) {
      console.error('Error detecting products:', error);
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
   * Detect products using DOM-based techniques
   */
  private async detectWithDOM(html: string): Promise<ProductDetectionResult> {
    try {
      const { products, patterns } = this.domDetector.detectProducts(html);
      
      // Filter out low-confidence products
      const filteredProducts = products.filter(
        product => product.confidence && product.confidence >= this.config.minDomConfidence
      );
      
      return {
        products: filteredProducts,
        categories: this.extractCategories(filteredProducts),
        metrics: {
          productCount: filteredProducts.length,
          tokensUsed: 0, // DOM detection doesn't use tokens
          confidence: this.calculateAverageConfidence(filteredProducts)
        }
      };
    } catch (error) {
      console.error('Error in DOM detection:', error);
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
   * Enhance product detection using LLM
   * This is a placeholder implementation that should be replaced with actual LLM integration
   */
  private async enhanceWithLlm(
    html: string, 
    domProducts: EnhancedProduct[], 
    complexity: number
  ): Promise<ProductDetectionResult> {
    try {
      // For a real implementation, this would call an LLM API
      // with appropriate prompting based on the HTML content
      
      // This is a placeholder implementation that returns empty results
      // It should be replaced with actual LLM integration
      
      // Mock implementation for now - in production this would be:
      // 1. Prepare a prompt with the HTML content
      // 2. Call the LLM API with appropriate parameters
      // 3. Parse the response to extract products
      
      // For the current implementation, just return the DOM products
      // with a token usage estimate
      const tokensUsed = 0; // No tokens used in this placeholder
      
      return {
        products: [], // No additional products found
        categories: [],
        metrics: {
          productCount: 0,
          tokensUsed: tokensUsed,
          confidence: 0
        }
      };
    } catch (error) {
      console.error('Error in LLM enhancement:', error);
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
   * Determine if LLM enhancement should be used based on DOM results
   */
  private shouldUseLlm(products: EnhancedProduct[], complexity: number): boolean {
    // If no products were found via DOM detection, always use LLM
    if (products.length === 0) {
      return true;
    }
    
    // If DOM detection found products but with low confidence, use LLM
    const avgConfidence = this.calculateAverageConfidence(products);
    if (avgConfidence < this.config.minDomConfidence) {
      return true;
    }
    
    // For complex websites, always use LLM
    if (complexity >= this.config.complexityThresholds.complex) {
      return true;
    }
    
    // For medium complexity with few products, use LLM
    if (complexity >= this.config.complexityThresholds.medium && products.length < 3) {
      return true;
    }
    
    // Otherwise, DOM detection is sufficient
    return false;
  }
  
  /**
   * Determine website complexity based on DOM structure
   */
  private determineWebsiteComplexity($: cheerio.CheerioAPI): number {
    // Count the number of elements, depth of nesting, and complexity indicators
    
    // 1. Element count (normalized)
    const elementCount = $('*').length;
    const normalizedElementCount = Math.min(1.0, elementCount / 5000);
    
    // 2. Depth of DOM tree
    let maxDepth = 0;
    
    // Sample a few elements to estimate maximum DOM depth
    $('body *').each((_, element) => {
      let depth = 0;
      let current = element;
      
      while (current.parent) {
        depth++;
        current = current.parent;
        
        // Break early for very deep trees
        if (depth > 50) break;
      }
      
      maxDepth = Math.max(maxDepth, depth);
    });
    
    const normalizedDepth = Math.min(1.0, maxDepth / 30);
    
    // 3. JavaScript complexity - count scripts
    const scriptCount = $('script').length;
    const normalizedScriptCount = Math.min(1.0, scriptCount / 20);
    
    // 4. Detect complex selectors (indication of CSS complexity)
    const styleCount = $('style').length;
    const styleLinks = $('link[rel="stylesheet"]').length;
    const normalizedStyleCount = Math.min(1.0, (styleCount + styleLinks) / 15);
    
    // 5. Count divs, sections, and other structural elements
    const structuralElements = $('div, section, article, main, aside, header, footer, nav').length;
    const normalizedStructuralCount = Math.min(1.0, structuralElements / 500);
    
    // Combine factors with weightings
    const complexity = (
      normalizedElementCount * 0.3 +
      normalizedDepth * 0.3 +
      normalizedScriptCount * 0.2 +
      normalizedStyleCount * 0.1 +
      normalizedStructuralCount * 0.1
    );
    
    return Math.min(1.0, complexity);
  }
  
  /**
   * Merge product results from both detection methods
   */
  private mergeProductResults(
    domProducts: EnhancedProduct[], 
    llmProducts: EnhancedProduct[]
  ): EnhancedProduct[] {
    const mergedProducts: EnhancedProduct[] = [...domProducts];
    const existingNames = new Set(domProducts.map(p => p.name.toLowerCase().trim()));
    
    // Add unique products from LLM results
    for (const llmProduct of llmProducts) {
      const normalizedName = llmProduct.name.toLowerCase().trim();
      
      // Check if this product is already in the DOM results
      let isDuplicate = false;
      for (const name of existingNames) {
        if (this.isSimilarProduct(normalizedName, name)) {
          isDuplicate = true;
          break;
        }
      }
      
      // Add if it's not a duplicate
      if (!isDuplicate) {
        existingNames.add(normalizedName);
        mergedProducts.push(llmProduct);
      }
    }
    
    return mergedProducts;
  }
  
  /**
   * Check if two product names are similar
   */
  private isSimilarProduct(name1: string, name2: string): boolean {
    // Simple check: if one is a substring of the other
    if (name1.includes(name2) || name2.includes(name1)) {
      return true;
    }
    
    // Could be enhanced with more sophisticated string similarity algorithms
    return false;
  }
  
  /**
   * Calculate average confidence across products
   */
  private calculateAverageConfidence(products: EnhancedProduct[]): number {
    if (products.length === 0) return 0;
    
    const totalConfidence = products.reduce((sum, product) => 
      sum + (product.confidence || 0), 0);
    
    return totalConfidence / products.length;
  }
  
  /**
   * Extract categories from products
   */
  private extractCategories(products: EnhancedProduct[]): string[] {
    const categorySet = new Set<string>();
    
    products.forEach(product => {
      if (product.category) {
        categorySet.add(product.category);
      }
    });
    
    return Array.from(categorySet);
  }
}

/**
 * Hybrid Product Detector Service
 * 
 * This service combines DOM-based detection with optional LLM analysis
 * to identify products on SME websites.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI, Element as CheerioElement, AnyNode } from 'cheerio';
import type { Element as DomHandlerElement } from 'domhandler';
import { EnhancedProduct, ProductDetectionResult, ProductAnalysisMetrics } from '../types/product-detection.types';
import { DOMProductDetector } from '../utils/dom-product-detector';
import axios from 'axios';

interface DetectionContext {
  $: CheerioAPI;
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
 * Type guard to check if an element is a tag element
 */
function isTagElement(element: DomHandlerElement | null): element is DomHandlerElement & { type: 'tag' | 'script' | 'style' } {
  return !!element && 
         (element.type === 'tag' || element.type === 'script' || element.type === 'style') &&
         'tagName' in element &&
         'name' in element &&
         'attribs' in element;
}

/**
 * Hybrid Product Detector Service
 * Combines DOM-based detection with optional LLM enhancement
 */
export class HybridProductDetector {
  private config: ProductDetectorConfig;
  private domDetector: DOMProductDetector;
  
  constructor(config: Partial<ProductDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.domDetector = new DOMProductDetector('');
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
      const domDetector = new DOMProductDetector(html);
      const { products, patterns } = domDetector.detectProducts();
      
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
   */
  private async enhanceWithLlm(
    html: string, 
    domProducts: EnhancedProduct[], 
    complexity: number
  ): Promise<ProductDetectionResult> {
    try {
      // Prepare HTML for LLM analysis
      const cleanedHtml = this.prepareHtmlForLlm(html);
      
      // Prepare existing products as context
      const existingProductsContext = domProducts.length > 0 
        ? `I've already identified these products: ${JSON.stringify(domProducts)}`
        : "I haven't identified any products yet.";
      
      // Create prompt for LLM
      const prompt = `
You are analyzing a website to extract product information for a business.
Website complexity: ${complexity.toFixed(2)} (0-1 scale)

TASK:
1. Identify all products mentioned on this website
2. For each product, extract:
   - name: Product name
   - description: Brief description 
   - price: Price if available
   - category: Product category
   - attributes: Any additional product attributes
   - images: URLs of product images (if in HTML)

${existingProductsContext}

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "products": [
    {
      "name": "Product Name",
      "description": "Product description",
      "price": "Price if available",
      "category": "Category name",
      "attributes": { "key1": "value1", "key2": "value2" },
      "images": ["image_url_1", "image_url_2"]
    },
    ... more products ...
  ],
  "categories": ["Category1", "Category2", ...]
}

WEBSITE HTML:
${cleanedHtml}
`;
      
      // Call OpenAI API with proper type definitions
      interface OpenAIResponse {
        choices: Array<{
          message: {
            content: string;
          };
        }>;
      }

      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a product extraction AI specialized in identifying products from website HTML.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      );
      
      // Parse the response
      let extractedData: any = {};
      const content = response.data.choices[0]?.message?.content;
      
      if (content) {
        // Find JSON in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        }
      }
      
      // Ensure the products have confidence values
      const products = (extractedData.products || []).map((product: any) => ({
        ...product,
        confidence: 0.9,  // LLM extraction has high confidence
        detectionMethod: 'llm'
      }));
      
      // Calculate token usage estimates
      const promptTokens = prompt.length / 4;  // Rough estimate
      const completionTokens = content ? content.length / 4 : 0;
      const tokensUsed = promptTokens + completionTokens;
      
      return {
        products,
        categories: extractedData.categories || [],
        metrics: {
          productCount: products.length,
          tokensUsed,
          confidence: 0.9  // LLM results typically have high confidence
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
   * Prepare HTML for LLM analysis by reducing its size
   */
  private prepareHtmlForLlm(html: string): string {
    // Load HTML into cheerio
    const $ = cheerio.load(html);
    
    // Remove elements that are unlikely to contain product information
    $('script, style, noscript, svg, path, iframe, meta').remove();
    
    // Get the simplified HTML
    let simplifiedHtml = $.html();
    
    // Limit size to avoid token limit issues
    const maxLength = 15000;
    if (simplifiedHtml.length > maxLength) {
      simplifiedHtml = simplifiedHtml.substring(0, maxLength) + '...';
    }
    
    return simplifiedHtml;
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
  private determineWebsiteComplexity($: CheerioAPI): number {
    // Count the number of elements, depth of nesting, and complexity indicators
    
    // 1. Element count (normalized)
    const elementCount = $('*').length;
    const normalizedElementCount = Math.min(1.0, elementCount / 5000);
    
    // 2. Depth of DOM tree
    let maxDepth = 0;
    
    // Sample a few elements to estimate maximum DOM depth
    $('body *').each((_i: number, element: CheerioElement) => {
      let depth = 0;
      let current = element;
      
      // Type-safe parent traversal
      while (current && 'parent' in current && current.parent) {
        depth++;
        current = current.parent as CheerioElement;
        
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

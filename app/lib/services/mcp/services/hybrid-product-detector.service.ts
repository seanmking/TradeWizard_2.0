import { ProductDetectorConfig } from '../config/product-detector.config';
import { EnhancedProduct, ProductDetectionResult, ProductAnalysisMetrics } from '../types/product-detection.types';
import { LLMProductAnalyzer } from '../analyzers/llm-product-analyzer';
import { CacheService } from './cache.service';
import { TelemetryService } from './telemetry.service';
import { calculateWebsiteComplexity, estimateAnalysisCost } from '../config/product-detector.config';

export class HybridProductDetector {
  private config: ProductDetectorConfig;
  private llmAnalyzer: LLMProductAnalyzer;
  private cache: CacheService;
  private telemetry: TelemetryService;

  constructor(
    config: ProductDetectorConfig,
    cache: CacheService,
    telemetry: TelemetryService
  ) {
    this.config = config;
    this.cache = cache;
    this.telemetry = telemetry;
    this.llmAnalyzer = new LLMProductAnalyzer(config.llm, telemetry);
  }

  async detectProducts(url: string, html: string): Promise<ProductDetectionResult> {
    // Check cache first
    const cacheKey = CacheService.generateKey(url, JSON.stringify(this.config));
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Calculate website complexity
    const complexity = this.calculateComplexity(html);
    
    // Estimate cost
    const estimatedCost = estimateAnalysisCost(
      html.length,
      this.config.llm.defaultModel,
      this.config
    );

    // Start with DOM-based detection
    const domProducts = await this.detectWithDOM(html);
    
    let result: ProductDetectionResult = {
      products: domProducts.products,
      categories: this.extractCategories(domProducts.products),
      metrics: domProducts.metrics
    };

    // Determine if LLM analysis is needed
    if (
      this.config.useLLM &&
      this.shouldUseLLM(domProducts.products.length, complexity, estimatedCost)
    ) {
      try {
        const llmResult = await this.llmAnalyzer.analyzeContent(url, html, complexity);
        
        // Merge results, preferring LLM results when confidence is higher
        result = this.mergeResults(result, {
          products: llmResult.products,
          categories: this.extractCategories(llmResult.products),
          metrics: llmResult.metrics
        });
      } catch (error) {
        console.error('LLM analysis failed:', error);
        // Continue with DOM results if LLM fails
      }
    }

    // Cache the results
    this.cache.set(cacheKey, result);
    
    return result;
  }

  private calculateComplexity(html: string): number {
    const domStructureDepth = (html.match(/<[^>]+>/g) || []).length;
    const hasEcommerce = /cart|checkout|price|product|buy/i.test(html);
    
    return calculateWebsiteComplexity(
      (html.match(/product/gi) || []).length, // Rough estimate of product count
      html.length,
      domStructureDepth,
      hasEcommerce
    );
  }

  private shouldUseLLM(
    productCount: number,
    complexity: number,
    estimatedCost: number
  ): boolean {
    return (
      productCount >= this.config.costOptimization.minProductsForLLM &&
      complexity >= this.config.llm.complexityThresholds.medium &&
      estimatedCost <= this.config.costOptimization.maxCostPerAnalysis
    );
  }

  private async detectWithDOM(html: string): Promise<ProductDetectionResult> {
    const startTime = Date.now();
    
    // TODO: Implement actual DOM-based detection
    // This is a placeholder that should be replaced with actual implementation
    const products: EnhancedProduct[] = [];
    
    const metrics: ProductAnalysisMetrics = {
      url: '',
      timestamp: new Date().toISOString(),
      modelUsed: 'dom',
      complexity: 0,
      confidence: 0,
      totalTime: Date.now() - startTime,
      costIncurred: 0,
      productCount: products.length,
      tokensUsed: 0
    };

    return {
      products,
      categories: this.extractCategories(products),
      metrics
    };
  }

  private extractCategories(products: EnhancedProduct[]): string[] {
    const categories = new Set<string>();
    for (const product of products) {
      if (product.category) {
        categories.add(product.category);
      }
    }
    return Array.from(categories);
  }

  private mergeResults(
    domResult: ProductDetectionResult,
    llmResult: ProductDetectionResult
  ): ProductDetectionResult {
    const products = new Map<string, EnhancedProduct>();
    
    // Add DOM products
    domResult.products.forEach(product => {
      products.set(this.normalizeProductKey(product), product);
    });

    // Add or update with LLM products if they have higher confidence
    llmResult.products.forEach(product => {
      const key = this.normalizeProductKey(product);
      const existing = products.get(key);
      
      if (!existing || (llmResult.metrics?.confidence || 0) > (domResult.metrics?.confidence || 0)) {
        products.set(key, product);
      }
    });

    // Combine metrics
    const metrics: ProductAnalysisMetrics = {
      url: domResult.metrics?.url || '',
      timestamp: new Date().toISOString(),
      modelUsed: 'hybrid',
      complexity: Math.max(
        domResult.metrics?.complexity || 0,
        llmResult.metrics?.complexity || 0
      ),
      confidence: Math.max(
        domResult.metrics?.confidence || 0,
        llmResult.metrics?.confidence || 0
      ),
      totalTime: (domResult.metrics?.totalTime || 0) + (llmResult.metrics?.totalTime || 0),
      costIncurred: (domResult.metrics?.costIncurred || 0) + (llmResult.metrics?.costIncurred || 0),
      productCount: products.size,
      tokensUsed: (domResult.metrics?.tokensUsed || 0) + (llmResult.metrics?.tokensUsed || 0)
    };

    return {
      products: Array.from(products.values()),
      categories: Array.from(new Set([...domResult.categories, ...llmResult.categories])),
      metrics
    };
  }

  private normalizeProductKey(product: EnhancedProduct): string {
    // Create a normalized key for product deduplication
    return `${product.name.toLowerCase().replace(/\s+/g, '')}-${product.price || ''}`;
  }
} 
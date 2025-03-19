import axios from 'axios';
import cheerio from 'cheerio';
import LLMProductAnalyzerService from './llm-product-analyzer.service';
import Redis from 'ioredis';

class HybridProductDetectorService {
  private llmAnalyzer: LLMProductAnalyzerService;
  private redisClient: Redis;

  constructor() {
    this.llmAnalyzer = new LLMProductAnalyzerService();
    this.redisClient = new Redis(process.env.REDIS_URL);
  }

  async detectProduct(url: string) {
    // Check cache first
    const cachedResult = await this.getCachedDetection(url);
    if (cachedResult) return cachedResult;

    // Attempt DOM-based detection
    const domDetectionResult = await this.domBasedDetection(url);
    
    // Determine detection confidence
    const confidence = this.calculateConfidence(domDetectionResult);

    // Enhance with LLM if confidence is low
    let enhancedResult = domDetectionResult;
    if (confidence < 0.7) {
      try {
        const llmClassification = await this.llmAnalyzer.classifyProduct(domDetectionResult);
        enhancedResult = {
          ...domDetectionResult,
          llmEnhancement: llmClassification
        };
      } catch (error) {
        console.warn('LLM enhancement failed', error);
      }
    }

    // Cache the result
    await this.cacheDetection(url, enhancedResult);

    return enhancedResult;
  }

  private async domBasedDetection(url: string) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Multiple detection strategies
      const strategies = [
        this.detectViaSchemaOrg($),
        this.detectViaECommercePatterns($),
        this.detectViaImageTextPairs($)
      ];

      // Find first successful detection
      for (const strategy of strategies) {
        if (strategy) return strategy;
      }

      // Fallback to generic extraction
      return this.genericExtraction($);
    } catch (error) {
      console.error('Product detection error:', error);
      throw new Error('Unable to detect product');
    }
  }

  private detectViaSchemaOrg($: cheerio.Root) {
    const schemaScript = $('script[type="application/ld+json"]').first().html();
    if (schemaScript) {
      try {
        const schemaData = JSON.parse(schemaScript);
        if (schemaData['@type'] === 'Product') {
          return {
            name: schemaData.name,
            description: schemaData.description,
            price: schemaData.offers?.price,
            confidence: 0.9
          };
        }
      } catch {}
    }
    return null;
  }

  private detectViaECommercePatterns($: cheerio.Root) {
    // Look for common e-commerce product page patterns
    const productTitle = $('h1.product-title, .product-name').first().text().trim();
    const productDescription = $('div.product-description, .product-details').first().text().trim();
    
    if (productTitle) {
      return {
        name: productTitle,
        description: productDescription,
        confidence: 0.7
      };
    }
    return null;
  }

  private detectViaImageTextPairs($: cheerio.Root) {
    // Find image-text pairs that suggest a product
    const productImages = $('img[alt]:not([alt=""])');
    
    if (productImages.length > 0) {
      return {
        name: productImages.first().attr('alt') || 'Unnamed Product',
        description: productImages.first().parent().text().trim(),
        confidence: 0.6
      };
    }
    return null;
  }

  private genericExtraction($: cheerio.Root) {
    // Most generic extraction as a last resort
    return {
      name: $('title').first().text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      confidence: 0.5
    };
  }

  private calculateConfidence(detectionResult: any): number {
    return detectionResult.confidence || 0.5;
  }

  private async getCachedDetection(url: string) {
    const cachedResult = await this.redisClient.get(`product_detection:${url}`);
    return cachedResult ? JSON.parse(cachedResult) : null;
  }

  private async cacheDetection(url: string, result: any) {
    // Cache for 7 days
    await this.redisClient.set(
      `product_detection:${url}`, 
      JSON.stringify(result), 
      'EX', 
      7 * 24 * 60 * 60
    );
  }

  // Cache management methods
  async clearCache() {
    const keys = await this.redisClient.keys('product_detection:*');
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
    return keys.length;
  }

  async getCacheStats() {
    const keys = await this.redisClient.keys('product_detection:*');
    return {
      totalCachedItems: keys.length,
      cacheSize: await Promise.all(
        keys.map(key => this.redisClient.strlen(key))
      ).then(sizes => sizes.reduce((a, b) => a + b, 0))
    };
  }
}

export default HybridProductDetectorService;

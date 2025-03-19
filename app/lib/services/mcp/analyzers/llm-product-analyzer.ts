import { LLMConfig } from '../config/product-detector.config';
import { EnhancedProduct, ProductAnalysisMetrics } from '../types/product-detection.types';
import { TelemetryService } from '../services/telemetry.service';

export class LLMProductAnalyzer {
  private config: LLMConfig;
  private telemetry: TelemetryService;

  constructor(config: LLMConfig, telemetry: TelemetryService) {
    this.config = config;
    this.telemetry = telemetry;
  }

  async analyzeContent(
    url: string, 
    htmlContent: string, 
    complexity: number
  ): Promise<{
    products: EnhancedProduct[];
    metrics: ProductAnalysisMetrics;
  }> {
    const startTime = Date.now();
    const modelName = this.selectModel(complexity);
    
    try {
      // Prepare the content for analysis
      const cleanedHtml = this.sanitizeHtml(htmlContent);
      const chunks = this.chunkContent(cleanedHtml);
      
      const products: EnhancedProduct[] = [];
      let totalTokens = 0;
      let confidence = 0;

      for (const chunk of chunks) {
        const result = await this.processChunk(chunk, modelName);
        products.push(...result.products);
        totalTokens += result.tokensUsed;
        confidence += result.confidence;
      }

      // Calculate average confidence across all chunks
      const avgConfidence = confidence / chunks.length;
      const totalTime = Date.now() - startTime;
      const costIncurred = totalTokens * this.config.costPerToken;

      const metrics: ProductAnalysisMetrics = {
        url,
        timestamp: new Date().toISOString(),
        modelUsed: modelName,
        complexity,
        confidence: avgConfidence,
        totalTime,
        costIncurred,
        productCount: products.length,
        tokensUsed: totalTokens
      };

      await this.telemetry.recordMetrics(metrics);

      return { products, metrics };
    } catch (error) {
      console.error('LLM analysis failed:', error);
      
      // Fallback to simpler model if available
      if (modelName !== this.config.fallbackModel) {
        console.log('Attempting analysis with fallback model...');
        return this.analyzeContent(url, htmlContent, 0); // Use minimum complexity for fallback
      }

      // If we're already using the fallback model, return empty results
      return {
        products: [],
        metrics: {
          url,
          timestamp: new Date().toISOString(),
          modelUsed: modelName,
          complexity,
          confidence: 0,
          totalTime: Date.now() - startTime,
          costIncurred: 0,
          productCount: 0,
          tokensUsed: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private selectModel(complexity: number): string {
    // Select model based on complexity thresholds
    if (complexity >= this.config.complexityThresholds.complex) {
      return this.config.defaultModel;
    } else if (complexity >= this.config.complexityThresholds.medium) {
      return this.config.fallbackModel;
    }
    return this.config.fallbackModel;
  }

  private sanitizeHtml(html: string): string {
    // Remove scripts, styles, and comments
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private chunkContent(content: string, maxChunkSize = 4000): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    // Split content into semantic chunks (e.g., by main divs or sections)
    const sections = content.match(/<(?:div|section|article|main)[^>]*>[\s\S]*?<\/(?:div|section|article|main)>/gi) || [content];

    for (const section of sections) {
      if (currentChunk.length + section.length <= maxChunkSize) {
        currentChunk += section;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = section;
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  private async processChunk(
    chunk: string,
    modelName: string
  ): Promise<{
    products: EnhancedProduct[];
    tokensUsed: number;
    confidence: number;
  }> {
    // Prepare the prompt for product detection
    const prompt = `
      Analyze the following HTML content and identify products with their details.
      Focus on elements that appear to be product listings, including:
      - Product names and titles
      - Prices and pricing information
      - Descriptions and features
      - Categories or classifications
      - Image references
      - Any additional attributes (size, color, etc.)

      HTML Content:
      ${chunk}

      Respond with a JSON array of products, where each product has:
      {
        "name": string,
        "price": number | null,
        "description": string,
        "category": string | null,
        "images": string[],
        "attributes": { [key: string]: string }
      }
    `;

    // TODO: Replace with actual LLM API call
    // This is a placeholder for the actual implementation
    const response = await this.callLLMApi(modelName, prompt);

    try {
      const products = JSON.parse(response.content) as EnhancedProduct[];
      return {
        products,
        tokensUsed: response.tokensUsed,
        confidence: response.confidence
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return {
        products: [],
        tokensUsed: response.tokensUsed,
        confidence: 0
      };
    }
  }

  private async callLLMApi(
    model: string,
    prompt: string
  ): Promise<{
    content: string;
    tokensUsed: number;
    confidence: number;
  }> {
    // TODO: Implement actual LLM API call
    // This is a placeholder that should be replaced with the actual API implementation
    throw new Error('LLM API call not implemented');
  }
} 
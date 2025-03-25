import { BaseAIService, AIServiceConfig } from './base-ai.service';
import { Logger } from '../../utils/logger';
import { MetricsService } from '../../monitoring/metrics.service';
import { 
  BusinessProfile, 
  EnhancedProduct, 
  AnalysisContext,
  ComplianceData,
  MarketData,
  BusinessAnalysis,
  WebsiteData,
  WebsiteAnalysisResult
} from '../../types/ai-orchestrator.types';

export class AIOrchestrator {
  private logger: Logger;
  private metrics: MetricsService;
  private baseAI: BaseAIService;

  constructor(config: AIServiceConfig) {
    this.logger = new Logger('AIOrchestrator');
    this.metrics = new MetricsService();
    this.baseAI = new BaseAIService(config);
  }

  async analyzeWebsite(websiteData: WebsiteData): Promise<WebsiteAnalysisResult> {
    this.logger.info('Starting website analysis', { url: websiteData.url });
    
    const prompt = `Analyze the following website data and extract key business information:
    URL: ${websiteData.url}
    Title: ${websiteData.title}
    Description: ${websiteData.description}
    Content: ${websiteData.content.substring(0, 8000)}
    
    Extract and structure the following information:
    1. Business name and description
    2. Industry and subindustry classification
    3. Products/services offered with descriptions and categories
    4. Contact information (emails, phones, address)
    5. Social media presence
    6. Export readiness indicators
    
    Provide the analysis in a structured JSON format matching the WebsiteAnalysisResult interface.`;

    try {
      const result = await this.baseAI.makeAIRequest({
        prompt,
        requiresStructuredOutput: true,
        cacheKey: `website_analysis:${websiteData.url}`,
        cacheTTL: 24 * 60 * 60 // 24 hours
      });

      return JSON.parse(result) as WebsiteAnalysisResult;
    } catch (error) {
      this.logger.error('Failed to analyze website', { error, url: websiteData.url });
      throw error;
    }
  }

  async enhanceProducts(products: EnhancedProduct[]): Promise<EnhancedProduct[]> {
    this.logger.info('Enhancing product information', { count: products.length });
    
    const enhancedProducts = await Promise.all(products.map(async (product) => {
      const prompt = `Analyze the following product and provide enhanced information:
      Name: ${product.name}
      Description: ${product.description}
      Category: ${product.category}
      ${product.price ? `Price: ${product.price}` : ''}
      
      Provide the following enhancements:
      1. HS Code classification
      2. Industry sector and subsector
      3. Export potential assessment (Low/Medium/High)
      4. Key compliance requirements
      5. Potential target markets
      
      Provide the analysis in a structured JSON format matching the enhancement field of EnhancedProduct interface.`;

      try {
        const result = await this.baseAI.makeAIRequest({
          prompt,
          requiresStructuredOutput: true,
          cacheKey: `product_enhancement:${product.name}`,
          cacheTTL: 7 * 24 * 60 * 60 // 7 days
        });

        const enhancement = JSON.parse(result);
        return { ...product, enhancement };
      } catch (error) {
        this.logger.error('Failed to enhance product', { error, product: product.name });
        throw error;
      }
    }));

    return enhancedProducts;
  }

  async generateBusinessAnalysis(context: AnalysisContext): Promise<BusinessAnalysis> {
    this.logger.info('Generating business analysis', { 
      business: context.businessProfile.businessName,
      products: context.products.length
    });
    
    const prompt = `Generate a comprehensive business analysis based on the following context:
    Business Profile: ${JSON.stringify(context.businessProfile)}
    Products: ${JSON.stringify(context.products)}
    Compliance Data: ${JSON.stringify(context.complianceData)}
    Market Data: ${JSON.stringify(context.marketData)}
    
    Provide a detailed analysis including:
    1. Overall export readiness score
    2. Business strengths and challenges
    3. Market opportunities by country
    4. Compliance requirements (immediate/short-term/long-term)
    5. Strategic recommendations
    6. Implementation timeline with milestones
    
    Provide the analysis in a structured JSON format matching the BusinessAnalysis interface.`;

    try {
      const result = await this.baseAI.makeAIRequest({
        prompt,
        requiresStructuredOutput: true,
        cacheKey: `business_analysis:${context.businessProfile.businessName}:${context.timestamp}`,
        cacheTTL: 24 * 60 * 60 // 24 hours
      });

      return JSON.parse(result) as BusinessAnalysis;
    } catch (error) {
      this.logger.error('Failed to generate business analysis', { 
        error, 
        business: context.businessProfile.businessName 
      });
      throw error;
    }
  }

  async destroy(): Promise<void> {
    await this.baseAI.destroy();
    await this.metrics.destroy();
  }
} 
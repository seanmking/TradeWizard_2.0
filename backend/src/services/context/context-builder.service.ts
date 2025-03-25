import { Logger } from '../../utils/logger';
import { AIOrchestrator } from '../ai/ai-orchestrator.service';
import {
  RawWebsiteData,
  RawProductData,
  RawComplianceData,
  RawMarketData,
  ContextBuilderConfig,
  ContextBuildResult,
  ValidationResult,
  DataEnrichmentResult
} from '../../types/context-builder.types';
import {
  BusinessProfile,
  EnhancedProduct,
  ComplianceData,
  MarketData
} from '../../types/ai-orchestrator.types';

export class ContextBuilder {
  private logger: Logger;
  private aiOrchestrator: AIOrchestrator;
  private config: Required<ContextBuilderConfig>;

  constructor(aiOrchestrator: AIOrchestrator, config: ContextBuilderConfig = {}) {
    this.logger = new Logger('ContextBuilder');
    this.aiOrchestrator = aiOrchestrator;
    this.config = {
      maxProductsToProcess: config.maxProductsToProcess ?? 10,
      maxMarketsToAnalyze: config.maxMarketsToAnalyze ?? 5,
      priorityMarkets: config.priorityMarkets ?? ['US', 'EU', 'UK', 'CA', 'AU'],
      industrySpecificRules: config.industrySpecificRules ?? {}
    };
  }

  async buildContext(
    websiteData: RawWebsiteData,
    products: RawProductData[],
    complianceData: RawComplianceData[],
    marketData: RawMarketData[]
  ): Promise<ContextBuildResult> {
    this.logger.info('Starting context building process', { url: websiteData.url });

    // Step 1: Analyze website and extract business profile
    const websiteAnalysis = await this.aiOrchestrator.analyzeWebsite({
      url: websiteData.url,
      title: websiteData.metadata['og:title'] || '',
      description: websiteData.metadata['og:description'] || '',
      content: websiteData.content,
      metadata: websiteData.metadata,
      images: websiteData.images,
      links: websiteData.links
    });

    // Step 2: Create business profile
    const businessProfile: BusinessProfile = {
      businessName: websiteAnalysis.businessName,
      industry: websiteAnalysis.industry,
      subIndustry: websiteAnalysis.subindustry,
      marketFocus: this.determineMarketFocus(websiteAnalysis),
      businessSize: this.determineBusinessSize(websiteAnalysis),
      productCategories: this.extractProductCategories(websiteAnalysis.products),
      exportReadinessIndicators: websiteAnalysis.exportReadinessIndicators
    };

    // Step 3: Process and enhance products
    const processedProducts = await this.processProducts(
      products,
      businessProfile.industry
    );

    // Step 4: Process compliance data
    const processedCompliance = this.processComplianceData(
      complianceData,
      processedProducts
    );

    // Step 5: Process market data
    const processedMarketData = this.processMarketData(
      marketData,
      processedProducts
    );

    // Step 6: Validate and score the context
    const validation = this.validateContext(
      businessProfile,
      processedProducts,
      processedCompliance,
      processedMarketData
    );

    return {
      businessProfile,
      products: processedProducts,
      complianceData: processedCompliance,
      marketData: processedMarketData,
      metadata: {
        processedAt: new Date().toISOString(),
        dataQualityScore: validation.dataQualityScore,
        confidenceScores: {
          businessProfile: this.calculateConfidenceScore(businessProfile),
          products: this.calculateArrayConfidenceScore(processedProducts),
          compliance: this.calculateArrayConfidenceScore(processedCompliance),
          market: this.calculateArrayConfidenceScore(processedMarketData)
        },
        warnings: validation.warnings
      }
    };
  }

  private determineMarketFocus(websiteAnalysis: any): string {
    // Implement market focus determination logic
    return 'B2B'; // Placeholder
  }

  private determineBusinessSize(websiteAnalysis: any): string {
    // Implement business size determination logic
    return 'Medium'; // Placeholder
  }

  private extractProductCategories(products: any[]): string[] {
    return [...new Set(products.map(p => p.category))];
  }

  private async processProducts(
    products: RawProductData[],
    industry: string
  ): Promise<EnhancedProduct[]> {
    const limitedProducts = products.slice(0, this.config.maxProductsToProcess);
    
    const enhancedProducts: EnhancedProduct[] = limitedProducts.map(product => ({
      name: product.name,
      description: product.description,
      category: product.category || 'Uncategorized',
      price: product.price,
      enhancement: {
        hsCode: '',
        industrySector: industry,
        industrySubsector: '',
        exportPotential: 'Low',
        complianceRequirements: [],
        potentialMarkets: []
      }
    }));

    return await this.aiOrchestrator.enhanceProducts(enhancedProducts);
  }

  private processComplianceData(
    complianceData: RawComplianceData[],
    products: EnhancedProduct[]
  ): ComplianceData[] {
    return complianceData
      .filter(data => {
        const relevantProduct = products.find(p => 
          p.category.toLowerCase().includes(data.productType.toLowerCase())
        );
        return relevantProduct !== undefined;
      })
      .map(data => ({
        product: data.productType,
        market: data.market,
        hsCode: this.findHsCodeForProduct(data.productType, products),
        requirements: {
          certifications: [],
          standards: [],
          regulations: [],
          documentation: []
        }
      }));
  }

  private processMarketData(
    marketData: RawMarketData[],
    products: EnhancedProduct[]
  ): MarketData[] {
    return marketData
      .filter(data => {
        const relevantProduct = products.find(p =>
          p.category.toLowerCase().includes(data.productType.toLowerCase())
        );
        return relevantProduct !== undefined;
      })
      .map(data => ({
        hsCode: this.findHsCodeForProduct(data.productType, products),
        market: data.market,
        insights: {
          marketSize: this.extractMarketDataValue(data, 'marketSize', 0),
          growthRate: this.extractMarketDataValue(data, 'growthRate', 0),
          competitorAnalysis: [],
          pricingTrends: {
            averagePrice: this.extractMarketDataValue(data, 'averagePrice', 0),
            priceRange: {
              min: this.extractMarketDataValue(data, 'minPrice', 0),
              max: this.extractMarketDataValue(data, 'maxPrice', 0)
            },
            trends: []
          },
          consumerPreferences: [],
          entryBarriers: [],
          distributionChannels: []
        }
      }));
  }

  private findHsCodeForProduct(productType: string, products: EnhancedProduct[]): string {
    const product = products.find(p => 
      p.category.toLowerCase().includes(productType.toLowerCase())
    );
    return product?.enhancement.hsCode || '';
  }

  private extractMarketDataValue(data: RawMarketData, type: string, defaultValue: number): number {
    const item = data.data.find(d => d.type === type);
    return item ? Number(item.value) || defaultValue : defaultValue;
  }

  private validateContext(
    businessProfile: BusinessProfile,
    products: EnhancedProduct[],
    compliance: ComplianceData[],
    marketData: MarketData[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate business profile
    if (!businessProfile.businessName) {
      errors.push('Business name is required');
    }

    // Validate products
    if (products.length === 0) {
      errors.push('At least one product is required');
    }

    // Check for missing HS codes
    products.forEach(product => {
      if (!product.enhancement.hsCode) {
        warnings.push(`Missing HS code for product: ${product.name}`);
      }
    });

    // Calculate data quality score
    const dataQualityScore = this.calculateDataQualityScore(
      errors.length,
      warnings.length,
      products,
      compliance,
      marketData
    );

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      dataQualityScore
    };
  }

  private calculateDataQualityScore(
    errorCount: number,
    warningCount: number,
    products: EnhancedProduct[],
    compliance: ComplianceData[],
    marketData: MarketData[]
  ): number {
    let score = 100;

    // Deduct points for errors and warnings
    score -= errorCount * 10;
    score -= warningCount * 5;

    // Check data completeness
    const productScore = this.calculateArrayConfidenceScore(products);
    const complianceScore = this.calculateArrayConfidenceScore(compliance);
    const marketScore = this.calculateArrayConfidenceScore(marketData);

    score = (score + productScore + complianceScore + marketScore) / 4;
    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidenceScore(data: any): number {
    const fields = Object.keys(data);
    const nonEmptyFields = fields.filter(field => {
      const value = data[field];
      return value !== undefined && value !== null && value !== '' &&
        (typeof value !== 'object' || Object.keys(value).length > 0);
    });

    return (nonEmptyFields.length / fields.length) * 100;
  }

  private calculateArrayConfidenceScore(data: any[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + this.calculateConfidenceScore(item), 0) / data.length;
  }
} 
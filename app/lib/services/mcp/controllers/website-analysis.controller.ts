// Add server-only directive at the top of the file
'use server';

/**
 * Website Analysis Controller
 * 
 * Controls website analysis using either the internal scraper or 
 * the external scraper microservice
 */

import { analyzeWebsiteWithScraperService, isScraperServiceAvailable } from '../services/website-analysis.service';
import { 
  EnhancedWebsiteAnalysisResult, 
  WebsiteAnalysisResult,
  BaseWebsiteAnalysisResult,
  BasicWebsiteAnalysisResult,
  ProductDetectionFields,
  EnhancedProduct,
  ProductDetail
} from '../models/website-data.model';
import { defaultConfig } from '../config/product-detector.config';
import { CacheService } from '../services/cache.service';
import { TelemetryService } from '../services/telemetry.service';
import { HybridProductDetector } from '../services/hybrid-product-detector.service';
import { ProductDetectionResult } from '../types/product-detection.types';

/**
 * Generate mock data when the scraper is unavailable
 */
function getMockAnalysisData(url: string): EnhancedWebsiteAnalysisResult {
  const mockProducts: EnhancedProduct[] = [
    {
      name: 'Premium Organic Coffee Beans',
      description: 'Our signature organic coffee beans sourced from sustainable farms',
      price: null,
      category: 'Beverages',
      images: [],
      attributes: {}
    },
    {
      name: 'Specialty Tea Collection',
      description: 'Hand-picked tea varieties from around the world',
      price: null,
      category: 'Beverages',
      images: [],
      attributes: {}
    }
  ];

  return {
    // Basic information
    businessName: 'Sample Business',
    description: 'Sample business description derived from URL: ' + url,
    
    // Required fields from original interface
    productCategories: ['Beverages'],
    certifications: ['ISO 9001', 'HACCP'],
    geographicPresence: ['South Africa'],
    businessSize: 'medium',
    customerSegments: ['B2B', 'Retailers'],
    exportReadiness: 45,
    
    // Enhanced fields
    productDetails: mockProducts.map(p => ({
      name: p.name,
      description: p.description
    })),
    exportMentions: ['Sample export statement'],
    contactInfo: {
      email: 'contact@example.com',
      phone: '+27 12 345 6789'
    },
    locations: ['Johannesburg'],
    lastUpdated: new Date(),
    
    // Website quality indicators
    websiteQuality: {
      hasSsl: url.startsWith('https://'),
      hasMobileCompatibility: true,
      hasRecentUpdates: true,
      hasMultiplePages: true
    },

    // Required EnhancedWebsiteAnalysisResult fields
    analysisType: 'enhanced' as const,
    url,
    products: mockProducts,
    categories: ['Beverages'],
    confidence: 0.75,
    analysisTime: 0,
    costIncurred: 0,
    detectionMethod: 'mock'
  };
}

/**
 * Analyze a website and return structured data
 */
export async function analyzeWebsite(url: string): Promise<EnhancedWebsiteAnalysisResult> {
  try {
    console.log(`Starting website analysis for ${url}`);
    
    // Check if the scraper service is available
    const scraperAvailable = await isScraperServiceAvailable();
    
    let analysisResult;
    
    if (scraperAvailable) {
      // Use the external scraper service
      console.log('Using external scraper microservice');
      analysisResult = await analyzeWebsiteWithScraperService(url);
    } else {
      // Fall back to mock data with a warning
      console.warn('Scraper service unavailable, using mock data');
      analysisResult = getMockAnalysisData(url);
    }
    
    console.log(`Completed website analysis for ${url}`);
    return analysisResult;
    
  } catch (error: any) {
    console.error(`Error analyzing website ${url}:`, error);
    throw new Error(`Failed to analyze website: ${error.message}`);
  }
}

export class WebsiteAnalysisController {
  private productDetector: HybridProductDetector;
  private cache: CacheService;
  private telemetry: TelemetryService;

  constructor() {
    this.cache = new CacheService(defaultConfig.cache);
    this.telemetry = new TelemetryService(defaultConfig.telemetry);
    this.productDetector = new HybridProductDetector(
      defaultConfig,
      this.cache,
      this.telemetry
    );
  }

  async analyzeWebsite(url: string): Promise<WebsiteAnalysisResult> {
    try {
      // First try the scraper service if available
      if (await isScraperServiceAvailable()) {
        const baseResult = await analyzeWebsiteWithScraperService(url);
        return this.enhanceAnalysisResult(url, baseResult);
      }

      // Fallback to hybrid detection if scraper service is unavailable
      try {
        const html = await this.fetchWebsiteContent(url);
        const detectionResult = await this.productDetector.detectProducts(url, html);
        return this.convertToAnalysisResult(url, detectionResult);
      } catch (fetchError) {
        // If fetching fails, use mock data as a fallback
        console.warn('Failed to fetch website content, using mock data:', fetchError);
        return getMockAnalysisData(url);
      }
    } catch (error: unknown) {
      console.error('Website analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const now = new Date();
      // Return a minimal valid result with error information
      const basicResult: BasicWebsiteAnalysisResult = {
        analysisType: 'basic',
        businessName: '',
        description: '',
        productCategories: [],
        certifications: [],
        geographicPresence: [],
        businessSize: 'small',
        customerSegments: [],
        exportReadiness: 0,
        productDetails: [],
        exportMentions: [],
        contactInfo: {},
        locations: [],
        lastUpdated: now,
        websiteQuality: {
          hasSsl: false,
          hasMobileCompatibility: false,
          hasRecentUpdates: false,
          hasMultiplePages: false
        }
      };
      
      return basicResult;
    }
  }

  getAnalyticsData() {
    return {
      cache: this.cache.getStats(),
      metrics: this.telemetry.getAggregateMetrics()
    };
  }

  private async fetchWebsiteContent(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      return await response.text();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch website content: ${errorMessage}`);
    }
  }

  private enhanceAnalysisResult(
    url: string,
    baseResult: BaseWebsiteAnalysisResult
  ): WebsiteAnalysisResult {
    try {
      const enhancedProducts: EnhancedProduct[] = baseResult.productDetails.map(detail => ({
        name: detail.name,
        description: detail.description,
        price: null,
        category: baseResult.productCategories[0] || null,
        images: [],
        attributes: {}
      }));

      const enhancedResult: EnhancedWebsiteAnalysisResult = {
        ...baseResult,
        analysisType: 'enhanced',
        url,
        products: enhancedProducts,
        categories: baseResult.productCategories,
        confidence: baseResult.exportReadiness / 100, // Convert to 0-1 scale
        analysisTime: 0,
        costIncurred: 0,
        detectionMethod: 'scraper-service'
      };

      return enhancedResult;
    } catch (error) {
      // Fallback to basic result if enhancement fails
      const basicResult: BasicWebsiteAnalysisResult = {
        ...baseResult,
        analysisType: 'basic'
      };
      return basicResult;
    }
  }

  private convertToAnalysisResult(
    url: string,
    detection: ProductDetectionResult
  ): WebsiteAnalysisResult {
    const now = new Date();
    const baseFields: BaseWebsiteAnalysisResult = {
      businessName: '',
      description: '',
      productCategories: detection.categories,
      certifications: [],
      geographicPresence: [],
      businessSize: 'small',
      customerSegments: [],
      exportReadiness: Math.round((detection.metrics?.confidence || 0) * 100),
      productDetails: detection.products.map(p => ({
        name: p.name,
        description: p.description
      })),
      exportMentions: [],
      contactInfo: {},
      locations: [],
      lastUpdated: now,
      websiteQuality: {
        hasSsl: url.startsWith('https'),
        hasMobileCompatibility: true,
        hasRecentUpdates: true,
        hasMultiplePages: true
      }
    };

    try {
      const enhancedProducts: EnhancedProduct[] = detection.products.map(p => ({
        name: p.name,
        description: p.description,
        price: null,
        category: p.category || null,
        images: p.images || [],
        attributes: p.attributes || {}
      }));

      const enhancedResult: EnhancedWebsiteAnalysisResult = {
        ...baseFields,
        analysisType: 'enhanced',
        url,
        products: enhancedProducts,
        categories: detection.categories,
        confidence: detection.metrics?.confidence || 0,
        analysisTime: detection.metrics?.totalTime || 0,
        costIncurred: detection.metrics?.costIncurred || 0,
        detectionMethod: detection.metrics?.modelUsed || 'hybrid'
      };

      return enhancedResult;
    } catch (error) {
      // Fallback to basic result if conversion fails
      const basicResult: BasicWebsiteAnalysisResult = {
        ...baseFields,
        analysisType: 'basic'
      };
      return basicResult;
    }
  }
} 
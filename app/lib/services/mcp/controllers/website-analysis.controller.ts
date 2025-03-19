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
import { getMockAnalysisData } from '../../../utils/mock-data';

// Initialize services
const cache = new CacheService(defaultConfig.cache);
const telemetry = new TelemetryService(defaultConfig.telemetry);
const productDetector = new HybridProductDetector(
  defaultConfig,
  cache,
  telemetry
);

/**
 * Analyze a website and return structured data
 */
export async function analyzeWebsite(url: string): Promise<WebsiteAnalysisResult> {
  try {
    // First try the scraper service if available
    if (await isScraperServiceAvailable()) {
      const baseResult = await analyzeWebsiteWithScraperService(url);
      return enhanceAnalysisResult(url, baseResult);
    }

    // Fallback to hybrid detection if scraper service is unavailable
    try {
      const html = await fetchWebsiteContent(url);
      const detectionResult = await productDetector.detectProducts(url, html);
      return convertToAnalysisResult(url, detectionResult);
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

export async function getAnalyticsData() {
  return {
    cache: cache.getStats(),
    metrics: telemetry.getAggregateMetrics()
  };
}

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    return await response.text();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch website content: ${errorMessage}`);
  }
}

function enhanceAnalysisResult(
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

function convertToAnalysisResult(
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
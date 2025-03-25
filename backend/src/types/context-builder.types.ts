import { 
  BusinessProfile, 
  EnhancedProduct, 
  ComplianceData, 
  MarketData 
} from './ai-orchestrator.types';

export interface RawWebsiteData {
  url: string;
  content: string;
  metadata: Record<string, string>;
  links: string[];
  images: string[];
}

export interface RawProductData {
  name: string;
  description: string;
  category?: string;
  price?: string;
  images?: string[];
  specifications?: Record<string, string>;
}

export interface RawComplianceData {
  market: string;
  productType: string;
  requirements: {
    type: string;
    details: string;
  }[];
}

export interface RawMarketData {
  market: string;
  productType: string;
  data: {
    type: string;
    value: any;
  }[];
}

export interface ContextBuilderConfig {
  maxProductsToProcess?: number;
  maxMarketsToAnalyze?: number;
  priorityMarkets?: string[];
  industrySpecificRules?: Record<string, any>;
}

export interface ContextBuildResult {
  businessProfile: BusinessProfile;
  products: EnhancedProduct[];
  complianceData: ComplianceData[];
  marketData: MarketData[];
  metadata: {
    processedAt: string;
    dataQualityScore: number;
    confidenceScores: {
      businessProfile: number;
      products: number;
      compliance: number;
      market: number;
    };
    warnings: string[];
  };
}

export interface DataEnrichmentResult {
  enrichedData: any;
  confidence: number;
  source: string;
  timestamp: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  dataQualityScore: number;
} 
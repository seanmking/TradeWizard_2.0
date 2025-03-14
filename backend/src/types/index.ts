/**
 * Common types used throughout the application
 */

// Configuration Types
export interface ConnectorsConfig {
  tradeMap?: {
    apiKey: string;
    baseUrl: string;
  };
  comtrade?: {
    apiKey: string;
    baseUrl: string;
  };
  regulatoryDb?: {
    connectionString: string;
  };
  wits?: {
    baseUrl: string;
  };
}

// Business Analysis Types
export interface BusinessCategory {
  mainSector: string;
  subSector: string;
  attributes: string[];
  confidence: number;
}

export interface ProductInfo {
  name: string;
  description?: string;
  hsCode?: string;
  price?: string;
  category?: string;
}

export interface BusinessAnalysis {
  businessName: string;
  website: string;
  categories: BusinessCategory[];
  products: ProductInfo[];
  markets: {
    current: string[];
    confidence: number;
  };
  certifications: {
    items: string[];
    confidence: number;
  };
  businessDetails: {
    estimatedSize: string;
    yearsOperating: string;
    confidence: number;
  };
}

// HS Code Types
export interface HSCodeMapping {
  product: string;
  hsCode: string;
  description: string;
  confidence: number;
  metadata: Record<string, any>;
}

// Market Intelligence Types
export interface MarketInfo {
  id: string;
  name: string;
  description: string;
  confidence: number;
  marketSize?: string;
  growthRate?: string | number;
  entryBarriers?: string;
  regulatoryComplexity?: string;
  strengths?: string[];
}

export interface TradeFlowData {
  exporterCountry: string;
  importerCountry: string;
  hsCode: string;
  year: number;
  value: number;
  quantity?: number;
  unit?: string;
  growth?: number;
  marketShare?: number;
  flowType?: string;
  weight?: number;
}

// Regulatory Types
export interface RegulatoryRequirement {
  id?: string;
  country: string;
  productCategory: string;
  hsCode?: string;
  requirementType: string;
  description: string;
  agency: string | {
    name: string;
    country: string;
    contactEmail?: string;
    contactPhone?: string;
    website: string;
  };
  documentationRequired?: string[];
  estimatedTimeline?: string;
  estimatedCost?: string;
  confidenceLevel?: number;
  frequency?: "once-off" | "ongoing" | "periodic";
  updateFrequency?: {
    recommendedSchedule: string;
    sourcesToMonitor: string[];
    countrySpecificNotes?: string;
  };
  validationStatus?: "verified" | "unverified" | "outdated";
  lastVerifiedDate?: string;
  verificationSource?: string;
}

// Website Data Types
export interface WebsiteData {
  url: string;
  title: string;
  description?: string;
  content: string;
  links?: string[];
  images?: {
    url: string;
    alt?: string;
  }[];
  metadata?: Record<string, string>;
}

export interface WebsiteAnalysis {
  businessProfile: {
    products: ProductInfo[];
    certifications: string[];
    marketFocus: string[];
  };
  regulatoryImplications: {
    suggestedRequirements: string[];
    potentialCompliance: string[];
    riskAreas: string[];
  };
}

// LLM / AI Service Types
export interface LLM {
  complete: (prompt: string | { 
    prompt: string;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
  }) => Promise<string>;
}

// Assessment Types
export interface ExportReadinessAssessment {
  overallScore: number;
  dimensionScores: Record<string, number>;
  regulatoryCompliance?: number;
  recommendations?: string[];
}

export interface ComplianceAssessment {
  overallScore: number;
  weightedScore: number;
  satisfiedRequirements: RegulatoryRequirement[];
  missingRequirements: RegulatoryRequirement[];
  partiallyCompliantRequirements?: RegulatoryRequirement[];
  timeline?: number;
  estimatedCost?: string;
  recommendations?: string[];
}

export interface MarketReport {
  businessName: string;
  productCategories: string[];
  targetMarket: string;
  marketSize: string;
  growthRate: string;
  entryBarriers: string;
  regulatoryRequirements: RegulatoryRequirement[];
  competitorAnalysis: {
    topCompetitors: string[];
    marketShare: Record<string, number>;
    strengthsWeaknesses: Record<string, string[]>;
  };
  opportunityTimeline: {
    months: number;
    milestones: Record<string, string>;
  };
  recommendations: string[];
  generatedDate: string;
} 
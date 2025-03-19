/**
 * Model for structured website data extracted by the web scraper
 */

export interface ProductService {
  name: string;
  description: string;
  category?: string;
  images?: string[];
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  socialMedia?: {
    [platform: string]: string;
  };
}

export interface Location {
  name: string;
  type: 'headquarters' | 'office' | 'factory' | 'warehouse' | 'distribution' | 'other';
  address?: string;
  country?: string;
}

export interface ExportInfo {
  mentionedMarkets: string[];
  exportStatements: string[];
  internationalPartners?: string[];
}

export interface WebsiteData {
  url: string;
  scrapedAt: Date;
  businessName: string;
  description: string;
  products: ProductService[];
  services: ProductService[];
  certifications: string[];
  exportInfo: ExportInfo;
  contactInfo: ContactInfo;
  locations: Location[];
  teamSize?: string; // e.g., "10-50 employees"
  yearFounded?: string;
  about?: string; // About us content
  businessSizeIndicators: string[]; // Collected statements that indicate business size
  customerSegments: string[]; // Identified customer types
  
  // Raw extracted text by page/section for AI processing if needed
  rawTextBySection?: {
    [sectionKey: string]: string;
  };
}

/**
 * Processed website analysis result with export readiness metrics
 * This is what gets returned to the AI service
 */
export interface WebsiteQuality {
  hasSsl: boolean;
  hasMobileCompatibility: boolean;
  hasRecentUpdates: boolean;
  hasMultiplePages: boolean;
}

export interface ProductDetail {
  name: string;
  description: string;
}

export interface EnhancedProduct extends ProductDetail {
  price: number | null;
  category: string | null;
  images: string[];
  attributes: {
    [key: string]: string | number | boolean;
  };
}

// Base interface for website analysis results
export interface BaseWebsiteAnalysisResult {
  businessName: string;
  description: string;
  productCategories: string[];
  certifications: string[];
  geographicPresence: string[];
  businessSize: 'small' | 'medium' | 'large';
  customerSegments: string[];
  exportReadiness: number;
  productDetails: ProductDetail[];
  exportMentions: string[];
  contactInfo: ContactInfo;
  locations: string[];
  lastUpdated: Date;
  websiteQuality: WebsiteQuality;
}

// Enhanced product fields that come from the hybrid detection system
export interface ProductDetectionFields {
  url: string;
  products: EnhancedProduct[];
  categories: string[];
  confidence: number;
  analysisTime: number;
  costIncurred: number;
  detectionMethod: string;
}

// Basic analysis result with discriminator
export interface BasicWebsiteAnalysisResult extends BaseWebsiteAnalysisResult {
  analysisType: 'basic';
}

// Enhanced analysis result with discriminator
export interface EnhancedWebsiteAnalysisResult extends BaseWebsiteAnalysisResult, ProductDetectionFields {
  analysisType: 'enhanced';
}

// Union type for all possible analysis results
export type WebsiteAnalysisResult = BasicWebsiteAnalysisResult | EnhancedWebsiteAnalysisResult;

/**
 * Configuration options for the web scraper
 */
export interface ScraperOptions {
  maxPages?: number;
  timeout?: number;
  followRobotsTxt?: boolean;
  userAgent?: string;
  proxy?: string;
} 
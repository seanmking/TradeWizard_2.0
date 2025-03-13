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
    [platform: string]: string; // e.g., { "linkedin": "url", "twitter": "url" }
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
export interface EnhancedWebsiteAnalysisResult {
  // Original fields from the existing WebsiteAnalysisResult interface
  productCategories: string[];
  certifications: string[];
  geographicPresence: string[];
  businessSize: 'small' | 'medium' | 'large';
  customerSegments: string[];
  exportReadiness: number; // 0-100 score
  
  // Enhanced fields with more detailed information
  businessName: string;
  description: string;
  productDetails: Array<{
    name: string;
    description: string;
  }>;
  exportMentions: string[];
  contactInfo: ContactInfo;
  locations: string[];
  yearFounded?: string;
  lastUpdated: Date;
  
  // Website quality indicators
  websiteQuality: {
    hasSsl: boolean;
    hasMobileCompatibility: boolean;
    hasRecentUpdates: boolean;
    hasMultiplePages: boolean;
  };
}

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
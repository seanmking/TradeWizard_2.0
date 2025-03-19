/**
 * Types for the product detection system
 */

/**
 * Represents a product detected from a website
 */
export interface EnhancedProduct {
  name: string;
  description?: string;
  price?: string | number;
  url?: string;
  category?: string;
  images: string[];
  attributes: Record<string, string>;
  confidence?: number;
  detectionMethod?: string;
}

/**
 * Result of the product detection process
 */
export interface ProductDetectionResult {
  products: EnhancedProduct[];
  categories: string[];
  metrics: ProductAnalysisMetrics;
}

/**
 * Metrics collected during the product analysis
 */
export interface ProductAnalysisMetrics {
  productCount: number;
  tokensUsed: number;
  confidence?: number;
  totalTime?: number;
  error?: string;
}

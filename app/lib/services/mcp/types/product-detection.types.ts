// app/lib/services/mcp/types/product-detection.types.ts

export interface EnhancedProduct {
  name: string;
  price: number | null;
  description: string;
  category: string | null;
  images: string[];
  attributes: { [key: string]: string };
}

export interface ProductAnalysisMetrics {
  url: string;
  timestamp: string;
  modelUsed: string;
  complexity: number;
  confidence: number;
  totalTime: number;
  costIncurred: number;
  productCount: number;
  tokensUsed: number;
  error?: string;
}

export interface ProductDetectionResult {
  products: EnhancedProduct[];
  categories: string[];
  metrics?: ProductAnalysisMetrics;
} 
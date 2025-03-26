export interface ProductData {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  specifications?: Record<string, any>;
  manufacturer?: string;
  origin?: string;
  images?: string[];
}

export interface EnhancedProductData extends ProductData {
  hs_code?: string;
  category: string;
  subcategory: string;
  attributes: string[];
  additional_info_needed: string[];
  confidence_score: number;
  competitive_analysis?: {
    competing_products: Array<{
      name: string;
      price_range: string;
      market_share: string;
      positioning: string;
    }>;
    price_point_recommendation: string;
    market_entry_difficulty: string;
    potential_advantage: string;
  };
}

export interface HSCodeMapping {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
}

export interface ComplianceRequirement {
  id: string;
  hsCodePrefix: string;
  market: string;
  requirements: string[];
  certifications: string[];
  documentation: string[];
  restrictions?: string[];
} 
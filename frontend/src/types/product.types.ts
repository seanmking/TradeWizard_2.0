// Product Detection and Management Types
export interface ProductDetectionResult {
  name: string;
  description: string;
  url?: string;
  hsCode?: string;
  industrySector?: string;
  confidence: number;
  detectionMethod?: 'dom' | 'llm' | 'hybrid';
}

export interface UserProductMetadata {
  id?: string;
  userId: string;
  originalDetection: ProductDetectionResult;
  userVerifiedDetails?: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
  };
  exportReadiness?: {
    complianceScore: number;
    marketPotentialScore: number;
    overallViability: 'low' | 'medium' | 'high';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  name: string;
  parentCategory?: string;
  description?: string;
}

export interface ProductFilter {
  category?: string;
  minConfidence?: number;
  exportViability?: 'low' | 'medium' | 'high';
  sector?: string;
  tags?: string[];
}

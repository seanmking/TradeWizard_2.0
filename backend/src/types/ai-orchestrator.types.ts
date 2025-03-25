export interface BusinessProfile {
  businessName: string;
  industry: string;
  subIndustry: string;
  marketFocus: string;
  businessSize: string;
  productCategories: string[];
  exportReadinessIndicators: Record<string, any>;
}

export interface EnhancedProduct {
  name: string;
  description: string;
  category: string;
  price?: string;
  enhancement: {
    hsCode: string;
    industrySector: string;
    industrySubsector: string;
    exportPotential: 'Low' | 'Medium' | 'High';
    complianceRequirements: string[];
    potentialMarkets: string[];
  };
}

export interface AnalysisContext {
  businessProfile: BusinessProfile;
  products: EnhancedProduct[];
  complianceData: ComplianceData[];
  marketData: MarketData[];
  timestamp: string;
}

export interface ComplianceData {
  product: string;
  market: string;
  hsCode: string;
  requirements: {
    certifications: string[];
    standards: string[];
    regulations: string[];
    documentation: string[];
  };
}

export interface MarketData {
  hsCode: string;
  market: string;
  insights: {
    marketSize: number;
    growthRate: number;
    competitorAnalysis: {
      company: string;
      marketShare: number;
      strengths: string[];
      weaknesses: string[];
    }[];
    pricingTrends: {
      averagePrice: number;
      priceRange: {
        min: number;
        max: number;
      };
      trends: string[];
    };
    consumerPreferences: string[];
    entryBarriers: string[];
    distributionChannels: string[];
  };
}

export interface BusinessAnalysis {
  overallScore: number;
  strengths: string[];
  challenges: string[];
  marketOpportunities: {
    [market: string]: {
      score: number;
      details: string;
    };
  };
  complianceRequirements: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  timeline: {
    estimatedMonths: number;
    milestones: {
      month: number;
      milestone: string;
      requirements: string[];
    }[];
  };
}

export interface WebsiteData {
  url: string;
  title: string;
  description: string;
  content: string;
  metadata: Record<string, string>;
  images: string[];
  links: string[];
}

export interface WebsiteAnalysisResult {
  businessName: string;
  businessDescription: string;
  industry: string;
  subindustry: string;
  products: {
    name: string;
    description: string;
    category: string;
    price?: string;
  }[];
  contactInfo: {
    emails: string[];
    phones: string[];
    address?: string;
  };
  socialMedia: string[];
  exportReadinessIndicators: {
    hasInternationalFocus: boolean;
    mentionsExports: boolean;
    hasCertifications: string[];
    hasMultipleLanguages: boolean;
  };
} 
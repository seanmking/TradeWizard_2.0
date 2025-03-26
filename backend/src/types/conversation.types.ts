export interface UserProfile {
  company: string;
  name?: string;
  email?: string;
}

export interface ManufacturingCapacity {
  monthlyVolume?: number;
  scalabilityPercentage?: number;
  certifications?: string[];
}

export interface Product {
  name: string;
  description?: string;
  hs_code?: string;
  category?: string;
  subcategory?: string;
  identified: boolean;
  needsAnalysis: boolean;
  analyzed?: boolean;
}

export interface SMEProfile {
  products: Product[];
  targetMarkets: string[];
  manufacturingCapacity: ManufacturingCapacity;
}

export interface AssessmentProgress {
  currentStage: string;
  pendingQuestions: string[];
}

export interface Interaction {
  type: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ConversationMemory {
  conversationId: string;
  userId: string;
  userProfile: UserProfile;
  smeProfile: SMEProfile;
  assessmentProgress: AssessmentProgress;
  interactionHistory: Interaction[];
}

export interface CompetitiveAnalysis {
  competing_products: Array<{
    name: string;
    price_range: string;
    market_share: string;
    positioning: string;
  }>;
  price_point_recommendation: string;
  market_entry_difficulty: string;
  potential_advantage: string;
  market_size: number;
  growth_rate: number;
  key_competitors: string[];
  entry_barriers: string[];
  regulatory_requirements: string[];
}

export interface MarketData {
  market_size: number;
  growth_rate: number;
  trade_data: {
    imports: number;
    exports: number;
    balance: number;
  };
  regulatory_data: {
    requirements: string[];
    restrictions: string[];
  };
}

export interface CompetitiveDataMap {
  [key: string]: {
    marketData: MarketData;
    competitiveAnalysis: CompetitiveAnalysis;
  };
} 
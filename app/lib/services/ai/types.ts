/**
 * Type definitions for AI service components
 */

/**
 * Defines the types of tasks that can be performed by the AI service
 */
export type TaskType = 
  'initial_assessment' | 
  'website_analysis' | 
  'export_experience' | 
  'export_motivation' | 
  'target_markets' | 
  'summary' | 
  'follow_up' | 
  'clarification' | 
  'faq';

/**
 * Defines the levels of complexity for tasks
 */
export type TaskComplexity = 'high' | 'medium' | 'low';

export type AssessmentStage = 
  | 'welcome'
  | 'website_analysis'
  | 'production_capacity'
  | 'market_interest'
  | 'capability_assessment'
  | 'quality_standards'
  | 'financial_readiness'
  | 'operational_assessment';

export interface BusinessInfo {
  name?: string;
  website?: string;
  productCategory?: string;
  monthlyVolume?: number;
  socialMediaUrl?: string;
}

// Base market data interface with required fields
export interface BaseMarketData {
  targetMarket: string;
  importValue: number;
  marketShare: number;
  growthRate: number;
}

// Market requirements interface
export interface MarketRequirements {
  certifications: string[];
  workingCapital: number;
  paymentTerms: string;
  shippingCosts: number;
}

// Extended market data combining base data and optional requirements
export interface MarketData extends BaseMarketData {
  requirements?: MarketRequirements;
}

// Conversation action types
export type InputAction = {
  type: 'input';
  placeholder: string;
};

export type ButtonAction = {
  type: 'button';
  options: string[];
};

export type MultiChoiceAction = {
  type: 'multiChoice';
  options: string[];
};

export type ConversationAction = InputAction | ButtonAction | MultiChoiceAction;

export interface ConversationResponse {
  message: string;
  actions: ConversationAction;
  nextStage?: AssessmentStage;
}

export interface AssessmentState {
  currentStage: AssessmentStage;
  businessInfo: BusinessInfo;
  marketData?: MarketData;
  selectedMarket?: string;
  completedStages: AssessmentStage[];
} 
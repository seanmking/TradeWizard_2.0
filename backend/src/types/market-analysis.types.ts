import { EnhancedProduct } from './ai-orchestrator.types';
import { RawMarketData } from './context-builder.types';

export interface MarketMetric {
  type: string;
  value: number;
  unit?: string;
  source?: string;
  confidence?: number;
}

export interface MarketIndicator {
  name: string;
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  significance: 'high' | 'medium' | 'low';
  description: string;
}

export interface CompetitiveLandscape {
  marketConcentration: 'high' | 'medium' | 'low';
  keyPlayers: {
    name: string;
    marketShare?: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  entryBarriers: {
    type: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
  }[];
}

export interface MarketOpportunity {
  market: string;
  score: number;
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    rationale: string;
    timeline: string;
  }[];
}

export interface MarketRisk {
  type: string;
  probability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  description: string;
  mitigationStrategies: string[];
}

export interface MarketAnalysis {
  market: string;
  overview: {
    size: number;
    growth: number;
    maturity: 'emerging' | 'growing' | 'mature' | 'declining';
    volatility: 'high' | 'medium' | 'low';
  };
  metrics: MarketMetric[];
  indicators: MarketIndicator[];
  competition: CompetitiveLandscape;
  opportunities: MarketOpportunity[];
  risks: MarketRisk[];
  timestamp: string;
}

export interface MarketFitAnalysis {
  product: EnhancedProduct;
  market: string;
  overallFitScore: number;
  dimensions: {
    name: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    impact: string;
    effort: 'high' | 'medium' | 'low';
  }[];
}

export interface MarketAnalysisConfig {
  priorityMarkets: string[];
  minConfidenceScore: number;
  maxMarketsToAnalyze: number;
  weightings: {
    marketSize: number;
    growthRate: number;
    competition: number;
    entryBarriers: number;
    regulations: number;
  };
}

export interface MarketAnalysisResult {
  timestamp: string;
  analyses: MarketAnalysis[];
  productFit: MarketFitAnalysis[];
  summary: {
    topMarkets: string[];
    totalOpportunityScore: number;
    averageMarketFitScore: number;
    keyFindings: string[];
    recommendations: {
      priority: 'high' | 'medium' | 'low';
      market: string;
      action: string;
      rationale: string;
    }[];
  };
  metadata: {
    dataQuality: {
      completeness: number;
      reliability: number;
      timeliness: number;
    };
    analysisConfidence: number;
    dataGaps: {
      market: string;
      missingData: string[];
      impact: 'high' | 'medium' | 'low';
    }[];
  };
} 
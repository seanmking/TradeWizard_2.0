export interface CacheConfig {
  enabled: boolean;
  ttlMs: number;  // Time-to-live in milliseconds
  maxEntries: number;
}

export interface LLMConfig {
  defaultModel: string;
  fallbackModel: string;
  maxTokens: number;
  costPerToken: number;
  complexityThresholds: {
    simple: number;
    medium: number;
    complex: number;
  };
}

export interface TelemetryConfig {
  enabled: boolean;
  sampleRate: number;
  metricsEndpoint: string;
}

export interface ProductDetectorConfig {
  useLLM: boolean;
  confidenceThreshold: number;
  maxAnalysisTime: number;
  cache: CacheConfig;
  llm: LLMConfig;
  telemetry: TelemetryConfig;
  costOptimization: {
    maxCostPerAnalysis: number;
    minProductsForLLM: number;
    complexityFactors: string[];
  };
}

export const defaultConfig: ProductDetectorConfig = {
  useLLM: process.env.USE_LLM === 'true',
  confidenceThreshold: Number(process.env.CONFIDENCE_THRESHOLD) || 0.6,
  maxAnalysisTime: Number(process.env.MAX_ANALYSIS_TIME) || 30000,
  
  cache: {
    enabled: process.env.ENABLE_CACHE !== 'false',
    ttlMs: Number(process.env.CACHE_TTL_MS) || 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: Number(process.env.CACHE_MAX_ENTRIES) || 1000
  },
  
  llm: {
    defaultModel: process.env.DEFAULT_LLM_MODEL || 'gpt-3.5-turbo',
    fallbackModel: process.env.FALLBACK_LLM_MODEL || 'gpt-3.5-turbo-instruct',
    maxTokens: Number(process.env.MAX_TOKENS) || 4000,
    costPerToken: Number(process.env.COST_PER_TOKEN) || 0.000002, // $0.002 per 1K tokens
    complexityThresholds: {
      simple: 0.3,
      medium: 0.6,
      complex: 0.8
    }
  },
  
  telemetry: {
    enabled: process.env.ENABLE_TELEMETRY !== 'false',
    sampleRate: Number(process.env.TELEMETRY_SAMPLE_RATE) || 0.1, // 10% sampling
    metricsEndpoint: process.env.METRICS_ENDPOINT || '/api/metrics'
  },
  
  costOptimization: {
    maxCostPerAnalysis: Number(process.env.MAX_COST_PER_ANALYSIS) || 0.05, // $0.05 per analysis
    minProductsForLLM: Number(process.env.MIN_PRODUCTS_FOR_LLM) || 2,
    complexityFactors: [
      'productCount',
      'textLength',
      'structureComplexity',
      'hasEcommerce',
      'domainReputation'
    ]
  }
};

// Helper function to determine website complexity
export function calculateWebsiteComplexity(
  productCount: number,
  textLength: number,
  domStructureDepth: number,
  hasEcommerce: boolean
): number {
  let complexity = 0;
  
  // Product count factor (0-0.3)
  complexity += Math.min(productCount / 50, 1) * 0.3;
  
  // Text length factor (0-0.2)
  complexity += Math.min(textLength / 10000, 1) * 0.2;
  
  // DOM structure complexity (0-0.3)
  complexity += Math.min(domStructureDepth / 10, 1) * 0.3;
  
  // E-commerce factor (0-0.2)
  if (hasEcommerce) complexity += 0.2;
  
  return Math.min(complexity, 1);
}

// Helper function to estimate analysis cost
export function estimateAnalysisCost(
  textLength: number,
  model: string,
  config: ProductDetectorConfig
): number {
  // Rough estimate of tokens (1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil(textLength / 4);
  return (estimatedTokens * config.llm.costPerToken);
}

// Helper function to determine appropriate LLM model
export function selectLLMModel(
  complexity: number,
  config: ProductDetectorConfig
): string {
  if (complexity >= config.llm.complexityThresholds.complex) {
    return config.llm.defaultModel;
  }
  return config.llm.fallbackModel;
} 
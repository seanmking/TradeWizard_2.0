import dotenv from 'dotenv';

dotenv.config();

export const Configuration = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GPT_MODEL: 'gpt-4',
  TEMPERATURE: 0.2,
  MAX_TOKENS: 2000,
  SYSTEM_PROMPT: `You are an expert in international trade and product classification. 
    Your role is to analyze products and provide accurate HS codes and export requirements.
    Always be precise and thorough in your analysis.`,
  
  // Confidence thresholds for product analysis
  CONFIDENCE_THRESHOLDS: {
    HIGH: 90,
    MEDIUM: 70,
    LOW: 50
  },
  
  // Retry configuration for API calls
  RETRY_CONFIG: {
    MAX_RETRIES: 3,
    INITIAL_RETRY_DELAY: 1000,
    MAX_RETRY_DELAY: 5000
  }
};

// Validate required configuration
if (!Configuration.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required but not provided in environment variables');
} 
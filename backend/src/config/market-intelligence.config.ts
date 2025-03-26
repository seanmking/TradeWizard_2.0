import dotenv from 'dotenv';

dotenv.config();

export const MarketIntelligenceConfig = {
  WORLD_BANK_API: {
    BASE_URL: process.env.WORLD_BANK_API_URL || 'https://api.worldbank.org/v2',
    FORMAT: process.env.WORLD_BANK_API_FORMAT || 'json',
    PER_PAGE: parseInt(process.env.WORLD_BANK_API_PER_PAGE || '1', 10),
    CACHE_TTL: parseInt(process.env.WORLD_BANK_API_CACHE_TTL || '86400', 10),
    ENABLED: process.env.ENABLE_WORLD_BANK_API === 'true'
  },

  REGULATORY_API: {
    ENABLED: process.env.ENABLE_REGULATORY_API === 'true'
  },

  CACHE: {
    MARKET_DATA_DAYS: parseInt(process.env.MARKET_DATA_CACHE_DAYS || '30', 10)
  },

  // Trade indicators we're interested in
  INDICATORS: {
    EXPORTS: 'NE.EXP.GNFS.ZS',  // Exports of goods and services (% of GDP)
    TRADE: 'TG.VAL.TOTL.GD.ZS', // Trade (% of GDP)
    GDP: 'NY.GDP.MKTP.CD',      // GDP (current US$)
    TARIFF: 'TM.TAX.MRCH.WM.AR.ZS', // Tariff rate, applied, weighted mean, all products (%)
    FDI: 'BX.KLT.DINV.WD.GD.ZS'     // Foreign direct investment, net inflows (% of GDP)
  },

  // Market analysis configuration
  ANALYSIS: {
    MIN_CONFIDENCE_SCORE: 70,  // Minimum confidence score for market analysis
    MAX_COMPETITORS: 10,       // Maximum number of competitors to track
    MARKET_SIZE_THRESHOLD: 1000000  // Minimum market size in USD to consider
  }
}; 
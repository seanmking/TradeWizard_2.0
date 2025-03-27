import { BaseMarketData, MarketData, MarketRequirements } from '../ai/types';

export class WITSDataService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheDuration = 3600000; // 1 hour in milliseconds

  constructor() {
    this.baseUrl = process.env.WITS_SDMX_BASE_URL || 'https://wits.worldbank.org/API/V1/SDMX/V21/rest/data/';
    this.cache = new Map();
  }

  private async fetchWithCache(url: string): Promise<any> {
    const cacheKey = url;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);

    if (cached && now - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: now });
      return data;
    } catch (error) {
      console.error('Error fetching WITS data:', error);
      return null;
    }
  }

  async getMarketData(productCode: string, targetMarket: string): Promise<MarketData | null> {
    try {
      // Placeholder: Replace with actual WITS API call
      const data = await this.fetchWithCache(`${this.baseUrl}/market-data/${productCode}/${targetMarket}`);
      
      if (!data) return null;

      const baseData: BaseMarketData = {
        targetMarket,
        importValue: data.importValue || 0,
        marketShare: data.marketShare || 0,
        growthRate: data.growthRate || 0
      };

      return baseData;
    } catch (error) {
      console.error('Error getting market data:', error);
      return null;
    }
  }

  async getTopMarkets(productCode: string, limit: number = 3): Promise<BaseMarketData[]> {
    try {
      // Placeholder: Replace with actual WITS API call
      const data = await this.fetchWithCache(`${this.baseUrl}/top-markets/${productCode}`);
      
      if (!data) return [];

      // Simulated data for development
      const markets: BaseMarketData[] = [
        { targetMarket: 'UAE', importValue: 1000000, marketShare: 5, growthRate: 12 },
        { targetMarket: 'Saudi Arabia', importValue: 800000, marketShare: 4, growthRate: 10 },
        { targetMarket: 'Qatar', importValue: 500000, marketShare: 3, growthRate: 8 }
      ];

      return markets.slice(0, limit);
    } catch (error) {
      console.error('Error getting top markets:', error);
      return [];
    }
  }

  async getMarketRequirements(productCode: string, market: string): Promise<MarketData | null> {
    try {
      // Placeholder: Replace with actual WITS API call
      const data = await this.fetchWithCache(`${this.baseUrl}/requirements/${productCode}/${market}`);
      
      if (!data) return null;

      const baseData: BaseMarketData = {
        targetMarket: market,
        importValue: data.importValue || 0,
        marketShare: data.marketShare || 0,
        growthRate: data.growthRate || 0
      };

      const requirements: MarketRequirements = {
        certifications: ['ISO 9001', 'HACCP', 'GMP'],
        workingCapital: 100000,
        paymentTerms: 'Net 60',
        shippingCosts: 5000
      };

      return {
        ...baseData,
        requirements
      };
    } catch (error) {
      console.error('Error getting market requirements:', error);
      return null;
    }
  }
} 
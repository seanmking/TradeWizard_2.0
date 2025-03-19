import axios from 'axios';
import Redis from 'ioredis';

class MarketIntelligenceMCPService {
  private redisClient: Redis;
  private static MARKET_DATA_SOURCES = {
    comtrade: 'https://comtrade.un.org/api/v1',
    trademap: 'https://www.trademap.org/api/v1'
  };

  constructor() {
    this.redisClient = new Redis(process.env.REDIS_URL);
  }

  async getMarketOpportunities(productData: MarketIntelligenceQuery) {
    // Generate unique cache key
    const cacheKey = this.generateCacheKey(productData);
    
    // Check cache first
    const cachedResult = await this.getCachedMarketData(cacheKey);
    if (cachedResult) return cachedResult;

    // Prepare query parameters
    const queryParams = this.transformProductData(productData);

    // Fetch market insights from multiple sources
    const marketInsights = await Promise.all([
      this.fetchComtradeData(queryParams),
      this.fetchTradeMapData(queryParams)
    ]);

    // Consolidate market intelligence
    const consolidatedInsights = this.consolidateMarketInsights(marketInsights);

    // Cache the result
    await this.cacheMarketData(cacheKey, consolidatedInsights);

    return consolidatedInsights;
  }

  private transformProductData(productData: MarketIntelligenceQuery) {
    return {
      hsCode: productData.hsCode || this.deriveHSCode(productData),
      productName: productData.name,
      sector: productData.industrySector,
      potentialMarkets: productData.potentialMarkets || ['USA', 'EU', 'UAE']
    };
  }

  private deriveHSCode(productData: MarketIntelligenceQuery): string {
    // Similar to Compliance MCP, use intelligent HS Code derivation
    const productNameLower = productData.name.toLowerCase();

    const hsCodeMappings: { [key: string]: string } = {
      'tea': '0902',
      'coffee': '0901',
      'leather': '4203',
      'bag': '4202',
      'textile': '5209',
      'clothing': '6203'
    };

    for (const [keyword, hsCode] of Object.entries(hsCodeMappings)) {
      if (productNameLower.includes(keyword)) return hsCode;
    }

    return 'Unknown';
  }

  private async fetchComtradeData(query: any) {
    try {
      const response = await axios.get(`${MarketIntelligenceMCPService.MARKET_DATA_SOURCES.comtrade}/market-insights`, { 
        params: query 
      });
      return response.data;
    } catch (error) {
      console.warn('Comtrade Market Data Fetch Error:', error);
      return null;
    }
  }

  private async fetchTradeMapData(query: any) {
    try {
      const response = await axios.get(`${MarketIntelligenceMCPService.MARKET_DATA_SOURCES.trademap}/market-trends`, { 
        params: query 
      });
      return response.data;
    } catch (error) {
      console.warn('TradeMap Market Data Fetch Error:', error);
      return null;
    }
  }

  private consolidateMarketInsights(insights: any[]) {
    const consolidatedData = {
      globalDemand: {
        totalValue: 0,
        growthRate: 0
      },
      topImportingCountries: [],
      priceRanges: {},
      competitiveLandscape: {
        topCompetitors: [],
        marketConcentration: 0
      },
      emergingOpportunities: []
    };

    insights.forEach(insight => {
      if (insight) {
        // Aggregate global demand
        consolidatedData.globalDemand.totalValue += insight.totalMarketValue || 0;
        consolidatedData.globalDemand.growthRate = Math.max(
          consolidatedData.globalDemand.growthRate, 
          insight.marketGrowthRate || 0
        );

        // Collect top importing countries
        consolidatedData.topImportingCountries.push(...(insight.topImportingCountries || []));

        // Aggregate price ranges
        if (insight.priceRanges) {
          Object.assign(consolidatedData.priceRanges, insight.priceRanges);
        }

        // Collect competitors
        consolidatedData.competitiveLandscape.topCompetitors.push(...(insight.topCompetitors || []));
        
        // Identify emerging opportunities
        consolidatedData.emergingOpportunities.push(...(insight.emergingMarkets || []));
      }
    });

    // Remove duplicates and limit results
    consolidatedData.topImportingCountries = [...new Set(consolidatedData.topImportingCountries)].slice(0, 5);
    consolidatedData.competitiveLandscape.topCompetitors = [...new Set(consolidatedData.competitiveLandscape.topCompetitors)].slice(0, 3);
    consolidatedData.emergingOpportunities = [...new Set(consolidatedData.emergingOpportunities)].slice(0, 3);

    return consolidatedData;
  }

  private generateCacheKey(productData: MarketIntelligenceQuery): string {
    return `market-intel:${productData.name}:${productData.hsCode || 'unknown'}`;
  }

  private async getCachedMarketData(key: string) {
    const cachedData = await this.redisClient.get(key);
    return cachedData ? JSON.parse(cachedData) : null;
  }

  private async cacheMarketData(key: string, data: any) {
    // Cache for 7 days
    await this.redisClient.set(key, JSON.stringify(data), 'EX', 7 * 24 * 60 * 60);
  }

  // Cache management methods
  async clearMarketIntelCache() {
    const keys = await this.redisClient.keys('market-intel:*');
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
    return keys.length;
  }

  async getMarketIntelCacheStats() {
    const keys = await this.redisClient.keys('market-intel:*');
    return {
      totalCachedItems: keys.length,
      cacheSize: await Promise.all(
        keys.map(key => this.redisClient.strlen(key))
      ).then(sizes => sizes.reduce((a, b) => a + b, 0))
    };
  }
}

interface MarketIntelligenceQuery {
  name: string;
  hsCode?: string;
  industrySector?: string;
  potentialMarkets?: string[];
}

export default MarketIntelligenceMCPService;

import { PrismaClient } from '@prisma/client';
import { Configuration } from '../config/llm.config';
import { MarketIntelligenceConfig } from '../config/market-intelligence.config';
import { OpenAI } from 'openai';

export interface MarketIntelligenceData {
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

interface WorldBankData {
  exports?: number;
  trade?: number;
  gdp?: number;
  tariff?: number;
  fdi?: number;
}

interface WorldBankResponse {
  data: Array<{
    value: number;
    date: string;
    indicator: {
      id: string;
      value: string;
    };
  }>;
}

interface MarketData {
  exports: number;
  imports: number;
  gdp: number;
  tariffRate: number;
  fdi: number;
}

export class MarketIntelligenceService {
  private prisma: PrismaClient;
  private openai: OpenAI;

  constructor() {
    this.prisma = new PrismaClient();
    this.openai = new OpenAI({
      apiKey: Configuration.OPENAI_API_KEY
    });
  }

  async getMarketData(hsCode: string, market: string): Promise<MarketIntelligenceData | null> {
    try {
      // Get market data from the database
      const marketData = await this.prisma.marketIntelligence.findFirst({
        where: {
          hsCodePrefix: hsCode.substring(0, 6),
          market: market,
          validUntil: {
            gte: new Date()
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      if (marketData) {
        return {
          competing_products: marketData.competing_products as Array<{
            name: string;
            price_range: string;
            market_share: string;
            positioning: string;
          }>,
          price_point_recommendation: marketData.price_point_recommendation,
          market_entry_difficulty: marketData.market_entry_difficulty,
          potential_advantage: marketData.potential_advantage,
          market_size: marketData.market_size,
          growth_rate: marketData.growth_rate,
          key_competitors: marketData.key_competitors,
          entry_barriers: marketData.entry_barriers,
          regulatory_requirements: marketData.regulatory_requirements
        };
      }

      // If no data exists or is outdated, fetch from external sources
      return await this.fetchExternalMarketData(hsCode, market);
    } catch (error) {
      console.error('Error fetching market intelligence data:', error);
      throw new Error('Failed to fetch market intelligence data');
    }
  }

  private async fetchExternalMarketData(hsCode: string, market: string): Promise<MarketIntelligenceData | null> {
    try {
      let tradeData: WorldBankData | null = null;
      let regulatoryData: any = null;

      // Fetch World Bank data if enabled
      if (MarketIntelligenceConfig.WORLD_BANK_API.ENABLED) {
        tradeData = await this.fetchWorldBankData(market);
      }

      // Fetch regulatory data if enabled
      if (MarketIntelligenceConfig.REGULATORY_API.ENABLED) {
        regulatoryData = await this.fetchRegulatoryData(hsCode, market);
      }

      // Use GPT-4 to analyze and combine the data
      const marketAnalysis = await this.analyzeMarketData(tradeData, hsCode, market);
      
      if (!marketAnalysis) {
        return null;
      }

      // Validate market size threshold
      if (marketAnalysis.market_size < MarketIntelligenceConfig.ANALYSIS.MIN_CONFIDENCE_SCORE) {
        console.warn('Market size below threshold:', marketAnalysis.market_size);
      }

      // Limit number of competitors
      marketAnalysis.key_competitors = marketAnalysis.key_competitors
        .slice(0, MarketIntelligenceConfig.ANALYSIS.MAX_COMPETITORS);

      // Store the analyzed data in our database
      await this.prisma.marketIntelligence.create({
        data: {
          hsCodePrefix: hsCode.substring(0, 6),
          market,
          competing_products: marketAnalysis.competing_products,
          price_point_recommendation: marketAnalysis.price_point_recommendation,
          market_entry_difficulty: marketAnalysis.market_entry_difficulty,
          potential_advantage: marketAnalysis.potential_advantage,
          market_size: marketAnalysis.market_size,
          growth_rate: marketAnalysis.growth_rate,
          key_competitors: marketAnalysis.key_competitors,
          entry_barriers: marketAnalysis.entry_barriers,
          regulatory_requirements: marketAnalysis.regulatory_requirements,
          validUntil: new Date(Date.now() + MarketIntelligenceConfig.CACHE.MARKET_DATA_DAYS * 24 * 60 * 60 * 1000)
        }
      });

      return marketAnalysis;
    } catch (error) {
      console.error('Error fetching external market data:', error);
      return null;
    }
  }

  private async fetchWorldBankData(country: string): Promise<MarketData> {
    const { BASE_URL, FORMAT, PER_PAGE } = MarketIntelligenceConfig.WORLD_BANK_API;
    const { INDICATORS } = MarketIntelligenceConfig;

    try {
      const responses = await Promise.all(
        Object.values(INDICATORS).map(indicator =>
          fetch(`${BASE_URL}/country/${country}/indicator/${indicator}?format=${FORMAT}&per_page=${PER_PAGE}&mrnev=1`)
        )
      );

      const data = await Promise.all(
        responses.map(response => response.json())
      );

      return {
        exports: data[0][1]?.[0]?.value,
        trade: data[1][1]?.[0]?.value,
        gdp: data[2][1]?.[0]?.value,
        tariff: data[3][1]?.[0]?.value,
        fdi: data[4][1]?.[0]?.value
      };
    } catch (error) {
      console.error('Error fetching World Bank data:', error);
      throw new Error('Failed to fetch World Bank data');
    }
  }

  private async fetchRegulatoryData(hsCode: string, market: string) {
    // This would integrate with government APIs for regulatory data
    // For now, we'll return null to indicate no direct API access
    return null;
  }

  private async analyzeMarketData(marketData: MarketData, hsCode: string, market: string): Promise<MarketIntelligenceData | null> {
    try {
      const prompt = `
        You are an expert market analyst specializing in international trade.
        
        Analyze the following trade data and provide market intelligence insights:
        
        HS Code: ${hsCode}
        Market: ${market}
        Trade Data: ${JSON.stringify(marketData)}
        
        Consider the following aspects:
        1. Market size and growth potential based on GDP and trade data
        2. Competitive landscape and market positioning
        3. Entry barriers including tariffs and regulations
        4. Price points based on market positioning and competition
        5. Market entry difficulty considering all factors
        
        Return the analysis in a structured JSON format matching the MarketIntelligenceData interface.
        Ensure all numeric values are realistic and based on the provided data.
        
        Required format:
        {
          "competing_products": [
            {
              "name": "string",
              "price_range": "string",
              "market_share": "string",
              "positioning": "string"
            }
          ],
          "price_point_recommendation": "string",
          "market_entry_difficulty": "string",
          "potential_advantage": "string",
          "market_size": number,
          "growth_rate": number,
          "key_competitors": ["string"],
          "entry_barriers": ["string"],
          "regulatory_requirements": ["string"]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      if (!response.choices[0].message.content) {
        throw new Error('No response content from OpenAI');
      }

      const analysis = JSON.parse(response.choices[0].message.content) as MarketIntelligenceData;

      // Validate the analysis data
      if (!this.validateMarketAnalysis(analysis)) {
        throw new Error('Invalid market analysis data');
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing market data:', error);
      return null;
    }
  }

  private validateMarketAnalysis(analysis: any): analysis is MarketIntelligenceData {
    return (
      analysis &&
      Array.isArray(analysis.competing_products) &&
      analysis.competing_products.every((product: any) =>
        typeof product.name === 'string' &&
        typeof product.price_range === 'string' &&
        typeof product.market_share === 'string' &&
        typeof product.positioning === 'string'
      ) &&
      typeof analysis.price_point_recommendation === 'string' &&
      typeof analysis.market_entry_difficulty === 'string' &&
      typeof analysis.potential_advantage === 'string' &&
      typeof analysis.market_size === 'number' &&
      typeof analysis.growth_rate === 'number' &&
      Array.isArray(analysis.key_competitors) &&
      analysis.key_competitors.every((competitor: string) => typeof competitor === 'string') &&
      Array.isArray(analysis.entry_barriers) &&
      analysis.entry_barriers.every((barrier: string) => typeof barrier === 'string') &&
      Array.isArray(analysis.regulatory_requirements) &&
      analysis.regulatory_requirements.every((req: string) => typeof req === 'string')
    );
  }
} 
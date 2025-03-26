import { MCPHandler, MCPResponse, MCPOutputMode } from '../../shared/schema';
import { mcpCache } from '../../shared/cache';
import { MCPTransformer } from '../../shared/transform';
import { TradeFlow, TradeFlowSchema, BuyerList, BuyerListSchema, MarketSize, MarketSizeSchema } from '../types';
import { WITSService } from '../services/WITSService';
import axios from 'axios';

interface MarketIntelligenceParams {
  hs_code?: string;
  market?: string;
  industry?: string;
  country?: string;
  product?: string;
}

export class MarketIntelligenceHandler implements MCPHandler<TradeFlow | BuyerList | MarketSize> {
  private static readonly CACHE_TTL = 12 * 60 * 60; // 12 hours
  private witsService: WITSService;

  constructor() {
    this.witsService = new WITSService();
  }

  async handle(params: MarketIntelligenceParams): Promise<MCPResponse<TradeFlow | BuyerList | MarketSize>> {
    const cacheConfig = this.getCacheConfig(params);
    const cachedData = await mcpCache.get<TradeFlow | BuyerList | MarketSize>(cacheConfig.key);

    if (cachedData) {
      return cachedData;
    }

    try {
      let data: TradeFlow | BuyerList | MarketSize;
      let validatedData: TradeFlow | BuyerList | MarketSize;
      let context = '';

      // Determine which type of market intelligence to fetch
      if (params.hs_code && params.market) {
        data = await this.fetchTradeFlowData(params);
        validatedData = TradeFlowSchema.parse(data);
        context = `Trade flow data for ${params.hs_code} in ${params.market}`;
      } else if (params.industry && params.country) {
        data = await this.fetchBuyerData(params);
        validatedData = BuyerListSchema.parse(data);
        context = `Buyer information for ${params.industry} in ${params.country}`;
      } else if (params.product && params.country) {
        data = await this.fetchMarketSizeData(params);
        validatedData = MarketSizeSchema.parse(data);
        context = `Market size analysis for ${params.product} in ${params.country}`;
      } else {
        throw new Error('Invalid parameter combination');
      }

      // Calculate confidence score
      const confidence_score = this.calculateConfidenceScore(validatedData);

      // Transform output
      const { ui_format, agent_format } = await MCPTransformer.transformOutput(
        validatedData,
        'both',
        { context }
      );

      const response: MCPResponse<typeof validatedData> = {
        status: 'success',
        data: validatedData,
        ui_format,
        agent_format,
        confidence_score,
        metadata: {
          source: 'WITS + ITC TradeMap',
          last_updated: new Date().toISOString(),
          source_quality_score: 0.9,
          data_completeness: this.determineDataCompleteness(validatedData)
        }
      };

      // Cache the response
      await mcpCache.set(cacheConfig.key, response, cacheConfig);

      return response;

    } catch (error) {
      console.error('Market Intelligence MCP Error:', error);
      return {
        status: 'error',
        data: {} as any,
        confidence_score: 0,
        metadata: {
          source: 'Error',
          last_updated: new Date().toISOString(),
          data_completeness: 'partial'
        },
        known_gaps: ['Failed to fetch market intelligence data'],
        fallback_suggestions: [
          'Check WITS database directly',
          'Consult ITC TradeMap',
          'Review industry reports'
        ]
      };
    }
  }

  getCacheConfig(params: MarketIntelligenceParams) {
    return {
      ttl: MarketIntelligenceHandler.CACHE_TTL,
      prefetch: true,
      key: mcpCache.generateKey('market', params)
    };
  }

  private async fetchTradeFlowData(params: MarketIntelligenceParams): Promise<TradeFlow> {
    const currentYear = new Date().getFullYear();
    const [tradeFlow, historicalTrend, tradingPartners] = await Promise.all([
      // Get current year trade flow data
      this.witsService.getTradeFlowData({
        reporter: 'WLD', // World as reporter for global trade
        partner: params.market!,
        year: currentYear - 1, // Use previous year as current year data might be incomplete
        productCode: params.hs_code!
      }),
      // Get historical trend
      this.witsService.getHistoricalTrend({
        reporter: 'WLD',
        partner: params.market!,
        productCode: params.hs_code!,
        startYear: currentYear - 5,
        endYear: currentYear - 1
      }),
      // Get top trading partners
      this.witsService.getTopTradingPartners({
        reporter: 'WLD',
        productCode: params.hs_code!,
        year: currentYear - 1,
        limit: 10
      })
    ]);

    return {
      ...tradeFlow,
      historical_trend: historicalTrend,
      top_exporters: tradingPartners.top_exporters,
      top_importers: tradingPartners.top_importers,
      trade_balance: tradeFlow.total_export_value - tradeFlow.total_import_value
    };
  }

  private async fetchBuyerData(params: MarketIntelligenceParams): Promise<BuyerList> {
    // TODO: Implement actual buyer database integration
    // For now, return mock data
    return {
      industry: params.industry!,
      country: params.country!,
      buyers: [
        {
          company_name: 'Global Trade Corp',
          country: params.country!,
          industry: params.industry!,
          import_volume: 500000,
          contact_info: {
            website: 'www.example.com',
            email: 'contact@example.com'
          },
          product_interests: ['Food', 'Beverages'],
          certification_requirements: ['ISO 9001', 'HACCP'],
          reliability_score: 0.95
        }
      ],
      total_count: 1,
      market_coverage: 0.8
    };
  }

  private async fetchMarketSizeData(params: MarketIntelligenceParams): Promise<MarketSize> {
    // TODO: Implement actual market research API integration
    // For now, return mock data
    return {
      product: params.product!,
      country: params.country!,
      total_market_size: 5000000,
      market_growth_rate: 0.08,
      market_share_distribution: [
        { segment: 'Premium', share: 0.3, value: 1500000 },
        { segment: 'Mid-range', share: 0.5, value: 2500000 },
        { segment: 'Economy', share: 0.2, value: 1000000 }
      ],
      forecast: [
        { year: 2024, projected_size: 5400000, growth_rate: 0.08 },
        { year: 2025, projected_size: 5832000, growth_rate: 0.08 }
      ],
      key_trends: [
        'Increasing demand for sustainable products',
        'Digital transformation in distribution',
        'Premium segment growth'
      ],
      competitive_landscape: {
        market_concentration: 0.65,
        key_players: [
          { name: 'Market Leader A', market_share: 0.25 },
          { name: 'Competitor B', market_share: 0.2 }
        ]
      }
    };
  }

  private calculateConfidenceScore(data: any): number {
    // Different scoring logic based on data type
    if ('total_import_value' in data) {
      // Trade flow data
      const requiredFields = ['total_import_value', 'total_export_value', 'growth_rate'];
      const optionalFields = ['top_exporters', 'top_importers', 'historical_trend'];
      return this.calculateScoreFromFields(data, requiredFields, optionalFields);
    } else if ('buyers' in data) {
      // Buyer list data
      return Math.min(data.market_coverage, 1);
    } else if ('total_market_size' in data) {
      // Market size data
      const requiredFields = ['total_market_size', 'market_growth_rate'];
      const optionalFields = ['market_share_distribution', 'forecast', 'key_trends'];
      return this.calculateScoreFromFields(data, requiredFields, optionalFields);
    }
    return 0;
  }

  private calculateScoreFromFields(data: any, requiredFields: string[], optionalFields: string[]): number {
    const requiredScore = requiredFields.reduce((score, field) => {
      return score + (data[field] ? 1 : 0);
    }, 0) / requiredFields.length;

    const optionalScore = optionalFields.reduce((score, field) => {
      return score + (data[field] ? 0.5 : 0);
    }, 0) / optionalFields.length;

    return Math.min(requiredScore * 0.7 + optionalScore * 0.3, 1);
  }

  private determineDataCompleteness(data: any): 'complete' | 'partial' | 'outdated' {
    const now = new Date();
    const dataYear = data.year || now.getFullYear();
    
    if (now.getFullYear() - dataYear > 2) {
      return 'outdated';
    }

    if ('total_import_value' in data) {
      return data.total_import_value && data.total_export_value ? 'complete' : 'partial';
    } else if ('buyers' in data) {
      return data.market_coverage > 0.7 ? 'complete' : 'partial';
    } else if ('total_market_size' in data) {
      return data.total_market_size && data.market_growth_rate ? 'complete' : 'partial';
    }

    return 'partial';
  }
} 
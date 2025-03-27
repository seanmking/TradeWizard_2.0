import { z } from 'zod';
import { WITSService } from '../services/WITSService';
import { RedisCache } from '../../shared/cache';
import { 
  MarketIntelligenceParams,
  MarketIntelligenceData,
  TradeFlowParams,
  TariffParams,
  MarketSizeParams,
  BuyersParams,
  isTradeFlowParams,
  isTariffParams,
  isMarketSizeParams,
  isBuyersParams,
  TradeFlowData,
  TariffData,
  MarketSizeData,
  BuyersData
} from '../../../types/market-intelligence.types';
import { ApiResponse } from '../../../types/api.types';
import { ValidationError } from '../../../utils/error.utils';
import { createSuccessResponse, createPartialSuccessResponse } from '../../../utils/response.utils';

export class MarketIntelligenceHandler {
  private witsService: WITSService;
  private cache: RedisCache;

  constructor(witsService: WITSService, cache: RedisCache) {
    this.witsService = witsService;
    this.cache = cache;
  }

  /**
   * Handle market intelligence requests based on type
   */
  async handle(params: MarketIntelligenceParams): Promise<ApiResponse<MarketIntelligenceData>> {
    this.validateParams(params);
    
    if (isTradeFlowParams(params)) {
      return this.handleTradeFlow(params);
    }
    if (isTariffParams(params)) {
      return this.handleTariff(params);
    }
    if (isMarketSizeParams(params)) {
      return this.handleMarketSize(params);
    }
    if (isBuyersParams(params)) {
      return this.handleBuyers(params);
    }
    
    throw new ValidationError('Invalid request type');
  }

  /**
   * Validate request parameters
   */
  private validateParams(params: MarketIntelligenceParams): void {
    const baseSchema = z.object({
      type: z.string()
    });

    const tradeFlowSchema = baseSchema.extend({
      hs_code: z.string(),
      market: z.string(),
      year: z.number().optional()
    });

    const tariffSchema = baseSchema.extend({
      hs_code: z.string(),
      origin: z.string(),
      destination: z.string()
    });

    const marketSizeSchema = baseSchema.extend({
      product: z.string(),
      country: z.string()
    });

    const buyersSchema = baseSchema.extend({
      industry: z.string(),
      country: z.string()
    });

    try {
      if (isTradeFlowParams(params)) {
        tradeFlowSchema.parse(params);
      } else if (isTariffParams(params)) {
        tariffSchema.parse(params);
      } else if (isMarketSizeParams(params)) {
        marketSizeSchema.parse(params);
      } else if (isBuyersParams(params)) {
        buyersSchema.parse(params);
      } else {
        throw new Error('Invalid parameter type');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid parameters', { 
          validation_errors: error.errors 
        });
      }
      throw error;
    }
  }

  /**
   * Handle trade flow data requests
   */
  private async handleTradeFlow(params: TradeFlowParams): Promise<ApiResponse<MarketIntelligenceData>> {
    const cacheKey = `trade_flow:${params.hs_code}:${params.market}:${params.year || 'latest'}`;
    const cached = await this.cache.get<TradeFlowData>(cacheKey);
    
    if (cached) {
      return createSuccessResponse(
        cached,
        'Trade flow data retrieved from cache',
        { source: 'Cache' }
      );
    }

    const data = await this.witsService.getTradeFlowData({
      reporter: params.market,
      partner: 'WLD',
      productCode: params.hs_code,
      year: params.year || new Date().getFullYear() - 1
    });

    const tradeFlowData: TradeFlowData = {
      hs_code: params.hs_code,
      market: params.market,
      total_import_value: data.total_import_value,
      total_export_value: data.total_export_value,
      year: data.year,
      growth_rate: data.growth_rate,
      top_exporters: data.top_exporters,
      top_importers: data.top_importers,
      trade_balance: data.trade_balance,
      historical_trend: data.historical_trend
    };

    await this.cache.set(cacheKey, tradeFlowData);

    return createSuccessResponse(
      tradeFlowData,
      'Trade flow data retrieved successfully'
    );
  }

  /**
   * Handle tariff data requests
   */
  private async handleTariff(params: TariffParams): Promise<ApiResponse<MarketIntelligenceData>> {
    const cacheKey = `tariff:${params.hs_code}:${params.origin}:${params.destination}`;
    const cached = await this.cache.get<TariffData>(cacheKey);
    
    if (cached) {
      return createSuccessResponse(
        cached,
        'Tariff data retrieved from cache',
        { source: 'Cache' }
      );
    }

    const data = await this.witsService.getTariffData({
      reporter: params.origin,
      partner: params.destination,
      productCode: params.hs_code,
      year: new Date().getFullYear() - 1
    });

    const tariffData: TariffData = {
      simple_average: data.simple_average,
      weighted_average: data.weighted_average,
      minimum_rate: data.minimum_rate,
      maximum_rate: data.maximum_rate,
      number_of_tariff_lines: data.number_of_tariff_lines
    };

    await this.cache.set(cacheKey, tariffData);

    return createSuccessResponse(
      tariffData,
      'Tariff data retrieved successfully'
    );
  }

  /**
   * Handle market size data requests
   */
  private async handleMarketSize(params: MarketSizeParams): Promise<ApiResponse<MarketIntelligenceData>> {
    const cacheKey = `market_size:${params.product}:${params.country}`;
    const cached = await this.cache.get<MarketSizeData>(cacheKey);
    
    if (cached) {
      return createSuccessResponse(
        cached,
        'Market size data retrieved from cache',
        { source: 'Cache' }
      );
    }

    const [tradeData, historicalTrend] = await Promise.all([
      this.witsService.getTradeFlowData({
        reporter: params.country,
        partner: 'WLD',
        productCode: params.product,
        year: new Date().getFullYear() - 1
      }),
      this.witsService.getHistoricalTrend({
        reporter: params.country,
        partner: 'WLD',
        productCode: params.product,
        startYear: new Date().getFullYear() - 5,
        endYear: new Date().getFullYear() - 1
      })
    ]);

    const marketSizeData: MarketSizeData = {
      total_market_value: tradeData.total_import_value + tradeData.total_export_value,
      growth_rate: tradeData.growth_rate,
      market_share_distribution: tradeData.top_importers.map(imp => ({
        segment: imp.country,
        share: imp.market_share
      })),
      forecast: historicalTrend.map(point => ({
        year: point.year,
        value: point.import_value + point.export_value
      }))
    };

    await this.cache.set(cacheKey, marketSizeData);

    return createPartialSuccessResponse(
      marketSizeData,
      'Market size data retrieved with some approximations',
      {
        data_completeness: 'partial',
        source: 'API',
        last_updated: new Date().toISOString(),
        confidence_score: 0.85
      }
    );
  }

  /**
   * Handle buyers data requests
   */
  private async handleBuyers(params: BuyersParams): Promise<ApiResponse<MarketIntelligenceData>> {
    const cacheKey = `buyers:${params.industry}:${params.country}`;
    const cached = await this.cache.get<BuyersData>(cacheKey);
    
    if (cached) {
      return createSuccessResponse(
        cached,
        'Buyers data retrieved from cache',
        { source: 'Cache' }
      );
    }

    const partners = await this.witsService.getTopTradingPartners({
      reporter: params.country,
      productCode: params.industry,
      year: new Date().getFullYear() - 1,
      limit: 10
    });

    const buyersData: BuyersData = {
      total_buyers: partners.top_importers.length,
      key_buyers: partners.top_importers.map(imp => ({
        name: imp.country,
        contact: 'Not available',
        annual_volume: imp.value
      })),
      market_segments: partners.top_importers.map(imp => ({
        name: imp.country,
        buyer_count: 1
      }))
    };

    await this.cache.set(cacheKey, buyersData);

    return createPartialSuccessResponse(
      buyersData,
      'Buyers data retrieved with estimated market shares',
      {
        data_completeness: 'partial',
        source: 'API',
        last_updated: new Date().toISOString(),
        confidence_score: 0.75
      }
    );
  }
}

import { MarketIntelligenceHandler } from '../handlers/MarketIntelligenceHandler';
import { mcpCache } from '../../shared/cache';
import type { MCPResponse } from '../../shared';
import type { MarketIntelligenceData } from '../handlers/MarketIntelligenceHandler';

// Mock Redis cache
jest.mock('../../shared/cache', () => ({
  mcpCache: {
    get: jest.fn(),
    set: jest.fn(),
    generateKey: jest.fn((type, params) => `mcp:${type}:${JSON.stringify(params)}`)
  }
}));

describe('MarketIntelligenceHandler', () => {
  let handler: MarketIntelligenceHandler;

  beforeEach(() => {
    handler = new MarketIntelligenceHandler();
    jest.clearAllMocks();
  });

  describe('Trade Flow Data', () => {
    it('should return cached trade flow data if available', async () => {
      const cachedData: MCPResponse<MarketIntelligenceData> = {
        status: 200,
        data: {
          tradeFlow: {
            hs_code: '210690',
            market: 'UAE',
            total_import_value: 1000000,
            total_export_value: 800000,
            year: 2024,
            growth_rate: 0.15,
            top_exporters: [
              { country: 'China', value: 300000, market_share: 0.3 }
            ],
            top_importers: [
              { country: 'Germany', value: 150000, market_share: 0.15 }
            ],
            trade_balance: -200000,
            historical_trend: [
              { year: 2022, import_value: 950000, export_value: 750000 }
            ]
          }
        },
        message: 'Success',
        metadata: {
          source: 'Cache',
          last_updated: new Date().toISOString(),
          data_completeness: 'complete'
        }
      };

      (mcpCache.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await handler.handle({
        hs_code: '210690',
        market: 'UAE',
        type: 'trade_flow'
      });

      expect(result).toEqual(cachedData);
      expect(mcpCache.get).toHaveBeenCalled();
      expect(mcpCache.set).not.toHaveBeenCalled();
    });

    it('should fetch and cache new trade flow data if not in cache', async () => {
      (mcpCache.get as jest.Mock).mockResolvedValue(null);

      const result = await handler.handle({
        hs_code: '210690',
        market: 'UAE',
        type: 'trade_flow'
      });

      expect(result.status).toBe(200);
      expect(result.data?.tradeFlow).toBeDefined();
      expect(result.data?.tradeFlow?.hs_code).toBe('210690');
      expect(result.data?.tradeFlow?.market).toBe('UAE');
      expect(result.data?.tradeFlow?.total_import_value).toBeDefined();
      expect(result.data?.tradeFlow?.total_export_value).toBeDefined();
      expect(result.data?.tradeFlow?.growth_rate).toBeDefined();
      expect(mcpCache.get).toHaveBeenCalled();
      expect(mcpCache.set).toHaveBeenCalled();
    });
  });

  describe('Tariff Data', () => {
    it('should return cached tariff data if available', async () => {
      const cachedData: MCPResponse<MarketIntelligenceData> = {
        status: 200,
        data: {
          tariff: {
            simple_average: 5.5,
            weighted_average: 6.2,
            minimum_rate: 2.0,
            maximum_rate: 12.0,
            number_of_tariff_lines: 15
          }
        },
        message: 'Success',
        metadata: {
          source: 'Cache',
          last_updated: new Date().toISOString(),
          data_completeness: 'complete'
        }
      };

      (mcpCache.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await handler.handle({
        hs_code: '210690',
        market: 'UAE',
        type: 'tariff'
      });

      expect(result).toEqual(cachedData);
      expect(mcpCache.get).toHaveBeenCalled();
      expect(mcpCache.set).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (mcpCache.get as jest.Mock).mockResolvedValue(null);
      jest.spyOn(handler['witsService'], 'getTariffData').mockRejectedValue(new Error('API Error'));

      const result = await handler.handle({
        hs_code: '210690',
        market: 'UAE',
        type: 'tariff'
      });

      expect(result.status).toBe(500);
      expect(result.data).toBeNull();
      expect(result.message).toBe('API Error');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const result = await handler.handle({
        hs_code: '', // Invalid: empty string
        market: 'UAE'
      });

      expect(result.status).toBe(400);
      expect(result.data).toBeNull();
      expect(result.message).toContain('Invalid parameters');
    });

    it('should handle service errors', async () => {
      (mcpCache.get as jest.Mock).mockResolvedValue(null);
      jest.spyOn(handler['witsService'], 'getTradeFlowData').mockRejectedValue(new Error('Service error'));

      const result = await handler.handle({
        hs_code: '210690',
        market: 'UAE',
        type: 'trade_flow'
      });

      expect(result.status).toBe(500);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Service error');
    });
  });
});
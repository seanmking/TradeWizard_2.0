import { MarketIntelligenceHandler } from '../handlers/MarketIntelligenceHandler';
import { mcpCache } from '../../shared/cache';

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
      const cachedData = {
        status: 'success',
        data: {
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
        },
        confidence_score: 0.95,
        metadata: {
          source: 'Cache',
          last_updated: new Date().toISOString(),
          data_completeness: 'complete'
        }
      };

      (mcpCache.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await handler.handle({
        hs_code: '210690',
        market: 'UAE'
      });

      expect(result).toEqual(cachedData);
      expect(mcpCache.get).toHaveBeenCalled();
      expect(mcpCache.set).not.toHaveBeenCalled();
    });

    it('should fetch and cache new trade flow data if not in cache', async () => {
      (mcpCache.get as jest.Mock).mockResolvedValue(null);

      const result = await handler.handle({
        hs_code: '210690',
        market: 'UAE'
      });

      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('hs_code', '210690');
      expect(result.data).toHaveProperty('market', 'UAE');
      expect(result.data).toHaveProperty('total_import_value');
      expect(result.data).toHaveProperty('total_export_value');
      expect(result.data).toHaveProperty('growth_rate');
      expect(result.confidence_score).toBeGreaterThan(0);
      expect(result.metadata).toHaveProperty('source');
      expect(result.metadata).toHaveProperty('data_completeness');
      expect(mcpCache.get).toHaveBeenCalled();
      expect(mcpCache.set).toHaveBeenCalled();
    });
  });

  describe('Buyer Data', () => {
    it('should return cached buyer data if available', async () => {
      const cachedData = {
        status: 'success',
        data: {
          industry: 'Food',
          country: 'UAE',
          buyers: [
            {
              company_name: 'Global Trade Corp',
              country: 'UAE',
              industry: 'Food',
              import_volume: 500000,
              reliability_score: 0.95
            }
          ],
          total_count: 1,
          market_coverage: 0.8
        },
        confidence_score: 0.9,
        metadata: {
          source: 'Cache',
          last_updated: new Date().toISOString(),
          data_completeness: 'complete'
        }
      };

      (mcpCache.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await handler.handle({
        industry: 'Food',
        country: 'UAE'
      });

      expect(result).toEqual(cachedData);
      expect(mcpCache.get).toHaveBeenCalled();
      expect(mcpCache.set).not.toHaveBeenCalled();
    });

    it('should fetch and cache new buyer data if not in cache', async () => {
      (mcpCache.get as jest.Mock).mockResolvedValue(null);

      const result = await handler.handle({
        industry: 'Food',
        country: 'UAE'
      });

      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('industry', 'Food');
      expect(result.data).toHaveProperty('country', 'UAE');
      expect(result.data).toHaveProperty('buyers');
      expect(result.data).toHaveProperty('total_count');
      expect(result.data).toHaveProperty('market_coverage');
      expect(result.confidence_score).toBeGreaterThan(0);
      expect(mcpCache.get).toHaveBeenCalled();
      expect(mcpCache.set).toHaveBeenCalled();
    });
  });

  describe('Market Size Data', () => {
    it('should return cached market size data if available', async () => {
      const cachedData = {
        status: 'success',
        data: {
          product: 'Snacks',
          country: 'UAE',
          total_market_size: 5000000,
          market_growth_rate: 0.08,
          market_share_distribution: [
            { segment: 'Premium', share: 0.3, value: 1500000 }
          ],
          forecast: [
            { year: 2024, projected_size: 5400000, growth_rate: 0.08 }
          ],
          key_trends: ['Premium segment growth'],
          competitive_landscape: {
            market_concentration: 0.65,
            key_players: [
              { name: 'Market Leader A', market_share: 0.25 }
            ]
          }
        },
        confidence_score: 0.85,
        metadata: {
          source: 'Cache',
          last_updated: new Date().toISOString(),
          data_completeness: 'complete'
        }
      };

      (mcpCache.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await handler.handle({
        product: 'Snacks',
        country: 'UAE'
      });

      expect(result).toEqual(cachedData);
      expect(mcpCache.get).toHaveBeenCalled();
      expect(mcpCache.set).not.toHaveBeenCalled();
    });

    it('should fetch and cache new market size data if not in cache', async () => {
      (mcpCache.get as jest.Mock).mockResolvedValue(null);

      const result = await handler.handle({
        product: 'Snacks',
        country: 'UAE'
      });

      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('product', 'Snacks');
      expect(result.data).toHaveProperty('country', 'UAE');
      expect(result.data).toHaveProperty('total_market_size');
      expect(result.data).toHaveProperty('market_growth_rate');
      expect(result.data).toHaveProperty('market_share_distribution');
      expect(result.data).toHaveProperty('forecast');
      expect(result.confidence_score).toBeGreaterThan(0);
      expect(mcpCache.get).toHaveBeenCalled();
      expect(mcpCache.set).toHaveBeenCalled();
    });
  });

  it('should handle errors gracefully', async () => {
    (mcpCache.get as jest.Mock).mockRejectedValue(new Error('Cache error'));

    const result = await handler.handle({
      hs_code: 'INVALID',
      market: 'INVALID'
    });

    expect(result.status).toBe('error');
    expect(result.confidence_score).toBe(0);
    expect(result.metadata.data_completeness).toBe('partial');
    expect(result.known_gaps).toContain('Failed to fetch market intelligence data');
    expect(result.fallback_suggestions).toHaveLength(3);
  });

  it('should throw error for invalid parameter combinations', async () => {
    await expect(handler.handle({})).rejects.toThrow('Invalid parameter combination');
  });
}); 
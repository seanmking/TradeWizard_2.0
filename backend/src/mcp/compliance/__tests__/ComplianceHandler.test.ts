import { ComplianceHandler } from '../handlers/ComplianceHandler';
import { mcpCache } from '../../shared/cache';

// Mock Redis cache
jest.mock('../../shared/cache', () => ({
  mcpCache: {
    get: jest.fn(),
    set: jest.fn(),
    generateKey: jest.fn((type, params) => `mcp:${type}:${JSON.stringify(params)}`)
  }
}));

describe('ComplianceHandler', () => {
  let handler: ComplianceHandler;

  beforeEach(() => {
    handler = new ComplianceHandler();
    jest.clearAllMocks();
  });

  it('should return cached data if available', async () => {
    const cachedData = {
      status: 'success',
      data: {
        country: 'UAE',
        hs_code: '210690',
        certifications_required: ['HACCP'],
        labeling_requirements: 'Arabic + English',
        tariff_rate: '5%'
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
      country: 'UAE',
      hs_code: '210690'
    });

    expect(result).toEqual(cachedData);
    expect(mcpCache.get).toHaveBeenCalled();
    expect(mcpCache.set).not.toHaveBeenCalled();
  });

  it('should fetch and cache new data if not in cache', async () => {
    (mcpCache.get as jest.Mock).mockResolvedValue(null);

    const result = await handler.handle({
      country: 'UAE',
      hs_code: '210690'
    });

    expect(result.status).toBe('success');
    expect(result.data).toHaveProperty('country', 'UAE');
    expect(result.data).toHaveProperty('hs_code', '210690');
    expect(result.data).toHaveProperty('certifications_required');
    expect(result.data).toHaveProperty('labeling_requirements');
    expect(result.data).toHaveProperty('tariff_rate');
    expect(result.confidence_score).toBeGreaterThan(0);
    expect(result.metadata).toHaveProperty('source');
    expect(result.metadata).toHaveProperty('data_completeness');
    expect(mcpCache.get).toHaveBeenCalled();
    expect(mcpCache.set).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    (mcpCache.get as jest.Mock).mockRejectedValue(new Error('Cache error'));

    const result = await handler.handle({
      country: 'INVALID',
      hs_code: 'INVALID'
    });

    expect(result.status).toBe('error');
    expect(result.confidence_score).toBe(0);
    expect(result.metadata.data_completeness).toBe('partial');
    expect(result.known_gaps).toContain('Failed to fetch compliance data');
    expect(result.fallback_suggestions).toHaveLength(2);
  });
}); 
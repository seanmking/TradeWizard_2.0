import { ComplianceHandler, ComplianceData } from '../handlers/ComplianceHandler';
import { mcpCache } from '../../shared/cache';
import type { MCPResponse } from '../../shared';

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
    const cachedData: ComplianceData = {
      compliance: {
        country: 'UAE',
        hs_code: '210690',
        certifications_required: ['HACCP'],
        labeling_requirements: 'Arabic + English',
        tariff_rate: '5%'
      }
    };

    (mcpCache.get as jest.Mock).mockResolvedValue(cachedData);

    const result = await handler.handle({
      country: 'UAE',
      hs_code: '210690',
      type: 'compliance'
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual(cachedData);
    expect(result.message).toBe('Success');
    expect(result.metadata?.source).toBe('Cache');
    expect(mcpCache.get).toHaveBeenCalled();
    expect(mcpCache.set).not.toHaveBeenCalled();
  });

  it('should fetch and cache new data if not in cache', async () => {
    (mcpCache.get as jest.Mock).mockResolvedValue(null);

    const result = await handler.handle({
      country: 'UAE',
      hs_code: '210690',
      type: 'compliance'
    });

    expect(result.status).toBe(200);
    expect(result.data?.compliance).toBeDefined();
    expect(result.data?.compliance?.country).toBe('UAE');
    expect(result.data?.compliance?.hs_code).toBe('210690');
    expect(result.data?.compliance?.certifications_required).toBeDefined();
    expect(result.data?.compliance?.labeling_requirements).toBeDefined();
    expect(result.data?.compliance?.tariff_rate).toBeDefined();
    expect(result.metadata?.source).toBe('WITS + Regulatory DB');
    expect(result.metadata?.data_completeness).toBeDefined();
    expect(mcpCache.get).toHaveBeenCalled();
    expect(mcpCache.set).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    (mcpCache.get as jest.Mock).mockRejectedValue(new Error('Cache error'));

    const result = await handler.handle({
      country: 'INVALID',
      hs_code: 'INVALID',
      type: 'compliance'
    });

    expect(result.status).toBe(500);
    expect(result.data).toBeNull();
    expect(result.message).toBe('Cache error');
    expect(result.metadata?.data_completeness).toBe('none');
  });
}); 
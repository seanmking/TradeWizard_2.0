import MarketIntelligenceMCPService from '../src/services/market-intelligence-mcp.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Market Intelligence MCP Service', () => {
  let marketIntelMCP: MarketIntelligenceMCPService;

  beforeEach(() => {
    marketIntelMCP = new MarketIntelligenceMCPService();
  });

  const testProducts = [
    {
      name: 'Organic Rooibos Tea',
      hsCode: '0902',
      industrySector: 'Beverages',
      potentialMarkets: ['UAE', 'UK']
    },
    {
      name: 'Handcrafted Leather Weekender Bag',
      industrySector: 'Accessories',
      potentialMarkets: ['USA', 'EU']
    }
  ];

  testProducts.forEach(product => {
    it(`should fetch market opportunities for ${product.name}`, async () => {
      // Mock Comtrade API response
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('comtrade')) {
          return Promise.resolve({
            data: {
              totalMarketValue: 500000,
              marketGrowthRate: 12.5,
              topImportingCountries: ['UAE', 'USA', 'UK'],
              topCompetitors: ['Brand A', 'Brand B'],
              emergingMarkets: ['India', 'Brazil']
            }
          });
        }
        // Mock TradeMap API response
        return Promise.resolve({
          data: {
            priceRanges: { min: 10, max: 50 },
            marketConcentration: 0.6
          }
        });
      });

      const marketOpportunities = await marketIntelMCP.getMarketOpportunities(product);

      // Validation checks
      expect(marketOpportunities).toBeDefined();
      expect(marketOpportunities.globalDemand).toBeDefined();
      expect(marketOpportunities.topImportingCountries).toBeInstanceOf(Array);
      expect(marketOpportunities.competitiveLandscape).toBeDefined();
      expect(marketOpportunities.emergingOpportunities).toBeInstanceOf(Array);
    });
  });

  it('should derive HS Code for products without explicit code', async () => {
    const productWithoutHSCode = {
      name: 'Premium Coffee Beans',
      industrySector: 'Beverages'
    };

    // Mock API responses
    mockedAxios.get.mockResolvedValue({
      data: {
        totalMarketValue: 750000,
        marketGrowthRate: 15,
        topImportingCountries: ['USA', 'EU', 'China']
      }
    });

    const marketOpportunities = await marketIntelMCP.getMarketOpportunities(productWithoutHSCode);

    expect(marketOpportunities).toBeDefined();
  });

  it('should manage market intelligence cache', async () => {
    // Clear cache
    const clearedItems = await marketIntelMCP.clearMarketIntelCache();
    expect(clearedItems).toBeDefined();

    // Get cache stats
    const stats = await marketIntelMCP.getMarketIntelCacheStats();
    expect(stats).toHaveProperty('totalCachedItems');
    expect(stats).toHaveProperty('cacheSize');
  });
});

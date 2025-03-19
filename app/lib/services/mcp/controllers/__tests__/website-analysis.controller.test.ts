import { analyzeWebsite } from '../website-analysis.controller';
import { isScraperServiceAvailable, analyzeWebsiteWithScraperService } from '../../services/website-analysis.service';
import { EnhancedWebsiteAnalysisResult } from '../../models/website-data.model';

// Mock the external services
jest.mock('../../services/website-analysis.service');
jest.mock('../../services/hybrid-product-detector.service', () => {
  return {
    HybridProductDetector: jest.fn().mockImplementation(() => ({
      detectProducts: jest.fn().mockResolvedValue({
        products: [{ name: 'Product 1', description: 'Description 1' }],
        categories: ['Category 1'],
        metrics: {
          confidence: 0.75,
          totalTime: 1000,
          costIncurred: 0.01,
          modelUsed: 'hybrid'
        }
      })
    }))
  };
});

describe('Website Analysis', () => {
  const mockUrl = 'https://example.com';
  const mockHtml = '<html><body>Test content</body></html>';

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock the global fetch function
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve(mockHtml)
      } as unknown as Response)
    );
  });

  describe('analyzeWebsite', () => {
    it('should return enhanced result when scraper service is available', async () => {
      // Mock scraper service availability
      (isScraperServiceAvailable as jest.Mock).mockResolvedValue(true);
      
      // Mock scraper service response
      const mockBaseResult = {
        url: mockUrl,
        title: 'Test Website',
        description: 'A test website',
        products: [
          {
            name: 'Product 1',
            description: 'Description 1'
          }
        ],
        categories: ['Category 1'],
        metrics: {
          confidence: 0.75,
          totalTime: 1000,
          costIncurred: 0.01,
          modelUsed: 'hybrid'
        }
      };

      (analyzeWebsiteWithScraperService as jest.Mock).mockResolvedValue(mockBaseResult);

      const result = await analyzeWebsite(mockUrl) as EnhancedWebsiteAnalysisResult;

      expect(result).toBeDefined();
      expect(result.url).toBe(mockUrl);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Product 1');
    });

    it('should fall back to hybrid detection when scraper service is unavailable', async () => {
      // Mock scraper service as unavailable
      (isScraperServiceAvailable as jest.Mock).mockResolvedValue(false);

      const result = await analyzeWebsite(mockUrl) as EnhancedWebsiteAnalysisResult;

      expect(result).toBeDefined();
      expect(result.url).toBe(mockUrl);
      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Product 1');
    });

    it('should handle errors gracefully', async () => {
      // Mock scraper service to throw an error
      (isScraperServiceAvailable as jest.Mock).mockRejectedValue(new Error('Service unavailable'));
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(analyzeWebsite(mockUrl)).rejects.toThrow();
    });
  });
}); 
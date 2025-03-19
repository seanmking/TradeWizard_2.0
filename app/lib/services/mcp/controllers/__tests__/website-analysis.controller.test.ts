import { WebsiteAnalysisController } from '../website-analysis.controller';
import { isScraperServiceAvailable, analyzeWebsiteWithScraperService } from '../../services/website-analysis.service';
import { HybridProductDetector } from '../../services/hybrid-product-detector.service';
import { WebsiteAnalysisResult, EnhancedWebsiteAnalysisResult, BasicWebsiteAnalysisResult } from '../../models/website-data.model';

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

describe('WebsiteAnalysisController', () => {
  let controller: WebsiteAnalysisController;
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
    
    controller = new WebsiteAnalysisController();
  });

  describe('analyzeWebsite', () => {
    it('should return enhanced result when scraper service is available', async () => {
      // Mock scraper service availability
      (isScraperServiceAvailable as jest.Mock).mockResolvedValue(true);
      
      // Mock scraper service response
      const mockBaseResult = {
        businessName: 'Test Company',
        description: 'A test company',
        productCategories: ['Category 1'],
        certifications: [],
        geographicPresence: ['US'],
        businessSize: 'small' as const,
        customerSegments: ['B2B'],
        exportReadiness: 75,
        productDetails: [{ name: 'Product 1', description: 'Description 1' }],
        exportMentions: [],
        contactInfo: {},
        locations: [],
        lastUpdated: new Date(),
        websiteQuality: {
          hasSsl: true,
          hasMobileCompatibility: true,
          hasRecentUpdates: true,
          hasMultiplePages: true
        }
      };
      
      (analyzeWebsiteWithScraperService as jest.Mock).mockResolvedValue(mockBaseResult);

      const result = await controller.analyzeWebsite(mockUrl);

      expect(result).toHaveProperty('analysisType');
      expect(result).toHaveProperty('url', mockUrl);
      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('categories');
      expect(isScraperServiceAvailable).toHaveBeenCalled();
      expect(analyzeWebsiteWithScraperService).toHaveBeenCalledWith(mockUrl);
    });

    it('should fallback to hybrid detection when scraper service is unavailable', async () => {
      // Mock scraper service as unavailable
      (isScraperServiceAvailable as jest.Mock).mockResolvedValue(false);

      const result = await controller.analyzeWebsite(mockUrl);

      // Update expectations to match the actual return type
      expect(result).toHaveProperty('analysisType');
      expect(result).toHaveProperty('url', mockUrl);
      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('categories');
      expect(HybridProductDetector).toHaveBeenCalled();
    });

    it('should return basic result when analysis fails', async () => {
      // Mock scraper service to throw error
      (isScraperServiceAvailable as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

      const result = await controller.analyzeWebsite(mockUrl);

      expect(result).toHaveProperty('analysisType', 'basic');
      expect(result).toHaveProperty('businessName', '');
      expect(result).toHaveProperty('productCategories', []);
    });
  });

  describe('getAnalyticsData', () => {
    it('should return cache and metrics data', () => {
      const result = controller.getAnalyticsData();
      
      expect(result).toHaveProperty('cache');
      expect(result).toHaveProperty('metrics');
    });
  });
}); 
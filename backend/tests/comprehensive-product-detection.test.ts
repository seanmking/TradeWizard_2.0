import axios from 'axios';
import HybridProductDetectorService from '../src/services/hybrid-product-detector.service';
import LLMProductAnalyzerService from '../src/services/llm-product-analyzer.service';
import PerformanceMonitor from '../src/utils/performance-monitor';

// Mock websites for comprehensive testing
const TEST_WEBSITES = [
  // E-commerce product pages
  {
    url: 'https://example-tea-company.co.za/organic-rooibos',
    expectedProductType: 'Beverages',
    expectedConfidence: 0.7
  },
  {
    url: 'https://example-leather-goods.co.za/weekender-bag',
    expectedProductType: 'Accessories',
    expectedConfidence: 0.7
  },
  // Challenging detection scenarios
  {
    url: 'https://minimal-product-page.com/item/123',
    expectedProductType: 'Unknown',
    expectedConfidence: 0.5
  },
  {
    url: 'https://blog-with-product-mention.com/article/review',
    expectedProductType: 'Unknown',
    expectedConfidence: 0.3
  }
];

// Error scenario websites
const ERROR_WEBSITES = [
  'https://non-existent-website.com',
  'https://completely-invalid-url'
];

describe('Comprehensive Product Detection Test Suite', () => {
  let hybridDetector: HybridProductDetectorService;
  let llmAnalyzer: LLMProductAnalyzerService;

  beforeEach(() => {
    hybridDetector = new HybridProductDetectorService();
    llmAnalyzer = new LLMProductAnalyzerService();
  });

  // Performance monitoring for detection
  describe('Performance Monitoring', () => {
    it('should measure product detection execution time', async () => {
      const performanceSpy = jest.spyOn(PerformanceMonitor, 'measureExecution');

      // Mock axios for a test website
      jest.spyOn(axios, 'get').mockResolvedValue({
        data: `
          <html>
            <head><title>Performance Test Product</title></head>
            <body>Sample product content</body>
          </html>
        `
      });

      await hybridDetector.detectProduct(TEST_WEBSITES[0].url);

      expect(performanceSpy).toHaveBeenCalled();
    });
  });

  // Caching behavior
  describe('Caching Mechanism', () => {
    it('should cache product detection results', async () => {
      // Mock axios for a test website
      const axiosSpy = jest.spyOn(axios, 'get').mockResolvedValue({
        data: `
          <html>
            <head><title>Cacheable Product</title></head>
            <body>Sample cacheable product</body>
          </html>
        `
      });

      // First detection (should not be cached)
      const firstDetection = await hybridDetector.detectProduct(TEST_WEBSITES[0].url);

      // Second detection (should be cached)
      const secondDetection = await hybridDetector.detectProduct(TEST_WEBSITES[0].url);

      // Verify caching worked
      expect(firstDetection).toEqual(secondDetection);
      expect(axiosSpy).toHaveBeenCalledTimes(1); // Only called once due to caching
    });
  });

  // Comprehensive error handling
  describe('Error Scenarios', () => {
    ERROR_WEBSITES.forEach(url => {
      it(`should handle errors gracefully for ${url}`, async () => {
        // Mock axios to simulate network error
        jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network Error'));

        // Expect the detection to throw an error
        await expect(hybridDetector.detectProduct(url)).rejects.toThrow();
      });
    });
  });

  // Advanced detection strategy test
  describe('Detection Strategy Effectiveness', () => {
    it('should use multiple detection strategies', async () => {
      // Create a mock HTML with multiple detection hints
      const mockHtml = `
        <html>
          <head>
            <title>Multi-Strategy Product</title>
            <script type="application/ld+json">
              {
                "@type": "Product",
                "name": "Test Product",
                "description": "A product with multiple detection strategies"
              }
            </script>
          </head>
          <body>
            <div class="product-title">Alternative Product Title</div>
            <img src="/product.jpg" alt="Product Image" />
          </body>
        </html>
      `;

      // Mock axios to return the complex HTML
      jest.spyOn(axios, 'get').mockResolvedValue({ data: mockHtml });

      const detectionResult = await hybridDetector.detectProduct(TEST_WEBSITES[0].url);

      // Validate that detection used multiple strategies
      expect(detectionResult.name).toBeTruthy();
      expect(detectionResult.confidence).toBeGreaterThan(0.6);
    });
  });

  // Token usage tracking
  describe('Token Usage Tracking', () => {
    it('should track token usage for LLM classification', async () => {
      const tokenTrackerSpy = jest.spyOn(PerformanceMonitor, 'trackTokenUsage');

      // Mock detection result
      const mockDetectionResult = {
        name: 'Token Usage Test Product',
        description: 'A product for testing token tracking',
        url: TEST_WEBSITES[0].url
      };

      await llmAnalyzer.classifyProduct(mockDetectionResult);

      // Verify token usage was tracked
      expect(tokenTrackerSpy).toHaveBeenCalled();
    });
  });
});

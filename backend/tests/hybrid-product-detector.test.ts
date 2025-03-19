import HybridProductDetectorService from '../src/services/hybrid-product-detector.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Hybrid Product Detector Service', () => {
  let hybridDetector: HybridProductDetectorService;

  beforeEach(() => {
    hybridDetector = new HybridProductDetectorService();
  });

  const testScenarios = [
    {
      name: 'E-commerce product page',
      html: `
        <html>
          <head><title>Organic Rooibos Tea - Premium South African Blend</title></head>
          <body>
            <h1 class="product-title">Organic Rooibos Tea</h1>
            <div class="product-description">Authentic South African herbal tea</div>
            <script type="application/ld+json">
              {
                "@type": "Product",
                "name": "Organic Rooibos Tea",
                "description": "Authentic South African herbal tea"
              }
            </script>
          </body>
        </html>
      `,
      url: 'https://example-tea-company.co.za/product/rooibos-tea'
    },
    {
      name: 'Simple product page',
      html: `
        <html>
          <head>
            <title>Handcrafted Leather Weekender Bag</title>
            <meta name="description" content="Premium leather travel bag with multiple compartments">
          </head>
          <body>
            <img src="/bag.jpg" alt="Leather Weekender Bag" />
          </body>
        </html>
      `,
      url: 'https://example-leather-goods.co.za/product/weekender-bag'
    }
  ];

  testScenarios.forEach(scenario => {
    it(`should detect product from ${scenario.name}`, async () => {
      // Mock axios get request
      mockedAxios.get.mockResolvedValue({ data: scenario.html });

      const result = await hybridDetector.detectProduct(scenario.url);

      // Validation checks
      expect(result).toBeDefined();
      expect(result.name).toBeTruthy();
      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  it('should use caching mechanism', async () => {
    // Mock axios get request
    mockedAxios.get.mockResolvedValue({ 
      data: `
        <html>
          <head><title>Test Product</title></head>
          <body>Test Product Description</body>
        </html>
      `
    });

    // First detection (should not be cached)
    const firstDetection = await hybridDetector.detectProduct('https://test-product.com');
    
    // Second detection (should be cached)
    const secondDetection = await hybridDetector.detectProduct('https://test-product.com');

    // Verify cache works
    expect(secondDetection).toEqual(firstDetection);
  });

  it('should provide cache management methods', async () => {
    // Clear cache
    const clearedItems = await hybridDetector.clearCache();
    expect(clearedItems).toBeDefined();

    // Get cache stats
    const stats = await hybridDetector.getCacheStats();
    expect(stats).toHaveProperty('totalCachedItems');
    expect(stats).toHaveProperty('cacheSize');
  });
});

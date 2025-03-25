import { ContextBuilder } from '../context-builder.service';
import { AIOrchestrator } from '../../ai/ai-orchestrator.service';
import {
  TEST_RAW_WEBSITE_DATA,
  TEST_PRODUCTS,
  TEST_COMPLIANCE_DATA,
  TEST_MARKET_DATA,
  TEST_WEBSITE_ANALYSIS
} from './test-utils/mock-data';

jest.mock('../../ai/ai-orchestrator.service');

describe('ContextBuilder', () => {
  let contextBuilder: ContextBuilder;
  let mockAIOrchestrator: jest.Mocked<AIOrchestrator>;

  beforeEach(() => {
    mockAIOrchestrator = {
      analyzeWebsite: jest.fn(),
      enhanceProducts: jest.fn(),
      generateBusinessAnalysis: jest.fn(),
      destroy: jest.fn()
    } as any;

    contextBuilder = new ContextBuilder(mockAIOrchestrator, {
      maxProductsToProcess: 5,
      maxMarketsToAnalyze: 3,
      priorityMarkets: ['[TEST] US', '[TEST] EU'],
      industrySpecificRules: {}
    });
  });

  describe('buildContext', () => {
    beforeEach(() => {
      mockAIOrchestrator.analyzeWebsite.mockResolvedValue(TEST_WEBSITE_ANALYSIS);
      mockAIOrchestrator.enhanceProducts.mockImplementation(products => 
        Promise.resolve(products.map(p => ({
          ...p,
          enhancement: {
            ...p.enhancement,
            hsCode: '9999.99', // Test HS code
            industrySector: '[TEST] Electronics',
            industrySubsector: '[TEST] Computer Peripherals',
            exportPotential: 'High',
            complianceRequirements: ['[TEST] FCC', '[TEST] CE'],
            potentialMarkets: ['[TEST] US', '[TEST] EU', '[TEST] JP']
          }
        })))
      );
    });

    it('should build context successfully with valid data', async () => {
      const result = await contextBuilder.buildContext(
        TEST_RAW_WEBSITE_DATA,
        TEST_PRODUCTS,
        TEST_COMPLIANCE_DATA,
        TEST_MARKET_DATA
      );

      expect(result).toMatchObject({
        businessProfile: {
          businessName: '[TEST] Example Test Company',
          industry: '[TEST] Manufacturing',
          subIndustry: '[TEST] Electronics'
        },
        products: expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringMatching(/^\[TEST\]/),
            enhancement: expect.objectContaining({
              hsCode: expect.any(String),
              exportPotential: expect.stringMatching(/^(Low|Medium|High)$/)
            })
          })
        ]),
        metadata: {
          processedAt: expect.any(String),
          dataQualityScore: expect.any(Number),
          confidenceScores: {
            businessProfile: expect.any(Number),
            products: expect.any(Number),
            compliance: expect.any(Number),
            market: expect.any(Number)
          },
          warnings: expect.any(Array)
        }
      });

      expect(mockAIOrchestrator.analyzeWebsite).toHaveBeenCalledWith(
        expect.objectContaining({
          url: TEST_RAW_WEBSITE_DATA.url,
          content: TEST_RAW_WEBSITE_DATA.content
        })
      );

      expect(mockAIOrchestrator.enhanceProducts).toHaveBeenCalled();
    });

    it('should handle empty product data', async () => {
      const result = await contextBuilder.buildContext(
        TEST_RAW_WEBSITE_DATA,
        [],
        TEST_COMPLIANCE_DATA,
        TEST_MARKET_DATA
      );

      expect(result.metadata.warnings).toContain(expect.stringMatching(/product/i));
      expect(result.metadata.dataQualityScore).toBeLessThan(100);
    });

    it('should respect maxProductsToProcess limit', async () => {
      const manyProducts = Array(10).fill(TEST_PRODUCTS[0]);
      const result = await contextBuilder.buildContext(
        TEST_RAW_WEBSITE_DATA,
        manyProducts,
        TEST_COMPLIANCE_DATA,
        TEST_MARKET_DATA
      );

      expect(result.products).toHaveLength(5); // maxProductsToProcess from config
    });

    it('should calculate confidence scores correctly', async () => {
      const result = await contextBuilder.buildContext(
        TEST_RAW_WEBSITE_DATA,
        TEST_PRODUCTS,
        TEST_COMPLIANCE_DATA,
        TEST_MARKET_DATA
      );

      expect(result.metadata.confidenceScores.businessProfile).toBeGreaterThan(0);
      expect(result.metadata.confidenceScores.businessProfile).toBeLessThanOrEqual(100);
      expect(result.metadata.dataQualityScore).toBeGreaterThan(0);
      expect(result.metadata.dataQualityScore).toBeLessThanOrEqual(100);
    });
  });
}); 
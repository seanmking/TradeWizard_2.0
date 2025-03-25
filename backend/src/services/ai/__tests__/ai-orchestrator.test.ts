import { AIOrchestrator } from '../ai-orchestrator.service';
import { BaseAIService } from '../base-ai.service';
import { Logger } from '../../../utils/logger';
import { MetricsService } from '../../../monitoring/metrics.service';
import {
  WebsiteData,
  EnhancedProduct,
  AnalysisContext
} from '../../../types/ai-orchestrator.types';
import {
  TEST_WEBSITE_DATA,
  TEST_PRODUCTS,
  TEST_WEBSITE_ANALYSIS,
  TEST_ENHANCEMENT_RESPONSE,
  TEST_ANALYSIS_RESPONSE
} from '../../context/__tests__/test-utils/mock-data';

jest.mock('../base-ai.service');
jest.mock('../../../utils/logger');
jest.mock('../../../monitoring/metrics.service');

describe('AIOrchestrator', () => {
  let aiOrchestrator: AIOrchestrator;
  let mockBaseAIService: jest.Mocked<BaseAIService>;
  let mockLogger: jest.Mocked<Logger>;
  let mockMetricsService: jest.Mocked<MetricsService>;

  beforeEach(() => {
    mockBaseAIService = {
      makeAIRequest: jest.fn(),
      destroy: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    mockMetricsService = {
      recordAIRequest: jest.fn(),
      getMetrics: jest.fn(),
      clearMetrics: jest.fn(),
      destroy: jest.fn()
    } as any;

    aiOrchestrator = new AIOrchestrator({
      apiKey: 'test-key',
      model: 'gpt-4-turbo-preview',
      maxRetries: 3,
      temperature: 0.7
    });
  });

  describe('analyzeWebsite', () => {
    beforeEach(() => {
      mockBaseAIService.makeAIRequest.mockResolvedValue(
        Promise.resolve(JSON.stringify(TEST_WEBSITE_ANALYSIS))
      );
    });

    it('should analyze website content successfully', async () => {
      const result = await aiOrchestrator.analyzeWebsite(TEST_WEBSITE_DATA);

      expect(result).toMatchObject({
        businessName: expect.stringMatching(/^\[TEST\]/),
        businessDescription: expect.stringMatching(/^\[TEST\]/),
        industry: expect.stringMatching(/^\[TEST\]/),
        subindustry: expect.stringMatching(/^\[TEST\]/),
        products: expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringMatching(/^\[TEST\]/),
            description: expect.stringMatching(/^\[TEST\]/)
          })
        ])
      });

      expect(mockBaseAIService.makeAIRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining(TEST_WEBSITE_DATA.url)
        })
      );

      expect(mockMetricsService.recordAIRequest).toHaveBeenCalled();
    });

    it('should handle invalid AI response format', async () => {
      mockBaseAIService.makeAIRequest.mockResolvedValue(
        Promise.resolve('Invalid JSON')
      );

      await expect(aiOrchestrator.analyzeWebsite(TEST_WEBSITE_DATA))
        .rejects
        .toThrow(/invalid response format/i);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('enhanceProducts', () => {
    const testProducts: EnhancedProduct[] = [
      {
        name: '[TEST] Product 1',
        description: '[TEST] Description 1',
        category: '[TEST] Category 1',
        enhancement: {
          hsCode: '',
          industrySector: '',
          industrySubsector: '',
          exportPotential: 'Low',
          complianceRequirements: [],
          potentialMarkets: []
        }
      }
    ];

    beforeEach(() => {
      mockBaseAIService.makeAIRequest.mockResolvedValue(
        Promise.resolve(JSON.stringify(TEST_ENHANCEMENT_RESPONSE))
      );
    });

    it('should enhance products with additional information', async () => {
      const result = await aiOrchestrator.enhanceProducts(testProducts);

      expect(result).toHaveLength(testProducts.length);
      expect(result[0]).toMatchObject({
        name: testProducts[0].name,
        enhancement: expect.objectContaining({
          hsCode: expect.stringMatching(/^9999/),
          exportPotential: expect.stringMatching(/^(Low|Medium|High)$/),
          complianceRequirements: expect.arrayContaining([
            expect.stringMatching(/^\[TEST\]/)
          ])
        })
      });

      expect(mockMetricsService.recordAIRequest).toHaveBeenCalled();
    });

    it('should handle empty product list', async () => {
      const result = await aiOrchestrator.enhanceProducts([]);
      expect(result).toHaveLength(0);
      expect(mockBaseAIService.makeAIRequest).not.toHaveBeenCalled();
    });
  });

  describe('generateBusinessAnalysis', () => {
    const testAnalysisContext: AnalysisContext = {
      businessProfile: {
        businessName: '[TEST] Example Test Company',
        industry: '[TEST] Manufacturing',
        subIndustry: '[TEST] Industrial Equipment',
        marketFocus: '[TEST] B2B',
        businessSize: '[TEST] Medium',
        productCategories: ['[TEST] Industrial Machinery', '[TEST] Equipment Parts'],
        exportReadinessIndicators: {
          hasInternationalFocus: true,
          mentionsExports: true,
          hasCertifications: ['[TEST] ISO9001'],
          hasMultipleLanguages: true
        }
      },
      products: [],
      complianceData: [],
      marketData: [],
      timestamp: new Date().toISOString()
    };

    beforeEach(() => {
      mockBaseAIService.makeAIRequest.mockResolvedValue(
        Promise.resolve(JSON.stringify(TEST_ANALYSIS_RESPONSE))
      );
    });

    it('should generate business analysis successfully', async () => {
      const result = await aiOrchestrator.generateBusinessAnalysis(testAnalysisContext);

      expect(result).toMatchObject({
        strengths: expect.arrayContaining([expect.stringMatching(/^\[TEST\]/)]),
        weaknesses: expect.arrayContaining([expect.stringMatching(/^\[TEST\]/)]),
        opportunities: expect.arrayContaining([expect.stringMatching(/^\[TEST\]/)]),
        threats: expect.arrayContaining([expect.stringMatching(/^\[TEST\]/)]),
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            type: expect.stringMatching(/^\[TEST\]/),
            description: expect.stringMatching(/^\[TEST\]/),
            priority: expect.stringMatching(/^(Low|Medium|High)$/)
          })
        ])
      });

      expect(mockMetricsService.recordAIRequest).toHaveBeenCalled();
    });

    it('should handle AI service errors', async () => {
      mockBaseAIService.makeAIRequest.mockRejectedValue(new Error('[TEST] AI service error'));

      await expect(aiOrchestrator.generateBusinessAnalysis(testAnalysisContext))
        .rejects
        .toThrow('[TEST] AI service error');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    aiOrchestrator.destroy();
  });
}); 
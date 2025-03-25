import { ValidationService } from '../validation.service';
import { defaultValidationConfig } from '../rules';
import { ValidationTarget } from '../../../types/validation.types';
import {
  TEST_WEBSITE_ANALYSIS,
  TEST_PRODUCTS,
  TEST_COMPLIANCE_DATA,
  TEST_MARKET_DATA
} from '../../context/__tests__/test-utils/mock-data';
import { BusinessProfile, EnhancedProduct } from '../../../types/ai-orchestrator.types';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService(defaultValidationConfig);
  });

  describe('validateData', () => {
    const createTestBusinessProfile = (): BusinessProfile => ({
      businessName: TEST_WEBSITE_ANALYSIS.businessName,
      industry: TEST_WEBSITE_ANALYSIS.industry,
      subIndustry: TEST_WEBSITE_ANALYSIS.subindustry,
      marketFocus: '[TEST] B2B',
      businessSize: '[TEST] Medium',
      productCategories: ['[TEST] Category 1'],
      exportReadinessIndicators: TEST_WEBSITE_ANALYSIS.exportReadinessIndicators
    });

    const createTestProducts = (): EnhancedProduct[] => 
      TEST_PRODUCTS.map(p => ({
        name: p.name,
        description: p.description,
        category: p.category || '[TEST] Default Category',
        enhancement: {
          hsCode: '9999.99',
          industrySector: '[TEST] Electronics',
          industrySubsector: '[TEST] Components',
          exportPotential: 'High',
          complianceRequirements: ['[TEST] CE', '[TEST] FCC'],
          potentialMarkets: ['[TEST] US', '[TEST] EU']
        }
      }));

    it('should validate complete and valid data successfully', async () => {
      const testData: ValidationTarget = {
        businessProfile: createTestBusinessProfile(),
        products: createTestProducts(),
        complianceData: TEST_COMPLIANCE_DATA,
        marketData: TEST_MARKET_DATA
      };

      const report = await validationService.validateData(testData);

      expect(report.overallStatus).toBe('passed');
      expect(report.summary.errorCount).toBe(0);
      expect(report.summary.warningCount).toBeLessThanOrEqual(
        defaultValidationConfig.severityThresholds.warning
      );
    });

    it('should fail validation for missing business profile', async () => {
      const testData: ValidationTarget = {
        products: createTestProducts(),
        complianceData: TEST_COMPLIANCE_DATA,
        marketData: TEST_MARKET_DATA
      };

      const report = await validationService.validateData(testData);

      expect(report.overallStatus).toBe('failed');
      expect(report.summary.errorCount).toBeGreaterThan(0);
      expect(report.results.business).toContainEqual(
        expect.objectContaining({
          passed: false,
          message: expect.stringContaining('required')
        })
      );
    });

    it('should generate warnings for incomplete product enhancements', async () => {
      const testData: ValidationTarget = {
        businessProfile: createTestBusinessProfile(),
        products: TEST_PRODUCTS.map(p => ({
          name: p.name,
          description: p.description,
          category: p.category || '[TEST] Default Category',
          enhancement: {
            hsCode: '',
            industrySector: '',
            industrySubsector: '',
            exportPotential: 'Low',
            complianceRequirements: [],
            potentialMarkets: []
          }
        })),
        complianceData: TEST_COMPLIANCE_DATA,
        marketData: TEST_MARKET_DATA
      };

      const report = await validationService.validateData(testData);

      expect(report.overallStatus).toBe('warning');
      expect(report.results.products).toContainEqual(
        expect.objectContaining({
          passed: false,
          message: expect.stringContaining('enhancement')
        })
      );
      expect(report.recommendations).toContainEqual(
        expect.objectContaining({
          priority: expect.stringMatching(/^(medium|high)$/),
          message: expect.stringContaining('HS code')
        })
      );
    });

    it('should validate compliance data requirements', async () => {
      const testData: ValidationTarget = {
        businessProfile: createTestBusinessProfile(),
        products: createTestProducts(),
        complianceData: [
          {
            market: '[TEST] US',
            productType: '[TEST] Category 1',
            requirements: [] // Empty requirements should trigger a warning
          }
        ],
        marketData: TEST_MARKET_DATA
      };

      const report = await validationService.validateData(testData);

      expect(report.results.compliance).toContainEqual(
        expect.objectContaining({
          passed: false,
          message: expect.stringContaining('requirements')
        })
      );
    });

    it('should validate market data completeness', async () => {
      const testData: ValidationTarget = {
        businessProfile: createTestBusinessProfile(),
        products: createTestProducts(),
        complianceData: TEST_COMPLIANCE_DATA,
        marketData: [
          {
            market: '[TEST] US',
            productType: '[TEST] Category 1',
            data: [
              { type: 'marketSize', value: 1000000 }
              // Missing growthRate should trigger a warning
            ]
          }
        ]
      };

      const report = await validationService.validateData(testData);

      expect(report.results.market).toContainEqual(
        expect.objectContaining({
          passed: false,
          message: expect.stringContaining('improvement')
        })
      );
      expect(report.recommendations).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('metrics')
        })
      );
    });

    it('should generate prioritized recommendations', async () => {
      const testData: ValidationTarget = {
        businessProfile: {
          ...createTestBusinessProfile(),
          exportReadinessIndicators: {
            hasInternationalFocus: false,
            mentionsExports: false,
            hasCertifications: [],
            hasMultipleLanguages: false
          }
        },
        products: TEST_PRODUCTS.map(p => ({
          name: p.name,
          description: p.description,
          category: p.category || '[TEST] Default Category',
          enhancement: {
            hsCode: '',
            industrySector: '',
            industrySubsector: '',
            exportPotential: 'Low',
            complianceRequirements: [],
            potentialMarkets: []
          }
        }))
      };

      const report = await validationService.validateData(testData);

      expect(report.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ priority: 'high' }),
          expect.objectContaining({ priority: 'medium' })
        ])
      );

      // Verify recommendations are sorted by priority
      const priorities = report.recommendations.map(r => r.priority);
      expect(priorities).toEqual([...priorities].sort((a, b) => {
        const weight = { high: 3, medium: 2, low: 1 };
        return weight[b] - weight[a];
      }));
    });
  });
}); 
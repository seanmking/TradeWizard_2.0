import { ValidationRule } from '../../../types/validation.types';

// Business Profile Rules
export const businessProfileRules: ValidationRule[] = [
  {
    id: 'business-001',
    name: 'Required Business Fields',
    description: 'Validates that all required business profile fields are present',
    severity: 'error',
    validate: ({ businessProfile }) => {
      if (!businessProfile) {
        return {
          passed: false,
          message: 'Business profile is required',
          details: [{ field: 'businessProfile', issue: 'Missing required data' }]
        };
      }

      const requiredFields = [
        'businessName',
        'industry',
        'subIndustry',
        'marketFocus',
        'businessSize'
      ];

      const missingFields = requiredFields.filter(
        field => !businessProfile[field as keyof typeof businessProfile]
      );

      return {
        passed: missingFields.length === 0,
        message: missingFields.length ? 'Missing required business fields' : 'All required fields present',
        details: missingFields.map(field => ({
          field,
          issue: 'Required field is missing',
          recommendation: `Please provide the ${field} information`
        }))
      };
    }
  },
  {
    id: 'business-002',
    name: 'Export Readiness Indicators',
    description: 'Validates export readiness indicators',
    severity: 'warning',
    validate: ({ businessProfile }) => {
      if (!businessProfile?.exportReadinessIndicators) {
        return {
          passed: false,
          message: 'Export readiness indicators are missing',
          details: [{
            field: 'exportReadinessIndicators',
            issue: 'Missing export readiness data',
            recommendation: 'Complete the export readiness assessment'
          }]
        };
      }

      const { hasInternationalFocus, mentionsExports, hasCertifications, hasMultipleLanguages } = 
        businessProfile.exportReadinessIndicators;

      const warnings = [];
      if (!hasInternationalFocus) {
        warnings.push({
          field: 'hasInternationalFocus',
          issue: 'No international focus detected',
          recommendation: 'Consider developing an international business strategy'
        });
      }
      if (!mentionsExports) {
        warnings.push({
          field: 'mentionsExports',
          issue: 'No export mentions found',
          recommendation: 'Include export capabilities in business description'
        });
      }
      if (!hasCertifications?.length) {
        warnings.push({
          field: 'hasCertifications',
          issue: 'No certifications listed',
          recommendation: 'Consider obtaining relevant international certifications'
        });
      }
      if (!hasMultipleLanguages) {
        warnings.push({
          field: 'hasMultipleLanguages',
          issue: 'Single language support',
          recommendation: 'Consider adding multilingual support'
        });
      }

      return {
        passed: warnings.length === 0,
        message: warnings.length ? 'Export readiness improvements needed' : 'Export readiness criteria met',
        details: warnings
      };
    }
  }
];

// Product Rules
export const productRules: ValidationRule[] = [
  {
    id: 'product-001',
    name: 'Required Product Fields',
    description: 'Validates that all required product fields are present',
    severity: 'error',
    validate: ({ products }) => {
      if (!products?.length) {
        return {
          passed: false,
          message: 'Products array is empty',
          details: [{ field: 'products', issue: 'No products provided' }]
        };
      }

      const requiredFields = ['name', 'description', 'category'];
      const issues: { field: string; issue: string; recommendation?: string }[] = [];

      products.forEach((product, index) => {
        requiredFields.forEach(field => {
          if (!product[field as keyof typeof product]) {
            issues.push({
              field: `products[${index}].${field}`,
              issue: `Missing ${field}`,
              recommendation: `Provide ${field} for product: ${product.name || `at index ${index}`}`
            });
          }
        });
      });

      return {
        passed: issues.length === 0,
        message: issues.length ? 'Products missing required fields' : 'All product fields present',
        details: issues
      };
    }
  },
  {
    id: 'product-002',
    name: 'Product Enhancement Validation',
    description: 'Validates product enhancement data',
    severity: 'warning',
    validate: ({ products }) => {
      if (!products?.length) {
        return {
          passed: false,
          message: 'No products to validate',
          details: [{ field: 'products', issue: 'Products array is empty' }]
        };
      }

      const issues: { field: string; issue: string; recommendation?: string }[] = [];

      products.forEach((product, index) => {
        if (!product.enhancement) {
          issues.push({
            field: `products[${index}].enhancement`,
            issue: 'Missing enhancement data',
            recommendation: 'Run product enhancement analysis'
          });
          return;
        }

        const { hsCode, exportPotential, complianceRequirements, potentialMarkets } = product.enhancement;

        if (!hsCode) {
          issues.push({
            field: `products[${index}].enhancement.hsCode`,
            issue: 'Missing HS code',
            recommendation: 'Determine correct HS code for international trade'
          });
        }

        if (!exportPotential) {
          issues.push({
            field: `products[${index}].enhancement.exportPotential`,
            issue: 'Missing export potential assessment',
            recommendation: 'Analyze export potential'
          });
        }

        if (!complianceRequirements?.length) {
          issues.push({
            field: `products[${index}].enhancement.complianceRequirements`,
            issue: 'No compliance requirements listed',
            recommendation: 'Research compliance requirements for target markets'
          });
        }

        if (!potentialMarkets?.length) {
          issues.push({
            field: `products[${index}].enhancement.potentialMarkets`,
            issue: 'No potential markets identified',
            recommendation: 'Analyze potential target markets'
          });
        }
      });

      return {
        passed: issues.length === 0,
        message: issues.length ? 'Product enhancements need improvement' : 'Product enhancements complete',
        details: issues
      };
    }
  }
];

// Compliance Rules
export const complianceRules: ValidationRule[] = [
  {
    id: 'compliance-001',
    name: 'Market Compliance Requirements',
    description: 'Validates compliance requirements for each market',
    severity: 'error',
    validate: ({ complianceData }) => {
      if (!complianceData?.length) {
        return {
          passed: true,
          message: 'No compliance data to validate',
          details: []
        };
      }

      const issues: { field: string; issue: string; recommendation?: string }[] = [];

      complianceData.forEach((data, index) => {
        if (!data.market) {
          issues.push({
            field: `complianceData[${index}].market`,
            issue: 'Missing market identifier',
            recommendation: 'Specify target market'
          });
        }

        if (!data.requirements?.length) {
          issues.push({
            field: `complianceData[${index}].requirements`,
            issue: 'No compliance requirements listed',
            recommendation: `Research compliance requirements for market: ${data.market || index}`
          });
        } else {
          data.requirements.forEach((req, reqIndex) => {
            if (!req.type || !req.details) {
              issues.push({
                field: `complianceData[${index}].requirements[${reqIndex}]`,
                issue: 'Incomplete requirement details',
                recommendation: 'Provide both type and details for each requirement'
              });
            }
          });
        }
      });

      return {
        passed: issues.length === 0,
        message: issues.length ? 'Compliance data needs improvement' : 'Compliance data is complete',
        details: issues
      };
    }
  }
];

// Market Rules
export const marketRules: ValidationRule[] = [
  {
    id: 'market-001',
    name: 'Market Data Completeness',
    description: 'Validates market data completeness',
    severity: 'warning',
    validate: ({ marketData }) => {
      if (!marketData?.length) {
        return {
          passed: true,
          message: 'No market data to validate',
          details: []
        };
      }

      const issues: { field: string; issue: string; recommendation?: string }[] = [];

      marketData.forEach((data, index) => {
        if (!data.market) {
          issues.push({
            field: `marketData[${index}].market`,
            issue: 'Missing market identifier',
            recommendation: 'Specify target market'
          });
        }

        if (!data.data?.length) {
          issues.push({
            field: `marketData[${index}].data`,
            issue: 'No market metrics provided',
            recommendation: `Add market analysis data for: ${data.market || index}`
          });
        } else {
          const requiredMetrics = ['marketSize', 'growthRate'];
          const missingMetrics = requiredMetrics.filter(
            metric => !data.data.some(d => d.type === metric)
          );

          if (missingMetrics.length) {
            issues.push({
              field: `marketData[${index}].data`,
              issue: `Missing key metrics: ${missingMetrics.join(', ')}`,
              recommendation: 'Include all key market metrics'
            });
          }
        }
      });

      return {
        passed: issues.length === 0,
        message: issues.length ? 'Market data needs improvement' : 'Market data is complete',
        details: issues
      };
    }
  }
];

export const defaultValidationConfig = {
  rules: {
    business: businessProfileRules,
    products: productRules,
    compliance: complianceRules,
    market: marketRules
  },
  severityThresholds: {
    error: 0,
    warning: 2,
    info: 5
  }
}; 
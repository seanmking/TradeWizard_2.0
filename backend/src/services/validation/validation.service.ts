import { Logger } from '../../utils/logger';
import {
  ValidationRule,
  ValidationTarget,
  ValidationResult,
  ValidationConfig,
  ValidationReport
} from '../../types/validation.types';
import { BusinessProfile, EnhancedProduct } from '../../types/ai-orchestrator.types';
import { RawComplianceData, RawMarketData } from '../../types/context-builder.types';

export class ValidationService {
  private readonly logger: Logger;
  private readonly config: ValidationConfig;

  constructor(config: ValidationConfig) {
    this.logger = new Logger('ValidationService');
    this.config = config;
  }

  public async validateData(data: ValidationTarget): Promise<ValidationReport> {
    this.logger.info('Starting data validation');
    const startTime = Date.now();

    const results = {
      business: await this.validateBusinessProfile(data.businessProfile),
      products: await this.validateProducts(data.products),
      compliance: await this.validateComplianceData(data.complianceData),
      market: await this.validateMarketData(data.marketData)
    };

    const summary = this.generateSummary(results);
    const recommendations = this.generateRecommendations(results);
    const overallStatus = this.determineOverallStatus(summary);

    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      overallStatus,
      results,
      summary,
      recommendations
    };

    this.logger.info(`Validation completed in ${Date.now() - startTime}ms`);
    return report;
  }

  private async validateBusinessProfile(profile?: BusinessProfile): Promise<ValidationResult[]> {
    if (!profile) {
      return [{
        passed: false,
        message: 'Business profile is required',
        details: [{ field: 'businessProfile', issue: 'Missing required data' }]
      }];
    }

    return await Promise.all(
      this.config.rules.business.map(rule => rule.validate({ businessProfile: profile }))
    );
  }

  private async validateProducts(products?: EnhancedProduct[]): Promise<ValidationResult[]> {
    if (!products?.length) {
      return [{
        passed: false,
        message: 'At least one product is required',
        details: [{ field: 'products', issue: 'No products provided' }]
      }];
    }

    const results: ValidationResult[] = [];
    for (const rule of this.config.rules.products) {
      results.push(await rule.validate({ products }));
    }

    // Product-specific validations
    for (const product of products) {
      if (!product.enhancement?.hsCode) {
        results.push({
          passed: false,
          message: `Missing HS code for product: ${product.name}`,
          details: [{ 
            field: 'product.enhancement.hsCode',
            issue: 'Missing HS code',
            recommendation: 'Ensure product enhancement includes valid HS code'
          }]
        });
      }
    }

    return results;
  }

  private async validateComplianceData(data?: RawComplianceData[]): Promise<ValidationResult[]> {
    if (!data?.length) {
      return [{
        passed: true,
        message: 'No compliance data to validate',
        details: [{ field: 'complianceData', issue: 'Optional data not provided' }]
      }];
    }

    return await Promise.all(
      this.config.rules.compliance.map(rule => rule.validate({ complianceData: data }))
    );
  }

  private async validateMarketData(data?: RawMarketData[]): Promise<ValidationResult[]> {
    if (!data?.length) {
      return [{
        passed: true,
        message: 'No market data to validate',
        details: [{ field: 'marketData', issue: 'Optional data not provided' }]
      }];
    }

    return await Promise.all(
      this.config.rules.market.map(rule => rule.validate({ marketData: data }))
    );
  }

  private generateSummary(results: ValidationReport['results']): ValidationReport['summary'] {
    let totalChecks = 0;
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    const processResults = (validationResults: ValidationResult[]) => {
      for (const result of validationResults) {
        totalChecks++;
        if (result.passed) {
          passed++;
        } else {
          failed++;
          if (result.details?.some(d => d.issue.toLowerCase().includes('warning'))) {
            warnings++;
            warningCount++;
          } else {
            errorCount++;
          }
        }
      }
    };

    processResults(results.business);
    processResults(results.products);
    processResults(results.compliance);
    processResults(results.market);

    return {
      totalChecks,
      passed,
      failed,
      warnings,
      errorCount,
      warningCount,
      infoCount
    };
  }

  private generateRecommendations(results: ValidationReport['results']): ValidationReport['recommendations'] {
    const recommendations: ValidationReport['recommendations'] = [];

    const processResults = (validationResults: ValidationResult[]) => {
      for (const result of validationResults) {
        if (!result.passed && result.details) {
          for (const detail of result.details) {
            if (detail.recommendation) {
              recommendations.push({
                priority: this.determinePriority(detail.issue),
                message: detail.recommendation,
                relatedRule: detail.field
              });
            }
          }
        }
      }
    };

    processResults(results.business);
    processResults(results.products);
    processResults(results.compliance);
    processResults(results.market);

    return recommendations.sort((a, b) => 
      this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority)
    );
  }

  private determinePriority(issue: string): 'high' | 'medium' | 'low' {
    const lowercaseIssue = issue.toLowerCase();
    if (lowercaseIssue.includes('error') || lowercaseIssue.includes('missing required')) {
      return 'high';
    }
    if (lowercaseIssue.includes('warning')) {
      return 'medium';
    }
    return 'low';
  }

  private getPriorityWeight(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }

  private determineOverallStatus(summary: ValidationReport['summary']): ValidationReport['overallStatus'] {
    if (summary.errorCount > this.config.severityThresholds.error) {
      return 'failed';
    }
    if (summary.warningCount > this.config.severityThresholds.warning) {
      return 'warning';
    }
    return 'passed';
  }
} 
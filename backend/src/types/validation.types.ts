import { BusinessProfile, EnhancedProduct } from './ai-orchestrator.types';
import { RawComplianceData, RawMarketData } from './context-builder.types';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validate: (data: ValidationTarget) => ValidationResult;
}

export interface ValidationTarget {
  businessProfile?: BusinessProfile;
  products?: EnhancedProduct[];
  complianceData?: RawComplianceData[];
  marketData?: RawMarketData[];
}

export interface ValidationResult {
  passed: boolean;
  message: string;
  details?: {
    field: string;
    issue: string;
    recommendation?: string;
  }[];
}

export interface ValidationConfig {
  rules: {
    business: ValidationRule[];
    products: ValidationRule[];
    compliance: ValidationRule[];
    market: ValidationRule[];
  };
  severityThresholds: {
    error: number;
    warning: number;
    info: number;
  };
}

export interface ValidationReport {
  timestamp: string;
  overallStatus: 'passed' | 'failed' | 'warning';
  results: {
    business: ValidationResult[];
    products: ValidationResult[];
    compliance: ValidationResult[];
    market: ValidationResult[];
  };
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    message: string;
    relatedRule: string;
  }[];
} 
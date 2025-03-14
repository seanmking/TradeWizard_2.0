/**
 * Export Readiness Integration with Assessment System
 * 
 * This module connects the export readiness report generator
 * with the existing 5-question assessment approach.
 */

import { ExportReadinessReport, ReportOptions, generateExportReadinessReport } from './reportGenerator';
import { analyzeWebsiteForExportReadiness } from './websiteAnalysisEnhanced';

// Define assessment interfaces locally to avoid dependency issues
// In a real implementation, import these from your assessment service

/**
 * Assessment question option
 */
interface AssessmentOption {
  value: string;
  label: string;
}

/**
 * Assessment question type
 */
interface AssessmentQuestion {
  id: string;
  text: string;
  type: 'text' | 'single_select' | 'multi_select' | 'number' | 'date';
  options?: AssessmentOption[];
  placeholder?: string;
  required: boolean;
  validationRules?: {
    minSelected?: number;
    maxSelected?: number;
    pattern?: string;
    patternError?: string;
  };
}

/**
 * Assessment stage
 */
interface AssessmentStage {
  id: string;
  name: string;
  description: string;
  questions: AssessmentQuestion[];
  nextStage: string | null;
}

/**
 * User response to an assessment question
 */
interface UserResponse {
  questionId: string;
  value: string | string[] | number | boolean;
}

/**
 * Interface for the assessment service integration
 */
interface ExportReadinessAssessmentResult {
  report: ExportReadinessReport;
  assessmentId: string;
  userResponses: UserResponse[];
  websiteUrl: string;
  businessName: string;
  generatedAt: Date;
}

/**
 * Export readiness questions that can be added to the assessment
 */
export const exportReadinessQuestions: AssessmentQuestion[] = [
  {
    id: 'export_target_markets',
    text: 'Which specific international markets are you interested in exporting to?',
    type: 'multi_select',
    options: [
      { value: 'uae', label: 'United Arab Emirates' },
      { value: 'uk', label: 'United Kingdom' },
      { value: 'usa', label: 'United States' },
      { value: 'eu', label: 'European Union' },
      { value: 'china', label: 'China' },
      { value: 'japan', label: 'Japan' },
      { value: 'other', label: 'Other (please specify)' }
    ],
    required: true,
    validationRules: {
      minSelected: 1,
      maxSelected: 5
    }
  },
  {
    id: 'export_experience',
    text: 'What is your current level of export experience?',
    type: 'single_select',
    options: [
      { value: 'none', label: 'No export experience' },
      { value: 'researching', label: 'Researching export opportunities' },
      { value: 'planning', label: 'Planning first export' },
      { value: 'limited', label: 'Limited export experience (1-2 markets)' },
      { value: 'experienced', label: 'Experienced exporter (3+ markets)' }
    ],
    required: true
  },
  {
    id: 'business_website',
    text: 'What is your business website URL?',
    type: 'text',
    placeholder: 'https://example.com',
    required: true,
    validationRules: {
      pattern: '^(https?:\\/\\/)?(www\\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\.[a-zA-Z]{2,}(\\.[a-zA-Z]{2,})?(\\/[^\\s]*)?$',
      patternError: 'Please enter a valid website URL'
    }
  },
  {
    id: 'industry_sector',
    text: 'What industry or sector does your business operate in?',
    type: 'single_select',
    options: [
      { value: 'food', label: 'Food & Beverages' },
      { value: 'textile', label: 'Textiles & Clothing' },
      { value: 'health', label: 'Healthcare & Medical' },
      { value: 'technology', label: 'Technology & Software' },
      { value: 'manufacturing', label: 'Manufacturing & Industrial' },
      { value: 'other', label: 'Other (please specify)' }
    ],
    required: true
  },
  {
    id: 'business_size',
    text: 'What is the size of your business?',
    type: 'single_select',
    options: [
      { value: 'micro', label: 'Micro (1-9 employees)' },
      { value: 'small', label: 'Small (10-49 employees)' },
      { value: 'medium', label: 'Medium (50-249 employees)' },
      { value: 'large', label: 'Large (250+ employees)' }
    ],
    required: true
  }
];

/**
 * Export readiness assessment stage definition
 */
export const EXPORT_READINESS_STAGE: AssessmentStage = {
  id: 'export_readiness',
  name: 'Export Readiness',
  description: 'Assess your readiness to start exporting your products or services to international markets',
  questions: exportReadinessQuestions,
  nextStage: null
};

/**
 * Convert user responses from the assessment into report options
 */
function mapAssessmentResponsesToReportOptions(responses: UserResponse[]): ReportOptions {
  // Default options
  const options: ReportOptions = {
    detailLevel: 'standard',
    includeVisuals: true,
    includeCompetitorAnalysis: false
  };
  
  // Process each response by question ID
  for (const response of responses) {
    switch (response.questionId) {
      case 'export_target_markets':
        // Map selected market values to actual market names
        if (Array.isArray(response.value)) {
          options.targetMarkets = response.value.map((value: string) => {
            switch (value) {
              case 'uae': return 'UAE';
              case 'uk': return 'UK';
              case 'usa': return 'USA';
              case 'eu': return 'European Union';
              case 'china': return 'China';
              case 'japan': return 'Japan';
              default: return value;
            }
          });
        }
        break;
        
      case 'industry_sector':
        // Set industry context
        options.industryContext = response.value as string;
        break;
        
      case 'business_size':
        // Set business size in additional info
        options.additionalBusinessInfo = options.additionalBusinessInfo || {};
        switch (response.value) {
          case 'micro':
            options.additionalBusinessInfo.employeeCount = 5; // Estimate
            break;
          case 'small':
            options.additionalBusinessInfo.employeeCount = 30; // Estimate
            break;
          case 'medium':
            options.additionalBusinessInfo.employeeCount = 150; // Estimate
            break;
          case 'large':
            options.additionalBusinessInfo.employeeCount = 500; // Estimate
            break;
        }
        break;
        
      case 'export_experience':
        // Set export experience in additional info
        options.additionalBusinessInfo = options.additionalBusinessInfo || {};
        options.additionalBusinessInfo.exportExperience = response.value as string;
        break;
    }
  }
  
  return options;
}

/**
 * Get website URL from user responses
 */
function getWebsiteUrlFromResponses(responses: UserResponse[]): string {
  const websiteResponse = responses.find(r => r.questionId === 'business_website');
  return websiteResponse ? websiteResponse.value as string : '';
}

/**
 * Generate export readiness report based on assessment responses
 */
export async function generateReportFromAssessment(
  assessmentId: string,
  userResponses: UserResponse[]
): Promise<ExportReadinessAssessmentResult> {
  // Extract website URL from responses
  const websiteUrl = getWebsiteUrlFromResponses(userResponses);
  
  if (!websiteUrl) {
    throw new Error('Website URL is required to generate an export readiness report');
  }
  
  // Map assessment responses to report options
  const reportOptions = mapAssessmentResponsesToReportOptions(userResponses);
  
  try {
    // Analyze the website
    const websiteAnalysis = await analyzeWebsiteForExportReadiness(websiteUrl);
    
    // Generate the report
    const report = await generateExportReadinessReport(websiteAnalysis, reportOptions);
    
    // Return the complete result with assessment context
    return {
      report,
      assessmentId,
      userResponses,
      websiteUrl,
      businessName: report.businessName,
      generatedAt: new Date()
    };
  } catch (error) {
    console.error('Error generating report from assessment:', error);
    throw new Error('Failed to generate export readiness report from assessment. Please try again later.');
  }
}

/**
 * Integration with existing assessment flow
 */
export function addExportReadinessToAssessment(
  currentStages: AssessmentStage[]
): AssessmentStage[] {
  // Clone the current stages to avoid modifying the original
  const newStages = [...currentStages];
  
  // Find the last stage
  const lastStage = newStages[newStages.length - 1];
  
  if (lastStage) {
    // Connect the last stage to the export readiness stage
    lastStage.nextStage = EXPORT_READINESS_STAGE.id;
    
    // Add the export readiness stage
    newStages.push(EXPORT_READINESS_STAGE);
  } else {
    // If no stages, just add export readiness stage
    newStages.push(EXPORT_READINESS_STAGE);
  }
  
  return newStages;
} 
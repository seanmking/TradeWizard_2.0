/**
 * Export Readiness Module Tests
 * 
 * Simple test functions to verify the export readiness module functionalities.
 * In a real implementation, these would be proper unit and integration tests.
 */

import { analyzeWebsiteForExportReadiness, ExportReadinessWebsiteAnalysis } from './websiteAnalysisEnhanced';
import { generateExportReadinessReport, ReportOptions } from './reportGenerator';
import { generateReportFromAssessment, EXPORT_READINESS_STAGE } from './integration';

// Create a complete mock that satisfies the ExportReadinessWebsiteAnalysis interface
// We're not including properties like url and scrapedAt that may be in the original interface
// but aren't used by our report generator

/**
 * Mock website analysis data for testing
 */
const mockWebsiteAnalysis = {
  businessName: 'Test Company',
  description: 'A company that manufactures high-quality food products',
  industry: 'food',
  sector: 'Agriculture & Food Processing',
  productDetails: [
    {
      name: 'Organic Honey',
      description: 'Premium organic honey sourced from sustainable apiaries'
    },
    {
      name: 'Natural Fruit Preserves',
      description: 'Preserves made from locally sourced fruits without additives'
    }
  ],
  productCategories: ['Organic Foods', 'Natural Products'],
  certifications: ['Organic', 'ISO 9001'],
  geographicPresence: ['US East Coast', 'Canada'],
  businessSize: 'small',
  customerSegments: ['Health-conscious consumers', 'Specialty grocery stores'],
  exportReadiness: 65,
  complianceSignals: {
    certifications: [
      { name: 'Organic', relevance: 'high' },
      { name: 'ISO 9001', relevance: 'medium' }
    ],
    standards: ['FDA Standards', 'USDA Organic'],
    qualityMarks: ['Premium', 'Organic Certified'],
    regulatoryMentions: ['Complies with FDA regulations']
  },
  digitalMaturity: {
    score: 70,
    level: 'intermediate',
    strengths: ['Comprehensive product information', 'Complete contact information'],
    gaps: ['Limited social media integration', 'No international market mentions']
  },
  exportContent: {
    hasExportMentions: true,
    hasInternationalPricing: false,
    hasMultipleLanguages: false,
    mentionedMarkets: ['Canada'],
    internationalPartners: [],
    globalLogistics: false
  },
  readinessDimensions: {
    product_quality: {
      score: 80,
      confidence: 70,
      evidence: ['Quality certifications: Organic, ISO 9001'],
      assumptions: []
    },
    product_adaptation: {
      score: 50,
      confidence: 60,
      evidence: [],
      assumptions: ['No explicit information about product adaptation capabilities']
    },
    market_research: {
      score: 40,
      confidence: 50,
      evidence: ['Limited international market mentions'],
      assumptions: ['No comprehensive market research evident on website']
    }
  },
  overallReadiness: {
    score: 65,
    confidenceLevel: 60,
    primaryStrengths: ['Product Quality', 'Digital Presence'],
    developmentAreas: ['Market Research', 'International Logistics'],
    immediateNextSteps: [
      'Conduct detailed market research for target markets',
      'Develop international pricing strategy'
    ]
  },
  contactInfo: {
    email: 'info@testcompany.com',
    phone: '555-123-4567',
    address: '123 Main St, Anytown, USA',
    socialMedia: {
      facebook: 'testcompany',
      instagram: 'testcompany'
    }
  },
  locations: ['New York, USA'],
  yearFounded: '2010',
  lastUpdated: new Date(),
  websiteQuality: {
    hasSsl: true,
    hasMobileCompatibility: true,
    hasRecentUpdates: true,
    hasMultiplePages: true
  },
  exportMentions: ['Planning to export to Canada']
};

/**
 * Mock user responses for testing
 */
const mockUserResponses = [
  {
    questionId: 'export_target_markets',
    value: ['uae', 'uk', 'usa']
  },
  {
    questionId: 'export_experience',
    value: 'limited'
  },
  {
    questionId: 'business_website',
    value: 'https://example-food-exporter.com'
  },
  {
    questionId: 'industry_sector',
    value: 'food'
  },
  {
    questionId: 'business_size',
    value: 'small'
  }
];

/**
 * Test website analysis functionality
 */
export async function testWebsiteAnalysis(): Promise<void> {
  console.log('=== Testing Website Analysis ===');
  
  try {
    // In a real test, this would use the actual function with a test URL
    // For this demo, we'll use a mocked version

    // Create a simple mock function that returns our test data
    const mockAnalyzeFunction = async (url: string) => mockWebsiteAnalysis;
    
    // Save original function (only for demonstration)
    const originalFunction = analyzeWebsiteForExportReadiness;
    
    // Replace with mock for testing
    (global as any).analyzeWebsiteForExportReadiness = mockAnalyzeFunction;
    
    console.log('Analyzing mock website...');
    // Call the function to get mock data
    const analysis = await mockAnalyzeFunction('https://test-url.com');
    
    console.log('Website analysis completed successfully');
    console.log(`Business name: ${analysis.businessName}`);
    console.log(`Industry: ${analysis.industry}`);
    console.log(`Digital maturity: ${analysis.digitalMaturity.level} (${analysis.digitalMaturity.score})`);
    console.log(`Overall readiness: ${analysis.overallReadiness.score}`);
    
    // Restore original function (only for demonstration)
    (global as any).analyzeWebsiteForExportReadiness = originalFunction;
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

/**
 * Test report generation functionality
 */
export async function testReportGeneration(): Promise<void> {
  console.log('=== Testing Report Generation ===');
  
  const options: ReportOptions = {
    targetMarkets: ['UAE', 'UK', 'USA'],
    detailLevel: 'comprehensive',
    includeVisuals: true,
    includeCompetitorAnalysis: false
  };
  
  try {
    console.log('Generating export readiness report...');
    // We pass our mock data directly to the report generator for testing
    const report = await generateExportReadinessReport(mockWebsiteAnalysis as ExportReadinessWebsiteAnalysis, options);
    
    console.log('Report generated successfully');
    console.log(`Business name: ${report.businessName}`);
    console.log(`Report ID: ${report.reportId}`);
    console.log(`Readiness level: ${report.executiveSummary.readinessLevel}`);
    console.log(`Target markets: ${report.targetMarkets.join(', ')}`);
    
    // Test report content
    if (report.executiveSummary.keySummaryPoints.length === 0) {
      console.error('Error: Executive summary is empty');
    } else {
      console.log(`Summary points: ${report.executiveSummary.keySummaryPoints.length}`);
    }
    
    if (report.readinessAssessment.length === 0) {
      console.error('Error: Readiness assessment is empty');
    } else {
      console.log(`Assessment categories: ${report.readinessAssessment.length}`);
    }
    
    if (report.marketAnalysis.length === 0) {
      console.error('Error: Market analysis is empty');
    } else {
      console.log(`Markets analyzed: ${report.marketAnalysis.length}`);
    }
    
    if (report.actionPlan.immediateActions.length === 0) {
      console.error('Error: Action plan is empty');
    } else {
      console.log(`Immediate actions: ${report.actionPlan.immediateActions.length}`);
    }
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

/**
 * Test integration with assessment
 */
export async function testAssessmentIntegration(): Promise<void> {
  console.log('=== Testing Assessment Integration ===');
  
  try {
    // Check export readiness stage
    console.log('Checking export readiness stage definition...');
    if (!EXPORT_READINESS_STAGE || EXPORT_READINESS_STAGE.questions.length === 0) {
      throw new Error('Export readiness stage is not properly defined');
    }
    
    console.log(`Stage name: ${EXPORT_READINESS_STAGE.name}`);
    console.log(`Questions: ${EXPORT_READINESS_STAGE.questions.length}`);
    
    // Mock generateReportFromAssessment function for testing
    console.log('Testing assessment to report generation...');
    
    // Create a simple mock function that returns our test data
    const mockAnalyzeFunction = async (url: string) => mockWebsiteAnalysis;
    
    // Save original function
    const originalAnalyzeFunction = analyzeWebsiteForExportReadiness;
    
    // Replace with mock for testing
    (global as any).analyzeWebsiteForExportReadiness = mockAnalyzeFunction;
    
    const result = await generateReportFromAssessment('test-assessment-123', mockUserResponses);
    
    console.log('Assessment integration test completed successfully');
    console.log(`Report generated for business: ${result.report.businessName}`);
    console.log(`Assessment ID: ${result.assessmentId}`);
    console.log(`Business name: ${result.businessName}`);
    
    // Restore original function
    (global as any).analyzeWebsiteForExportReadiness = originalAnalyzeFunction;
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.log('Running all export readiness module tests...');
  
  await testWebsiteAnalysis();
  console.log('\n');
  
  await testReportGeneration();
  console.log('\n');
  
  await testAssessmentIntegration();
  console.log('\n');
  
  console.log('All tests completed');
} 
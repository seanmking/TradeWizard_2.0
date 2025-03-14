/**
 * Export Readiness Generator - Demo Usage
 * 
 * This file shows how to use the export readiness report generator
 * with the enhanced website analysis module.
 */

import { analyzeWebsiteForExportReadiness } from './websiteAnalysisEnhanced';
import { generateExportReadinessReport, ReportOptions, ExportReadinessReport } from './reportGenerator';

/**
 * Generate a complete export readiness report for a website
 */
export async function generateExportReadinessReportForWebsite(
  websiteUrl: string, 
  options: ReportOptions
): Promise<ExportReadinessReport> {
  console.log(`Generating export readiness report for ${websiteUrl}...`);
  console.log(`Target markets: ${options.targetMarkets?.join(', ') || 'None specified'}`);
  
  try {
    // Step 1: Perform enhanced website analysis with export focus
    console.log('Step 1: Analyzing website for export readiness signals...');
    const websiteAnalysis = await analyzeWebsiteForExportReadiness(websiteUrl);
    
    console.log(`Analysis complete for ${websiteAnalysis.businessName}`);
    console.log(`Detected industry: ${websiteAnalysis.industry}`);
    console.log(`Digital maturity: ${websiteAnalysis.digitalMaturity.level} (${websiteAnalysis.digitalMaturity.score}/100)`);
    console.log(`Overall readiness score: ${websiteAnalysis.overallReadiness.score}/100`);
    
    // Step 2: Generate comprehensive export readiness report
    console.log('Step 2: Generating export readiness report...');
    const report = await generateExportReadinessReport(websiteAnalysis, options);
    
    // In a real application, you would:
    // 1. Save the report to database
    // 2. Generate PDF/HTML from the report data
    // 3. Return the report to the user interface
    
    console.log('\n===== REPORT SUMMARY =====');
    console.log(`Business: ${report.businessName}`);
    console.log(`Report ID: ${report.reportId}`);
    console.log(`Generated: ${report.generatedAt.toISOString()}`);
    console.log(`Overall Readiness: ${report.executiveSummary.readinessLevel.toUpperCase()} (${report.executiveSummary.overallReadinessScore}/100)`);
    
    console.log('\nKey Summary Points:');
    report.executiveSummary.keySummaryPoints.forEach((point, i) => {
      console.log(`${i + 1}. ${point}`);
    });
    
    console.log('\nImmediate Next Steps:');
    report.actionPlan.immediateActions.forEach((action, i) => {
      console.log(`${i + 1}. ${action}`);
    });
    
    console.log('\nMarket Analysis:');
    report.marketAnalysis.forEach(market => {
      console.log(`- ${market.market}: Opportunity Score ${market.opportunityScore}/100, Entry Complexity ${market.entryComplexity}/100`);
    });
    
    console.log('\nReport generated successfully!');
    
    return report;
  } catch (error) {
    console.error('Error generating export readiness report:', error);
    throw new Error('Failed to generate export readiness report. Please try again later.');
  }
}

/**
 * Demo function to showcase the report generator with example data
 */
export async function runExportReadinessDemoReport(): Promise<ExportReadinessReport | undefined> {
  // Example report options
  const demoOptions: ReportOptions = {
    targetMarkets: ['UAE', 'UK', 'USA'],
    detailLevel: 'comprehensive',
    includeVisuals: true,
    includeCompetitorAnalysis: false,
    industryContext: 'food',
    additionalBusinessInfo: {
      yearFounded: 2010,
      employeeCount: 45,
      annualRevenue: '$2-5 million',
      existingMarkets: ['Canada', 'Mexico'],
      exportExperience: 'Limited to North America'
    }
  };
  
  // Example website URL (in a real application, this would be user-provided)
  const websiteUrl = 'https://example-food-exporter.com';
  
  try {
    // Generate report
    const report = await generateExportReadinessReportForWebsite(websiteUrl, demoOptions);
    
    console.log('\nDemo complete! In a real application, this report would be:');
    console.log('1. Saved to the database');
    console.log('2. Made available for download as PDF');
    console.log('3. Displayed in the user interface with interactive visualizations');
    
    return report;
  } catch (error) {
    console.error('Demo failed:', error);
    return undefined;
  }
} 
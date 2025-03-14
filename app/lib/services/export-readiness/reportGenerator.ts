/**
 * Export Readiness Report Generator
 * 
 * Generates comprehensive reports based on website analysis and assessment data
 * to help businesses understand their export readiness.
 */

import { ExportReadinessWebsiteAnalysis } from './websiteAnalysisEnhanced';
import { ReadinessCategory, ReadinessDimension, readinessCategories, getMarketSpecificReadiness } from './readinessModel';

/**
 * Report configuration options
 */
export interface ReportOptions {
  // Target market(s) for export
  targetMarkets?: string[];
  
  // Level of detail in the report
  detailLevel: 'basic' | 'standard' | 'comprehensive';
  
  // Include visual elements (charts, graphs)
  includeVisuals: boolean;
  
  // Include competitor analysis
  includeCompetitorAnalysis: boolean;
  
  // Specific industry context to highlight
  industryContext?: string;
  
  // Additional business information not available from website
  additionalBusinessInfo?: {
    yearFounded?: number;
    employeeCount?: number;
    annualRevenue?: string;
    existingMarkets?: string[];
    exportExperience?: string;
  };
}

/**
 * Structure for an export readiness report
 */
export interface ExportReadinessReport {
  // Basic information
  businessName: string;
  generatedAt: Date;
  reportId: string;
  
  // Report configuration
  targetMarkets: string[];
  
  // Executive summary
  executiveSummary: {
    overallReadinessScore: number;
    readinessLevel: 'not ready' | 'partially ready' | 'ready' | 'highly ready';
    keySummaryPoints: string[];
    recommendedNextSteps: string[];
  };
  
  // Detailed analysis sections
  businessProfile: {
    description: string;
    industry: string;
    products: Array<{
      name: string;
      description: string;
      exportPotential: number; // 0-100
    }>;
    digitalPresence: {
      score: number;
      strengths: string[];
      weaknesses: string[];
    };
  };
  
  // Readiness assessment by category
  readinessAssessment: Array<{
    category: string;
    score: number;
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    dimensions: Array<{
      name: string;
      score: number;
      analysis: string;
    }>;
  }>;
  
  // Market-specific analysis
  marketAnalysis: Array<{
    market: string;
    opportunityScore: number;
    entryComplexity: number; // 0-100, higher means more complex
    culturalCompatibility: number; // 0-100
    keyRequirements: string[];
    regulatoryConsiderations: string[];
  }>;
  
  // Action plan
  actionPlan: {
    immediateActions: string[];
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
  };
  
  // Visual elements (if enabled)
  visualElements?: {
    readinessRadarChart?: any; // Would be actual chart data in implementation
    marketOpportunityMatrix?: any;
    competitivePositioning?: any;
    timelineEstimate?: any;
  };
}

/**
 * Generate an export readiness report based on website analysis
 */
export async function generateExportReadinessReport(
  websiteAnalysis: ExportReadinessWebsiteAnalysis,
  options: ReportOptions
): Promise<ExportReadinessReport> {
  // Basic report structure
  const report: ExportReadinessReport = {
    businessName: websiteAnalysis.businessName,
    generatedAt: new Date(),
    reportId: generateReportId(),
    targetMarkets: options.targetMarkets || ['General'],
    
    executiveSummary: {
      overallReadinessScore: websiteAnalysis.overallReadiness.score,
      readinessLevel: getReadinessLevel(websiteAnalysis.overallReadiness.score),
      keySummaryPoints: [],
      recommendedNextSteps: []
    },
    
    businessProfile: {
      description: websiteAnalysis.description,
      industry: websiteAnalysis.industry,
      products: [],
      digitalPresence: {
        score: websiteAnalysis.digitalMaturity.score,
        strengths: websiteAnalysis.digitalMaturity.strengths,
        weaknesses: websiteAnalysis.digitalMaturity.gaps
      }
    },
    
    readinessAssessment: [],
    
    marketAnalysis: [],
    
    actionPlan: {
      immediateActions: [],
      shortTerm: [],
      mediumTerm: [],
      longTerm: []
    }
  };
  
  // Generate executive summary
  report.executiveSummary = generateExecutiveSummary(websiteAnalysis, options);
  
  // Analyze products for export potential
  report.businessProfile.products = analyzeProductsForExport(websiteAnalysis, options);
  
  // Generate readiness assessment by category
  report.readinessAssessment = generateReadinessAssessment(websiteAnalysis);
  
  // Generate market analysis if target markets are specified
  if (options.targetMarkets && options.targetMarkets.length > 0) {
    report.marketAnalysis = generateMarketAnalysis(
      websiteAnalysis, 
      options.targetMarkets
    );
  }
  
  // Generate action plan
  report.actionPlan = generateActionPlan(websiteAnalysis, report.readinessAssessment, options);
  
  // Add visual elements if enabled
  if (options.includeVisuals) {
    report.visualElements = generateVisualElements(
      websiteAnalysis, 
      report.readinessAssessment,
      report.marketAnalysis
    );
  }
  
  return report;
}

/**
 * Generate the executive summary section of the report
 */
function generateExecutiveSummary(
  websiteAnalysis: ExportReadinessWebsiteAnalysis,
  options: ReportOptions
): ExportReadinessReport['executiveSummary'] {
  const overallReadinessScore = websiteAnalysis.overallReadiness.score;
  const readinessLevel = getReadinessLevel(overallReadinessScore);
  
  // Generate key summary points
  const keySummaryPoints: string[] = [];
  
  // Overall readiness assessment
  keySummaryPoints.push(
    `${websiteAnalysis.businessName} is currently assessed as ${readinessLevel.toUpperCase()} for export` +
    `${options.targetMarkets && options.targetMarkets.length > 0 ? 
      ` to ${options.targetMarkets.join(', ')}` : ''}.`
  );
  
  // Digital presence assessment
  keySummaryPoints.push(
    `Digital presence assessment: ${websiteAnalysis.digitalMaturity.level} (${websiteAnalysis.digitalMaturity.score}/100), ` +
    `with ${websiteAnalysis.digitalMaturity.strengths.length} identified strengths and ` +
    `${websiteAnalysis.digitalMaturity.gaps.length} areas for improvement.`
  );
  
  // Key strength areas
  if (websiteAnalysis.overallReadiness.primaryStrengths.length > 0) {
    keySummaryPoints.push(
      `Key strengths include: ${websiteAnalysis.overallReadiness.primaryStrengths.join(', ')}.`
    );
  }
  
  // Development areas
  if (websiteAnalysis.overallReadiness.developmentAreas.length > 0) {
    keySummaryPoints.push(
      `Priority development areas: ${websiteAnalysis.overallReadiness.developmentAreas.join(', ')}.`
    );
  }
  
  // Export content assessment
  const exportContent = websiteAnalysis.exportContent;
  if (exportContent.hasExportMentions) {
    keySummaryPoints.push(
      `The business shows existing export awareness with mentions of ${exportContent.mentionedMarkets.join(', ')}.`
    );
  } else {
    keySummaryPoints.push(
      'No explicit export focus detected on the website, suggesting export activities may be new to the business.'
    );
  }
  
  // Compliance signals
  const certCount = websiteAnalysis.complianceSignals.certifications.length;
  if (certCount > 0) {
    const highRelevanceCerts = websiteAnalysis.complianceSignals.certifications
      .filter(c => c.relevance === 'high')
      .map(c => c.name);
      
    if (highRelevanceCerts.length > 0) {
      keySummaryPoints.push(
        `The business has ${highRelevanceCerts.length} high-relevance certifications for export: ${highRelevanceCerts.join(', ')}.`
      );
    } else {
      keySummaryPoints.push(
        `The business has ${certCount} certifications, but none with high export relevance.`
      );
    }
  }
  
  // Next steps recommendations
  const recommendedNextSteps: string[] = [...websiteAnalysis.overallReadiness.immediateNextSteps];
  
  // Add market-specific recommendations if target markets are provided
  if (options.targetMarkets && options.targetMarkets.length > 0) {
    for (const market of options.targetMarkets) {
      const marketSpecificDimensions = getMarketSpecificReadiness(market);
      if (marketSpecificDimensions.length > 0) {
        recommendedNextSteps.push(
          `Evaluate compliance with ${market} specific requirements: ${
            marketSpecificDimensions.map(d => d.name).join(', ')
          }`
        );
      }
    }
  }
  
  // Add industry-specific recommendations
  const industry = websiteAnalysis.industry;
  if (industry === 'food') {
    recommendedNextSteps.push(
      'Ensure packaging and labeling meet international food safety standards and target market requirements.'
    );
  } else if (industry === 'textile') {
    recommendedNextSteps.push(
      'Verify compliance with textile labeling requirements and safety standards for target markets.'
    );
  } else if (industry === 'health') {
    recommendedNextSteps.push(
      'Research regulatory approval processes for health products in each target market.'
    );
  }
  
  // Digital presence recommendations
  if (websiteAnalysis.digitalMaturity.level !== 'advanced') {
    recommendedNextSteps.push(
      'Enhance website with international focus, including target market languages and export information.'
    );
  }
  
  return {
    overallReadinessScore,
    readinessLevel,
    keySummaryPoints,
    recommendedNextSteps
  };
}

/**
 * Analyze products for export potential
 */
function analyzeProductsForExport(
  websiteAnalysis: ExportReadinessWebsiteAnalysis,
  options: ReportOptions
): ExportReadinessReport['businessProfile']['products'] {
  return websiteAnalysis.productDetails.map(product => {
    // Calculate export potential score for this product
    let exportPotential = 50; // Start with a neutral score
    
    // Check if product description mentions export-related terms
    const exportTerms = ['international', 'global', 'export', 'worldwide', 'overseas'];
    const descLower = product.description.toLowerCase();
    const hasExportTerms = exportTerms.some(term => descLower.includes(term));
    if (hasExportTerms) {
      exportPotential += 15;
    }
    
    // Check if description mentions quality or standards
    const qualityTerms = ['quality', 'standard', 'certified', 'premium', 'compliant'];
    const hasQualityTerms = qualityTerms.some(term => descLower.includes(term));
    if (hasQualityTerms) {
      exportPotential += 10;
    }
    
    // Check for unique selling points
    const uniqueTerms = ['unique', 'innovative', 'patented', 'exclusive', 'award'];
    const hasUniqueTerms = uniqueTerms.some(term => descLower.includes(term));
    if (hasUniqueTerms) {
      exportPotential += 15;
    }
    
    // Industry-specific adjustments
    if (websiteAnalysis.industry === 'food') {
      // Check for food-specific export advantages
      const foodExportTerms = ['organic', 'sustainable', 'natural', 'halal', 'kosher'];
      const hasFoodAdvantage = foodExportTerms.some(term => descLower.includes(term));
      if (hasFoodAdvantage) {
        exportPotential += 10;
      }
    } else if (websiteAnalysis.industry === 'textile') {
      // Check for textile-specific export advantages
      const textileExportTerms = ['sustainable', 'eco', 'organic cotton', 'fair trade'];
      const hasTextileAdvantage = textileExportTerms.some(term => descLower.includes(term));
      if (hasTextileAdvantage) {
        exportPotential += 10;
      }
    }
    
    // Target market match
    if (options.targetMarkets && options.targetMarkets.length > 0) {
      const marketTerms = options.targetMarkets.filter(market => 
        descLower.includes(market.toLowerCase())
      );
      if (marketTerms.length > 0) {
        exportPotential += 10 * Math.min(marketTerms.length, 2); // Max 20 points for market match
      }
    }
    
    // Ensure score is within 0-100 range
    exportPotential = Math.max(0, Math.min(100, exportPotential));
    
    return {
      name: product.name,
      description: product.description,
      exportPotential
    };
  });
}

/**
 * Generate a unique report ID
 */
function generateReportId(): string {
  return `ER-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
}

/**
 * Get readiness level based on overall score
 */
function getReadinessLevel(score: number): 'not ready' | 'partially ready' | 'ready' | 'highly ready' {
  if (score < 40) return 'not ready';
  if (score < 60) return 'partially ready';
  if (score < 80) return 'ready';
  return 'highly ready';
}

/**
 * Generate readiness assessment by category
 */
function generateReadinessAssessment(
  websiteAnalysis: ExportReadinessWebsiteAnalysis
): ExportReadinessReport['readinessAssessment'] {
  const assessmentByCategory: ExportReadinessReport['readinessAssessment'] = [];
  
  // Process each readiness category
  for (const category of readinessCategories) {
    // Get all dimensions for this category
    const dimensionIds = category.dimensions.map(d => d.id);
    
    // Calculate average score for the category
    let totalScore = 0;
    let totalDimensions = 0;
    
    const dimensionAnalysis: Array<{
      name: string;
      score: number;
      analysis: string;
    }> = [];
    
    const strengths: string[] = [];
    const gaps: string[] = [];
    
    // Process each dimension in the category
    for (const dimension of category.dimensions) {
      const dimensionData = websiteAnalysis.readinessDimensions[dimension.id];
      
      if (dimensionData) {
        totalScore += dimensionData.score;
        totalDimensions++;
        
        // Add to dimension analysis
        let analysisText = '';
        
        // Add evidence-based analysis
        if (dimensionData.evidence.length > 0) {
          analysisText += `Based on evidence: ${dimensionData.evidence.join('. ')}. `;
        }
        
        // Add assumption-based analysis
        if (dimensionData.assumptions.length > 0) {
          analysisText += `Assumptions: ${dimensionData.assumptions.join('. ')}. `;
        }
        
        // Add confidence level
        analysisText += `Confidence level in this assessment: ${dimensionData.confidence}%.`;
        
        dimensionAnalysis.push({
          name: dimension.name,
          score: dimensionData.score,
          analysis: analysisText
        });
        
        // Add to strengths or gaps
        if (dimensionData.score >= 70) {
          strengths.push(`Strong ${dimension.name.toLowerCase()}: ${dimensionData.evidence[0] || 'No specific evidence'}`);
        } else if (dimensionData.score <= 40) {
          gaps.push(`Weak ${dimension.name.toLowerCase()}: ${dimensionData.evidence[0] || dimensionData.assumptions[0] || 'No specific evidence'}`);
        }
      }
    }
    
    // Calculate category score
    const categoryScore = totalDimensions > 0 ? Math.round(totalScore / totalDimensions) : 0;
    
    // Generate recommendations based on gaps
    const recommendations: string[] = gaps.map(gap => {
      // Extract dimension name from gap
      const colonIndex = gap.indexOf(':');
      const dimensionPart = colonIndex > 0 ? gap.substring(0, colonIndex) : gap;
      const dimensionName = dimensionPart.replace('Weak ', '');
      
      // Generate recommendation
      return `Improve ${dimensionName} by developing a clear strategy and documenting it on your website.`;
    });
    
    // Add general recommendation if needed
    if (recommendations.length === 0 && categoryScore < 70) {
      recommendations.push(`Strengthen overall ${category.name} by addressing all dimensions in this category.`);
    }
    
    // Add industry-specific recommendations
    if (category.id === 'product_readiness' && websiteAnalysis.industry === 'food') {
      recommendations.push('Consider obtaining industry-specific food safety certifications relevant to target export markets.');
    } else if (category.id === 'operational_readiness' && websiteAnalysis.industry === 'textile') {
      recommendations.push('Ensure supply chain transparency and ethical sourcing documentation for export markets.');
    }
    
    // Add category to the assessment
    assessmentByCategory.push({
      category: category.name,
      score: categoryScore,
      strengths,
      gaps,
      recommendations,
      dimensions: dimensionAnalysis
    });
  }
  
  return assessmentByCategory;
}

/**
 * Generate market analysis for target markets
 */
function generateMarketAnalysis(
  websiteAnalysis: ExportReadinessWebsiteAnalysis,
  targetMarkets: string[]
): ExportReadinessReport['marketAnalysis'] {
  const marketAnalysisList: ExportReadinessReport['marketAnalysis'] = [];
  
  for (const market of targetMarkets) {
    // Get market-specific dimensions
    const marketSpecificDimensions = getMarketSpecificReadiness(market);
    
    // Calculate opportunity score based on product fit and compliance factors
    const productFitScore = calculateProductFitScore(websiteAnalysis, market);
    const complianceScore = calculateComplianceScore(websiteAnalysis, marketSpecificDimensions);
    const marketResearchScore = websiteAnalysis.exportContent.mentionedMarkets.includes(market) ? 70 : 40;
    
    // Use readiness model helper to calculate market opportunity
    const opportunityScore = calculateMarketOpportunityScore(
      market, 
      productFitScore, 
      complianceScore, 
      marketResearchScore
    );
    
    // Calculate entry complexity (higher score means more complex)
    const entryComplexity = calculateEntryComplexity(market, marketSpecificDimensions);
    
    // Calculate cultural compatibility
    const culturalCompatibility = calculateCulturalCompatibility(websiteAnalysis, market);
    
    // Compile key requirements
    const keyRequirements: string[] = marketSpecificDimensions.map(d => 
      `${d.name}: ${d.description}`
    );
    
    // Add general requirements if specific ones are limited
    if (keyRequirements.length < 2) {
      if (market.toLowerCase().includes('uae') || market.toLowerCase().includes('emirates')) {
        keyRequirements.push('Trade license or local partner may be required');
        keyRequirements.push('Arabic labeling for consumer products');
      } else if (market.toLowerCase().includes('uk')) {
        keyRequirements.push('UK-specific product marking and standards post-Brexit');
        keyRequirements.push('VAT registration for certain sales thresholds');
      } else if (market.toLowerCase().includes('usa')) {
        keyRequirements.push('Consider FDA compliance for food, cosmetics, or medical products');
        keyRequirements.push('Nationwide distribution may require state-by-state approach');
      }
    }
    
    // Compile regulatory considerations
    const regulatoryConsiderations: string[] = [];
    
    // Add industry-specific regulatory considerations
    if (websiteAnalysis.industry === 'food') {
      if (market.toLowerCase().includes('uae')) {
        regulatoryConsiderations.push('Halal certification required for most food products');
        regulatoryConsiderations.push('Gulf Standard Organization (GSO) food safety compliance');
      } else if (market.toLowerCase().includes('uk')) {
        regulatoryConsiderations.push('UK food labeling and nutritional information requirements');
        regulatoryConsiderations.push('Food Standards Agency (FSA) regulations');
      } else if (market.toLowerCase().includes('usa')) {
        regulatoryConsiderations.push('FDA food safety modernization act compliance');
        regulatoryConsiderations.push('Nutritional labeling and allergen disclosure requirements');
      }
    } else if (websiteAnalysis.industry === 'textile') {
      if (market.toLowerCase().includes('uae')) {
        regulatoryConsiderations.push('Fabric content labeling in Arabic');
        regulatoryConsiderations.push('Compliance with Gulf standards for textiles');
      } else if (market.toLowerCase().includes('uk')) {
        regulatoryConsiderations.push('UK textile labeling regulations');
        regulatoryConsiderations.push('Chemical safety regulations (similar to EU REACH)');
      } else if (market.toLowerCase().includes('usa')) {
        regulatoryConsiderations.push('Flammability standards compliance');
        regulatoryConsiderations.push('Textile fiber identification labeling');
      }
    }
    
    // Add market analysis
    marketAnalysisList.push({
      market,
      opportunityScore,
      entryComplexity,
      culturalCompatibility,
      keyRequirements,
      regulatoryConsiderations
    });
  }
  
  return marketAnalysisList;
}

/**
 * Calculate product fit score for a specific market
 */
function calculateProductFitScore(
  websiteAnalysis: ExportReadinessWebsiteAnalysis, 
  market: string
): number {
  let score = 50; // Start with neutral score
  
  // Check if products mention the target market
  const productMentionsMarket = websiteAnalysis.productDetails.some(p => 
    p.description.toLowerCase().includes(market.toLowerCase())
  );
  
  if (productMentionsMarket) {
    score += 20;
  }
  
  // Check for market-appropriate certifications
  if (market.toLowerCase().includes('uae') || market.toLowerCase().includes('emirates')) {
    const hasHalal = websiteAnalysis.complianceSignals.certifications.some(c => 
      c.name.toLowerCase().includes('halal')
    );
    if (hasHalal) score += 15;
  } else if (market.toLowerCase().includes('uk') || market.toLowerCase().includes('britain')) {
    const hasUkCert = websiteAnalysis.complianceSignals.certifications.some(c => 
      c.name.toLowerCase().includes('ukca') || c.name.toLowerCase().includes('uk') || c.name.toLowerCase().includes('british')
    );
    if (hasUkCert) score += 15;
  } else if (market.toLowerCase().includes('usa') || market.toLowerCase().includes('america')) {
    const hasUsaCert = websiteAnalysis.complianceSignals.certifications.some(c => 
      c.name.toLowerCase().includes('fda') || c.name.toLowerCase().includes('us') || c.name.toLowerCase().includes('american')
    );
    if (hasUsaCert) score += 15;
  }
  
  // Adjust based on industry
  if (websiteAnalysis.industry === 'food') {
    if (market.toLowerCase().includes('uae')) {
      // UAE has high demand for premium food products
      score += 10;
    } else if (market.toLowerCase().includes('uk')) {
      // UK has strong organic and sustainable food market
      const hasOrganic = websiteAnalysis.productDetails.some(p => 
        p.description.toLowerCase().includes('organic') || p.description.toLowerCase().includes('sustainable')
      );
      if (hasOrganic) score += 10;
    }
  } else if (websiteAnalysis.industry === 'textile') {
    if (market.toLowerCase().includes('usa')) {
      // US has strong sustainable textile market
      const hasSustainable = websiteAnalysis.productDetails.some(p => 
        p.description.toLowerCase().includes('sustainable') || p.description.toLowerCase().includes('eco')
      );
      if (hasSustainable) score += 10;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate compliance score based on market-specific dimensions
 */
function calculateComplianceScore(
  websiteAnalysis: ExportReadinessWebsiteAnalysis,
  marketSpecificDimensions: ReadinessDimension[]
): number {
  if (marketSpecificDimensions.length === 0) {
    return 50; // Neutral score if no specific dimensions
  }
  
  let score = 40; // Start with slightly below neutral
  
  // Check for relevant certifications
  const requiredCerts = marketSpecificDimensions
    .filter(d => d.requiredForExport)
    .map(d => d.name.toLowerCase());
  
  const businessCerts = websiteAnalysis.complianceSignals.certifications
    .map(c => c.name.toLowerCase());
  
  // Check for matches between required certs and business certs
  const matchCount = requiredCerts.filter(req => 
    businessCerts.some(bc => bc.includes(req) || req.includes(bc))
  ).length;
  
  if (matchCount > 0) {
    // Significant boost for having required certifications
    score += 30 * (matchCount / requiredCerts.length);
  }
  
  // Check for regulatory mentions
  const hasRegulatory = websiteAnalysis.complianceSignals.regulatoryMentions.length > 0;
  if (hasRegulatory) {
    score += 15;
  }
  
  // Check for standards
  const hasStandards = websiteAnalysis.complianceSignals.standards.length > 0;
  if (hasStandards) {
    score += 15;
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate entry complexity for a market (higher score = more complex)
 */
function calculateEntryComplexity(
  market: string,
  marketSpecificDimensions: ReadinessDimension[]
): number {
  let complexity = 50; // Start with medium complexity
  
  // Complexity based on number of required dimensions
  const requiredDimensions = marketSpecificDimensions.filter(d => d.requiredForExport);
  complexity += requiredDimensions.length * 5;
  
  // Market-specific adjustments
  if (market.toLowerCase().includes('uae') || market.toLowerCase().includes('emirates')) {
    complexity += 20; // Higher complexity for UAE (agent requirements, cultural differences)
  } else if (market.toLowerCase().includes('usa')) {
    complexity += 15; // USA complexity due to state variations and competitive market
  } else if (market.toLowerCase().includes('uk')) {
    complexity += 10; // UK complexity due to post-Brexit changes
  }
  
  return Math.max(0, Math.min(100, complexity));
}

/**
 * Calculate cultural compatibility with target market
 */
function calculateCulturalCompatibility(
  websiteAnalysis: ExportReadinessWebsiteAnalysis,
  market: string
): number {
  let compatibility = 50; // Start with medium compatibility
  
  // Check for language compatibility
  if (websiteAnalysis.exportContent.hasMultipleLanguages) {
    compatibility += 20;
  }
  
  // Check for market mentions
  if (websiteAnalysis.exportContent.mentionedMarkets.includes(market)) {
    compatibility += 15;
  }
  
  // Market-specific adjustments
  if (market.toLowerCase().includes('uae') || market.toLowerCase().includes('emirates')) {
    // Check for Arab world cultural sensitivity
    let hasArabicAwareness = false;
    
    // Check for Arabic/Middle East/Halal mentions in available text content
    if (websiteAnalysis.description.toLowerCase().includes('arab') || 
        websiteAnalysis.description.toLowerCase().includes('middle east') ||
        websiteAnalysis.description.toLowerCase().includes('halal')) {
      hasArabicAwareness = true;
    }
    
    // Also check in product descriptions
    if (!hasArabicAwareness && websiteAnalysis.productDetails) {
      hasArabicAwareness = websiteAnalysis.productDetails.some(p => 
        p.description.toLowerCase().includes('arab') || 
        p.description.toLowerCase().includes('middle east') ||
        p.description.toLowerCase().includes('halal')
      );
    }
      
    if (hasArabicAwareness) {
      compatibility += 15;
    } else {
      compatibility -= 10;
    }
  }
  
  return Math.max(0, Math.min(100, compatibility));
}

/**
 * Calculate market opportunity score
 * This is a simplified version that redirects to the readiness model implementation
 */
function calculateMarketOpportunityScore(
  market: string, 
  productFitScore: number, 
  complianceScore: number, 
  marketResearchScore: number
): number {
  // This assumes the imported function exists in readinessModel
  // If not, implement the logic here
  return Math.round((productFitScore * 0.4) + (marketResearchScore * 0.3) + (complianceScore * 0.3));
}

/**
 * Generate action plan based on assessment results
 */
function generateActionPlan(
  websiteAnalysis: ExportReadinessWebsiteAnalysis,
  readinessAssessment: ExportReadinessReport['readinessAssessment'],
  options: ReportOptions
): ExportReadinessReport['actionPlan'] {
  const immediateActions: string[] = [];
  const shortTerm: string[] = [];
  const mediumTerm: string[] = [];
  const longTerm: string[] = [];
  
  // Immediate actions - focus on critical gaps and low-hanging fruit
  
  // Find categories with lowest scores
  const lowScoreCategories = readinessAssessment
    .filter(cat => cat.score < 50)
    .sort((a, b) => a.score - b.score);
    
  // Add critical actions from low score categories
  for (const category of lowScoreCategories) {
    // Get the most critical gap from this category
    if (category.gaps.length > 0) {
      immediateActions.push(`Address critical gap in ${category.category}: ${category.gaps[0]}`);
    }
    
    // Add most important recommendation
    if (category.recommendations.length > 0) {
      immediateActions.push(category.recommendations[0]);
    }
  }
  
  // Add website optimization if digital maturity is low
  if (websiteAnalysis.digitalMaturity.score < 60) {
    immediateActions.push(
      'Enhance website with export-focused content and improve digital presence'
    );
  }
  
  // Add certification action if lacking critical certifications
  if (websiteAnalysis.complianceSignals.certifications.length === 0) {
    immediateActions.push(
      'Identify and pursue essential industry certifications required for export markets'
    );
  }
  
  // Short-term actions - focus on building capabilities
  
  // Add recommendations from medium-scored categories
  const mediumScoreCategories = readinessAssessment
    .filter(cat => cat.score >= 50 && cat.score < 70);
    
  for (const category of mediumScoreCategories) {
    if (category.recommendations.length > 0) {
      // Take second recommendation if available, otherwise first
      const recIndex = category.recommendations.length > 1 ? 1 : 0;
      shortTerm.push(category.recommendations[recIndex]);
    }
  }
  
  // Add market research action if needed
  if (options.targetMarkets && options.targetMarkets.length > 0) {
    shortTerm.push(
      `Conduct detailed market research for ${options.targetMarkets.join(', ')}`
    );
  } else {
    shortTerm.push(
      'Identify and prioritize target export markets based on product fit and opportunity'
    );
  }
  
  // Add pricing strategy action
  shortTerm.push(
    'Develop international pricing strategy considering logistics, import duties, and market positioning'
  );
  
  // Medium-term actions - focus on market entry and compliance
  
  // Add compliance actions for target markets
  if (options.targetMarkets && options.targetMarkets.length > 0) {
    for (const market of options.targetMarkets) {
      mediumTerm.push(
        `Ensure full compliance with ${market} regulatory requirements and standards`
      );
    }
  }
  
  // Add logistics and distribution action
  mediumTerm.push(
    'Establish reliable international logistics and distribution channels'
  );
  
  // Add market adaptation action
  mediumTerm.push(
    'Adapt products, packaging, and marketing materials for target export markets'
  );
  
  // Add payment and risk management
  mediumTerm.push(
    'Implement international payment methods and risk management strategies'
  );
  
  // Long-term actions - focus on growth and sustainability
  
  // Add expansion action
  longTerm.push(
    'Develop strategy for expanding into additional international markets'
  );
  
  // Add local presence action
  longTerm.push(
    'Consider establishing local presence in key export markets as volume grows'
  );
  
  // Add product diversification
  longTerm.push(
    'Develop new product lines or adaptations specifically for international markets'
  );
  
  // Add partnership action
  longTerm.push(
    'Seek strategic international partnerships to accelerate market penetration'
  );
  
  // Add sustainability action
  longTerm.push(
    'Build sustainable export operation with ongoing compliance monitoring and market intelligence'
  );
  
  return {
    immediateActions,
    shortTerm,
    mediumTerm,
    longTerm
  };
}

/**
 * Generate visual elements for the report
 */
function generateVisualElements(
  websiteAnalysis: ExportReadinessWebsiteAnalysis,
  readinessAssessment: ExportReadinessReport['readinessAssessment'],
  marketAnalysis: ExportReadinessReport['marketAnalysis']
): NonNullable<ExportReadinessReport['visualElements']> {
  // In a real implementation, this would generate actual chart data
  // For this example, we'll create placeholder structures that would be
  // used by a frontend to render charts
  
  // Readiness radar chart - shows scores for each category
  const readinessRadarChart = {
    type: 'radar',
    labels: readinessAssessment.map(c => c.category),
    datasets: [{
      label: 'Readiness Score',
      data: readinessAssessment.map(c => c.score)
    }]
  };
  
  // Market opportunity matrix - compares opportunity vs. entry complexity
  const marketOpportunityMatrix = {
    type: 'scatter',
    datasets: [{
      label: 'Markets',
      data: marketAnalysis.map(m => ({
        x: m.entryComplexity,  // X-axis: complexity (higher = more complex)
        y: m.opportunityScore, // Y-axis: opportunity (higher = better opportunity)
        label: m.market
      }))
    }],
    axisLabels: {
      x: 'Entry Complexity',
      y: 'Market Opportunity'
    }
  };
  
  // Competitive positioning - simplified placeholder
  const competitivePositioning = {
    type: 'quadrant',
    quadrants: [
      { name: 'Market Leaders', position: 'top-right' },
      { name: 'Niche Players', position: 'bottom-right' },
      { name: 'Emerging Challengers', position: 'top-left' },
      { name: 'Struggling Businesses', position: 'bottom-left' }
    ],
    position: calculateCompetitivePosition(websiteAnalysis),
    axisLabels: {
      x: 'Export Specialization',
      y: 'Digital Maturity'
    }
  };
  
  // Timeline estimate for export readiness
  const timelineEstimate = {
    type: 'timeline',
    milestones: [
      { 
        name: 'Initial Assessment', 
        completed: true,
        duration: '0 months'
      },
      { 
        name: 'Critical Gaps Addressed', 
        completed: false,
        duration: '1-3 months'
      },
      { 
        name: 'Market Entry Preparation', 
        completed: false,
        duration: '3-6 months'
      },
      { 
        name: 'First Export Deal', 
        completed: false,
        duration: '6-9 months'
      },
      { 
        name: 'Sustainable Export Operation', 
        completed: false,
        duration: '12+ months'
      }
    ],
    currentPosition: 0, // Start position
    estimatedCompletion: estimateTimeToExport(websiteAnalysis)
  };
  
  return {
    readinessRadarChart,
    marketOpportunityMatrix,
    competitivePositioning,
    timelineEstimate
  };
}

/**
 * Calculate competitive position for visual chart
 */
function calculateCompetitivePosition(websiteAnalysis: ExportReadinessWebsiteAnalysis): { x: number, y: number } {
  // X-axis: Export specialization (0-100)
  // Based on export content and compliance signals
  let exportSpecialization = 0;
  
  // Export content factors
  if (websiteAnalysis.exportContent.hasExportMentions) exportSpecialization += 20;
  if (websiteAnalysis.exportContent.hasInternationalPricing) exportSpecialization += 15;
  if (websiteAnalysis.exportContent.hasMultipleLanguages) exportSpecialization += 15;
  if (websiteAnalysis.exportContent.globalLogistics) exportSpecialization += 15;
  
  // Add points for each mentioned market
  exportSpecialization += Math.min(websiteAnalysis.exportContent.mentionedMarkets.length * 5, 20);
  
  // Add points for certifications
  exportSpecialization += Math.min(websiteAnalysis.complianceSignals.certifications.length * 5, 15);
  
  // Y-axis: Digital maturity (already on 0-100 scale)
  const digitalMaturity = websiteAnalysis.digitalMaturity.score;
  
  return {
    x: Math.min(100, exportSpecialization),
    y: digitalMaturity
  };
}

/**
 * Estimate time to export readiness in months
 */
function estimateTimeToExport(websiteAnalysis: ExportReadinessWebsiteAnalysis): string {
  const readinessScore = websiteAnalysis.overallReadiness.score;
  
  // Very low readiness will take longer
  if (readinessScore < 30) {
    return '12-18 months';
  } else if (readinessScore < 50) {
    return '9-12 months';
  } else if (readinessScore < 70) {
    return '6-9 months';
  } else if (readinessScore < 85) {
    return '3-6 months';
  } else {
    return '1-3 months';
  }
} 
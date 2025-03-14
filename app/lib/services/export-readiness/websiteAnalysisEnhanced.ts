/**
 * Enhanced Website Analysis Module for Export Readiness Assessment
 * 
 * This module extends the basic website analysis with export-specific dimensions:
 * - Business information extraction (products, certifications, geography)
 * - Industry and sector-specific export readiness indicators
 * - Compliance signals detection (certifications, standards, quality marks)
 * - Digital presence maturity assessment
 * - Mapping to export readiness dimensions
 */

import axios from 'axios';
import { WebsiteData, EnhancedWebsiteAnalysisResult, ScraperOptions } from '../mcp/models/website-data.model';
import { analyzeWebsiteWithScraperService, isScraperServiceAvailable } from '../mcp/services/website-analysis.service';
import { readinessCategories, ReadinessCategory, ReadinessDimension } from './readinessModel';

// Enhanced model with export-specific dimensions
export interface ExportReadinessWebsiteAnalysis extends EnhancedWebsiteAnalysisResult {
  // Industry-specific context
  industry: string;
  sector: string;
  
  // Compliance and regulatory indicators
  complianceSignals: {
    certifications: Array<{ name: string; relevance: 'high' | 'medium' | 'low' }>;
    standards: string[];
    qualityMarks: string[];
    regulatoryMentions: string[];
  };
  
  // Digital presence maturity
  digitalMaturity: {
    score: number; // 0-100
    level: 'basic' | 'intermediate' | 'advanced';
    strengths: string[];
    gaps: string[];
  };
  
  // Export-specific content
  exportContent: {
    hasExportMentions: boolean;
    hasInternationalPricing: boolean;
    hasMultipleLanguages: boolean;
    mentionedMarkets: string[];
    internationalPartners: string[];
    globalLogistics: boolean;
  };
  
  // Readiness dimensions mapped from website analysis
  readinessDimensions: Record<string, {
    score: number; // 0-100
    confidence: number; // 0-100 confidence in this assessment
    evidence: string[];
    assumptions: string[];
  }>;
  
  // Overall export readiness assessment
  overallReadiness: {
    score: number; // 0-100
    confidenceLevel: number; // 0-100
    primaryStrengths: string[];
    developmentAreas: string[];
    immediateNextSteps: string[];
  };
}

// Industry-specific heuristics for filling data gaps
interface IndustryHeuristics {
  typicalCertifications: string[];
  commonExportMarkets: string[];
  typicalComplianceNeeds: string[];
  regulatoryConsiderations: string[];
}

// Database of industry heuristics
const industryHeuristics: Record<string, IndustryHeuristics> = {
  'food': {
    typicalCertifications: ['HACCP', 'ISO 22000', 'FSSC 22000', 'BRC', 'Global GAP', 'Organic', 'Halal', 'Kosher'],
    commonExportMarkets: ['UAE', 'UK', 'USA', 'EU', 'China', 'Japan'],
    typicalComplianceNeeds: ['Food safety', 'Labeling requirements', 'Shelf life', 'Preservatives regulation'],
    regulatoryConsiderations: ['FDA approval for USA', 'SASO for Middle East', 'FSSAI for India']
  },
  'textile': {
    typicalCertifications: ['OEKO-TEX', 'GOTS', 'Fair Trade', 'ISO 9001', 'WRAP', 'GRS'],
    commonExportMarkets: ['EU', 'USA', 'UAE', 'Japan', 'UK', 'Canada'],
    typicalComplianceNeeds: ['Chemical safety', 'Child labor prevention', 'Sustainable sourcing'],
    regulatoryConsiderations: ['REACH regulations in EU', 'CPSC in USA', 'GSO in Gulf states']
  },
  'health': {
    typicalCertifications: ['GMP', 'ISO 13485', 'CE Mark', 'FDA approval', 'MDSAP'],
    commonExportMarkets: ['USA', 'EU', 'UK', 'Australia', 'Middle East'],
    typicalComplianceNeeds: ['Clinical trials', 'Quality management', 'Safety testing'],
    regulatoryConsiderations: ['FDA regulation in USA', 'MDR in EU', 'TGA in Australia']
  },
  'default': {
    typicalCertifications: ['ISO 9001', 'ISO 14001'],
    commonExportMarkets: ['UAE', 'UK', 'USA'],
    typicalComplianceNeeds: ['Quality management', 'Documentation'],
    regulatoryConsiderations: ['Product specific regulations', 'Country of origin documentation']
  }
};

// Industry detection keywords
const industryKeywords: Record<string, string[]> = {
  'food': ['food', 'beverage', 'agriculture', 'farm', 'organic', 'ingredients', 'restaurant', 'catering', 'grocery'],
  'textile': ['textile', 'fabric', 'clothing', 'apparel', 'fashion', 'garment', 'wear', 'cotton', 'polyester'],
  'health': ['health', 'medical', 'pharmaceutical', 'medicine', 'wellness', 'healthcare', 'supplement', 'device', 'therapy'],
  'technology': ['software', 'hardware', 'technology', 'tech', 'digital', 'IT', 'computer', 'electronic', 'app'],
  'manufacturing': ['manufacturing', 'factory', 'production', 'industrial', 'machinery', 'equipment', 'tool'],
};

/**
 * Detect industry from product descriptions and business content
 */
function detectIndustry(websiteData: WebsiteData): string {
  // Combine all text content for analysis
  const allText = [
    websiteData.description,
    websiteData.about || '',
    ...websiteData.products.map(p => `${p.name} ${p.description}`),
    ...websiteData.services.map(s => `${s.name} ${s.description}`),
    ...(websiteData.rawTextBySection ? Object.values(websiteData.rawTextBySection) : [])
  ].join(' ').toLowerCase();
  
  // Count industry keyword matches
  const industryCounts: Record<string, number> = {};
  
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    industryCounts[industry] = keywords.reduce((count, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = allText.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
  }
  
  // Find industry with most keyword matches
  let maxCount = 0;
  let detectedIndustry = 'default';
  
  for (const [industry, count] of Object.entries(industryCounts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedIndustry = industry;
    }
  }
  
  return detectedIndustry;
}

/**
 * Assess digital presence maturity based on website features
 */
function assessDigitalMaturity(websiteData: WebsiteData): ExportReadinessWebsiteAnalysis['digitalMaturity'] {
  const strengths: string[] = [];
  const gaps: string[] = [];
  let score = 50; // Start with base score
  
  // Check for comprehensive product information
  if (websiteData.products.length > 0 && websiteData.products.every(p => p.description && p.description.length > 30)) {
    strengths.push('Comprehensive product information');
    score += 5;
  } else {
    gaps.push('Limited product details');
    score -= 5;
  }
  
  // Check for contact information completeness
  const contact = websiteData.contactInfo;
  if (contact.email && contact.phone && contact.address) {
    strengths.push('Complete contact information');
    score += 5;
  } else {
    gaps.push('Incomplete contact information');
    score -= 5;
  }
  
  // Check for social media presence
  if (contact.socialMedia && Object.keys(contact.socialMedia).length >= 2) {
    strengths.push('Active social media presence');
    score += 5;
  } else {
    gaps.push('Limited social media integration');
    score -= 5;
  }
  
  // Check for international focus
  if (websiteData.exportInfo.mentionedMarkets.length > 0) {
    strengths.push('International market focus');
    score += 10;
  } else {
    gaps.push('No international market mentions');
    score -= 5;
  }
  
  // Check for certifications
  if (websiteData.certifications.length > 0) {
    strengths.push('Industry certifications highlighted');
    score += 10;
  } else {
    gaps.push('No certifications mentioned');
    score -= 5;
  }
  
  // Determine maturity level
  let level: 'basic' | 'intermediate' | 'advanced' = 'basic';
  if (score >= 70) {
    level = 'advanced';
  } else if (score >= 50) {
    level = 'intermediate';
  }
  
  // Ensure score is between 0-100
  score = Math.max(0, Math.min(100, score));
  
  return {
    score,
    level,
    strengths,
    gaps
  };
}

/**
 * Map website data to export readiness dimensions
 */
function mapToReadinessDimensions(
  websiteData: WebsiteData,
  industry: string
): Record<string, ExportReadinessWebsiteAnalysis['readinessDimensions'][string]> {
  const dimensions: Record<string, ExportReadinessWebsiteAnalysis['readinessDimensions'][string]> = {};
  
  // Loop through all readiness categories and dimensions
  for (const category of readinessCategories) {
    for (const dimension of category.dimensions) {
      dimensions[dimension.id] = assessDimension(dimension, websiteData, industry);
    }
  }
  
  return dimensions;
}

/**
 * Assess a specific readiness dimension based on website data
 */
function assessDimension(
  dimension: ReadinessDimension,
  websiteData: WebsiteData,
  industry: string
): ExportReadinessWebsiteAnalysis['readinessDimensions'][string] {
  const evidence: string[] = [];
  const assumptions: string[] = [];
  let score = 50; // Start with neutral score
  let confidence = 50; // Start with neutral confidence
  
  // Apply dimension-specific assessment logic
  switch (dimension.id) {
    case 'product_quality':
      // Check for quality-related certifications
      const qualityCerts = websiteData.certifications.filter(cert => 
        ['ISO 9001', 'GMP', 'HACCP'].some(qc => cert.includes(qc))
      );
      
      if (qualityCerts.length > 0) {
        evidence.push(`Quality certifications: ${qualityCerts.join(', ')}`);
        score += 20;
        confidence += 20;
      } else {
        assumptions.push('No explicit quality certifications mentioned');
        // Use industry heuristics
        const industryData = industryHeuristics[industry] || industryHeuristics.default;
        assumptions.push(`Typical quality certifications in ${industry} industry: ${industryData.typicalCertifications.join(', ')}`);
      }
      
      // Check for quality mentions in product descriptions
      const qualityMentions = websiteData.products.filter(p => 
        p.description.toLowerCase().includes('quality') || 
        p.description.toLowerCase().includes('premium') ||
        p.description.toLowerCase().includes('high-end')
      );
      
      if (qualityMentions.length > 0) {
        evidence.push(`${qualityMentions.length} products described with quality indicators`);
        score += 10;
      }
      break;
      
    case 'pricing_strategy':
      // Little direct evidence from website usually, rely on assumptions
      assumptions.push('Pricing strategy typically requires direct assessment');
      
      // Check if pricing is mentioned on the website
      const hasPricing = websiteData.rawTextBySection ? 
        Object.values(websiteData.rawTextBySection).some(text => 
          text.includes('price') || text.includes('cost') || text.includes('$') || text.includes('€')
        ) : false;
      
      if (hasPricing) {
        evidence.push('Pricing information available on website');
        score += 15;
        confidence += 10;
      } else {
        assumptions.push('No explicit pricing information on website');
        confidence -= 10;
      }
      break;
      
    // Add cases for other dimensions
    
    default:
      assumptions.push(`Limited website data for assessing ${dimension.name}`);
      confidence -= 20;
  }
  
  // Ensure score and confidence are between 0-100
  score = Math.max(0, Math.min(100, score));
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    score,
    confidence,
    evidence,
    assumptions
  };
}

/**
 * Analyze export content from website data
 */
function analyzeExportContent(websiteData: WebsiteData): ExportReadinessWebsiteAnalysis['exportContent'] {
  const exportInfo = websiteData.exportInfo;
  
  // Check for multiple languages
  const hasMultipleLanguages = websiteData.rawTextBySection ? 
    Object.keys(websiteData.rawTextBySection).some(key => 
      key.includes('language') || key.includes('translate')
    ) : false;
  
  // Check for international pricing
  const hasInternationalPricing = websiteData.rawTextBySection ? 
    Object.values(websiteData.rawTextBySection).some(text => 
      (text.includes('price') || text.includes('cost')) && 
      (text.includes('international') || text.includes('export') || text.includes('overseas'))
    ) : false;
  
  // Check for global logistics mentions
  const globalLogistics = websiteData.rawTextBySection ? 
    Object.values(websiteData.rawTextBySection).some(text => 
      (text.includes('shipping') || text.includes('delivery')) && 
      (text.includes('international') || text.includes('global') || text.includes('worldwide'))
    ) : false;
  
  return {
    hasExportMentions: exportInfo.mentionedMarkets.length > 0 || exportInfo.exportStatements.length > 0,
    hasInternationalPricing,
    hasMultipleLanguages,
    mentionedMarkets: exportInfo.mentionedMarkets,
    internationalPartners: exportInfo.internationalPartners || [],
    globalLogistics
  };
}

/**
 * Calculate overall export readiness based on all dimensions
 */
function calculateOverallReadiness(
  dimensions: Record<string, ExportReadinessWebsiteAnalysis['readinessDimensions'][string]>,
  websiteData: WebsiteData
): ExportReadinessWebsiteAnalysis['overallReadiness'] {
  // Calculate weighted average of dimension scores with confidence as weight
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const [dimensionId, assessment] of Object.entries(dimensions)) {
    const weight = assessment.confidence / 100;
    totalWeightedScore += assessment.score * weight;
    totalWeight += weight;
  }
  
  const overallScore = totalWeight > 0 ? 
    Math.round(totalWeightedScore / totalWeight) : 50;
  
  // Calculate average confidence
  const averageConfidence = totalWeight > 0 ? 
    Math.round(Object.values(dimensions).reduce((sum, d) => sum + d.confidence, 0) / Object.keys(dimensions).length) : 40;
  
  // Identify top strengths
  const strengths = Object.entries(dimensions)
    .filter(([_, assessment]) => assessment.score >= 70)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3)
    .map(([dimensionId, _]) => {
      const dimension = readinessCategories
        .flatMap((c: ReadinessCategory) => c.dimensions)
        .find((d: ReadinessDimension) => d.id === dimensionId);
      return dimension ? dimension.name : dimensionId;
    });
  
  // Identify development areas
  const developmentAreas = Object.entries(dimensions)
    .filter(([_, assessment]) => assessment.score <= 40)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 3)
    .map(([dimensionId, _]) => {
      const dimension = readinessCategories
        .flatMap((c: ReadinessCategory) => c.dimensions)
        .find((d: ReadinessDimension) => d.id === dimensionId);
      return dimension ? dimension.name : dimensionId;
    });
  
  // Identify immediate next steps based on lowest scores with highest confidence
  const nextSteps = Object.entries(dimensions)
    .filter(([_, assessment]) => assessment.score <= 50 && assessment.confidence >= 60)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 3)
    .map(([dimensionId, _]) => {
      const dimension = readinessCategories
        .flatMap((c: ReadinessCategory) => c.dimensions)
        .find((d: ReadinessDimension) => d.id === dimensionId);
      return dimension ? 
        `Improve ${dimension.name.toLowerCase()} to increase export readiness` : 
        `Address ${dimensionId.replace('_', ' ')} to increase export readiness`;
    });
  
  // Add a step for certifications if missing
  if (websiteData.certifications.length === 0) {
    nextSteps.push('Obtain and highlight relevant industry certifications on your website');
  }
  
  return {
    score: overallScore,
    confidenceLevel: averageConfidence,
    primaryStrengths: strengths.length > 0 ? strengths : ['Not enough data to determine strengths'],
    developmentAreas: developmentAreas.length > 0 ? developmentAreas : ['Not enough data to determine development areas'],
    immediateNextSteps: nextSteps.length > 0 ? nextSteps : ['Complete a detailed export readiness assessment']
  };
}

/**
 * Analyze website for export readiness
 */
export async function analyzeWebsiteForExportReadiness(
  websiteUrl: string, 
  options?: ScraperOptions
): Promise<ExportReadinessWebsiteAnalysis> {
  try {
    // Check if the scraper service is available
    const scraperAvailable = await isScraperServiceAvailable();
    
    let websiteData: WebsiteData;
    
    if (scraperAvailable) {
      // Use the scraper service to get website data
      const basicAnalysis = await analyzeWebsiteWithScraperService(websiteUrl);
      
      // Convert basic analysis to our internal format
      // In a real implementation, you would properly map the data returned from the service to the WebsiteData format
      websiteData = {
        url: websiteUrl,
        scrapedAt: new Date(),
        businessName: basicAnalysis.businessName || 'Unknown Business',
        description: basicAnalysis.description || '',
        products: basicAnalysis.productDetails.map((p: any) => ({
          name: p.name,
          description: p.description,
        })) || [],
        services: [],
        certifications: basicAnalysis.certifications || [],
        exportInfo: {
          mentionedMarkets: basicAnalysis.exportMentions || [],
          exportStatements: []
        },
        contactInfo: basicAnalysis.contactInfo || { email: '', phone: '', address: '' },
        locations: basicAnalysis.locations.map((l: string) => ({ name: l, type: 'other' as const })) || [],
        businessSizeIndicators: [],
        customerSegments: basicAnalysis.customerSegments || []
      };
    } else {
      // Fallback to simplified analysis or mock data for testing
      console.warn('Scraper service unavailable, using fallback analysis');
      websiteData = createFallbackAnalysis(websiteUrl);
    }
    
    // Detect industry based on website content
    const industry = detectIndustry(websiteData);
    
    // Assess digital maturity
    const digitalMaturity = assessDigitalMaturity(websiteData);
    
    // Analyze export content
    const exportContent = analyzeExportContent(websiteData);
    
    // Map to readiness dimensions
    const readinessDimensions = mapToReadinessDimensions(websiteData, industry);
    
    // Calculate overall readiness
    const overallReadiness = calculateOverallReadiness(readinessDimensions, websiteData);
    
    // Build comprehensive compliance signals
    const complianceSignals = {
      certifications: websiteData.certifications.map(cert => {
        // Evaluate relevance based on industry
        const industryData = industryHeuristics[industry] || industryHeuristics.default;
        const relevance: 'high' | 'medium' | 'low' = industryData.typicalCertifications.includes(cert) ? 'high' : 'medium';
        return { name: cert, relevance };
      }),
      standards: extractStandardsMentions(websiteData),
      qualityMarks: extractQualityMarks(websiteData),
      regulatoryMentions: extractRegulatoryMentions(websiteData, industry)
    };
    
    // Map website size indicators to business size
    let businessSize: 'small' | 'medium' | 'large' = 'small';
    if (websiteData.teamSize) {
      if (websiteData.teamSize.includes('100') || websiteData.teamSize.includes('large')) {
        businessSize = 'large';
      } else if (websiteData.teamSize.includes('50') || websiteData.teamSize.includes('medium')) {
        businessSize = 'medium';
      }
    }
    
    // Construct enhanced analysis result
    return {
      // Basic information from original analysis
      productCategories: websiteData.products.map(p => p.category || 'general'),
      certifications: websiteData.certifications,
      geographicPresence: websiteData.locations.map(l => l.country || 'unknown'),
      businessSize,
      customerSegments: websiteData.customerSegments,
      exportReadiness: overallReadiness.score,
      businessName: websiteData.businessName,
      description: websiteData.description,
      productDetails: websiteData.products.map(p => ({
        name: p.name,
        description: p.description
      })),
      exportMentions: websiteData.exportInfo.exportStatements,
      contactInfo: websiteData.contactInfo,
      locations: websiteData.locations.map(l => l.name),
      yearFounded: websiteData.yearFounded,
      lastUpdated: new Date(),
      
      // Website quality indicators
      websiteQuality: {
        hasSsl: websiteUrl.startsWith('https'),
        hasMobileCompatibility: true, // Assumption for now
        hasRecentUpdates: true, // Assumption for now
        hasMultiplePages: true  // Assumption for now
      },
      
      // Enhanced export readiness data
      industry,
      sector: determineSector(industry),
      complianceSignals,
      digitalMaturity,
      exportContent,
      readinessDimensions,
      overallReadiness
    };
  } catch (error) {
    console.error('Error analyzing website for export readiness:', error);
    throw new Error('Failed to analyze website for export readiness. Please try again later.');
  }
}

/**
 * Extract standards mentions from website data
 */
function extractStandardsMentions(websiteData: WebsiteData): string[] {
  // Common standards patterns
  const standardPatterns = [
    /ISO\s+\d+/g,
    /[A-Z]{2,}[\s-]\d+/g, // Pattern like "EN 1234" or "ASTM-1234"
    /\b(?:standard|compliance|compliant)\s+with\s+([^.,]+)/gi
  ];
  
  // Combine all text content for analysis
  const allText = [
    websiteData.description,
    websiteData.about || '',
    ...websiteData.products.map(p => `${p.name} ${p.description}`),
    ...websiteData.services.map(s => `${s.name} ${s.description}`),
    ...(websiteData.rawTextBySection ? Object.values(websiteData.rawTextBySection) : [])
  ].join(' ');
  
  // Extract standards using patterns
  const standards: string[] = [];
  for (const pattern of standardPatterns) {
    const matches = allText.match(pattern) || [];
    standards.push(...matches);
  }
  
  return [...new Set(standards)]; // Remove duplicates
}

/**
 * Extract quality marks from website data
 */
function extractQualityMarks(websiteData: WebsiteData): string[] {
  // Common quality marks
  const qualityMarks = [
    'CE', 'UL', 'GS', 'TUV', 'FDA Approved', 'Energy Star',
    'Fair Trade', 'Organic', 'Non-GMO', 'Gluten-Free',
    'Made in', 'Quality Assured', 'Premium', 'Certificate of Excellence'
  ];
  
  // Combine all text content for analysis
  const allText = [
    websiteData.description,
    websiteData.about || '',
    ...websiteData.products.map(p => `${p.name} ${p.description}`),
    ...websiteData.services.map(s => `${s.name} ${s.description}`),
    ...(websiteData.rawTextBySection ? Object.values(websiteData.rawTextBySection) : [])
  ].join(' ');
  
  // Find mentions of quality marks
  return qualityMarks.filter(mark => allText.includes(mark));
}

/**
 * Extract regulatory mentions from website data
 */
function extractRegulatoryMentions(websiteData: WebsiteData, industry: string): string[] {
  // Get industry-specific regulatory considerations
  const industryData = industryHeuristics[industry] || industryHeuristics.default;
  const regulatoryTerms = [
    'regulation', 'regulatory', 'compliance', 'compliant',
    'approved', 'authorized', 'certified', 'registered',
    ...industryData.regulatoryConsiderations
  ];
  
  // Combine all text content for analysis
  const allText = [
    websiteData.description,
    websiteData.about || '',
    ...websiteData.products.map(p => `${p.name} ${p.description}`),
    ...websiteData.services.map(s => `${s.name} ${s.description}`),
    ...(websiteData.rawTextBySection ? Object.values(websiteData.rawTextBySection) : [])
  ].join(' ');
  
  // Find sentences containing regulatory terms
  const sentences = allText.split(/[.!?]+/);
  return sentences
    .filter(sentence => 
      regulatoryTerms.some(term => 
        sentence.toLowerCase().includes(term.toLowerCase())
      )
    )
    .map(s => s.trim())
    .filter(s => s.length > 10); // Filter out very short fragments
}

/**
 * Determine sector based on industry
 */
function determineSector(industry: string): string {
  const sectorMap: Record<string, string> = {
    'food': 'Agriculture & Food Processing',
    'textile': 'Manufacturing & Textiles',
    'health': 'Healthcare & Life Sciences',
    'technology': 'Information Technology & Services',
    'manufacturing': 'Industrial Manufacturing'
  };
  
  return sectorMap[industry] || 'General Business';
}

/**
 * Create fallback analysis when scraper is unavailable
 */
function createFallbackAnalysis(websiteUrl: string): WebsiteData {
  // Extract domain name for business name guess
  const domain = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`).hostname;
  const businessName = domain
    .replace(/www\.|\.com|\.co|\.org|\.net|\.io|\.biz/g, '')
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  
  return {
    url: websiteUrl,
    scrapedAt: new Date(),
    businessName,
    description: `Website analysis was limited due to technical constraints. We've made assumptions based on the domain ${domain}.`,
    products: [
      { name: 'Primary Product', description: 'Product details unavailable from website analysis' }
    ],
    services: [],
    certifications: [],
    exportInfo: {
      mentionedMarkets: [],
      exportStatements: []
    },
    contactInfo: {
      email: `info@${domain}`,
      phone: '',
      address: ''
    },
    locations: [{ name: 'Headquarters', type: 'headquarters' as const }],
    businessSizeIndicators: [],
    customerSegments: ['General Customers'],
    rawTextBySection: {
      'note': `Limited analysis performed. Full website scraping was unavailable.`
    }
  };
} 
/**
 * Export Readiness Model
 * 
 * Defines the categories and dimensions used to assess export readiness
 */

/**
 * A specific dimension of export readiness
 */
export interface ReadinessDimension {
  id: string;
  name: string;
  description: string;
  weight: number; // Weight for scoring (0-1)
  requiredForExport: boolean; // Is this a must-have for export success?
}

/**
 * A category grouping multiple dimensions of export readiness
 */
export interface ReadinessCategory {
  id: string;
  name: string;
  description: string;
  dimensions: ReadinessDimension[];
}

/**
 * The complete export readiness assessment model
 */
export const readinessCategories: ReadinessCategory[] = [
  {
    id: 'product_readiness',
    name: 'Product Readiness',
    description: 'Assessment of how export-ready the product or service offering is',
    dimensions: [
      {
        id: 'product_quality',
        name: 'Product Quality',
        description: 'The quality of products/services relative to international standards',
        weight: 0.8,
        requiredForExport: true
      },
      {
        id: 'product_adaptation',
        name: 'Product Adaptation',
        description: 'Ability to adapt products for international markets (packaging, labeling, etc.)',
        weight: 0.7,
        requiredForExport: true
      },
      {
        id: 'pricing_strategy',
        name: 'Pricing Strategy',
        description: 'Pricing competitiveness and strategy for international markets',
        weight: 0.6,
        requiredForExport: false
      },
      {
        id: 'intellectual_property',
        name: 'Intellectual Property',
        description: 'Protection of IP and trademarks in target markets',
        weight: 0.5,
        requiredForExport: false
      }
    ]
  },
  {
    id: 'market_readiness',
    name: 'Market Readiness',
    description: 'Assessment of market research and understanding of target markets',
    dimensions: [
      {
        id: 'market_research',
        name: 'Market Research',
        description: 'Understanding of target market conditions, competitors, and customer needs',
        weight: 0.7,
        requiredForExport: true
      },
      {
        id: 'market_entry_strategy',
        name: 'Market Entry Strategy',
        description: 'Clear strategy for entering identified export markets',
        weight: 0.6,
        requiredForExport: false
      },
      {
        id: 'customer_segmentation',
        name: 'Customer Segmentation',
        description: 'Identification of specific customer segments in target markets',
        weight: 0.5,
        requiredForExport: false
      },
      {
        id: 'competitive_advantage',
        name: 'Competitive Advantage',
        description: 'Unique selling proposition for international markets',
        weight: 0.7,
        requiredForExport: true
      }
    ]
  },
  {
    id: 'operational_readiness',
    name: 'Operational Readiness',
    description: 'Assessment of operational capacity to handle export activities',
    dimensions: [
      {
        id: 'production_capacity',
        name: 'Production Capacity',
        description: 'Ability to scale production to meet export demand',
        weight: 0.7,
        requiredForExport: true
      },
      {
        id: 'supply_chain',
        name: 'Supply Chain',
        description: 'Robustness of supply chain for international delivery',
        weight: 0.6,
        requiredForExport: false
      },
      {
        id: 'logistics_capabilities',
        name: 'Logistics Capabilities',
        description: 'Access to reliable logistics for international shipping',
        weight: 0.7,
        requiredForExport: true
      },
      {
        id: 'certification_compliance',
        name: 'Certification & Compliance',
        description: 'Necessary certifications and compliance with regulations',
        weight: 0.8,
        requiredForExport: true
      }
    ]
  },
  {
    id: 'financial_readiness',
    name: 'Financial Readiness',
    description: 'Assessment of financial resources and capabilities for export',
    dimensions: [
      {
        id: 'export_costing',
        name: 'Export Costing',
        description: 'Understanding of export costs and pricing implications',
        weight: 0.6,
        requiredForExport: true
      },
      {
        id: 'financial_resources',
        name: 'Financial Resources',
        description: 'Access to financing for export activities',
        weight: 0.7,
        requiredForExport: true
      },
      {
        id: 'payment_methods',
        name: 'Payment Methods',
        description: 'Ability to handle international payment methods',
        weight: 0.5,
        requiredForExport: false
      },
      {
        id: 'risk_management',
        name: 'Risk Management',
        description: 'Strategies to manage currency, payment, and other financial risks',
        weight: 0.5,
        requiredForExport: false
      }
    ]
  },
  {
    id: 'organizational_readiness',
    name: 'Organizational Readiness',
    description: 'Assessment of organizational capability and commitment to export',
    dimensions: [
      {
        id: 'export_commitment',
        name: 'Export Commitment',
        description: 'Management commitment to export success',
        weight: 0.8,
        requiredForExport: true
      },
      {
        id: 'export_experience',
        name: 'Export Experience',
        description: 'Previous experience with international trade',
        weight: 0.5,
        requiredForExport: false
      },
      {
        id: 'staff_capability',
        name: 'Staff Capability',
        description: 'Staff knowledge and skills for export activities',
        weight: 0.6,
        requiredForExport: false
      },
      {
        id: 'language_cultural_awareness',
        name: 'Language & Cultural Awareness',
        description: 'Understanding of language and cultural aspects of target markets',
        weight: 0.4,
        requiredForExport: false
      }
    ]
  }
];

/**
 * Get market-specific readiness dimensions for target markets
 */
export function getMarketSpecificReadiness(targetMarket: string): ReadinessDimension[] {
  // Market-specific dimensions for UAE
  if (targetMarket.toLowerCase().includes('uae') ||
      targetMarket.toLowerCase().includes('emirates') ||
      targetMarket.toLowerCase().includes('dubai')) {
    return [
      {
        id: 'halal_certification',
        name: 'Halal Certification',
        description: 'Products meet Halal requirements where applicable',
        weight: 0.7,
        requiredForExport: true
      },
      {
        id: 'arabic_labeling',
        name: 'Arabic Labeling',
        description: 'Products have Arabic language packaging/labeling',
        weight: 0.6,
        requiredForExport: true
      },
      {
        id: 'gulf_standard_compliance',
        name: 'Gulf Standards Compliance',
        description: 'Compliance with Gulf Standard Organization (GSO) standards',
        weight: 0.7,
        requiredForExport: true
      }
    ];
  }
  
  // Market-specific dimensions for UK
  if (targetMarket.toLowerCase().includes('uk') ||
      targetMarket.toLowerCase().includes('united kingdom') ||
      targetMarket.toLowerCase().includes('britain')) {
    return [
      {
        id: 'ukca_marking',
        name: 'UKCA Marking',
        description: 'UK Conformity Assessed marking for applicable products',
        weight: 0.7,
        requiredForExport: true
      },
      {
        id: 'uk_regulatory_compliance',
        name: 'UK Regulatory Compliance',
        description: 'Compliance with UK-specific regulations post-Brexit',
        weight: 0.7,
        requiredForExport: true
      },
      {
        id: 'sustainable_practices',
        name: 'Sustainable Practices',
        description: 'Environmental sustainability practices for UK market',
        weight: 0.5,
        requiredForExport: false
      }
    ];
  }
  
  // Market-specific dimensions for USA
  if (targetMarket.toLowerCase().includes('usa') ||
      targetMarket.toLowerCase().includes('united states') ||
      targetMarket.toLowerCase().includes('america')) {
    return [
      {
        id: 'fda_compliance',
        name: 'FDA Compliance',
        description: 'Food and Drug Administration compliance for applicable products',
        weight: 0.8,
        requiredForExport: true
      },
      {
        id: 'state_level_regulations',
        name: 'State-Level Regulations',
        description: 'Understanding of varying state-level regulations',
        weight: 0.6,
        requiredForExport: false
      },
      {
        id: 'product_liability',
        name: 'Product Liability',
        description: 'Insurance and protection against US product liability claims',
        weight: 0.7,
        requiredForExport: true
      }
    ];
  }
  
  // Default empty list if no specific market matched
  return [];
}

/**
 * Calculate an overall readiness score based on dimension scores
 */
export function calculateReadinessScore(dimensionScores: Record<string, number>): number {
  let totalScore = 0;
  let totalWeight = 0;
  
  // Calculate weighted score for all standard dimensions
  for (const category of readinessCategories) {
    for (const dimension of category.dimensions) {
      if (dimensionScores[dimension.id] !== undefined) {
        totalScore += dimensionScores[dimension.id] * dimension.weight;
        totalWeight += dimension.weight;
      }
    }
  }
  
  // Calculate final score (0-100)
  return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
}

/**
 * Get market opportunity score for a specific target market
 * based on product fit, market demand, and compliance factors
 */
export function getMarketOpportunityScore(
  targetMarket: string,
  productFitScore: number,
  marketResearchScore: number,
  complianceScore: number
): number {
  // Base calculation
  let score = (productFitScore * 0.4) + (marketResearchScore * 0.3) + (complianceScore * 0.3);
  
  // Apply market-specific adjustments
  if (targetMarket.toLowerCase().includes('uae')) {
    // UAE market conditions adjustment
    score *= 1.1; // 10% bonus for UAE currently being a high-opportunity market
  } else if (targetMarket.toLowerCase().includes('uk')) {
    // UK market adjustment
    score *= 0.95; // 5% reduction due to Brexit-related challenges
  } else if (targetMarket.toLowerCase().includes('usa')) {
    // USA market adjustment
    score *= 1.05; // 5% bonus for large market size
  }
  
  // Ensure score is 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
} 
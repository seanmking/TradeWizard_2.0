import { ScoreData } from '../data/mockScores';

export interface ReadinessInputs {
  certifications: string[];
  workingCapital: number;
  supplyChain: boolean;
  hasExportPlan: boolean;
  digitalPresence: boolean;
  marketResearch: boolean;
  riskAssessment: boolean;
  staffTraining: boolean;
}

const CATEGORY_WEIGHTS = {
  'Financial Readiness': 1.2,
  'Operational Capability': 1.0,
  'Regulatory Compliance': 1.5,
  'Market Understanding': 1.1,
  'Strategic Preparedness': 1.3,
  'Innovation & Digital': 0.9,
  'Risk Management': 1.4,
  'Human Capital': 1.0,
};

export function calculateScore(inputs: ReadinessInputs): ScoreData {
  const scores = {
    'Financial Readiness': calculateFinancialScore(inputs),
    'Operational Capability': calculateOperationalScore(inputs),
    'Regulatory Compliance': calculateComplianceScore(inputs),
    'Market Understanding': calculateMarketScore(inputs),
    'Strategic Preparedness': calculateStrategyScore(inputs),
    'Innovation & Digital': calculateDigitalScore(inputs),
    'Risk Management': calculateRiskScore(inputs),
    'Human Capital': calculateHumanCapitalScore(inputs),
  };

  const totalScore = Math.round(
    Object.entries(scores).reduce(
      (acc, [category, score]) =>
        acc + score * CATEGORY_WEIGHTS[category as keyof typeof CATEGORY_WEIGHTS],
      0
    ) / Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b)
  );

  return {
    totalScore,
    scoresByCategory: scores,
    gapRecommendations: generateRecommendations(scores),
  };
}

function calculateFinancialScore(inputs: ReadinessInputs): number {
  return inputs.workingCapital > 100000 ? 80 : 65;
}

function calculateOperationalScore(inputs: ReadinessInputs): number {
  return inputs.supplyChain ? 78 : 60;
}

function calculateComplianceScore(inputs: ReadinessInputs): number {
  return inputs.certifications.length >= 2 ? 85 : 55;
}

function calculateMarketScore(inputs: ReadinessInputs): number {
  return inputs.marketResearch ? 82 : 60;
}

function calculateStrategyScore(inputs: ReadinessInputs): number {
  return inputs.hasExportPlan ? 85 : 67;
}

function calculateDigitalScore(inputs: ReadinessInputs): number {
  return inputs.digitalPresence ? 74 : 50;
}

function calculateRiskScore(inputs: ReadinessInputs): number {
  return inputs.riskAssessment ? 80 : 60;
}

function calculateHumanCapitalScore(inputs: ReadinessInputs): number {
  return inputs.staffTraining ? 88 : 70;
}

function generateRecommendations(scores: Record<string, number>): {
  'Regulatory Compliance': string[];
  'Financial Readiness': string[];
  'Risk Management': string[];
  'Strategic Preparedness': string[];
} {
  const baseRecommendations = {
    'Regulatory Compliance': [
      'Obtain required certifications',
      'Review and update labeling requirements',
    ],
    'Financial Readiness': [
      'Increase working capital buffer',
      'Develop forex risk management strategy',
    ],
    'Risk Management': ['Secure export insurance coverage', 'Complete country risk assessments'],
    'Strategic Preparedness': [
      'Review and update export strategy',
      'Conduct market entry analysis',
    ],
  };

  return Object.entries(scores).reduce(
    (acc, [category, score]) => {
      if (score < 70 && category in baseRecommendations) {
        acc[category as keyof typeof baseRecommendations] =
          baseRecommendations[category as keyof typeof baseRecommendations];
      }
      return acc;
    },
    { ...baseRecommendations }
  );
}

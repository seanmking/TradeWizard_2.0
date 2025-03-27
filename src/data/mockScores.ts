export const mockScores = {
  totalScore: 72,
  scoresByCategory: {
    'Financial Readiness': 65,
    'Operational Capability': 78,
    'Regulatory Compliance': 55,
    'Market Understanding': 82,
    'Strategic Preparedness': 67,
    'Innovation & Digital': 74,
    'Risk Management': 60,
    'Human Capital': 88,
  },
  gapRecommendations: {
    'Regulatory Compliance': [
      'Missing HACCP certification',
      'Labeling not compliant with UAE market',
    ],
    'Financial Readiness': ['Insufficient working capital buffer', 'Forex strategy not defined'],
    'Risk Management': ['Export insurance coverage needed', 'Country risk assessment incomplete'],
    'Strategic Preparedness': [
      'Export market entry plan needs refinement',
      'Competitive analysis requires updating',
    ],
  },
};

export type Category = keyof typeof mockScores.scoresByCategory;
export type ScoreData = typeof mockScores;

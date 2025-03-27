export type PhaseStatus = 'not-started' | 'in-progress' | 'completed';

export interface JourneyPhase {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  estimatedCost: 'Low' | 'Medium' | 'High' | 'Variable';
  dependencies: string[];
  status: PhaseStatus;
  tasks?: string[];
}

export const journeyPhases: JourneyPhase[] = [
  {
    id: 'market-discovery',
    title: 'Market Discovery',
    description: "Let's discover your best-fit export market.",
    estimatedDuration: '2 weeks',
    estimatedCost: 'Low',
    dependencies: [],
    status: 'not-started',
    tasks: [
      'Complete market research survey',
      'Review competitor analysis',
      'Identify target demographics',
    ],
  },
  {
    id: 'compliance-readiness',
    title: 'Compliance Readiness',
    description: 'Make sure your product meets destination rules.',
    estimatedDuration: '3 weeks',
    estimatedCost: 'Medium',
    dependencies: ['market-discovery'],
    status: 'not-started',
    tasks: ['Review regulatory requirements', 'Prepare documentation', 'Submit certifications'],
  },
  {
    id: 'financial-preparation',
    title: 'Financial Preparation',
    description: 'Secure funds, manage risk, and forecast costs.',
    estimatedDuration: '2 weeks',
    estimatedCost: 'Variable',
    dependencies: ['market-discovery'],
    status: 'not-started',
    tasks: ['Create export budget', 'Assess financing options', 'Set up risk management'],
  },
  {
    id: 'operational-scaling',
    title: 'Operational Scaling',
    description: 'Get your logistics, partners, and systems ready.',
    estimatedDuration: '2-4 weeks',
    estimatedCost: 'High',
    dependencies: ['compliance-readiness', 'financial-preparation'],
    status: 'not-started',
    tasks: [
      'Select logistics partners',
      'Set up distribution network',
      'Prepare inventory management',
    ],
  },
];

import { MarketInsight, Reminder } from '@/state/useEngagementStore';
import { WeeklyProgress } from '@/state/useEngagementStore';

export const mockInsights: MarketInsight[] = [
  {
    id: 'insight_1',
    title: 'UAE Plant-Based Market Growth',
    summary:
      'Plant-based food imports to UAE increased by 15% this quarter. Consider adjusting your volume estimates.',
    actionCTA: 'Review Volume Estimates',
    relevantPhases: ['market-discovery', 'operational-scaling'],
    dateAdded: new Date('2024-03-20'),
  },
  {
    id: 'insight_2',
    title: 'New Halal Certification Process',
    summary:
      'UAE has streamlined their Halal certification process. Get certified faster with the new online system.',
    actionCTA: 'Start Certification',
    relevantPhases: ['compliance-readiness'],
    dateAdded: new Date('2024-03-19'),
  },
];

export const mockReminders: Reminder[] = [
  {
    id: 'reminder_1',
    task: 'Submit Halal certification application',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    phaseId: 'compliance-readiness',
    isCompleted: false,
  },
  {
    id: 'reminder_2',
    task: 'Review logistics partner proposals',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    phaseId: 'operational-scaling',
    isCompleted: false,
  },
];

export const mockWeeklyProgress: WeeklyProgress = {
  completedTasks: [
    'Completed market research survey',
    'Identified target demographics',
    'Started competitor analysis',
  ],
  upcomingTasks: [
    'Submit Halal certification application',
    'Review logistics partner proposals',
    'Prepare export budget',
  ],
  phaseProgress: [
    {
      phaseId: 'market-discovery',
      progress: 75,
    },
    {
      phaseId: 'compliance-readiness',
      progress: 30,
    },
    {
      phaseId: 'financial-preparation',
      progress: 10,
    },
    {
      phaseId: 'operational-scaling',
      progress: 0,
    },
  ],
};

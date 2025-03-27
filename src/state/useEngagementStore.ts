import { create } from 'zustand';
import { StoreApi } from 'zustand';

export interface Reminder {
  id: string;
  task: string;
  dueDate: Date;
  phaseId: string;
  isCompleted: boolean;
}

export interface MarketInsight {
  id: string;
  title: string;
  summary: string;
  actionCTA: string;
  relevantPhases: string[];
  dateAdded: Date;
}

export interface WeeklyProgress {
  completedTasks: string[];
  upcomingTasks: string[];
  phaseProgress: {
    phaseId: string;
    progress: number;
  }[];
}

interface EngagementStore {
  lastDigestViewed: Date | null;
  seenInsights: string[];
  activeReminders: Reminder[];
  weeklyProgress: WeeklyProgress;
  insights: MarketInsight[];

  // Actions
  markDigestViewed: () => void;
  addSeenInsight: (insightId: string) => void;
  addReminder: (reminder: Omit<Reminder, 'id' | 'isCompleted'>) => void;
  completeReminder: (reminderId: string) => void;
  updateWeeklyProgress: (progress: WeeklyProgress) => void;
  addInsight: (insight: Omit<MarketInsight, 'id' | 'dateAdded'>) => void;
}

type SetState = StoreApi<EngagementStore>['setState'];

export const useEngagementStore = create<EngagementStore>((set: SetState) => ({
  lastDigestViewed: null,
  seenInsights: [],
  activeReminders: [],
  weeklyProgress: {
    completedTasks: [],
    upcomingTasks: [],
    phaseProgress: [],
  },
  insights: [],

  markDigestViewed: () => set({ lastDigestViewed: new Date() }),

  addSeenInsight: (insightId: string) =>
    set(state => ({
      seenInsights: [...state.seenInsights, insightId],
    })),

  addReminder: (reminder: Omit<Reminder, 'id' | 'isCompleted'>) =>
    set(state => ({
      activeReminders: [
        ...state.activeReminders,
        {
          ...reminder,
          id: `reminder_${Date.now()}`,
          isCompleted: false,
        },
      ],
    })),

  completeReminder: (reminderId: string) =>
    set(state => ({
      activeReminders: state.activeReminders.map(reminder =>
        reminder.id === reminderId ? { ...reminder, isCompleted: true } : reminder
      ),
    })),

  updateWeeklyProgress: (progress: WeeklyProgress) => set({ weeklyProgress: progress }),

  addInsight: (insight: Omit<MarketInsight, 'id' | 'dateAdded'>) =>
    set(state => ({
      insights: [
        ...state.insights,
        {
          ...insight,
          id: `insight_${Date.now()}`,
          dateAdded: new Date(),
        },
      ],
    })),
}));

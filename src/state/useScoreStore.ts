import { create } from 'zustand';
import { Category, mockScores } from '../data/mockScores';

interface ScoreStore {
  showDetail: boolean;
  selectedCategory: Category | null;
  scores: typeof mockScores;
  openDetail: (category: Category) => void;
  closeDetail: () => void;
  updateScores: (newScores: typeof mockScores) => void;
}

export const useScoreStore = create<ScoreStore>(set => ({
  showDetail: false,
  selectedCategory: null,
  scores: mockScores,
  openDetail: category => set({ showDetail: true, selectedCategory: category }),
  closeDetail: () => set({ showDetail: false, selectedCategory: null }),
  updateScores: newScores => set({ scores: newScores }),
}));

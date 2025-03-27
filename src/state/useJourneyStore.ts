import { create } from 'zustand';
import { JourneyPhase, journeyPhases } from '../data/journeyPhases';

interface JourneyStore {
  phases: JourneyPhase[];
  currentPhase: string | null;
  setCurrentPhase: (phaseId: string | null) => void;
  updatePhaseStatus: (phaseId: string, status: JourneyPhase['status']) => void;
  getPhaseById: (phaseId: string) => JourneyPhase | undefined;
  canStartPhase: (phaseId: string) => boolean;
}

export const useJourneyStore = create<JourneyStore>((set, get) => ({
  phases: journeyPhases,
  currentPhase: null,

  setCurrentPhase: phaseId => set({ currentPhase: phaseId }),

  updatePhaseStatus: (phaseId, status) =>
    set(state => ({
      phases: state.phases.map(phase => (phase.id === phaseId ? { ...phase, status } : phase)),
    })),

  getPhaseById: phaseId => {
    const state = get();
    return state.phases.find(phase => phase.id === phaseId);
  },

  canStartPhase: phaseId => {
    const state = get();
    const phase = state.phases.find(p => p.id === phaseId);
    if (!phase) return false;

    // If no dependencies, can always start
    if (phase.dependencies.length === 0) return true;

    // Check if all dependencies are completed
    return phase.dependencies.every(depId => {
      const depPhase = state.phases.find(p => p.id === depId);
      return depPhase?.status === 'completed';
    });
  },
}));

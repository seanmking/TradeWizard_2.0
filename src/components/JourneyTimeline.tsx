import React from 'react';
import { useJourneyStore } from '../state/useJourneyStore';
import { MilestoneMarker } from './MilestoneMarker';
import { JourneyPhase } from '../data/journeyPhases';

export const JourneyTimeline: React.FC = () => {
  const { phases, currentPhase, setCurrentPhase, canStartPhase } = useJourneyStore();

  const handlePhaseClick = (phaseId: string) => {
    if (!canStartPhase(phaseId)) {
      // Show dependency warning
      alert('Please complete the required phases first.');
      return;
    }
    setCurrentPhase(phaseId);
  };

  return (
    <div className="w-full overflow-x-auto py-6">
      <div className="flex min-w-max gap-6 px-4">
        {phases.map((phase: JourneyPhase, index: number) => (
          <div
            key={phase.id}
            className={`relative flex w-72 flex-col rounded-lg border p-4 shadow-sm transition-all
              ${currentPhase === phase.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}
              ${canStartPhase(phase.id) ? 'cursor-pointer hover:shadow-md' : 'opacity-70'}
            `}
            onClick={() => handlePhaseClick(phase.id)}
          >
            {/* Phase number and title */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Phase {index + 1}</span>
              <MilestoneMarker status={phase.status} />
            </div>

            {/* Phase title and description */}
            <h3 className="mb-1 text-lg font-semibold">{phase.title}</h3>
            <p className="mb-4 text-sm text-gray-600">{phase.description}</p>

            {/* Timeline and cost estimates */}
            <div className="mt-auto space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Duration:</span>
                <span className="font-medium">{phase.estimatedDuration}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Cost:</span>
                <span className="font-medium">{phase.estimatedCost}</span>
              </div>
            </div>

            {/* Dependencies */}
            {phase.dependencies.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs text-gray-500">Requires: {phase.dependencies.join(', ')}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

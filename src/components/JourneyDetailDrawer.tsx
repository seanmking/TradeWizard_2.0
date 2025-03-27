import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useJourneyStore } from '../state/useJourneyStore';
import { MilestoneMarker } from './MilestoneMarker';

interface JourneyDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JourneyDetailDrawer: React.FC<JourneyDetailDrawerProps> = ({ isOpen, onClose }) => {
  const {
    currentPhase: phaseId,
    getPhaseById,
    canStartPhase,
    updatePhaseStatus,
  } = useJourneyStore();
  const phase = phaseId ? getPhaseById(phaseId) : null;

  if (!isOpen || !phase) return null;

  const handleStart = () => {
    if (!canStartPhase(phase.id)) {
      alert('Please complete the required phases first.');
      return;
    }
    updatePhaseStatus(phase.id, 'in-progress');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-25 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md">
          <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
            {/* Header */}
            <div className="px-4 sm:px-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-medium text-gray-900">Phase Details</h2>
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={onClose}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="relative mt-6 flex-1 px-4 sm:px-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold">{phase.title}</h3>
                <div className="mt-2">
                  <MilestoneMarker status={phase.status} />
                </div>
              </div>

              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h4 className="font-medium text-gray-900">About this Phase</h4>
                  <p className="mt-2 text-gray-600">{phase.description}</p>
                </div>

                {/* Timeline & Cost */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Duration</p>
                      <p className="mt-1 text-sm text-gray-900">{phase.estimatedDuration}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Estimated Cost</p>
                      <p className="mt-1 text-sm text-gray-900">{phase.estimatedCost}</p>
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                {phase.tasks && (
                  <div>
                    <h4 className="font-medium text-gray-900">Key Tasks</h4>
                    <ul className="mt-2 space-y-2">
                      {phase.tasks.map((task: string, index: number) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dependencies */}
                {phase.dependencies.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900">Prerequisites</h4>
                    <p className="mt-2 text-sm text-gray-600">Complete these phases first:</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {phase.dependencies.map((depId: string) => {
                        const dep = getPhaseById(depId);
                        return (
                          <li key={depId} className="text-sm text-gray-600">
                            {dep?.title}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-8">
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!canStartPhase(phase.id)}
                  className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white
                    ${
                      canStartPhase(phase.id)
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {phase.status === 'not-started' ? 'Start this Phase' : 'Continue Phase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

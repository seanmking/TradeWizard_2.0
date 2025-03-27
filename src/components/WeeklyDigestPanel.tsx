import React from 'react';
import { useEngagementStore } from '../state/useEngagementStore';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/solid';

export const WeeklyDigestPanel: React.FC = () => {
  const { weeklyProgress, markDigestViewed } = useEngagementStore();

  const handleMarkReviewed = () => {
    markDigestViewed();
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Weekly Export Progress</h2>
        <button
          onClick={handleMarkReviewed}
          className="rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-100"
        >
          Mark as Reviewed
        </button>
      </div>

      {/* Accomplishments */}
      <div className="mb-6">
        <h3 className="mb-3 font-medium text-gray-900">This Week&apos;s Accomplishments</h3>
        <ul className="space-y-2">
          {weeklyProgress.completedTasks.map((task, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              {task}
            </li>
          ))}
        </ul>
      </div>

      {/* Upcoming Tasks */}
      <div className="mb-6">
        <h3 className="mb-3 font-medium text-gray-900">Priority Next Steps</h3>
        <ul className="space-y-2">
          {weeklyProgress.upcomingTasks.map((task, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
              <ClockIcon className="h-5 w-5 text-blue-500" />
              {task}
            </li>
          ))}
        </ul>
      </div>

      {/* Phase Progress */}
      <div>
        <h3 className="mb-3 font-medium text-gray-900">Phase Progress</h3>
        <div className="space-y-4">
          {weeklyProgress.phaseProgress.map(phase => (
            <div key={phase.phaseId}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{phase.phaseId}</span>
                <span className="text-gray-500">{phase.progress}% Complete</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

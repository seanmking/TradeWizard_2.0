import React from 'react';
import { useEngagementStore } from '../state/useEngagementStore';
import { LightBulbIcon } from '@heroicons/react/24/outline';

interface MarketInsightCardProps {
  insightId: string;
  onActionClick?: () => void;
}

export const MarketInsightCard: React.FC<MarketInsightCardProps> = ({
  insightId,
  onActionClick,
}) => {
  const { insights, addSeenInsight } = useEngagementStore();
  const insight = insights.find(i => i.id === insightId);

  if (!insight) return null;

  const handleActionClick = () => {
    addSeenInsight(insightId);
    onActionClick?.();
  };

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-full bg-blue-100 p-2">
          <LightBulbIcon className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-medium text-blue-900">{insight.title}</h3>
          <p className="mt-1 text-sm text-blue-700">{insight.summary}</p>
        </div>
      </div>

      {insight.actionCTA && (
        <button
          onClick={handleActionClick}
          className="mt-2 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {insight.actionCTA}
        </button>
      )}

      <div className="mt-3 text-xs text-blue-600">
        Added {new Date(insight.dateAdded).toLocaleDateString()}
      </div>
    </div>
  );
};

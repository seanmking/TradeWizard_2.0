import React from 'react';
import { ReadinessRadarChart } from './ReadinessRadarChart';
import { ScoreDetailPanel } from './ScoreDetailPanel';
import { useScoreStore } from '../state/useScoreStore';
import { Category } from '../data/mockScores';

export const ExportReadinessScore: React.FC = () => {
  const { scores, showDetail, selectedCategory, openDetail, closeDetail } = useScoreStore();

  const radarData = Object.entries(scores.scoresByCategory).map(([category, score]) => ({
    category: category as Category,
    score,
  }));

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Export Readiness Profile</h1>
          <p className="text-lg text-gray-600">
            Let&apos;s look at your export readiness profile and see where we can unlock progress!
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  Overall Score: {scores.totalScore}
                </h2>
                <p className="text-gray-600 mt-1">
                  Click on any category to see detailed recommendations
                </p>
              </div>
            </div>
          </div>

          <ReadinessRadarChart data={radarData} onCategoryClick={openDetail} />
        </div>

        {showDetail && selectedCategory && (
          <ScoreDetailPanel
            category={selectedCategory}
            score={scores.scoresByCategory[selectedCategory]}
            recommendations={
              scores.gapRecommendations[
                selectedCategory as keyof typeof scores.gapRecommendations
              ] || []
            }
            onClose={closeDetail}
          />
        )}
      </div>
    </div>
  );
};

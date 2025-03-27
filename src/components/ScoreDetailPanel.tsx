import React from 'react';
import { Category } from '../data/mockScores';

interface Props {
  category: Category;
  score: number;
  recommendations: string[];
  onClose: () => void;
}

export const ScoreDetailPanel: React.FC<Props> = ({
  category,
  score,
  recommendations,
  onClose,
}) => {
  const getEncouragingMessage = (score: number) => {
    if (score >= 80) return "Excellent progress! You're well-prepared in this area.";
    if (score >= 70) return 'Good work! A few improvements will make you even stronger.';
    if (score >= 60) return "You're on the right track! Let's focus on key improvements.";
    return "This area needs attention, but we'll help you get there!";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{category}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold text-blue-600">{score}</div>
            <div className="text-sm text-gray-600">out of 100</div>
          </div>
          <p className="text-gray-700 mb-4">{getEncouragingMessage(score)}</p>
        </div>

        {recommendations.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Next Steps:</h3>
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <svg
                    className="h-6 w-6 text-blue-500 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

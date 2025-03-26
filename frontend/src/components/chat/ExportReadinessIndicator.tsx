import React from 'react';

interface ExportReadinessIndicatorProps {
  stage: string;
}

const stages = [
  { id: 'initial', label: 'Initial Assessment' },
  { id: 'product', label: 'Product Analysis' },
  { id: 'market', label: 'Market Research' },
  { id: 'competitive', label: 'Competitive Analysis' },
  { id: 'recommendations', label: 'Recommendations' }
];

const ExportReadinessIndicator: React.FC<ExportReadinessIndicatorProps> = ({ stage }) => {
  const currentIndex = stages.findIndex(s => s.id === stage);

  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Export Readiness Assessment</h3>
      <div className="space-y-4">
        {stages.map((s, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = s.id === stage;
          
          return (
            <div key={s.id} className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-sm mr-3 ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? '✓' : (index + 1)}
              </div>
              <span
                className={`${
                  isCurrent
                    ? 'text-blue-600 font-medium'
                    : isCompleted
                    ? 'text-gray-600'
                    : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
              {index < stages.length - 1 && (
                <div
                  className={`h-8 w-0.5 ml-3 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                  style={{ marginLeft: '2.75rem', marginTop: '0.5rem' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExportReadinessIndicator; 
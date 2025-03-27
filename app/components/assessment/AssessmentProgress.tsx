import * as React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

const stepTitles = [
  'Business Profile',
  'Product Selection',
  'Production Volume',
  'Market Selection',
  'Maximum Capacity',
  'Certifications',
  'Budget'
];

interface AssessmentProgressProps {
  currentStep: number;
  totalSteps: number;
}

export default function AssessmentProgress({ currentStep, totalSteps }: AssessmentProgressProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-8">
      <div className="relative">
        {/* Progress bar */}
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
          <div
            style={{ width: `${progress}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
          />
        </div>

        {/* Steps */}
        <div className="flex justify-between">
          {stepTitles.map((title, index) => {
            const isCompleted = currentStep > index + 1;
            const isActive = currentStep === index + 1;

            return (
              <div
                key={index}
                className={`flex flex-col items-center ${
                  isActive ? 'text-primary' : isCompleted ? 'text-green-500' : 'text-gray-400'
                }`}
              >
                <div
                  className={`
                    w-8 h-8 flex items-center justify-center rounded-full border-2
                    ${
                      isActive
                        ? 'border-primary bg-white text-primary'
                        : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="mt-2 text-xs text-center hidden sm:block">{title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 
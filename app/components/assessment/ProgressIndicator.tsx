"use client";

import React, { useState, useEffect } from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
  steps: number;
  isTransitioning?: boolean;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  currentStep, 
  steps,
  isTransitioning = false
}) => {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Create an array of step indices
  const stepIndices = Array.from({ length: steps }, (_, i) => i);
  
  // Calculate progress percentage
  const progressPercentage = (currentStep / (steps - 1)) * 100;
  
  return (
    <div className="w-full" aria-label={`Step ${currentStep + 1} of ${steps}`}>
      {/* Mobile view - simplified progress bar */}
      {isMobile && (
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
            aria-hidden="true"
          />
        </div>
      )}
      
      {/* Desktop view - step indicators */}
      {!isMobile && (
        <div className="flex space-x-2">
          {stepIndices.map((step) => {
            const isCompleted = step < currentStep;
            const isCurrent = step === currentStep;
            
            return (
              <div
                key={step}
                className={`progress-step ${
                  isCompleted 
                    ? 'progress-step-completed' 
                    : isCurrent 
                      ? 'progress-step-current' 
                      : 'progress-step-future'
                } ${isTransitioning && isCurrent ? 'animate-pulse' : ''}`}
                style={{ 
                  width: `calc(100% / ${steps})`,
                  transition: 'background-color 0.3s ease'
                }}
                aria-label={
                  isCompleted 
                    ? `Step ${step + 1} completed` 
                    : isCurrent 
                      ? `Current step ${step + 1}` 
                      : `Step ${step + 1} not started`
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator; 
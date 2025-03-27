"use client";

import * as React from 'react';
import { AIAssessmentService } from '@/lib/services/aiAssessmentService';
import AssessmentProgress from './AssessmentProgress';
import BusinessProfileStep from './steps/BusinessProfileStep';
import ProductSelectionStep from './steps/ProductSelectionStep';
import ProductionVolumeStep from './steps/ProductionVolumeStep';
import MarketSelectionStep from './steps/MarketSelectionStep';
import MaxCapacityStep from './steps/MaxCapacityStep';
import CertificationStep from './steps/CertificationStep';
import BudgetStep from './steps/BudgetStep';

export default function AssessmentContainer() {
  const [aiService] = React.useState(() => new AIAssessmentService());
  const [currentStep, setCurrentStep] = React.useState(1);
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [assessmentData, setAssessmentData] = React.useState<any>({});
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    startAssessment();
  }, []);

  const startAssessment = async () => {
    setIsLoading(true);
    try {
      const initialMessage = await aiService.startAssessment();
      setMessage(initialMessage);
    } catch (error) {
      console.error('Error starting assessment:', error);
      setMessage('Error starting assessment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepSubmit = async (stepData: any) => {
    setIsLoading(true);
    try {
      const { nextStep, message: newMessage, isComplete: completed } = await aiService.processStep(stepData);
      
      setCurrentStep(nextStep);
      setMessage(newMessage);
      setIsComplete(completed);
      setAssessmentData(aiService.getAssessmentData());
    } catch (error) {
      console.error('Error processing step:', error);
      setMessage('Error processing step. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepComponent = () => {
    const stepProps = {
      onSubmit: handleStepSubmit,
      data: assessmentData
    };

    switch (currentStep) {
      case 1:
        return <BusinessProfileStep {...stepProps} />;
      case 2:
        return <ProductSelectionStep 
          {...stepProps} 
          businessUrl={assessmentData.businessProfile?.website} 
        />;
      case 3:
        return <ProductionVolumeStep {...stepProps} />;
      case 4:
        return <MarketSelectionStep {...stepProps} />;
      case 5:
        return <MaxCapacityStep {...stepProps} />;
      case 6:
        return <CertificationStep {...stepProps} />;
      case 7:
        return <BudgetStep {...stepProps} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <AssessmentProgress
        currentStep={currentStep}
        totalSteps={aiService.getTotalSteps()}
      />

      <div className="bg-white rounded-lg shadow-lg p-6">
        {isComplete ? (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold mb-4">Assessment Complete</h2>
            <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md">
              {message}
            </pre>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Step {currentStep}</h2>
              <p className="text-gray-600">{message}</p>
            </div>

            {renderStepComponent()}
          </>
        )}
      </div>
    </div>
  );
} 
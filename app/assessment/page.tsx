import React from 'react';
import InitialAssessment from '../components/assessment/InitialAssessment';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Export Readiness Assessment | TradeWizard',
  description: 'Take our interactive export readiness assessment to discover your business\'s potential for international markets.',
};

export default function AssessmentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <InitialAssessment />
    </div>
  );
} 
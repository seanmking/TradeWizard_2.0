import React from 'react';
import AssessmentContainer from '@/components/assessment/AssessmentContainer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Export Readiness Assessment | TradeWizard',
  description: 'Take our interactive export readiness assessment to discover your business\'s potential for international markets.',
};

export default function AssessmentPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Export Readiness Assessment
        </h1>
        <AssessmentContainer />
      </div>
    </main>
  );
} 
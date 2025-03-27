import * as React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Export Readiness Assessment - TradeWizard',
  description: 'Assess your export readiness with our step-by-step guide.',
};

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
} 
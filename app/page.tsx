import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to TradeWizard
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your AI-powered guide to export readiness assessment and improvement.
        </p>
        <Link href="/assessment">
          <Button size="lg">
            Start Your Assessment
          </Button>
        </Link>
      </div>
    </main>
  );
} 
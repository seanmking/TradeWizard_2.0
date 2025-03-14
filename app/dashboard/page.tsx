"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadUserAssessmentData } from '../lib/services/transitionService';

export default function DashboardPage() {
  const [hasAssessment, setHasAssessment] = useState(false);
  
  useEffect(() => {
    // Check if there's user assessment data
    const userData = loadUserAssessmentData();
    setHasAssessment(!!userData);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              Welcome to TradeWizard
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Your export readiness journey starts here.
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <p className="text-gray-700 mb-4">
              {hasAssessment 
                ? "Thank you for creating your account! Your export readiness assessment has been successfully associated with your profile."
                : "Get started by completing your export readiness assessment."}
            </p>
            
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-blue-800 mb-2">Your Export Readiness</h3>
                <p className="text-blue-700 mb-4">
                  {hasAssessment 
                    ? "View your complete assessment results and get personalized recommendations."
                    : "Take our assessment to evaluate your export readiness and get personalized recommendations."}
                </p>
                <Link href={hasAssessment ? "/assessment-results" : "/assessment"}>
                  <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    {hasAssessment ? "View Full Results" : "Start Assessment"}
                  </span>
                </Link>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-green-800 mb-2">Export Planning</h3>
                <p className="text-green-700 mb-4">
                  Start building your export strategy with our guided planning tools.
                </p>
                <Link href="/export-planning">
                  <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                    Start Planning
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 
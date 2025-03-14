"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadUserAssessmentData } from '../lib/services/transitionService';

export default function ProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load user assessment data
    const assessmentData = loadUserAssessmentData();
    setUserData(assessmentData);
    setLoading(false);
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }
  
  if (!userData) {
    // Redirect or show message if no user data found
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">No Assessment Data Found</h2>
          <p className="text-gray-600 mb-6 text-center">
            We couldn't find your assessment data. Please complete an assessment first.
          </p>
          <div className="flex justify-center">
            <Link href="/assessment">
              <span className="inline-block px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors duration-200">
                Start Assessment
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              In-Depth Export Readiness Assessment
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Complete your profile to get a comprehensive export readiness analysis
            </p>
          </div>
          
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Your journey so far
              </h3>
              
              <div className="bg-blue-50 p-4 rounded-md mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      You've completed the initial assessment and created an account. Now it's time to build on that foundation with more detailed information.
                    </p>
                  </div>
                </div>
              </div>
              
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Next steps
              </h3>
              
              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-md p-4 flex">
                  <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 mr-4">
                    1
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-gray-800">Business Details</h4>
                    <p className="text-sm text-gray-500">Complete your business information and export goals</p>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-md p-4 flex">
                  <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 mr-4">
                    2
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-gray-800">Product Information</h4>
                    <p className="text-sm text-gray-500">Tell us about your products or services</p>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-md p-4 flex">
                  <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 mr-4">
                    3
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-gray-800">Market Selection</h4>
                    <p className="text-sm text-gray-500">Identify your target international markets</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Link href="/assessment/business-details">
                  <span className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Start In-Depth Assessment
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
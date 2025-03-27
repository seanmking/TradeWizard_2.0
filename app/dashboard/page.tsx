'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Dashboard() {
  // Placeholder data - would come from API
  const exportReadiness = 65;
  const recentActivities = [
    { id: 1, type: 'assessment', title: 'Export Readiness Assessment', status: 'Completed', date: '2024-03-27' },
    { id: 2, type: 'market', title: 'Market Analysis - UAE', status: 'In Progress', date: '2024-03-26' }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-blue-600 text-white p-8 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-blue-100">Your export readiness score is {exportReadiness}%</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Dashboard Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Export Readiness Progress */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Export Readiness Progress</h2>
            <div className="h-4 bg-gray-200 rounded-full mb-4">
              <div 
                className="h-4 bg-blue-600 rounded-full" 
                style={{ width: `${exportReadiness}%` }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium">Documentation</h3>
                <p className="text-sm text-gray-600">80% Complete</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium">Market Research</h3>
                <p className="text-sm text-gray-600">60% Complete</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium">Compliance</h3>
                <p className="text-sm text-gray-600">55% Complete</p>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activities</h2>
            <div className="space-y-4">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="font-medium">{activity.title}</h3>
                    <p className="text-sm text-gray-600">{activity.date}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    activity.status === 'Completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* AI Assistant */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">AI Assistant</h2>
            <p className="text-gray-600 mb-4">Need help with your export journey?</p>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors">
              Chat with AI Assistant
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link 
                href="/analysis"
                className="block w-full bg-blue-50 text-blue-600 py-2 px-4 rounded hover:bg-blue-100 transition-colors text-center"
              >
                New Market Analysis
              </Link>
              <button className="w-full bg-blue-50 text-blue-600 py-2 px-4 rounded hover:bg-blue-100 transition-colors">
                Update Business Profile
              </button>
              <button className="w-full bg-blue-50 text-blue-600 py-2 px-4 rounded hover:bg-blue-100 transition-colors">
                View Compliance Checklist
              </button>
            </div>
          </div>

          {/* Market Insights */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Market Insights</h2>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded">
                <h3 className="font-medium">UAE Market Opportunity</h3>
                <p className="text-sm text-gray-600">Growing demand in your sector</p>
              </div>
              <div className="p-3 bg-blue-50 rounded">
                <h3 className="font-medium">New Trade Agreement</h3>
                <p className="text-sm text-gray-600">SA-UK trade benefits updated</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
'use client';

import React, { useState } from 'react';

export default function Analysis() {
  const [analysisType, setAnalysisType] = useState('trade');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implement analysis submission
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">New Trade Analysis</h1>
      
      <div className="max-w-2xl bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Type
            </label>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="trade">Trade Flow Analysis</option>
              <option value="market">Market Analysis</option>
              <option value="competitor">Competitor Analysis</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Category
            </label>
            <input
              type="text"
              placeholder="Enter product category or HS code"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Start Year"
                min="2000"
                max="2024"
                className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="End Year"
                min="2000"
                max="2024"
                className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Processing...' : 'Start Analysis'}
          </button>
        </form>
      </div>
    </div>
  );
} 
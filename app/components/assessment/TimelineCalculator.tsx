"use client";

import React, { useState, useEffect } from 'react';
import { processOptimizedQuery } from '../../lib/services/ai/server-actions';

interface TimelineCalculatorProps {
  totalComplianceCost: number;
  targetMarkets: string;
  exportMotivation: string;
}

const TimelineCalculator: React.FC<TimelineCalculatorProps> = ({
  totalComplianceCost,
  targetMarkets,
  exportMotivation
}) => {
  const [monthlyBudget, setMonthlyBudget] = useState(1000);
  const [timeline, setTimeline] = useState(0);
  const [optimizedPath, setOptimizedPath] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Calculate the timeline based on monthly budget
  useEffect(() => {
    // Simple calculation for immediate feedback
    if (totalComplianceCost <= 0 || monthlyBudget <= 0) {
      setTimeline(0);
      return;
    }
    
    const calculatedMonths = Math.ceil(totalComplianceCost / monthlyBudget);
    setTimeline(calculatedMonths);
    
    // Generate optimized path with delay to avoid too many API calls
    const timeoutId = setTimeout(() => {
      generateOptimizedPath();
    }, 800);
    
    return () => clearTimeout(timeoutId);
  }, [totalComplianceCost, monthlyBudget]);
  
  // Generate an optimized export readiness path using AI
  const generateOptimizedPath = async () => {
    if (totalComplianceCost <= 0 || timeline <= 0) {
      setOptimizedPath([]);
      return;
    }
    
    try {
      setIsLoading(true);
      
      const prompt = `
        Based on a total compliance cost of $${totalComplianceCost} and a monthly budget of $${monthlyBudget},
        create an optimized export readiness pathway for a business targeting ${targetMarkets} with the motivation: "${exportMotivation}".
        
        The pathway should span ${timeline} months and show key milestones for export preparation.
        For each milestone, provide a brief action item (less than 50 words).
        
        Format as a JSON array of strings, with one milestone per month:
        ["Month 1: First milestone action", "Month 2: Second milestone action", ...]
        
        Focus on practical, sequential steps that make the most of the monthly budget.
      `;
      
      const result = await processOptimizedQuery(
        prompt,
        'export_motivation',
      );
      
      try {
        // Parse the response as JSON array of strings
        const pathItems = JSON.parse(result.response);
        if (Array.isArray(pathItems)) {
          setOptimizedPath(pathItems.slice(0, timeline));
        }
      } catch (error) {
        console.error('Error parsing optimized path:', error);
        // Create a fallback path
        const fallbackPath = Array.from({ length: timeline }, (_, i) => 
          `Month ${i + 1}: ${getFallbackMilestone(i, timeline, targetMarkets)}`
        );
        setOptimizedPath(fallbackPath);
      }
    } catch (error) {
      console.error('Error generating optimized path:', error);
      // Create a fallback path
      const fallbackPath = Array.from({ length: timeline }, (_, i) => 
        `Month ${i + 1}: ${getFallbackMilestone(i, timeline, targetMarkets)}`
      );
      setOptimizedPath(fallbackPath);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format a number as a currency
  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString()}`;
  };
  
  return (
    <div className="mb-8 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h3 className="text-lg font-medium text-gray-800 mb-1">Export Timeline Calculator</h3>
      <p className="text-gray-500 text-sm mb-4">Adjust your monthly budget to see how it affects your export timeline</p>
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <label htmlFor="budget-slider" className="block text-sm font-medium text-gray-700">
            Monthly Budget
          </label>
          <span className="text-blue-600 font-semibold">{formatCurrency(monthlyBudget)}</span>
        </div>
        
        <input
          type="range"
          id="budget-slider"
          min="500"
          max={Math.max(5000, totalComplianceCost / 2)}
          step="100"
          value={monthlyBudget}
          onChange={(e) => setMonthlyBudget(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>$500</span>
          <span>${Math.max(5000, totalComplianceCost / 2).toLocaleString()}</span>
        </div>
      </div>
      
      {/* Timeline Summary */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-800 font-medium">Estimated Timeline</p>
            <p className="text-gray-600 text-sm">Total cost: {formatCurrency(totalComplianceCost)}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-blue-800">{timeline} months</p>
            <p className="text-sm text-gray-600">With {formatCurrency(monthlyBudget)}/month</p>
          </div>
        </div>
      </div>
      
      {/* Timeline Visualization */}
      <div className="relative">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {timeline > 12 && (
              <div className="text-amber-600 text-sm flex items-center mb-2">
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Consider increasing your monthly budget for a faster timeline.</span>
              </div>
            )}
            
            {optimizedPath.length > 0 ? (
              <div className="relative border-l-2 border-blue-300 ml-3 pl-6 pb-2">
                {optimizedPath.map((milestone, index) => {
                  const [monthPart, ...contentParts] = milestone.split(': ');
                  const content = contentParts.join(': '); // Rejoin in case there are colons in the content
                  
                  return (
                    <div key={index} className="mb-6 relative">
                      {/* Circle marker */}
                      <div className="absolute -left-9 flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs">
                        {index + 1}
                      </div>
                      
                      {/* Content */}
                      <div className={`p-3 rounded-lg border ${
                        index === 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                      }`}>
                        <p className="text-sm font-medium text-blue-800 mb-1">{monthPart}</p>
                        <p className="text-sm text-gray-600">{content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : timeline > 0 ? (
              <div className="text-center text-gray-500 py-8">
                Adjust your budget to generate an export timeline
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No compliance costs to calculate a timeline for
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to generate fallback milestones
function getFallbackMilestone(monthIndex: number, totalMonths: number, targetMarkets: string): string {
  const markets = targetMarkets.split(/,\s*/).map(m => m.trim());
  const firstMarket = markets[0] || 'international markets';
  
  // Create milestone stages based on progress through the timeline
  const progress = monthIndex / (totalMonths - 1);
  
  if (progress < 0.25) {
    const options = [
      `Research compliance requirements for ${firstMarket} and create initial documentation plan`,
      `Initiate contact with export consultants and prepare preliminary assessments`,
      `Begin product labeling and packaging adjustments for ${firstMarket}`,
      `Start preparing essential export documentation and financial forecasts`
    ];
    return options[monthIndex % options.length];
  } else if (progress < 0.5) {
    const options = [
      `Apply for key certificates and permits required for ${firstMarket}`,
      `Engage with freight forwarders and establish logistics partnerships`,
      `Complete product adjustments to meet ${firstMarket} standards`,
      `Set up international payment processing and currency management`
    ];
    return options[monthIndex % options.length];
  } else if (progress < 0.75) {
    const options = [
      `Secure insurance and finalize compliance documentation for ${firstMarket}`,
      `Develop market entry strategy and identify distribution partners`,
      `Complete customs registration and importer verification processes`,
      `Finalize pricing strategy and promotional materials for ${firstMarket}`
    ];
    return options[monthIndex % options.length];
  } else {
    const options = [
      `Final verification of all export compliance requirements`,
      `Launch marketing campaign targeting ${firstMarket} customers`,
      `Execute first shipment and monitor customs clearance process`,
      `Establish local support and customer service for ${firstMarket}`
    ];
    return options[monthIndex % options.length];
  }
}

export default TimelineCalculator; 
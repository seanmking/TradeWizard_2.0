"use client";

import React, { useState, useEffect } from 'react';
import { processOptimizedQuery } from '../../lib/services/ai/server-actions';

interface ExportVisionStatementProps {
  businessName: string;
  exportMotivation: string;
  targetMarkets: string;
  firstName?: string;
}

const ExportVisionStatement: React.FC<ExportVisionStatementProps> = ({
  businessName,
  exportMotivation,
  targetMarkets,
  firstName
}) => {
  const [visionStatement, setVisionStatement] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateVisionStatement = async () => {
      if (!exportMotivation) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Use AI to generate an inspirational vision statement
        const prompt = `Create an inspiring export vision statement for ${businessName || 'the business'} 
                       based on their motivation: "${exportMotivation}" and 
                       considering their interest in markets: ${targetMarkets || 'global markets'}.
                       
                       The statement should be 3-4 sentences that articulate a compelling vision for their 
                       export future, incorporating their motivation but elevating it into a strategic vision.
                       
                       Make it inspirational, forward-looking, and specific to their business context.
                       Include one clear differentiator and one high-level milestone.
                       
                       Format it as a well-written paragraph without bullet points or headings.`;
        
        const result = await processOptimizedQuery(
          prompt,
          'export_motivation',
        );
        
        setVisionStatement(result.response);
      } catch (error) {
        console.error('Error generating vision statement:', error);
        // Fallback vision statement
        setVisionStatement(`${businessName || 'Your business'} is poised to expand into ${targetMarkets || 'international markets'}, building on your existing strengths and capabilities. By strategically developing your export approach, you can realize your vision of ${exportMotivation?.toLowerCase() || 'growing globally'}.`);
      } finally {
        setIsLoading(false);
      }
    };

    generateVisionStatement();
  }, [businessName, exportMotivation, targetMarkets]);

  if (isLoading) {
    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-sm border border-blue-100">
        <div className="flex items-center space-x-2 mb-2">
          <span className="h-4 w-4 bg-blue-200 rounded-full animate-pulse"></span>
          <h3 className="text-blue-700 font-medium">Crafting Your Export Vision...</h3>
        </div>
        <div className="h-16 bg-gray-100 animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-sm border border-blue-100">
      <div className="flex items-center space-x-2 mb-2">
        <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
        </svg>
        <h3 className="text-blue-700 font-medium">{firstName ? `${firstName}'s` : 'Your'} Export Vision</h3>
      </div>
      
      <p className="text-gray-700 leading-relaxed">
        {visionStatement || `${businessName || 'Your business'} has the potential to expand into international markets, building on your existing capabilities and market knowledge.`}
      </p>
    </div>
  );
};

export default ExportVisionStatement; 
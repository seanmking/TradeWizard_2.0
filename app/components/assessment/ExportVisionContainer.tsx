"use client";

import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Define detailed TypeScript interfaces for our data structure
interface ExportVisionData {
  strengths: string[];
  challenges: string[];
  marketInsights: string[];
  regulatoryInsights: string[];
  competitiveInsights: string[];
}

interface ExportVisionContainerProps {
  aiResponse: string;
  businessName: string;
  isLoading: boolean;
}

// Fallback component when error occurs
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => {
  return (
    <div className="p-4 border border-red-200 rounded-md bg-red-50">
      <h3 className="text-lg font-medium text-red-800 mb-2">
        Something went wrong displaying your export vision
      </h3>
      <p className="text-sm text-red-600 mb-4">
        {process.env.NODE_ENV === 'development' 
          ? `Error: ${error.message}` 
          : 'Our team has been notified of this issue.'}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
      >
        Try Again
      </button>
    </div>
  );
};

const ExportVisionContainer: React.FC<ExportVisionContainerProps> = ({
  aiResponse,
  businessName,
  isLoading
}) => {
  const [parsedData, setParsedData] = useState<ExportVisionData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [formattedContent, setFormattedContent] = useState<string>('');

  // Extract JSON from AI response, handling multiple formats
  const extractJsonFromResponse = (response: string): ExportVisionData | null => {
    // Skip empty responses
    if (!response || response.trim() === '') {
      return null;
    }

    try {
      // First, try parsing the entire response as JSON
      try {
        const parsed = JSON.parse(response);
        if (isValidExportVisionData(parsed)) {
          return parsed;
        }
      } catch (e) {
        // If that fails, try to extract JSON from text
        console.log("Initial parse failed, trying to extract JSON from text");
      }

      // Try to find JSON object pattern in the text
      const jsonMatches = response.match(/(\{[\s\S]*?\})/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // Sort matches by length (largest first) to prioritize complete objects
        const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
        
        for (const match of sortedMatches) {
          try {
            const parsed = JSON.parse(match);
            if (isValidExportVisionData(parsed)) {
              return parsed;
            }
          } catch (e) {
            // Continue to next match
            console.log("Failed to parse JSON match, trying next");
          }
        }
      }

      // If we still don't have valid JSON, try more aggressive extraction
      // Look for array patterns that might contain the data sections
      const extractedData: Partial<ExportVisionData> = {};

      // Helper to extract arrays from text
      const extractArray = (section: string): string[] => {
        const arrayMatch = response.match(new RegExp(`"${section}"\\s*:\\s*(\\[.*?\\])`, 's'));
        if (arrayMatch && arrayMatch[1]) {
          try {
            return JSON.parse(arrayMatch[1]);
          } catch (e) {
            // Try with manual array extraction if JSON parse fails
            const items = arrayMatch[1].match(/"([^"]*)"/g);
            if (items) {
              return items.map(item => item.replace(/"/g, ''));
            }
          }
        }
        return [];
      };

      // Extract each section
      extractedData.strengths = extractArray('strengths');
      extractedData.challenges = extractArray('challenges');
      extractedData.marketInsights = extractArray('marketInsights');
      extractedData.regulatoryInsights = extractArray('regulatoryInsights');
      extractedData.competitiveInsights = extractArray('competitiveInsights');

      // Check if we have at least some data
      if (
        extractedData.strengths?.length || 
        extractedData.challenges?.length || 
        extractedData.marketInsights?.length
      ) {
        return {
          strengths: extractedData.strengths || [],
          challenges: extractedData.challenges || [],
          marketInsights: extractedData.marketInsights || [],
          regulatoryInsights: extractedData.regulatoryInsights || [],
          competitiveInsights: extractedData.competitiveInsights || []
        };
      }

      // If we reach here, we couldn't extract structured data
      return null;
    } catch (error) {
      console.error("Error extracting JSON:", error);
      return null;
    }
  };

  // Type guard to validate the data structure
  const isValidExportVisionData = (data: any): data is ExportVisionData => {
    return (
      data &&
      typeof data === 'object' &&
      (Array.isArray(data.strengths) || 
       Array.isArray(data.challenges) || 
       Array.isArray(data.marketInsights))
    );
  };

  // Format the data sections into readable paragraphs
  const formatDataToParagraphs = (data: ExportVisionData): string => {
    // Create a vision/mission statement instead of a summary
    const businessNameShort = businessName.replace(/\s+/g, ' ').trim();
    
    // Extract product names if they appear in the strengths
    const productNames: string[] = [];
    data.strengths?.forEach(strength => {
      // Look for product mentions in quotes or after possessive form of business name
      const productMatches = strength.match(/"([^"]+)"|'([^']+)'|`([^`]+)`|(?:${businessNameShort}'s|our)\s+([^\s,]+)/gi);
      if (productMatches) {
        productMatches.forEach(match => {
          const clean = match.replace(/["'`]|(?:${businessNameShort}'s|our)\s+/gi, '').trim();
          if (clean.length > 2 && !productNames.includes(clean)) {
            productNames.push(clean);
          }
        });
      }
    });
    
    // Get markets
    const markets = data.marketInsights?.map((m: any) => 
      typeof m === 'string' ? m : m.name || ''
    ).filter(Boolean);
    
    const uniqueMarkets = markets && markets.length > 0 ? 
      Array.from(new Set(markets)).join(', ') : 
      'global markets';
    
    // Create a compelling vision statement
    let vision = '';
    
    // Start with business name and vision
    vision += `${businessNameShort} envisions becoming a recognized leader in `;
    
    // Add product context if available
    if (productNames.length > 0) {
      vision += `${productNames.join(' and ')} exports to ${uniqueMarkets}, `;
    } else {
      vision += `international trade, establishing a strong presence in ${uniqueMarkets}, `;
    }
    
    // Add aspirational element
    vision += `delivering exceptional value to international customers while driving sustainable business growth. `;
    
    // Add commitment statement
    vision += `We are committed to overcoming export challenges through innovation, quality, and strategic partnerships, `;
    
    // Add forward-looking conclusion
    vision += `positioning our business for long-term success in the global marketplace.`;
    
    return vision;
  };

  // Process the response and format content
  useEffect(() => {
    if (isLoading || !aiResponse) {
      return;
    }

    try {
      const extractedData = extractJsonFromResponse(aiResponse);
      
      if (extractedData) {
        setParsedData(extractedData);
        const formatted = formatDataToParagraphs(extractedData);
        setFormattedContent(formatted);
        setParseError(null);
      } else {
        console.warn("Could not extract structured data from response:", aiResponse);
        setParseError("Could not process the export vision data");
        
        // In development, show raw data for debugging
        if (process.env.NODE_ENV === 'development') {
          setFormattedContent(`[DEV MODE] Raw response: ${aiResponse}`);
        } else {
          // In production, provide a graceful fallback
          setFormattedContent(`${businessName} has unique strengths that position it for export success. With the right strategy and preparation, your business can overcome challenges and capitalize on international market opportunities.`);
        }
      }
    } catch (error) {
      console.error("Error processing export vision:", error);
      setParseError(`Error: ${(error as Error).message}`);
      
      // Fallback content
      setFormattedContent(`${businessName} has potential for export growth. Contact our team for a detailed assessment of your international expansion opportunities.`);
    }
  }, [aiResponse, businessName, isLoading]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 rounded-lg bg-white shadow-sm border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
        </div>
      </div>
    );
  }

  // Error state (outside error boundary)
  if (parseError && !formattedContent) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <h3 className="text-lg font-medium text-red-800 mb-2">
          Unable to generate export vision
        </h3>
        <p className="text-sm text-red-600">
          {process.env.NODE_ENV === 'development' ? parseError : 'Please try again later.'}
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => setParseError(null)}>
      <div className="p-5 rounded-lg bg-white shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">
          Export Vision
        </h2>
        
        {formattedContent ? (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-gray-800 leading-relaxed font-medium italic">{formattedContent}</p>
          </div>
        ) : (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-gray-500 italic">
              No export vision data available. Please try generating a new assessment.
            </p>
          </div>
        )}

        {/* Display the structured data sections */}
        {parsedData && (
          <div className="mt-6 space-y-6">
            {/* Strengths Section */}
            {parsedData.strengths && parsedData.strengths.length > 0 && (
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  Key Strengths
                </h3>
                <ul className="bg-green-50 rounded-lg border border-green-100 p-4 space-y-2">
                  {parsedData.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span className="text-gray-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Challenges Section */}
            {parsedData.challenges && parsedData.challenges.length > 0 && (
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 text-amber-500 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                  </svg>
                  Key Challenges
                </h3>
                <ul className="bg-amber-50 rounded-lg border border-amber-100 p-4 space-y-2">
                  {parsedData.challenges.map((challenge, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-amber-500 mr-2">•</span>
                      <span className="text-gray-700">{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Market Insights Section - Card Layout */}
            {parsedData.marketInsights && parsedData.marketInsights.length > 0 && (
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                  </svg>
                  Market Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {parsedData.marketInsights.map((market: any, index) => {
                    const marketName = typeof market === 'string' ? market : market.name || 'Market';
                    const marketDesc = typeof market === 'string' ? '' : (market.description || '');
                    const potential = typeof market === 'string' ? 'medium' : (market.potential || 'medium');
                    
                    return (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-3 bg-blue-50 border-b border-gray-200">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-gray-800">{marketName}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              potential === 'high' ? 'bg-green-100 text-green-800' :
                              potential === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {potential.charAt(0).toUpperCase() + potential.slice(1)} potential
                            </span>
                          </div>
                        </div>
                        <div className="p-3">
                          {marketDesc && <p className="text-sm text-gray-600 mb-2">{marketDesc}</p>}
                          
                          {/* Show relevant regulatory insights for this market */}
                          {parsedData.regulatoryInsights && parsedData.regulatoryInsights.length > 0 && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium text-gray-700 mb-1">Regulatory Considerations:</h5>
                              <p className="text-xs text-gray-600">
                                {parsedData.regulatoryInsights[0]}
                              </p>
                            </div>
                          )}
                          
                          {/* Show relevant competitive insights for this market */}
                          {parsedData.competitiveInsights && parsedData.competitiveInsights.length > 0 && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium text-gray-700 mb-1">Competitive Position:</h5>
                              <p className="text-xs text-gray-600">
                                {parsedData.competitiveInsights[0]}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Regulatory Insights Section */}
            {parsedData.regulatoryInsights && parsedData.regulatoryInsights.length > 1 && (
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
                  </svg>
                  Regulatory Insights
                </h3>
                <ul className="bg-purple-50 rounded-lg border border-purple-100 p-4 space-y-2">
                  {parsedData.regulatoryInsights.slice(1).map((insight, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      <span className="text-gray-700">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Competitive Insights Section */}
            {parsedData.competitiveInsights && parsedData.competitiveInsights.length > 1 && (
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 text-indigo-500 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd"></path>
                  </svg>
                  Competitive Insights
                </h3>
                <ul className="bg-indigo-50 rounded-lg border border-indigo-100 p-4 space-y-2">
                  {parsedData.competitiveInsights.slice(1).map((insight, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-indigo-500 mr-2">•</span>
                      <span className="text-gray-700">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Keep the debug data section for development only */}
        {process.env.NODE_ENV === 'development' && parsedData && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <details>
              <summary className="text-sm text-gray-500 cursor-pointer">
                Debug Data
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(parsedData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default ExportVisionContainer; 
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface CustomerComparison {
  domestic: {
    name: string;
    industry: string;
    description: string;
    logo?: string;
  };
  international: {
    name: string;
    industry: string;
    description: string;
    market: string;
    logo?: string;
  };
  similarityReason: string;
}

interface CustomerComparisonAnalysisProps {
  aiResponse: string;
  businessName: string;
  isLoading?: boolean;
}

const CustomerComparisonAnalysis: React.FC<CustomerComparisonAnalysisProps> = ({
  aiResponse,
  businessName,
  isLoading = false
}) => {
  const [comparisons, setComparisons] = useState<CustomerComparison[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Extract customer comparisons from AI response
  useEffect(() => {
    if (isLoading || !aiResponse) {
      return;
    }

    try {
      // Try to find a JSON object in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      let parsedData: any = null;
      
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error("Failed to parse JSON from match:", e);
        }
      }
      
      // Extract customer comparisons array from the parsed data
      let customerComparisons: any[] = [];
      
      if (parsedData && parsedData.customerComparisons && Array.isArray(parsedData.customerComparisons)) {
        customerComparisons = parsedData.customerComparisons;
      } else if (parsedData && parsedData.customers && Array.isArray(parsedData.customers)) {
        customerComparisons = parsedData.customers;
      } else {
        // Fallback to generate placeholder comparisons if none found
        customerComparisons = createPlaceholderComparisons();
      }
      
      // Format the comparisons
      const formattedComparisons = customerComparisons.map((comparison: any) => {
        const domestic = comparison.domestic || {};
        const international = comparison.international || {};
        
        return {
          domestic: {
            name: domestic.name || 'Local Business',
            industry: domestic.industry || 'Various',
            description: domestic.description || 'A domestic business with similar characteristics',
            logo: domestic.logo || ''
          },
          international: {
            name: international.name || 'International Business',
            industry: international.industry || 'Various',
            description: international.description || 'An international business with similar market position',
            market: international.market || international.country || 'International Market',
            logo: international.logo || ''
          },
          similarityReason: comparison.similarityReason || comparison.reason || 'Similar business model and customer demographics'
        };
      });
      
      setComparisons(formattedComparisons);
      setParseError(null);
    } catch (error) {
      console.error("Error processing customer comparison data:", error);
      setParseError(`Error: ${(error as Error).message}`);
      setComparisons(createPlaceholderComparisons());
    }
  }, [aiResponse, isLoading]);

  // Create placeholder comparisons for testing or when parsing fails
  const createPlaceholderComparisons = (): CustomerComparison[] => {
    return [
      {
        domestic: {
          name: 'Takealot',
          industry: 'E-commerce',
          description: 'South Africa\'s leading online retailer offering a wide range of products',
          logo: '/logos/takealot.png'
        },
        international: {
          name: 'Amazon',
          industry: 'E-commerce',
          description: 'Global e-commerce giant with extensive product offerings',
          market: 'United States, Global',
          logo: '/logos/amazon.png'
        },
        similarityReason: 'Both are dominant e-commerce platforms offering diverse product catalogs with marketplace functionality'
      },
      {
        domestic: {
          name: 'Pick n Pay',
          industry: 'Retail / Grocery',
          description: 'Major South African supermarket chain and retailer',
          logo: '/logos/picknpay.png'
        },
        international: {
          name: 'Tesco',
          industry: 'Retail / Grocery',
          description: 'Major British multinational grocery and merchandise retailer',
          market: 'United Kingdom, Central Europe, Asia',
          logo: '/logos/tesco.png'
        },
        similarityReason: 'Both are established grocery retailers with similar customer demographics and product offerings'
      }
    ];
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-5 rounded-lg bg-white shadow-sm border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 h-32 bg-gray-200 rounded"></div>
              <div className="w-12 flex items-center justify-center self-center">
                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
              </div>
              <div className="flex-1 h-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-lg bg-white shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">
        Customer Comparison Analysis
      </h2>
      
      {comparisons.length > 0 ? (
        <div className="space-y-6">
          <p className="text-sm text-gray-600 mb-4">
            Below are domestic customers that have similarities to international counterparts, 
            helping you understand your potential market approach.
          </p>
          
          {comparisons.map((comparison, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-medium text-gray-800">Comparison {index + 1}</h3>
                <p className="text-sm text-gray-600">{comparison.similarityReason}</p>
              </div>
              
              <div className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  {/* Domestic Customer */}
                  <div className="flex-1 w-full bg-white p-4 rounded-lg border border-gray-200 h-full">
                    <div className="flex items-center mb-3">
                      {comparison.domestic.logo ? (
                        <div className="w-10 h-10 mr-3 relative">
                          <Image 
                            src={comparison.domestic.logo}
                            alt={`${comparison.domestic.name} logo`}
                            width={40}
                            height={40}
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 mr-3 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-500 text-xs font-medium">
                            {comparison.domestic.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-gray-800">{comparison.domestic.name}</h4>
                        <span className="text-xs text-gray-500">
                          {comparison.domestic.industry} • Domestic
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{comparison.domestic.description}</p>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400 transform rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                  
                  {/* International Customer */}
                  <div className="flex-1 w-full bg-white p-4 rounded-lg border border-gray-200 h-full">
                    <div className="flex items-center mb-3">
                      {comparison.international.logo ? (
                        <div className="w-10 h-10 mr-3 relative">
                          <Image 
                            src={comparison.international.logo}
                            alt={`${comparison.international.name} logo`}
                            width={40}
                            height={40}
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 mr-3 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-500 text-xs font-medium">
                            {comparison.international.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-gray-800">{comparison.international.name}</h4>
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500">
                            {comparison.international.industry} • {comparison.international.market}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{comparison.international.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
            <p className="text-sm text-yellow-800">
              <span className="font-medium">Pro tip:</span> These customer comparisons help you understand how your approach
              in the domestic market can be adapted for international markets with similar customer profiles.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500">
          No customer comparisons identified. Try generating a new assessment.
        </div>
      )}
      
      {parseError && process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 border border-red-200 rounded bg-red-50 text-sm text-red-600">
          {parseError}
        </div>
      )}
    </div>
  );
};

export default CustomerComparisonAnalysis; 
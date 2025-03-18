"use client";

import React, { useState, useEffect } from 'react';
import { processOptimizedQuery } from '../../lib/services/ai/server-actions';

interface ComplianceItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  timeToObtain: string; // e.g. "2-3 months"
  market: string;
  category: 'documentation' | 'certification' | 'legal' | 'logistics' | 'financial';
  isFallback?: boolean;
}

interface ComplianceCostCalculatorProps {
  targetMarkets: string;
  businessSize: string;
  productCategories: string[];
  existingCertifications: string[];
  onCostChange?: (cost: number) => void;
}

const ComplianceCostCalculator: React.FC<ComplianceCostCalculatorProps> = ({
  targetMarkets,
  businessSize,
  productCategories,
  existingCertifications = [],
  onCostChange
}) => {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [toggledItems, setToggledItems] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeMarket, setActiveMarket] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTime, setTotalTime] = useState('');

  // Helper to parse markets into an array
  const parseMarkets = (marketsString: string): string[] => {
    return marketsString.split(/,\s*/).map(m => m.trim());
  };

  // Generate compliance items using AI
  useEffect(() => {
    const fetchComplianceItems = async () => {
      try {
        setIsLoading(true);
        setLoadingProgress(10);
        
        const markets = parseMarkets(targetMarkets || 'UAE, USA, UK');
        const firstMarket = markets[0] || 'UAE';
        setActiveMarket(firstMarket);
        
        const allItems: ComplianceItem[] = [];
        
        // Generate compliance items for each market
        for (let i = 0; i < markets.length; i++) {
          const market = markets[i];
          // Update progress based on market index
          setLoadingProgress(Math.min(90, 10 + Math.round(80 * (i / markets.length))));
          
          // Create a prompt for the AI to generate compliance requirements
          const prompt = `
            Generate a comprehensive list of export compliance requirements for a ${businessSize || 'small'} business 
            exporting to ${market}, with the following product categories: ${productCategories.join(', ') || 'general products'}.
            
            For each requirement, provide:
            1. A short name (under 50 characters)
            2. A brief description of what it is and why it's needed (under 100 characters)
            3. Estimated cost in USD
            4. Estimated time to obtain
            5. Category (one of: documentation, certification, legal, logistics, financial)
            
            Format as valid JSON array with the following structure:
            [
              {
                "id": "unique-id-1",
                "name": "Requirement Name",
                "description": "Brief description of the requirement",
                "cost": 1000,
                "timeToObtain": "2-3 months",
                "market": "${market}",
                "category": "documentation"
              }
            ]
            
            Include 5-7 key requirements for ${market}. Make the costs and timeframes realistic.
          `;
          
          // Call AI service to generate compliance items
          const result = await processOptimizedQuery(
            prompt,
            'target_markets',
          );
          
          try {
            // Parse the response as JSON
            // First, clean and pre-process the response to ensure it's valid JSON
            let cleanedResponse = result.response;
            
            // More robust JSON extraction
            try {
              // Try to identify a complete JSON structure ({}), might be embedded in text
              const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                cleanedResponse = jsonMatch[0];
              }
              
              // Alternatively look for array pattern ([])
              const arrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
              if (!jsonMatch && arrayMatch) {
                cleanedResponse = arrayMatch[0];
              }
              
              // Remove any trailing commas before closing brackets (common JSON error)
              cleanedResponse = cleanedResponse.replace(/,(\s*[\]}])/g, '$1');
            } catch (e) {
              console.log("Error pre-processing JSON response:", e);
            }

            // Parse the JSON, with fallback options
            let marketItems;
            
            try {
              marketItems = JSON.parse(cleanedResponse);
            } catch (parseError) {
              console.error(`Initial JSON parse error for ${market}:`, parseError);
              
              // Try to extract just the items array if response includes other fields
              try {
                // Look for array pattern within the response
                const arrayMatch = cleanedResponse.match(/\[\s*\{\s*"id"/);
                if (arrayMatch && arrayMatch.index !== undefined) {
                  // Find the matching array end - count opening and closing brackets
                  let startIndex = arrayMatch.index;
                  let bracketCount = 1;
                  let endIndex = startIndex + 1;
                  
                  while (bracketCount > 0 && endIndex < cleanedResponse.length) {
                    if (cleanedResponse[endIndex] === '[') bracketCount++;
                    if (cleanedResponse[endIndex] === ']') bracketCount--;
                    endIndex++;
                  }
                  
                  if (bracketCount === 0) {
                    const arrayContent = cleanedResponse.substring(startIndex, endIndex);
                    marketItems = JSON.parse(arrayContent);
                  }
                }
              } catch (extractError) {
                console.log("Error extracting array from response:", extractError);
                
                // Last resort: try to create a basic fallback item from text analysis
                marketItems = {
                  id: `${market.toLowerCase()}-fallback-${Date.now()}`,
                  name: `${market} Compliance Requirements`,
                  description: "Generated from incomplete data",
                  cost: 1500,
                  timeToObtain: "3-4 months",
                  market: market,
                  category: "documentation",
                  isFallback: true
                };
              }
            }
            
            // Check if marketItems is an array before spreading
            if (Array.isArray(marketItems)) {
              allItems.push(...marketItems);
            } else if (marketItems && typeof marketItems === 'object') {
              // If it's an object but not an array, it might be a single item or have a different structure
              
              // Check for nested array fields like "items", "requirements", etc.
              const potentialArrayFields = ['items', 'requirements', 'complianceItems', 'certifications', 'documents', 'regulations'];
              
              let foundArray = false;
              for (const field of potentialArrayFields) {
                if (marketItems[field] && Array.isArray(marketItems[field])) {
                  allItems.push(...marketItems[field]);
                  foundArray = true;
                  break;
                }
              }
              
              // If no arrays found in known fields, try any array in the object
              if (!foundArray) {
                const possibleArray = Object.values(marketItems).find(val => Array.isArray(val));
                
                if (possibleArray && Array.isArray(possibleArray)) {
                  allItems.push(...possibleArray);
                } else {
                  // If we can't find an array, create an item from the object itself
                  allItems.push({
                    id: `${market.toLowerCase()}-${Date.now()}`,
                    name: marketItems.name || `Compliance for ${market}`,
                    description: marketItems.description || "Required for market entry",
                    cost: marketItems.cost || 1500,
                    timeToObtain: marketItems.timeToObtain || "3-4 months",
                    market: market,
                    category: marketItems.category || "documentation",
                    isFallback: true
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Error parsing compliance items for ${market}:`, error);
            // Add a fallback item when parsing fails
            allItems.push({
              id: `${market.toLowerCase()}-fallback-${Date.now()}`,
              name: `${market} Compliance Requirements`,
              description: "Standard compliance documentation for market entry",
              cost: 1500,
              timeToObtain: "3-4 months",
              market: market,
              category: "documentation",
              isFallback: true
            });
          }
        }
        
        // Initialize toggled state for the generated items
        const initialToggleState: { [key: string]: boolean } = {};
        allItems.forEach(item => {
          // Safety check for undefined properties before using toLowerCase()
          if (!item) return;
          
          // Check if this compliance item might match an existing certification
          const matchesExistingCertification = existingCertifications.some(cert => {
            // Safety checks for both item.name and cert
            if (!item.name || typeof item.name !== 'string') return false;
            if (!cert || typeof cert !== 'string') return false;
            
            return item.name.toLowerCase().includes(cert.toLowerCase());
          });
          
          if (item.id) {
            initialToggleState[item.id] = matchesExistingCertification;
          }
        });
        
        setComplianceItems(allItems);
        setToggledItems(initialToggleState);
      } catch (error) {
        console.error('Error fetching compliance items:', error);
        // Set fallback compliance items
        setComplianceItems(getFallbackComplianceItems(targetMarkets));
      } finally {
        setLoadingProgress(100);
        // Small delay to show 100% before hiding loader
        setTimeout(() => {
          setIsLoading(false);
          setLoadingProgress(0);
        }, 500);
      }
    };
    
    fetchComplianceItems();
  }, [targetMarkets, businessSize, productCategories, existingCertifications]);
  
  // Calculate total cost and time whenever toggled items change
  useEffect(() => {
    // Filter to active market and items not toggled (items user doesn't have)
    const activeItems = complianceItems.filter(
      item => item.market === activeMarket && !toggledItems[item.id]
    );
    
    // Calculate total cost
    const cost = activeItems.reduce((sum, item) => sum + item.cost, 0);
    setTotalCost(cost);
    
    // Notify parent component about cost change if callback provided
    if (onCostChange) {
      onCostChange(cost);
    }
    
    // Calculate approximate time range
    if (activeItems.length === 0) {
      setTotalTime('0 months');
      return;
    }
    
    // Extract time ranges and find the maximum
    const timeRanges = activeItems.map(item => {
      const matches = item.timeToObtain.match(/(\d+)(?:-(\d+))?\s*(\w+)/);
      if (!matches) return { time: 0, minTime: 0, unit: 'month' };
      
      const minTime = parseInt(matches[1], 10);
      const maxTime = matches[2] ? parseInt(matches[2], 10) : minTime;
      const unit = matches[3].toLowerCase();
      
      // Convert to months for comparison, but keep track of minimum time
      let timeInMonths;
      
      if (unit.includes('week')) {
        timeInMonths = maxTime / 4; // weeks to months
      } else if (unit.includes('day')) {
        timeInMonths = maxTime / 30; // days to months
      } else if (unit.includes('year')) {
        timeInMonths = maxTime * 12; // years to months
      } else {
        timeInMonths = maxTime; // already in months
      }
      
      // Store both minimum and maximum time in months
      return {
        time: timeInMonths,
        minTime: minTime,
        unit: unit
      };
    });
    
    // Find the maximum time and respect minimum timeframes
    if (timeRanges.length > 0) {
      const maxTimeObj = timeRanges.reduce((max, current) => 
        (current.time > max.time) ? current : max);
      
      // Ensure we respect minimum timeframes even with increased investment
      setTotalTime(`${Math.ceil(maxTimeObj.time)} months (minimum ${maxTimeObj.minTime} ${maxTimeObj.unit})`);
    } else {
      setTotalTime('0 months');
    }
    
  }, [complianceItems, toggledItems, activeMarket, onCostChange]);
  
  // Handle toggle change
  const handleToggleChange = (itemId: string) => {
    setToggledItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  // Handle market change
  const handleMarketChange = (market: string) => {
    setActiveMarket(market);
  };
  
  // Get available markets from compliance items
  const markets = Array.from(new Set(complianceItems.map(item => item.market)));
  
  if (isLoading) {
    return (
      <div className="mb-8 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Compliance Requirements</h3>
        <div className="flex flex-col items-center justify-center p-6">
          <div className="relative w-16 h-16 mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">{loadingProgress}%</span>
            </div>
          </div>
          <p className="text-gray-600">Loading compliance data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-8 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h3 className="text-lg font-medium text-gray-800 mb-1">Compliance Requirements</h3>
      <p className="text-gray-500 text-sm mb-4">Toggle items you already have to see your remaining compliance costs</p>
      
      {/* Market selection tabs */}
      <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
        {markets.map((market, index) => (
          <button
            key={`market-tab-${market}-${index}`}
            className={`py-2 px-4 text-sm font-medium ${
              activeMarket === market 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleMarketChange(market)}
          >
            {market}
          </button>
        ))}
      </div>
      
      {/* Total summary */}
      <div className="bg-blue-50 p-3 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-800 font-medium">Estimated Cost</p>
            <p className="text-gray-600 text-sm">Required for {activeMarket}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-blue-800">${totalCost.toLocaleString()}</p>
            <p className="text-sm text-gray-600">{totalTime}</p>
            {totalTime.includes('minimum') && (
              <p className="text-xs text-amber-700 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Some requirements have minimum timeframes
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Compliance items list */}
      <div className="space-y-3">
        {complianceItems
          .filter(item => item.market === activeMarket)
          .map(item => (
            <div 
              key={item.id}
              className={`p-3 rounded-md border transition-all ${
                toggledItems[item.id] 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-1">
                  <input
                    type="checkbox"
                    id={`toggle-${item.id}`}
                    checked={toggledItems[item.id] || false}
                    onChange={() => handleToggleChange(item.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 flex-grow">
                  <label 
                    htmlFor={`toggle-${item.id}`}
                    className="block text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    {item.name}
                    {item.isFallback && (
                      <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        Estimated
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  <div className="flex items-center mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${getCategoryBadgeClass(item.category)}`}>
                      {formatCategory(item.category)}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ${item.cost.toLocaleString()} • {item.timeToObtain}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
      
      {complianceItems.filter(item => item.market === activeMarket).length === 0 && (
        <div className="text-center py-6 text-gray-500">
          No compliance requirements available for {activeMarket}
        </div>
      )}
    </div>
  );
};

// Helper functions for formatting
function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'documentation':
      return 'bg-blue-100 text-blue-800';
    case 'certification':
      return 'bg-green-100 text-green-800';
    case 'legal':
      return 'bg-purple-100 text-purple-800';
    case 'logistics':
      return 'bg-yellow-100 text-yellow-800';
    case 'financial':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Fallback compliance items in case AI generation fails
function getFallbackComplianceItems(targetMarkets: string): ComplianceItem[] {
  const markets = targetMarkets.split(/,\s*/).map(m => m.trim());
  if (markets.length === 0) markets.push('UAE');
  
  const items: ComplianceItem[] = [];
  
  // Add some fallback items for each market
  markets.forEach(market => {
    if (market === 'UAE' || market.includes('UAE')) {
      items.push(
        {
          id: 'uae-1',
          name: 'Certificate of Origin',
          description: 'Document certifying where goods were manufactured',
          cost: 350,
          timeToObtain: '2-3 weeks',
          market: 'UAE',
          category: 'documentation',
          isFallback: true
        },
        {
          id: 'uae-2',
          name: 'Import License',
          description: 'Permission to import goods into the UAE',
          cost: 2500,
          timeToObtain: '1-2 months',
          market: 'UAE',
          category: 'legal',
          isFallback: true
        },
        {
          id: 'uae-3',
          name: 'ESMA Certification',
          description: 'UAE product quality and safety standards',
          cost: 4000,
          timeToObtain: '3-4 months',
          market: 'UAE',
          category: 'certification',
          isFallback: true
        }
      );
    }
    
    if (market === 'USA' || market.includes('USA')) {
      items.push(
        {
          id: 'usa-1',
          name: 'FDA Registration',
          description: 'Required for food, drugs, and cosmetics',
          cost: 3200,
          timeToObtain: '2-3 months',
          market: 'USA',
          category: 'certification',
          isFallback: true
        },
        {
          id: 'usa-2',
          name: 'Import Bond',
          description: 'Financial guarantee for US Customs',
          cost: 500,
          timeToObtain: '2-3 weeks',
          market: 'USA',
          category: 'financial',
          isFallback: true
        },
        {
          id: 'usa-3',
          name: 'ISF Filing',
          description: 'Importer Security Filing for ocean shipments',
          cost: 150,
          timeToObtain: '1 week',
          market: 'USA',
          category: 'logistics',
          isFallback: true
        }
      );
    }
    
    if (market === 'UK' || market.includes('UK')) {
      items.push(
        {
          id: 'uk-1',
          name: 'UKCA Marking',
          description: 'UK Conformity Assessment for product safety',
          cost: 3000,
          timeToObtain: '2-4 months',
          market: 'UK',
          category: 'certification',
          isFallback: true
        },
        {
          id: 'uk-2',
          name: 'VAT Registration',
          description: 'Value Added Tax registration',
          cost: 800,
          timeToObtain: '3-4 weeks',
          market: 'UK',
          category: 'financial',
          isFallback: true
        },
        {
          id: 'uk-3',
          name: 'Import Declaration',
          description: 'Customs documentation for importing goods',
          cost: 250,
          timeToObtain: '1-2 weeks',
          market: 'UK',
          category: 'documentation',
          isFallback: true
        }
      );
    }
  });
  
  return items;
}

export default ComplianceCostCalculator; 
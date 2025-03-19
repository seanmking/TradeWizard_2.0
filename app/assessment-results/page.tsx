"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AssessmentData, calculateScore, loadAssessmentData } from '../lib/services/assessmentService';
import { loadUserAssessmentData } from '../lib/services/transitionService';
// Import MCP and AI services
import { analyzeWebsite as mcpAnalyzeWebsite } from '../lib/services/mcp/actions';
// Import server actions instead of direct integration
import { processOptimizedQuery } from '../lib/services/ai/server-actions';
// Import the new components
import ExportVisionStatement from '../components/assessment/ExportVisionStatement';
import ComplianceCostCalculator from '../components/assessment/ComplianceCostCalculator';
import TimelineCalculator from '../components/assessment/TimelineCalculator';
import ExportProductsSelector from '../components/assessment/ExportProductsSelector';
import CustomerComparisonAnalysis from '../components/assessment/CustomerComparisonAnalysis';

// Define types for our insights
interface Insight {
  type: 'strength' | 'neutral' | 'challenge';
  content: string;
}

interface MarketInsight {
  name: string;
  potential: 'high' | 'medium' | 'low';
  description: string;
}

interface WebsiteAnalysis {
  productCategories?: string[];
  certifications?: string[];
  geographicPresence?: string[];
  businessSize?: 'small' | 'medium' | 'large';
  customerSegments?: string[];
  exportReadiness?: number;
  productDetails?: Array<{
    name: string;
    description: string;
  }>;
}

interface EnhancedAssessmentData extends AssessmentData {
  websiteAnalysis?: WebsiteAnalysis;
  insights?: Insight[];
  marketInsights?: MarketInsight[];
  regulatoryInsights?: string[];
  competitiveInsights?: string[];
}

export default function AssessmentResultsPage() {
  const [assessmentData, setAssessmentData] = useState<EnhancedAssessmentData | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [totalComplianceCost, setTotalComplianceCost] = useState(0);
  const router = useRouter();
  
  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Load assessment data
  useEffect(() => {
    // First try to fetch assessment data from localStorage
    const data = loadAssessmentData();
    
    if (data) {
      setAssessmentData(data);
      setIsLoggedIn(false);
      // Add a small delay to allow for animations
      setTimeout(() => {
        setIsLoaded(true);
      }, 300);
    } else {
      // If no initial assessment data, try to load user assessment data
      const userData = loadUserAssessmentData();
      if (userData) {
        setAssessmentData(userData.data);
        setIsLoggedIn(true);
        // Add a small delay to allow for animations
        setTimeout(() => {
          setIsLoaded(true);
        }, 300);
      } else {
        // Redirect to assessment if no data found in either place
        router.push('/assessment');
      }
    }
  }, [router]);
  
  // Analyze website and generate insights when assessment data is loaded
  useEffect(() => {
    const generateInsights = async () => {
      if (!assessmentData) return;
      
      setIsAnalyzing(true);
      setAnalysisProgress(10); // Start progress
      
      try {
        const enhancedData: EnhancedAssessmentData = { ...assessmentData };
        
        // Check if there's a website URL to analyze
        if (enhancedData.website_url && 
            !enhancedData.website_url.toLowerCase().includes('no') && 
            !enhancedData.website_url.toLowerCase().includes('none')) {
          
          try {
            setAnalysisProgress(25); // Update progress
            console.log(`Analyzing website: ${enhancedData.website_url}`);
            // Call MCP service to analyze website
            const websiteAnalysis = await mcpAnalyzeWebsite(enhancedData.website_url);
            enhancedData.websiteAnalysis = websiteAnalysis;
            setAnalysisProgress(50); // Update progress
          } catch (error) {
            console.error("Error analyzing website:", error);
          }
        } else {
          setAnalysisProgress(50); // Skip to 50% if no website analysis
        }
        
        // Generate insights based on assessment data
        setAnalysisProgress(60); // Update progress
        const generatedInsights = await generateAssessmentInsights(enhancedData);
        setAnalysisProgress(80); // Update progress
        enhancedData.insights = generatedInsights.insights;
        enhancedData.marketInsights = generatedInsights.marketInsights;
        enhancedData.regulatoryInsights = generatedInsights.regulatoryInsights;
        enhancedData.competitiveInsights = generatedInsights.competitiveInsights;
        
        setAnalysisProgress(95); // Almost done
        setAssessmentData(enhancedData);
      } catch (error) {
        console.error("Error generating insights:", error);
      } finally {
        setAnalysisProgress(100); // Complete
        setTimeout(() => {
          setIsAnalyzing(false);
          setAnalysisProgress(0); // Reset progress
        }, 500); // Small delay to show 100%
      }
    };
    
    if (assessmentData && !assessmentData.insights) {
      generateInsights();
    }
  }, [assessmentData]);
  
  // Helper function to generate insights using AI
  const generateAssessmentInsights = async (data: AssessmentData) => {
    // Default insights if AI processing fails
    let defaultInsights = {
      insights: [
        {
          type: 'strength' as const,
          content: 'Your business shows potential for export growth'
        },
        {
          type: 'neutral' as const,
          content: data.export_experience?.toLowerCase().includes('yes') 
            ? 'Your export experience gives you a strong foundation' 
            : 'Your business could benefit from export-readiness assistance'
        }
      ],
      marketInsights: [
        {
          name: data.target_markets || 'International Markets',
          potential: 'medium' as const,
          description: 'Based on your business profile, we\'ve identified potential export markets that match your products and capabilities.'
        }
      ],
      regulatoryInsights: [
        'Your business may need to address key compliance requirements before entering international markets.'
      ],
      competitiveInsights: [
        'Your product\'s unique features position you well against international competition in selected markets.'
      ]
    };
    
    try {
      // Try to generate insights with AI
      const businessType = determineBusinessType(data);
      const businessSize = determineBusinessSize(data);
      const exportReadiness = calculateScore(data);
      
      // Create a prompt for the AI to analyze
      const prompt = `
        Generate detailed and specific export readiness insights for a ${businessSize} ${businessType} business.
        
        BUSINESS DETAILS:
        - Business name: ${data.business_name}
        - Export experience: ${data.export_experience}
        - Export motivation: ${data.export_motivation}
        - Selected markets for analysis: ${data.target_markets || "None"}
        - Export readiness score: ${exportReadiness}
        ${data.productCategories ? `- Product categories: ${data.productCategories.join(', ')}` : ''}
        ${data.websiteUrl ? `- Website: ${data.websiteUrl}` : ''}
        
        REQUIREMENTS:
        Create HIGHLY SPECIFIC insights with product and market information. Avoid generic statements. Each insight should:
        1. Include specific product names/categories when mentioned (use "${data.business_name}'s [product type]" format)
        2. ONLY analyze markets the user selected (${data.target_markets || "None"}) - do NOT include other markets
        3. Include market-specific data and trends that impact this business type
        4. For challenges, explain WHY each challenge is relevant and its specific impact
        
        Example of good specificity:
        - Instead of "High-quality products" say "${data.business_name}'s [specific products] appeal to [specific market] due to [specific reason]"
        - Instead of "Regulatory challenges" say "Navigating [specific regulation] in [specific market] requires [specific action]"
        
        Provide the following insights ONLY for the selected markets (${data.target_markets || "None"}):
        1. Key strengths (at least 3) for export readiness - be specific about products and markets
        2. Key challenges (at least 3) for export readiness - explain why each is a challenge
        3. Specific market opportunities for the selected markets with data-driven reasons
        4. Detailed regulatory considerations for each selected market with specific regulations
        5. Competitive positioning analysis against competitors in selected markets
        
        ${data.target_markets === "None selected" ? "The user did not select any specific markets. Provide general export readiness insights without focusing on specific markets." : ""}
        
        Format as JSON with keys: strengths, challenges, marketInsights, regulatoryInsights, competitiveInsights
      `;
      
      // Use AI service to process the prompt
      try {
        const { response } = await processOptimizedQuery(prompt, 'summary');
        
        // Parse the AI response
        const aiInsights = extractJsonFromAiResponse(response);
        
        if (aiInsights) {
          // Transform AI insights into our format
          return {
            insights: [
              ...(aiInsights.strengths || []).map((strength: string) => ({ 
                type: 'strength' as const, 
                content: strength 
              })),
              ...(aiInsights.challenges || []).map((challenge: string) => ({ 
                type: 'challenge' as const, 
                content: challenge 
              })),
            ],
            marketInsights: aiInsights.marketInsights || defaultInsights.marketInsights,
            regulatoryInsights: aiInsights.regulatoryInsights || defaultInsights.regulatoryInsights,
            competitiveInsights: aiInsights.competitiveInsights || defaultInsights.competitiveInsights
          };
        }
      } catch (error) {
        console.error("Error processing AI query:", error);
      }
      
      // Fall back to default insights if AI processing fails
      return defaultInsights;
    } catch (error) {
      console.error("Error in generateAssessmentInsights:", error);
      return defaultInsights;
    }
  };
  
  // Helper functions
  const determineBusinessType = (data: AssessmentData): string => {
    // Extract business type from assessment data
    const description = [
      data.business_name,
      data.export_motivation,
      data.export_experience,
      data.target_markets
    ].join(' ').toLowerCase();
    
    if (description.includes('food') || description.includes('restaurant') || description.includes('catering')) {
      return 'food';
    } else if (description.includes('tech') || description.includes('software') || description.includes('digital')) {
      return 'technology';
    } else if (description.includes('manufacture') || description.includes('production') || description.includes('factory')) {
      return 'manufacturing';
    } else {
      return 'general';
    }
  };
  
  const determineBusinessSize = (data: AssessmentData): string => {
    if (data.websiteAnalysis?.businessSize) {
      return data.websiteAnalysis.businessSize;
    }
    return 'small to medium';
  };
  
  const extractJsonFromAiResponse = (response: string) => {
    try {
      // First, try to parse the entire response as JSON directly
      try {
        return JSON.parse(response);
      } catch (e) {
        // If that fails, try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*?\}/g);
        if (jsonMatch && jsonMatch.length > 0) {
          // Try each matched JSON block, starting with the largest
          const sortedMatches = jsonMatch.sort((a, b) => b.length - a.length);
          
          for (const match of sortedMatches) {
            try {
              const parsed = JSON.parse(match);
              // Verify it has the expected properties
              if (parsed.strengths || parsed.challenges) {
                return parsed;
              }
            } catch (e) {
              // Continue to next match
              console.log("Failed to parse JSON match:", match.substring(0, 100) + "...");
            }
          }
        }
      }
      
      // If all parsing attempts fail, extract key sections manually
      console.log("Trying manual extraction of insights from text...");
      const strengths = extractListSection(response, "strengths", "strength");
      const challenges = extractListSection(response, "challenges", "challenge");
      const marketInsights = extractListSection(response, "market", "opportunity");
      const regulatoryInsights = extractListSection(response, "regulatory", "regulation");
      const competitiveInsights = extractListSection(response, "competitive", "competition");
      
      if (strengths.length > 0 || challenges.length > 0) {
        return {
          strengths,
          challenges,
          marketInsights: marketInsights.map(text => ({
            name: extractMarketName(text) || assessmentData?.target_markets || "International Markets",
            potential: determineMarketPotential(text),
            description: text
          })),
          regulatoryInsights,
          competitiveInsights
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting JSON from AI response:", error);
      return null;
    }
  };
  
  // Helper function to extract list items from text sections
  const extractListSection = (text: string, sectionKeyword: string, alternativeKeyword: string): string[] => {
    const lines = text.split('\n');
    const results: string[] = [];
    let inSection = false;
    
    for (const line of lines) {
      const normalizedLine = line.trim().toLowerCase();
      
      // Check if this line starts a relevant section
      if (normalizedLine.includes(sectionKeyword) || normalizedLine.includes(alternativeKeyword)) {
        inSection = true;
        continue;
      }
      
      // Check if we're entering a new section
      if (inSection && (normalizedLine.startsWith('#') || normalizedLine.endsWith(':'))) {
        inSection = false;
      }
      
      // Extract bullet points or numbered items in the section
      if (inSection && (line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+\./.test(line.trim()))) {
        const content = line.trim().replace(/^[-•\d\.]+\s*/, '').trim();
        if (content.length > 0) {
          results.push(content);
        }
      }
    }
    
    return results;
  };
  
  // Extract market name from a string
  const extractMarketName = (text: string): string | null => {
    // Only look for our supported markets
    const marketMatches = text.match(/\b(UAE|USA|UK|United States|United Kingdom|United Arab Emirates)\b/gi);
    return marketMatches && marketMatches.length > 0 ? marketMatches[0] : null;
  };
  
  // Determine market potential from text
  const determineMarketPotential = (text: string): 'high' | 'medium' | 'low' => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('high potential') || lowerText.includes('strong opportunity') || lowerText.includes('excellent')) {
      return 'high';
    } else if (lowerText.includes('low potential') || lowerText.includes('limited opportunity') || lowerText.includes('challenging')) {
      return 'low';
    }
    return 'medium';
  };
  
  // Extract key opportunity phrases from a market description
  const extractKeyOpportunities = (description: string): string[] => {
    const keywords = [
      'opportunity', 'potential', 'demand', 'growth', 'market', 
      'trend', 'consumer', 'preference', 'popular', 'increasing'
    ];
    
    // First try to find phrases containing keywords
    const words = description.split(' ');
    const phrases: string[] = [];
    
    // Look for 2-4 word phrases containing keywords
    for (let i = 0; i < words.length; i++) {
      for (const keyword of keywords) {
        if (words[i].toLowerCase().includes(keyword)) {
          // Extract phrases of different lengths
          for (let length = 2; length <= 4; length++) {
            if (i - length + 1 >= 0) {
              const phrase = words.slice(i - length + 1, i + 1).join(' ');
              if (phrase.length > 8 && phrase.length < 30) {
                phrases.push(phrase);
              }
            }
          }
        }
      }
    }
    
    // If we found phrases, return the first 2-3 unique ones
    if (phrases.length > 0) {
      return Array.from(new Set(phrases)).slice(0, 3);
    }
    
    // Fallback: return default opportunities based on market potential
    return ['Growing market', 'Export opportunity'];
  };
  
  if (!assessmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your assessment results...</p>
        </div>
      </div>
    );
  }
  
  const score = calculateScore(assessmentData);
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className={`bg-white rounded-xl shadow-md overflow-hidden ${isLoaded ? 'animate-fade-in' : 'opacity-0'}`}>
          {/* Header section */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-6 sm:px-10 sm:py-8">
            <div className="flex flex-col sm:flex-row items-center">
              <div className={`mb-6 sm:mb-0 sm:mr-8 flex-shrink-0 ${isLoaded ? 'animate-slide-in-left' : ''}`}>
                {/* Circular score indicator */}
                <div className={`score-circle ${isMobile ? 'w-24 h-24' : 'w-32 h-32'}`}>
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      fill="none" 
                      stroke="#60A5FA" 
                      strokeWidth="10" 
                    />
                    {/* Progress circle - calculated based on score */}
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="10" 
                      strokeDasharray={`${2 * Math.PI * 45 * score / 100} ${2 * Math.PI * 45 * (1 - score / 100)}`}
                      strokeDashoffset={2 * Math.PI * 45 * 0.25} // Start from top
                      transform="rotate(-90 50 50)"
                      className={isLoaded ? 'animate-score-fill' : ''}
                      style={{
                        transition: 'stroke-dasharray 1.5s ease-in-out',
                        strokeDasharray: isLoaded ? `${2 * Math.PI * 45 * score / 100} ${2 * Math.PI * 45 * (1 - score / 100)}` : '0 283'
                      }}
                    />
                    <text 
                      x="50" 
                      y="50" 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}
                      fill="white"
                    >
                      {score}%
                    </text>
                  </svg>
                </div>
              </div>
              
              <div className={`text-center sm:text-left ${isLoaded ? 'animate-slide-in-right' : ''}`}>
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  {assessmentData.business_name ? `${assessmentData.business_name}'s Export Readiness` : 'Your Export Readiness'}
                </h1>
                <p className="text-blue-100 mb-4 text-sm sm:text-base">
                  Based on your responses, we've calculated your initial export readiness score.
                </p>
                <div className="inline-block bg-blue-400 bg-opacity-30 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm">
                  {isLoggedIn ? 'Complete Assessment' : 'Preliminary Assessment'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Results content */}
          <div className="px-4 py-6 sm:px-10 sm:py-8">
            {isAnalyzing ? (
              <div className="my-8 text-center">
                <div className="relative mx-auto mb-4 w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-700">{analysisProgress}%</span>
                  </div>
                </div>
                <p className="text-gray-600">Analyzing your business profile...</p>
              </div>
            ) : (
              <>
                {/* Section 1: Export Vision Summary - Concise 3-4 sentence summary */}
                {assessmentData && (
                  <div className="mb-6">
                    {/* Vision Statement */}
                    <ExportVisionStatement
                      businessName={assessmentData.business_name || ''}
                      exportMotivation={assessmentData.export_motivation || ''}
                      targetMarkets={Array.isArray(assessmentData.target_markets) 
                        ? assessmentData.target_markets.join(', ')
                        : assessmentData.target_markets || ''}
                      firstName={assessmentData.first_name}
                    />
                    
                    {/* Market Analysis Section */}
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Market Analysis & Insights</h3>
                      <div className="space-y-6">
                        {/* Strengths Section */}
                        {assessmentData.insights && assessmentData.insights.filter(i => i.type === 'strength').length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-green-100">
                            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Key Strengths
                            </h4>
                            <ul className="space-y-2">
                              {(assessmentData.insights || [])
                                .filter(i => i.type === 'strength')
                                .map((strength, index) => (
                                  <li key={index} className="flex items-start text-gray-700">
                                    <span className="text-green-500 mr-2">•</span>
                                    {strength.content}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}

                        {/* Market Insights Section */}
                        {assessmentData.marketInsights && assessmentData.marketInsights.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-blue-100">
                            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                              <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              Target Markets
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(assessmentData.marketInsights || []).map((market, index) => {
                                const marketData: MarketInsight = typeof market === 'string' 
                                  ? { 
                                      name: market,
                                      potential: 'medium',
                                      description: `Market opportunity in ${market}`
                                    }
                                  : market as MarketInsight;
                                
                                return (
                                  <div key={index} className="bg-blue-50 rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-2">
                                      <h5 className="font-medium text-gray-800">{marketData.name}</h5>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        marketData.potential === 'high' ? 'bg-green-100 text-green-800' :
                                        marketData.potential === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {marketData.potential.charAt(0).toUpperCase() + marketData.potential.slice(1)} potential
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600">{marketData.description}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Challenges Section */}
                        {assessmentData.insights && assessmentData.insights.filter(i => i.type === 'challenge').length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-amber-100">
                            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                              <svg className="w-5 h-5 text-amber-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Key Challenges
                            </h4>
                            <ul className="space-y-2">
                              {(assessmentData.insights || [])
                                .filter(i => i.type === 'challenge')
                                .map((challenge, index) => (
                                  <li key={index} className="flex items-start text-gray-700">
                                    <span className="text-amber-500 mr-2">•</span>
                                    {challenge.content}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Section 2: Core Products for Export Opportunity */}
                {assessmentData && (
                  <div className="mb-6">
                    <ExportProductsSelector
                      aiResponse={JSON.stringify({
                        coreProducts: assessmentData.websiteAnalysis?.productDetails ? 
                          // Use real product data from websiteAnalysis if available
                          assessmentData.websiteAnalysis.productDetails.map((product: { name: string; description: string }, index: number) => ({
                            id: `product-${index + 1}`,
                            name: product.name,
                            description: product.description,
                            // Assign potential based on position or other factors
                            potential: index === 0 ? 'high' : 'medium'
                          }))
                          :
                          // Fallback to generic products if no real products found
                          [
                            {
                              id: 'product-1',
                              name: `${assessmentData.business_name} Primary Product`,
                              description: assessmentData.business_description?.split('. ')[0] || 'Main product with export potential',
                              potential: 'high'
                            },
                            {
                              id: 'product-2',
                              name: `${assessmentData.business_name} Secondary Product`,
                              description: 'Complementary offering for international markets',
                              potential: 'medium'
                            },
                            {
                              id: 'product-3',
                              name: `${assessmentData.business_name} Service Line`,
                              description: 'Supporting service with specialized appeal',
                              potential: 'medium'
                            }
                          ]
                      })}
                      businessName={assessmentData.business_name || ''}
                      isLoading={isAnalyzing}
                    />
                  </div>
                )}
                
                {/* Section 3: Customer Comparison Analysis */}
                {assessmentData && (
                  <div className="mb-6">
                    <CustomerComparisonAnalysis
                      aiResponse={JSON.stringify({
                        customerComparisons: [
                          {
                            domestic: {
                              name: 'Pick n Pay',
                              industry: 'Retail',
                              description: 'Major South African supermarket chain'
                            },
                            international: {
                              name: 'Tesco',
                              industry: 'Retail',
                              market: 'United Kingdom',
                              description: 'Major British supermarket chain with international presence'
                            },
                            similarityReason: 'Similar retail operations, product mix, and customer demographics'
                          },
                          {
                            domestic: {
                              name: 'Takealot',
                              industry: 'E-commerce',
                              description: 'Leading online retailer in South Africa'
                            },
                            international: {
                              name: 'Amazon',
                              industry: 'E-commerce',
                              market: 'United States, Global',
                              description: 'Global e-commerce giant with extensive product offerings'
                            },
                            similarityReason: 'Both focus on e-commerce with marketplace functionality and logistics networks'
                          }
                        ]
                      })}
                      businessName={assessmentData.business_name || ''}
                      isLoading={isAnalyzing}
                    />
                  </div>
                )}

                {/* Target Markets and Countries (moved from detailed section to here for better visibility) */}
                {assessmentData && assessmentData.targetCountries && assessmentData.targetCountries.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-md sm:text-lg font-medium text-gray-800 mb-4">Target Export Markets</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {assessmentData.targetCountries.map((country: any, index: number) => (
                        <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-center mb-2">
                            <span className="text-md font-medium text-gray-800">{country.name}</span>
                            {country.preferentialAccess && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                Preferential Access
                              </span>
                            )}
                          </div>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {country.benefits && country.benefits.map((benefit: string, bidx: number) => (
                              <li key={bidx} className="flex items-start">
                                <span className="text-green-500 mr-1.5">✓</span> {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual separator between new top sections and original content */}
                <div className="my-8 relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-gray-50 text-sm text-gray-500">Detailed Assessment</span>
                  </div>
                </div>

                {/* Existing sections - now below the new sections */}
                <div className="mb-8 sm:mb-10">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Key Insights</h2>
                  
                  <div className="space-y-3 sm:space-y-4">
                    {/* Dynamically generated insights */}
                    {assessmentData.insights?.map((insight, index) => (
                      <div 
                        key={index} 
                        className={`insight-card ${
                          insight.type === 'strength' ? 'insight-strength' : 
                          insight.type === 'challenge' ? 'insight-challenge' : 'insight-neutral'
                        } ${isLoaded ? 'animate-fade-in' : ''}`} 
                        style={{ animationDelay: `${0.2 + (index * 0.2)}s` }}
                      >
                        <div className="flex">
                          <div className="flex-shrink-0">
                            {insight.type === 'strength' ? (
                              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : insight.type === 'challenge' ? (
                              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-3 flex-1">
                            <p className={`text-sm ${
                              insight.type === 'strength' ? 'text-green-800 font-medium' : 
                              insight.type === 'challenge' ? 'text-red-800 font-medium' : 'text-blue-800 font-medium'
                            }`}>
                              <span className="font-semibold">
                                {insight.type === 'strength' ? 'Strength:' : 
                                 insight.type === 'challenge' ? 'Challenge:' : 'Insight:'}
                              </span> {insight.content}
                            </p>
                            
                            {/* If the content is long enough, it might contain key information we want to highlight */}
                            {insight.content && insight.content.length > 100 && (
                              <div className="mt-2 text-xs text-gray-600">
                                {insight.type === 'strength' && (
                                  <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full mr-2 mb-1">
                                    Opportunity
                                  </span>
                                )}
                                {insight.type === 'challenge' && (
                                  <span className="inline-block bg-amber-100 text-amber-800 px-2 py-1 rounded-full mr-2 mb-1">
                                    Action needed
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Blurred additional insights or full content based on login status */}
                <div className="mb-8 sm:mb-10">
                  <h3 className="text-md sm:text-lg font-medium text-gray-800 mb-4">Additional Insights</h3>
                  
                  <div className="space-y-4 relative">
                    {!isLoggedIn ? (
                      <>
                        {/* Blurred content for non-registered users */}
                        <div className="filter blur-sm opacity-70 pointer-events-none">
                          <div className="bg-gray-50 p-4 rounded">
                            <h4 className="font-medium text-gray-800">Market Opportunity Analysis</h4>
                            <p className="text-gray-600 text-sm sm:text-base">Based on your business profile, we've identified high-potential export markets that match your products and capabilities.</p>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded mt-4">
                            <h4 className="font-medium text-gray-800">Regulatory Readiness</h4>
                            <p className="text-gray-600 text-sm sm:text-base">Your business may need to address key compliance requirements before entering international markets.</p>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded mt-4">
                            <h4 className="font-medium text-gray-800">Competitive Positioning</h4>
                            <p className="text-gray-600 text-sm sm:text-base">Your product's unique features position you well against international competition in selected markets.</p>
                          </div>
                        </div>
                        
                        {/* Overlay with CTA */}
                        <div className={`absolute inset-0 flex items-center justify-center bg-white bg-opacity-60 rounded ${isLoaded ? 'animate-fade-in' : ''}`} style={{ animationDelay: '0.6s' }}>
                          <div className="text-center p-4 sm:p-6">
                            <p className="text-gray-800 font-medium mb-4 text-sm sm:text-base">
                              Register for a free account to unlock your complete assessment
                            </p>
                            <Link href="/register">
                              <span className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm sm:text-base animate-ping-slow">
                                Create Free Account
                              </span>
                            </Link>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Full content for logged-in users  
                      <>
                        <div className="bg-gray-50 p-4 rounded">
                          <h4 className="font-medium text-gray-800">Market Opportunity Analysis</h4>
                          <p className="text-gray-600 text-sm sm:text-base mb-3">
                            {assessmentData.marketInsights?.[0]?.description || 
                              "Based on your business profile, we've identified high-potential export markets that match your products and capabilities."}
                          </p>
                          
                          {assessmentData.marketInsights && assessmentData.marketInsights.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {assessmentData.marketInsights.map((market: any, index: number) => (
                                <div key={index} className="border-l-4 border-blue-400 pl-3 py-2">
                                  <p className="text-sm font-medium text-gray-700">
                                    {market.name} 
                                    <span className={`inline-block ml-2 px-2 py-0.5 rounded-full text-xs ${
                                      market.potential === 'high' ? 'bg-green-100 text-green-800' :
                                      market.potential === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {market.potential} potential
                                    </span>
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">{market.description}</p>
                                  
                                  {/* Extract key market opportunities from the description */}
                                  {market.description && market.description.length > 50 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {extractKeyOpportunities(market.description).map((opportunity: string, i: number) => (
                                        <span key={i} className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                                          {opportunity}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded mt-4">
                          <h4 className="font-medium text-gray-800">Regulatory Readiness</h4>
                          {assessmentData.regulatoryInsights?.map((insight: string, index: number) => (
                            <p key={index} className="text-gray-600 text-sm sm:text-base mt-1">
                              • {insight}
                            </p>
                          ))}
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded mt-4">
                          <h4 className="font-medium text-gray-800">Competitive Positioning</h4>
                          {assessmentData.competitiveInsights?.map((insight: string, index: number) => (
                            <p key={index} className="text-gray-600 text-sm sm:text-base mt-1">
                              • {insight}
                            </p>
                          ))}
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded mt-4">
                          <h4 className="font-medium text-gray-800">Target Market Analysis: {assessmentData.target_markets}</h4>
                          <p className="text-gray-600 text-sm sm:text-base">Our analysis suggests strong potential in these markets based on your product type and business goals.</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Interactive Compliance and Timeline Section */}
                {isLoggedIn ? (
                  <div className="mb-8">
                    <h3 className="text-md sm:text-lg font-medium text-gray-800 mb-4">Export Readiness Planning</h3>
                    
                    {/* Note: Export Products Selector and Customer Comparison Analysis 
                        have been moved to the top of the page for better UX */}
                    
                    {/* Compliance Cost Calculator */}
                    {assessmentData && (
                      <ComplianceCostCalculator
                        targetMarkets={assessmentData.target_markets || 'UAE, USA, UK'}
                        businessSize={assessmentData.websiteAnalysis?.businessSize || 'small'}
                        productCategories={assessmentData.websiteAnalysis?.productCategories || []}
                        existingCertifications={assessmentData.websiteAnalysis?.certifications || []}
                        onCostChange={setTotalComplianceCost}
                      />
                    )}
                    
                    {/* Timeline Calculator */}
                    {assessmentData && (
                      <TimelineCalculator
                        totalComplianceCost={totalComplianceCost}
                        targetMarkets={assessmentData.target_markets || 'global markets'}
                        exportMotivation={assessmentData.export_motivation || ''}
                      />
                    )}
                  </div>
                ) : (
                  <div className="mb-8 bg-white rounded-lg shadow-sm p-4 border border-gray-200 relative">
                    <div className="filter blur-sm opacity-70 pointer-events-none">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Export Readiness Planning</h3>
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <div className="h-20"></div>
                      </div>
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-12 bg-gray-50 rounded"></div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Overlay with CTA */}
                    <div className={`absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded ${isLoaded ? 'animate-fade-in' : ''}`} style={{ animationDelay: '0.5s' }}>
                      <div className="text-center p-4 sm:p-6">
                        <p className="text-gray-800 font-medium mb-4 text-sm sm:text-base">
                          Register for a free account to access interactive export planning tools
                        </p>
                        <Link href="/register">
                          <span className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm sm:text-base">
                            Create Free Account
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Path forward visualization */}
                <div>
                  <h3 className="text-md sm:text-lg font-medium text-gray-800 mb-4">Your Export Journey</h3>
                  
                  <div className="relative">
                    {/* Steps timeline */}
                    <div className="hidden sm:block absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gray-200"></div>
                    
                    <div className="space-y-8 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6">
                      {/* Step 1 - Completed */}
                      <div className={`sm:col-start-1 ${isLoaded ? 'animate-fade-in' : ''}`} style={{ animationDelay: '0.8s' }}>
                        <div className="flex items-center sm:items-end sm:flex-col">
                          <div className="mr-4 sm:mr-0 sm:mb-3">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-500 text-white">
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          </div>
                          <div className="sm:text-right">
                            <h4 className="text-md font-medium text-blue-800">Initial Assessment</h4>
                            <p className="text-xs sm:text-sm text-gray-600">Completed</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Step 2 - Current or Completed based on login status */}
                      <div className={`sm:col-start-2 ${isLoaded ? 'animate-fade-in' : ''}`} style={{ animationDelay: '1s' }}>
                        <div className="flex items-center sm:items-start sm:flex-col">
                          <div className="mr-4 sm:mr-0 sm:ml-6 sm:mb-3">
                            {isLoggedIn ? (
                              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-500 text-white">
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-blue-500 bg-white text-blue-500">
                                <span className="font-medium">2</span>
                              </span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-md font-medium text-gray-800">Create Account</h4>
                            <p className="text-xs sm:text-sm text-gray-600">{isLoggedIn ? 'Completed' : 'To access your full assessment'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Step 3 - Future or Current based on login status */}
                      <div className={`sm:col-start-1 ${isLoaded ? 'animate-fade-in' : ''}`} style={{ animationDelay: '1.2s' }}>
                        <div className="flex items-center sm:items-end sm:flex-col">
                          <div className="mr-4 sm:mr-0 sm:mb-3">
                            <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full border-2 ${isLoggedIn ? 'border-blue-500 bg-white text-blue-500' : 'border-gray-300 bg-white text-gray-400'}`}>
                              <span className="font-medium">3</span>
                            </span>
                          </div>
                          <div className="sm:text-right">
                            <h4 className={`text-md font-medium ${isLoggedIn ? 'text-gray-800' : 'text-gray-500'}`}>In-Depth Assessment</h4>
                            <p className={`text-xs sm:text-sm ${isLoggedIn ? 'text-gray-600' : 'text-gray-500'}`}>Personalized analysis</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Step 4 - Future */}
                      <div className={`sm:col-start-2 ${isLoaded ? 'animate-fade-in' : ''}`} style={{ animationDelay: '1.4s' }}>
                        <div className="flex items-center sm:items-start sm:flex-col">
                          <div className="mr-4 sm:mr-0 sm:ml-6 sm:mb-3">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-gray-300 bg-white text-gray-400">
                              <span className="font-medium">4</span>
                            </span>
                          </div>
                          <div>
                            <h4 className="text-md font-medium text-gray-500">Action Plan</h4>
                            <p className="text-xs sm:text-sm text-gray-500">Custom export roadmap</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Footer section */}
            <div className="bg-gray-50 border-t border-gray-100 p-4 sm:px-10 sm:py-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <div className="mb-4 sm:mb-0">
                  <p className="text-gray-600 text-xs sm:text-sm">
                    This is a preliminary assessment based on limited information.
                    <br className="hidden sm:inline" />
                    {isLoggedIn 
                      ? "For a comprehensive export readiness plan, complete your profile."
                      : "Sign in or create an account to access your full assessment."}
                  </p>
                </div>
                
                <div>
                  {isLoggedIn ? (
                    <Link href="/profile">
                      <span className="inline-block w-full sm:w-auto text-center px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm">
                        Complete Your Profile
                      </span>
                    </Link>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href="/login">
                        <span className="inline-block w-full sm:w-auto text-center px-4 py-2 bg-white border border-blue-500 text-blue-500 font-medium rounded-lg hover:bg-blue-50 transition-colors duration-200 text-sm">
                          Sign In
                        </span>
                      </Link>
                      <Link href="/register">
                        <span className="inline-block w-full sm:w-auto text-center px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm">
                          Create Account
                        </span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
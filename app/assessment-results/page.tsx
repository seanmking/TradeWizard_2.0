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
      
      try {
        const enhancedData: EnhancedAssessmentData = { ...assessmentData };
        
        // Check if there's a website URL to analyze
        if (enhancedData.website_url && 
            !enhancedData.website_url.toLowerCase().includes('no') && 
            !enhancedData.website_url.toLowerCase().includes('none')) {
          
          try {
            console.log(`Analyzing website: ${enhancedData.website_url}`);
            // Call MCP service to analyze website
            const websiteAnalysis = await mcpAnalyzeWebsite(enhancedData.website_url);
            enhancedData.websiteAnalysis = websiteAnalysis;
          } catch (error) {
            console.error("Error analyzing website:", error);
          }
        }
        
        // Generate insights based on assessment data
        const generatedInsights = await generateAssessmentInsights(enhancedData);
        enhancedData.insights = generatedInsights.insights;
        enhancedData.marketInsights = generatedInsights.marketInsights;
        enhancedData.regulatoryInsights = generatedInsights.regulatoryInsights;
        enhancedData.competitiveInsights = generatedInsights.competitiveInsights;
        
        setAssessmentData(enhancedData);
      } catch (error) {
        console.error("Error generating insights:", error);
      } finally {
        setIsAnalyzing(false);
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
        Generate export readiness insights for a ${businessSize} ${businessType} business.
        Business name: ${data.business_name}
        Export experience: ${data.export_experience}
        Export motivation: ${data.export_motivation}
        Target markets: ${data.target_markets}
        Export readiness score: ${exportReadiness}
        
        Provide the following insights:
        1. Key strengths and challenges for export readiness
        2. Specific market opportunities for ${data.target_markets || "international markets"}
        3. Regulatory considerations for ${data.target_markets || "export markets"}
        4. Competitive positioning analysis
        
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
      // Try to find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error("Error extracting JSON from AI response:", error);
      return null;
    }
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Analyzing your business profile and generating insights...</p>
              </div>
            ) : (
              <>
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
                          <div className="ml-3">
                            <p className={`text-sm ${
                              insight.type === 'strength' ? 'text-green-800' : 
                              insight.type === 'challenge' ? 'text-red-800' : 'text-blue-800'
                            }`}>
                              <span className="font-medium">
                                {insight.type === 'strength' ? 'Strength:' : 
                                 insight.type === 'challenge' ? 'Challenge:' : 'Insight:'}
                              </span> {insight.content}
                            </p>
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
                              {assessmentData.marketInsights.map((market, index) => (
                                <div key={index} className="border-l-4 border-blue-400 pl-3 py-1">
                                  <p className="text-sm font-medium text-gray-700">{market.name} <span className={`inline-block ml-2 px-2 py-0.5 rounded-full text-xs ${
                                    market.potential === 'high' ? 'bg-green-100 text-green-800' :
                                    market.potential === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>{market.potential} potential</span></p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded mt-4">
                          <h4 className="font-medium text-gray-800">Regulatory Readiness</h4>
                          {assessmentData.regulatoryInsights?.map((insight, index) => (
                            <p key={index} className="text-gray-600 text-sm sm:text-base mt-1">
                              • {insight}
                            </p>
                          ))}
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded mt-4">
                          <h4 className="font-medium text-gray-800">Competitive Positioning</h4>
                          {assessmentData.competitiveInsights?.map((insight, index) => (
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
              </>
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
          </div>
          
          {/* Footer section */}
          <div className="bg-gray-50 border-t border-gray-100 p-4 sm:px-10 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div className="mb-4 sm:mb-0">
                <p className="text-gray-600 text-xs sm:text-sm">
                  This is a preliminary assessment based on limited information.
                  <br className="hidden sm:inline" />
                  For a comprehensive export readiness plan, complete your profile.
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
                  <Link href="/register">
                    <span className="inline-block w-full sm:w-auto text-center px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm">
                      Continue to Full Assessment
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
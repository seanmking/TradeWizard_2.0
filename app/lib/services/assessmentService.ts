/**
 * Assessment Service
 * Handles the flow of questions, validation, and data extraction for the export readiness assessment.
 */
import { v4 as uuidv4 } from 'uuid';

// Use dynamic imports for server components and provide fallbacks for client components
let aiAssessmentService: any = null;
let ASSESSMENT_STAGES = {
  INTRODUCTION: 'introduction',
  WEBSITE_ANALYSIS: 'website_analysis',
  EXPORT_EXPERIENCE: 'export_experience',
  MOTIVATION: 'motivation',
  TARGET_MARKETS: 'target_markets',
  SUMMARY: 'summary'
};

// Only import server components on the server side
if (typeof window === 'undefined') {
  // We're on the server
  import('./ai').then(module => {
    aiAssessmentService = module.aiAssessmentService;
    ASSESSMENT_STAGES = module.ASSESSMENT_STAGES;
  });
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  extraction_patterns: Record<string, RegExp>;
  validation?: (input: string) => { valid: boolean; message?: string };
}

export interface AssessmentData {
  // User information
  first_name: string;
  last_name: string;
  role: string;
  
  // Business information
  business_name: string;
  website_url: string;
  
  // Export information
  export_experience: string;
  export_motivation: string;
  target_markets?: string;
  
  // Website analysis data
  productCategories?: string[];
  certifications?: string[];
  geographicPresence?: string[];
  businessSize?: 'small' | 'medium' | 'large';
  customerSegments?: string[];
  websiteExportReadiness?: number;
  
  // System data
  sessionId?: string;
  score?: number;
  
  // Allow dynamic properties
  [key: string]: any;
}

// Define the assessment questions and extraction patterns
export const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: 'intro',
    prompt: "Hi there! I'm Sarah, your export readiness advisor. To personalize your assessment, could you tell me your name, role, and business name?",
    extraction_patterns: {
      first_name: /(?:my name is|i'm|im|i am|name is|this is)\s+([A-Z][a-z]+)(?:\s+[A-Z][a-z]+)*|\b([A-Z][a-z]+)\b(?=\s+[A-Z][a-z]+(?:\s+and|\s+with|\s+at|\s+from|\s+of|\s*$))/i,
      last_name: /(?:my name is|i'm|im|i am|name is|this is)\s+[A-Z][a-z]+\s+([A-Z][a-z]+)|\b[A-Z][a-z]+\s+([A-Z][a-z]+)\b(?:\s+and|\s+at|\s+from|\s+with|\s+of|\s*$)/i,
      role: /(?:(?:i'm|im|i am)(?: a| the)? ([^,.]+? (?:at|in|of|for)))/i,
      business_name: /(?:(?:at|for|from|with|of) ([\w\s&\-\.]+))/i,
    },
    validation: (input: string) => {
      if (input.length < 5) {
        return { valid: false, message: "Please provide a bit more information so I can get to know you better." };
      }
      return { valid: true };
    }
  },
  {
    id: 'website',
    prompt: "Thanks {first_name}! Do you have a website for {business_name}? If yes, please share the URL.",
    extraction_patterns: {
      website_url: /(?:(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(?:\/[^\s]*)?)|(?:(?:is|it's|its|it is|we have|have)? ?(?:no|nope|none|not yet|negative))/i,
    },
    validation: (input: string) => {
      // Allow "no" responses
      if (/no|nope|none|not yet|negative/i.test(input)) {
        return { valid: true };
      }
      
      // Check for URL pattern or "no" pattern
      const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(?:\/[^\s]*)?/i;
      if (!urlPattern.test(input) && input.length < 4) {
        return { 
          valid: false, 
          message: "Please provide a valid website URL or let me know if you don't have one." 
        };
      }
      return { valid: true };
    }
  },
  {
    id: 'experience',
    prompt: "Great! Now, could you tell me about your previous export experience, if any?",
    extraction_patterns: {
      export_experience: /(.*)/i, // Capture the entire response
    },
    validation: (input: string) => {
      if (input.length < 3) {
        return { 
          valid: false, 
          message: "Could you elaborate a bit more on your export experience, even if you don't have any?" 
        };
      }
      return { valid: true };
    }
  },
  {
    id: 'motivation',
    prompt: "What's your primary motivation for exploring export opportunities?",
    extraction_patterns: {
      export_motivation: /(.*)/i, // Capture the entire response
    },
    validation: (input: string) => {
      if (input.length < 5) {
        return { 
          valid: false, 
          message: "Understanding your motivation helps me provide better recommendations. Could you share a bit more?" 
        };
      }
      return { valid: true };
    }
  },
  {
    id: 'target_markets',
    prompt: "Which specific international markets are you interested in exporting to? We currently specialize in UAE, USA, and UK.",
    extraction_patterns: {
      target_markets: /(.*)/i, // Capture the entire response
    },
    validation: (input: string) => {
      if (input.length < 3) {
        return { 
          valid: false, 
          message: "Please let me know which markets you're interested in, even if they're not on our supported list." 
        };
      }
      return { valid: true };
    }
  }
];

/**
 * Validate a user response against a question's validation rules
 */
export const validateResponse = (input: string, questionId: string): { valid: boolean; message?: string } => {
  const question = assessmentQuestions.find(q => q.id === questionId);
  
  if (!question || !question.validation) {
    return { valid: true };
  }
  
  return question.validation(input);
};

/**
 * Extract structured data from a user response using defined regex patterns
 */
export const extractDataFromResponse = (
  input: string, 
  patterns: Record<string, RegExp>
): Record<string, string> => {
  const extractedData: Record<string, string> = {};
  
  // First, clean input by filtering out potential confusion with AI names
  // Filter out references to the AI assistant to avoid name extraction confusion
  const cleanedInput = input.replace(/\b(?:sarah|hi sarah|hello sarah|thanks sarah)\b/i, '').trim();
  
  // Apply each pattern and extract data
  Object.entries(patterns).forEach(([key, pattern]) => {
    const match = cleanedInput.match(pattern);
    if (match) {
      // Find the first non-undefined capturing group
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          extractedData[key] = match[i].trim();
          break;
        }
      }
    }
  });
  
  // If we're looking for first_name and last_name but didn't find them,
  // try a more general name extraction approach
  if (patterns.hasOwnProperty('first_name') && !extractedData['first_name']) {
    // Look for capitalized words that might be names
    const nameMatch = cleanedInput.match(/\b([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?\b/);
    if (nameMatch && nameMatch[1]) {
      // Check that this isn't a common word that might be capitalized at start of sentence
      const commonWords = ['hi', 'hello', 'yes', 'no', 'thanks', 'thank', 'sarah'];
      if (!commonWords.includes(nameMatch[1].toLowerCase())) {
        extractedData['first_name'] = nameMatch[1];
        
        // If there's a second capitalized word, it might be a last name
        if (nameMatch[2] && !extractedData['last_name']) {
          extractedData['last_name'] = nameMatch[2];
        }
      }
    }
  }
  
  return extractedData;
};

/**
 * Format the next prompt by replacing data placeholders
 */
export const formatPrompt = (prompt: string, data: AssessmentData): string => {
  let formattedPrompt = prompt;
  
  console.log("Format prompt input:", prompt);
  console.log("Format prompt data:", data);
  
  // Special case: replace "name" with first_name if it exists in the prompt
  if (data.first_name) {
    console.log("Replacing {name} with:", data.first_name);
    formattedPrompt = formattedPrompt.replace(/\{name\}/g, data.first_name);
    formattedPrompt = formattedPrompt.replace(/Thanks name!/g, `Thanks ${data.first_name}!`);
  }
  
  // Replace placeholders with actual data
  Object.entries(data).forEach(([key, value]) => {
    if (value) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      if (formattedPrompt.match(placeholder)) {
        console.log(`Replacing {${key}} with:`, value);
      }
      formattedPrompt = formattedPrompt.replace(placeholder, value);
    }
  });
  
  console.log("Final formatted prompt:", formattedPrompt);
  return formattedPrompt;
};

/**
 * Gets the next prompt in the assessment process
 * @param sessionId Unique identifier for the user's session
 * @param currentStage Current stage of the assessment
 * @param assessmentData Current assessment data
 */
export const getNextPrompt = async (
  sessionId: string = uuidv4(),
  currentStage: string = ASSESSMENT_STAGES.INTRODUCTION,
  assessmentData: Partial<AssessmentData> = {}
): Promise<string> => {
  // Map our assessment data to conversation context
  const contextData = {
    userName: assessmentData.first_name,
    role: assessmentData.role,
    businessName: assessmentData.business_name,
    website: assessmentData.website_url,
    exportExperience: assessmentData.export_experience,
    motivation: assessmentData.export_motivation,
    targetMarkets: assessmentData.target_markets ? [assessmentData.target_markets] : undefined,
    // Add industry data if available from website analysis
    industry: assessmentData.productCategories ? assessmentData.productCategories.join(', ') : undefined
  };
  
  // Get the fixed prompt for this stage, replacing variables with data
  return aiAssessmentService.getFixedPrompt(currentStage, contextData);
};

/**
 * Process a user's response and determine the next stage
 * @param userInput The user's response text
 * @param sessionId Unique identifier for the user's session
 * @param currentStage Current stage of the assessment
 * @param currentData Current assessment data
 */
export const processUserResponse = async (
  userInput: string,
  sessionId: string = uuidv4(),
  currentStage: string = ASSESSMENT_STAGES.INTRODUCTION,
  currentData: Partial<AssessmentData> = {}
): Promise<{
  response: string;
  nextStage: string;
  extractedData: Partial<AssessmentData>;
  isComplete: boolean;
}> => {
  try {
    // Map our assessment data to conversation context
    const contextData = {
      userName: currentData.first_name,
      role: currentData.role,
      businessName: currentData.business_name,
      website: currentData.website_url,
      exportExperience: currentData.export_experience,
      motivation: currentData.export_motivation,
      targetMarkets: currentData.target_markets ? [currentData.target_markets] : undefined,
      // Add industry data if available from website analysis
      industry: currentData.productCategories ? currentData.productCategories.join(', ') : undefined
    };
    
    // Process the message with our AI service
    const result = await aiAssessmentService.processUserMessage(
      sessionId,
      userInput,
      currentStage,
      contextData
    );
    
    // Extract data based on the current stage
    const extractedData: Partial<AssessmentData> = {};
    
    // Get the conversation context after processing
    const conversation = aiAssessmentService.conversationManager.getConversation(sessionId);
    const updatedContext = conversation.getContext();
    
    // Map the context back to our AssessmentData format
    if (updatedContext.userName) extractedData.first_name = updatedContext.userName;
    if (updatedContext.role) extractedData.role = updatedContext.role;
    if (updatedContext.businessName) extractedData.business_name = updatedContext.businessName;
    if (updatedContext.website) extractedData.website_url = updatedContext.website;
    if (updatedContext.exportExperience) extractedData.export_experience = updatedContext.exportExperience;
    if (updatedContext.motivation) extractedData.export_motivation = updatedContext.motivation;
    if (updatedContext.targetMarkets && updatedContext.targetMarkets.length > 0) {
      extractedData.target_markets = updatedContext.targetMarkets.join(', ');
    }
    
    // Add website analysis results if available
    if (result.websiteAnalysis) {
      extractedData.productCategories = result.websiteAnalysis.productCategories;
      extractedData.certifications = result.websiteAnalysis.certifications;
      extractedData.geographicPresence = result.websiteAnalysis.geographicPresence;
      extractedData.businessSize = result.websiteAnalysis.businessSize;
      extractedData.customerSegments = result.websiteAnalysis.customerSegments;
      extractedData.websiteExportReadiness = result.websiteAnalysis.exportReadiness;
      
      console.log(`Website analysis integrated into assessment data:`, 
        JSON.stringify(result.websiteAnalysis, null, 2));
    }
    
    // Track session ID
    extractedData.sessionId = sessionId;
    
    // Check if we've completed the assessment
    const isComplete = result.nextStage === ASSESSMENT_STAGES.SUMMARY;
    
    // Calculate score if the assessment is complete
    if (isComplete) {
      extractedData.score = calculateScore({
        ...currentData,
        ...extractedData
      } as AssessmentData);
    }
    
    return {
      response: result.response,
      nextStage: result.nextStage,
      extractedData,
      isComplete
    };
  } catch (error: any) {
    console.error('Error processing user response:', error);
    
    return {
      response: "I'm sorry, I'm having trouble processing your response. Could you try again?",
      nextStage: currentStage, // Stay on the same stage
      extractedData: {},
      isComplete: false
    };
  }
};

/**
 * Calculate a score based on assessment data
 */
export const calculateScore = (data: AssessmentData): number => {
  // Start with website export readiness score if available, otherwise use base score
  let score = data.websiteExportReadiness || 50;
  
  // Add points for having export experience
  if (data.export_experience && (
      data.export_experience.toLowerCase().includes('yes') || 
      data.export_experience.toLowerCase().includes('experience') ||
      data.export_experience.toLowerCase().includes('exported')
    )) {
    score += 20;
  }
  
  // Add points for having a website
  if (data.website_url && 
      !data.website_url.toLowerCase().includes('no') && 
      !data.website_url.toLowerCase().includes('none')) {
    score += 10;
  }
  
  // Add points for clear motivation
  if (data.export_motivation && data.export_motivation.length > 20) {
    score += 5;
  }
  
  // Add points for target markets
  if (data.target_markets && data.target_markets.length > 5) {
    score += 5;
  }
  
  // Add points for certifications
  if (data.certifications && data.certifications.length > 0) {
    score += 5;
  }
  
  return Math.min(score, 100); // Cap at 100
};

/**
 * Save assessment data to localStorage
 */
export const saveAssessmentData = (data: AssessmentData): void => {
  localStorage.setItem('initialAssessment', JSON.stringify(data));
};

/**
 * Load assessment data from localStorage
 */
export const loadAssessmentData = (): AssessmentData | null => {
  const storedData = localStorage.getItem('initialAssessment');
  
  if (storedData) {
    try {
      return JSON.parse(storedData) as AssessmentData;
    } catch (e) {
      console.error('Failed to parse assessment data:', e);
      return null;
    }
  }
  
  return null;
}; 
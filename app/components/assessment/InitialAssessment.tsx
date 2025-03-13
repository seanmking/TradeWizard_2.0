"use client";

/// <reference path="../../types/declarations.d.ts" />
import React, { useState, useEffect, useRef } from 'react';
import ConversationThread from './ConversationThread';
import UserInput from './UserInput';
import ProgressIndicator from './ProgressIndicator';
import AnimatedAvatar from './AnimatedAvatar';
import { 
  AssessmentQuestion, 
  assessmentQuestions, 
  validateResponse, 
  extractDataFromResponse,
  formatPrompt,
  saveAssessmentData
} from '../../lib/services/assessmentService';

// Add a fallback for server-only content
const FALLBACK_QUESTIONS = [
  {
    id: 'introduction',
    prompt: "Hi there! I'm Sarah, your export readiness advisor. Could you tell me your name, role, and business name?",
    extraction_patterns: {
      first_name: /(?:my name is|i'm|im|i am|name is|hi|hello|hey|this is|i'm called)\s+([a-zA-Z]+)/i,
      business_name: /(?:(?:at|for|from|with|of) ([\w\s&\-\.]+))/i,
      role: /(?:(?:i'm|im|i am)(?: a| the)? ([^,.]+? (?:at|in|of|for)))/i
    }
  },
  {
    id: 'website_analysis',
    prompt: "Thanks {{first_name}}! Do you have a website for {{business_name}}? If yes, please share the URL.",
    extraction_patterns: {
      website_url: /(https?:\/\/[^\s]+)/g
    }
  }
];

// Use imported questions with fallback
const questions = assessmentQuestions.length > 0 ? assessmentQuestions : FALLBACK_QUESTIONS;

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isCompletionMessage?: boolean;
}

const InitialAssessment: React.FC = () => {
  // State for the assessment
  const [currentStep, setCurrentStep] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState(questions[0].id);
  const [isTyping, setIsTyping] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      content: questions[0].prompt,
      timestamp: new Date(),
    },
  ]);
  const [userResponses, setUserResponses] = useState({
    first_name: '',
    last_name: '',
    role: '',
    business_name: '',
    website_url: '',
    export_experience: '',
    export_motivation: '',
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
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
  
  // Refs for auto-scrolling
  const conversationEndRef = useRef<HTMLDivElement>(null);
  
  // Handle user input submission
  const handleSubmit = (userInput: string) => {
    // Prevent empty submissions
    if (!userInput.trim()) return;
    
    // Add user message to the conversation
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: userInput,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Validate the response
    const currentQuestion = questions.find(q => q.id === currentQuestionId);
    if (!currentQuestion) return;
    
    // Pass the question ID, not the question object
    const validationResult = validateResponse(userInput, currentQuestionId);
    
    if (validationResult.valid) {
      // Clear any previous validation errors
      setValidationError(null);
      
      // Extract data from the response
      const extractedData = extractDataFromResponse(userInput, currentQuestion.extraction_patterns);
      
      // Update user responses
      setUserResponses(prev => ({
        ...prev,
        ...extractedData,
      }));
      
      // Show typing indicator
      setIsTyping(true);
      
      // Simulate assistant typing delay
      setTimeout(() => {
        // Determine the next question
        const nextStepIndex = currentStep + 1;
        
        if (nextStepIndex < questions.length) {
          const nextQuestion = questions[nextStepIndex];
          
          // Format the prompt with user data if needed
          const formattedPrompt = formatPrompt(nextQuestion.prompt, {
            ...userResponses,
            ...extractedData,
          });
          
          // Add assistant response
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            content: formattedPrompt,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setCurrentStep(nextStepIndex);
          setCurrentQuestionId(nextQuestion.id);
        } else {
          // Assessment complete - save data and show completion message
          const finalData = {
            ...userResponses,
            ...extractedData,
          };
          
          // Save assessment data
          saveAssessmentData(finalData);
          
          // Add completion message
          const completionMessage: Message = {
            id: `assistant-${Date.now()}`,
            sender: 'assistant',
            content: "Thank you for completing the initial assessment! I'm analyzing your responses to prepare your export readiness report. This will just take a moment...",
            timestamp: new Date(),
            isCompletionMessage: true
          };
          
          setMessages(prev => [...prev, completionMessage]);
          
          // Transition to results page after a delay
          setIsTransitioning(true);
          setTimeout(() => {
            window.location.href = '/assessment-results';
          }, 8000); // Increased from 3000ms to 8000ms (8 seconds) to make it more noticeable
        }
        
        // Stop typing indicator
        setIsTyping(false);
      }, 1500 + Math.random() * 1000); // Random delay between 1.5-2.5s for natural feel
    } else {
      // Show validation error
      setValidationError(validationResult.message || "Please provide a valid response");
      
      // Show typing indicator
      setIsTyping(true);
      
      // Simulate assistant typing delay for error message
      setTimeout(() => {
        // Add assistant error response
        const errorMessage: Message = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          content: validationResult.message || "Please provide a valid response",
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
        
        // Stop typing indicator
        setIsTyping(false);
      }, 1000 + Math.random() * 500); // Slightly shorter delay for error responses
    }
  };
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to submit (for accessibility)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLTextAreaElement) {
          const event = new Event('submit', { bubbles: true });
          activeElement.form?.dispatchEvent(event);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Calculate progress percentage
  const progressPercentage = (currentStep / (questions.length - 1)) * 100;
  
  return (
    <div className={`flex flex-col h-full ${isTransitioning ? 'fade-out' : ''}`}>
      {/* Header with progress indicator */}
      <div className={`bg-white border-b border-gray-200 py-3 px-4 sm:px-6 ${isMobile ? 'sticky top-0 z-10' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className={`font-semibold text-gray-800 ${isMobile ? 'text-sm' : 'text-base'}`}>
            Export Readiness Assessment
          </h2>
          <span className={`text-blue-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {currentStep + 1} of {questions.length}
          </span>
        </div>
        <ProgressIndicator 
          steps={questions.length} 
          currentStep={currentStep} 
        />
      </div>
      
      {/* Conversation area */}
      <div className={`flex-1 overflow-y-auto bg-gray-50 ${isMobile ? 'py-3' : 'py-6'}`}>
        <div className={`max-w-3xl mx-auto ${isMobile ? 'px-2' : 'px-4'}`}>
          <ConversationThread 
            messages={messages} 
            isTyping={isTyping} 
            conversationEndRef={conversationEndRef}
          />
        </div>
      </div>
      
      {/* Input area */}
      <div className={`bg-white border-t border-gray-200 py-3 ${isMobile ? 'px-2 sticky bottom-0 z-10' : 'px-4'}`}>
        <div className="max-w-3xl mx-auto">
          <UserInput 
            onSubmit={handleSubmit} 
            disabled={isTyping || isTransitioning}
            placeholder={isTyping ? "Sarah is typing..." : "Type your response..."}
          />
          
          {validationError && !isTyping && (
            <div className="mt-2 text-red-500 text-xs sm:text-sm animate-fade-in">
              <svg className="inline-block h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {validationError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InitialAssessment; 
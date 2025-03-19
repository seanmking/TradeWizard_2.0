"use client";

import React, { useState, useEffect } from 'react';
import { processOptimizedQuery } from '../../lib/services/ai/server-actions';
import { TaskType } from '../../lib/services/ai/openai-service';
import { ToneAdaptationService } from '../../lib/services/ai/tone-adaptation-service';
import { ConversationManager } from '../../lib/services/ai/conversation';

interface ExportVisionStatementProps {
  businessName: string;
  exportMotivation: string;
  targetMarkets: string[] | string;
  firstName?: string;
}

// Initialize services
const toneService = new ToneAdaptationService();
const conversationManager = new ConversationManager(
  "You are an expert in crafting compelling export vision statements that sound natural and authentic."
);

const ExportVisionStatement: React.FC<ExportVisionStatementProps> = ({
  businessName,
  exportMotivation,
  targetMarkets,
  firstName
}) => {
  const [visionStatement, setVisionStatement] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedVision, setEditedVision] = useState<string>('');
  const [regenerateCount, setRegenerateCount] = useState(0);

  const generateVisionStatement = async () => {
    if (!exportMotivation) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get or create a conversation for this business
      const conversation = conversationManager.getOrCreateConversation(businessName);
      
      // Update conversation context with business details
      conversation.updateContext({
        businessName,
        motivation: exportMotivation,
        targetMarkets: Array.isArray(targetMarkets) ? targetMarkets.map(m => m.trim()) : [targetMarkets].map(m => m.trim()),
        communicationProfile: {
          preferredTone: 'professional',
          languageComplexity: 'moderate',
          emotionalResonance: ['confident', 'ambitious', 'professional']
        }
      });
      
      const prompt = `
Generate a concise export vision statement for a business with the following details:
- Business name: ${businessName || 'the business'}
- Export motivation: ${exportMotivation}
- Target markets: ${Array.isArray(targetMarkets) ? targetMarkets.join(', ') : targetMarkets || 'international markets'}

The vision statement should:
- Be 3-4 sentences long
- Focus on motivation and aspirations
- Incorporate target markets naturally
- Avoid buzzwords and AI-like phrasing
- Sound like it was written by a business owner
- Be inspiring but grounded in reality

Format the response as a JSON object with a single key "visionStatement" containing the narrative text.
Do not include any formatting, bullet points, or line breaks in the vision statement.`;
      
      // Add the prompt to the conversation
      conversation.addUserMessage(prompt);
      
      // Get the AI response
      const result = await processOptimizedQuery(prompt, 'vision' as TaskType);
      
      // Parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(result.response);
        if (parsedResponse.visionStatement) {
          // Clean up any remaining formatting
          const cleanVision = parsedResponse.visionStatement
            .replace(/[\n\r]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          setVisionStatement(cleanVision);
        } else {
          // Fallback if JSON is valid but missing visionStatement
          setVisionStatement(generateFallbackVision());
        }
      } catch (e) {
        // If JSON parsing fails, try to clean up the raw response
        const cleanedResponse = result.response
          .replace(/[\n\r]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/^["']|["']$/g, '') // Remove surrounding quotes if present
          .trim();
        
        // Check if the cleaned response looks like JSON
        if (cleanedResponse.startsWith('{') && cleanedResponse.endsWith('}')) {
          // Still JSON-like, use fallback
          setVisionStatement(generateFallbackVision());
        } else {
          // Use the cleaned response directly
          setVisionStatement(cleanedResponse);
        }
      }
    } catch (error) {
      console.error('Error generating vision statement:', error);
      setVisionStatement(generateFallbackVision());
    } finally {
      setIsLoading(false);
    }
  };

  // Improved fallback vision generator
  const generateFallbackVision = () => {
    const parts = [];
    
    // First sentence: Business name and motivation
    if (businessName && exportMotivation) {
      parts.push(`At ${businessName}, we are driven by our goal to ${exportMotivation.toLowerCase()}`);
    } else if (businessName) {
      parts.push(`At ${businessName}, we are committed to expanding our global presence`);
    }
    
    // Second sentence: Target markets
    if (targetMarkets) {
      parts.push(`Our vision is to establish a strong presence in ${targetMarkets}, bringing our quality products and services to new customers`);
    } else {
      parts.push('Our vision is to establish a strong presence in international markets, bringing our quality products and services to new customers');
    }
    
    // Third sentence: Forward-looking statement
    parts.push('Through strategic partnerships and deep market understanding, we will build sustainable growth while maintaining our commitment to excellence and customer satisfaction');
    
    return parts.join('. ') + '.';
  };

  useEffect(() => {
    generateVisionStatement();
  }, [businessName, exportMotivation, targetMarkets]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedVision(visionStatement || '');
  };

  const handleSave = () => {
    setVisionStatement(editedVision);
    setIsEditing(false);
  };

  const handleRegenerate = () => {
    setRegenerateCount(prev => prev + 1);
    setIsLoading(true);
    generateVisionStatement();
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedVision('');
  };

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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
          </svg>
          <h3 className="text-blue-700 font-medium">{firstName ? `${firstName}'s` : 'Your'} Export Vision</h3>
        </div>
        
        {!isEditing && (
          <div className="flex space-x-2">
            <button
              onClick={handleEdit}
              className="px-3 py-1 text-sm bg-white text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleRegenerate}
              className="px-3 py-1 text-sm bg-white text-purple-600 border border-purple-200 rounded-md hover:bg-purple-50 transition-colors"
              disabled={regenerateCount >= 3}
            >
              Regenerate
            </button>
          </div>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editedVision}
            onChange={(e) => setEditedVision(e.target.value)}
            className="w-full h-32 p-3 text-gray-700 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
            placeholder="Edit your export vision statement..."
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm bg-white text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-700 leading-relaxed">
          {visionStatement || `${businessName || 'Your business'} has the potential to expand into international markets, building on your existing capabilities and market knowledge.`}
        </p>
      )}
      
      {regenerateCount >= 3 && !isEditing && (
        <p className="mt-2 text-sm text-amber-600">
          You've reached the maximum number of regenerations. Please edit the current vision or contact support for assistance.
        </p>
      )}
    </div>
  );
};

export default ExportVisionStatement; 
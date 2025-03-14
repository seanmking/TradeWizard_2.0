/**
 * Helper utilities for LLM interactions
 */

import { LLM } from '../types';
import { ApiError } from './error-handling';

/**
 * Completes a prompt with retry logic
 */
export async function completeWithRetry(
  llm: LLM,
  prompt: string,
  options: {
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    retries?: number;
    backoffMs?: number;
  } = {}
): Promise<string> {
  const {
    retries = 3,
    backoffMs = 1000,
    ...llmOptions
  } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add retry information to the prompt if this is a retry
      const retryPrompt = attempt > 0
        ? `${prompt}\n\n[Note: This is retry attempt ${attempt}/${retries}. Previous attempts failed.]`
        : prompt;
      
      const response = await llm.complete({
        prompt: retryPrompt,
        ...llmOptions
      });
      
      return response;
    } catch (error: any) {
      lastError = error;
      console.error(`LLM request failed (attempt ${attempt + 1}/${retries + 1}):`, error.message || error);
      
      // Don't wait if this was the last attempt
      if (attempt < retries) {
        // Exponential backoff
        const delay = backoffMs * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new ApiError('Failed to complete LLM request after multiple attempts', 500);
}

/**
 * Parses a structured response from an LLM
 */
export function parseStructuredResponse<T>(response: string): T {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                      response.match(/\{[\s\S]*\}/);
    
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    
    // Clean up the string - this handles cases where the model doesn't use proper JSON blocks
    const cleanedStr = jsonStr
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    
    return JSON.parse(cleanedStr) as T;
  } catch (error: any) {
    throw new Error(`Failed to parse structured response: ${error.message}\nResponse: ${response}`);
  }
}

/**
 * Safely extracts a property value from an LLM response
 */
export function extractProperty<T>(
  response: any,
  propertyPath: string,
  defaultValue: T
): T {
  try {
    const parts = propertyPath.split('.');
    let value = response;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return defaultValue;
      }
      value = value[part];
    }
    
    return (value === undefined || value === null) ? defaultValue : value as T;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Creates a prompt with a structured output template
 */
export function createStructuredPrompt(
  instructions: string,
  schema: Record<string, any>,
  examples?: Array<{ input: string; output: any }>
): string {
  const schemaStr = JSON.stringify(schema, null, 2);
  const examplesStr = examples
    ? examples.map(ex => 
        `Input: ${ex.input}\nOutput: \`\`\`json\n${JSON.stringify(ex.output, null, 2)}\n\`\`\``
      ).join('\n\n')
    : '';
  
  return `${instructions}

Your response should strictly follow this JSON schema:
\`\`\`json
${schemaStr}
\`\`\`

${examples ? `Here are some examples:\n\n${examplesStr}\n\n` : ''}
Provide your response in valid JSON format enclosed in triple backticks.`;
} 
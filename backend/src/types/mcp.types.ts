import { AssessmentQuestion } from '@prisma/client';

export interface MCPQuery {
  mcp: 'market-intelligence' | 'compliance';
  query_type: string;
  parameters: Record<string, string>;
  required_fields: string[];
}

export interface MCPResponse {
  status: 'success' | 'not_found' | 'error';
  data: Record<string, string | number | string[]>;
  metadata?: {
    source: string;
    confidence_score: number;
    last_updated: string;
  };
}

export interface MCPCacheKey {
  mcp: string;
  query_type: string;
  parameters: string; // JSON.stringify of parameters object
}

export interface EnhancedQuestionData {
  question: AssessmentQuestion;
  enhancedPrefix?: string; // marketingPrefix with MCP data interpolated
  enhancedText?: string; // Any other text enhancement with MCP data
  confidence?: number; // Confidence in the MCP data used (0-1)
}

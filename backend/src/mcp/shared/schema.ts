import { z } from 'zod';

// Base MCP response metadata schema
export const MCPMetadataSchema = z.object({
  source: z.string(),
  last_updated: z.string().datetime(),
  source_quality_score: z.number().min(0).max(1).optional(),
  data_completeness: z.enum(['complete', 'partial', 'outdated']),
  version: z.string().optional()
});

// Base MCP response schema
export const MCPBaseResponseSchema = z.object({
  status: z.enum(['success', 'error']),
  data: z.record(z.any()),
  ui_format: z.union([z.string(), z.any()]).optional(), // JSX elements will be any
  agent_format: z.record(z.any()).optional(),
  confidence_score: z.number().min(0).max(1),
  metadata: MCPMetadataSchema,
  known_gaps: z.array(z.string()).optional(),
  fallback_suggestions: z.array(z.string()).optional()
});

// TypeScript types derived from schemas
export type MCPMetadata = z.infer<typeof MCPMetadataSchema>;
export type MCPBaseResponse = z.infer<typeof MCPBaseResponseSchema>;

// Utility type for creating specific MCP response types
export type MCPResponse<T> = Omit<MCPBaseResponse, 'data'> & {
  data: T;
};

// Common error response type
export interface MCPErrorResponse {
  status: 'error';
  error: string;
  code: string;
  metadata: MCPMetadata;
}

// Output mode type
export type MCPOutputMode = 'agent' | 'ui' | 'both';

// Cache configuration interface
export interface MCPCacheConfig {
  ttl: number; // Time to live in seconds
  prefetch: boolean;
  key: string;
}

// Base MCP handler interface
export interface MCPHandler<T = any> {
  handle(params: any): Promise<MCPResponse<T>>;
  getCacheConfig?(params: any): MCPCacheConfig;
  transformOutput?(data: T, mode: MCPOutputMode): any;
} 
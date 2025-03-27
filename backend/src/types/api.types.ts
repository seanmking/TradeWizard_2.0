/**
 * Standardized API Response Types
 */

/**
 * Metadata structure included in all API responses
 */
export interface ResponseMetadata {
  /** Indicates the completeness of data (complete, partial, incomplete) */
  data_completeness: 'complete' | 'partial' | 'incomplete';
  /** ISO timestamp when the data was last updated */
  last_updated: string;
  /** Source of the data (API, Cache, Database, etc.) */
  source: string;
  /** Optional confidence score (0-1) indicating data reliability */
  confidence_score?: number;
}

/**
 * Standard API Success Response structure
 */
export interface ApiResponse<T> {
  /** API response status code */
  status: number;
  /** The actual response data */
  data: T;
  /** Optional message providing additional context */
  message?: string;
  /** Metadata about the response */
  metadata: ResponseMetadata;
}

/**
 * Standard API Error Response structure
 */
export interface ApiErrorResponse {
  /** API error status code */
  status: number;
  /** Will be null for error responses */
  data: null;
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  error_code?: string;
  /** Additional error details */
  details?: Record<string, any>;
  /** Metadata about the response */
  metadata?: ResponseMetadata;
}

/**
 * Common error codes used throughout the application
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}

/**
 * Type guard to check if a response is an error response
 */
export function isApiErrorResponse(response: ApiResponse<any> | ApiErrorResponse): response is ApiErrorResponse {
  return response.data === null && 'message' in response;
}

/**
 * Base request parameters interface that should be extended by
 * specific request types
 */
export interface BaseRequestParams {
  /** Request type identifier */
  type: string;
}

/**
 * Handler function signature that works with typed request parameters
 */
export type HandlerFunction<T extends BaseRequestParams, R> = (params: T) => Promise<ApiResponse<R>>; 
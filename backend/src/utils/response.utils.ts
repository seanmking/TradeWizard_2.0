/**
 * Response Handling Utilities
 */

import { ApiResponse, ResponseMetadata } from '../types/api.types';
import { NextFunction, Request, Response } from 'express';

/**
 * Create a standardized successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  message: string = 'Success',
  metadata?: Partial<ResponseMetadata>
): ApiResponse<T> {
  return {
    status: 200,
    data,
    message,
    metadata: {
      data_completeness: 'complete',
      last_updated: new Date().toISOString(),
      source: 'API',
      ...metadata
    }
  };
}

/**
 * Create a standardized partial success API response (some data may be missing or incomplete)
 */
export function createPartialSuccessResponse<T>(
  data: T,
  message: string,
  metadata?: Partial<ResponseMetadata>
): ApiResponse<T> {
  return {
    status: 206,
    data,
    message,
    metadata: {
      data_completeness: 'partial',
      last_updated: new Date().toISOString(),
      source: 'API',
      ...metadata
    }
  };
}

/**
 * Create a standardized empty success API response (no content)
 */
export function createEmptySuccessResponse(
  message: string = 'No content',
  metadata?: Partial<ResponseMetadata>
): ApiResponse<null> {
  return {
    status: 204,
    data: null,
    message,
    metadata: {
      data_completeness: 'complete',
      last_updated: new Date().toISOString(),
      source: 'API',
      ...metadata
    }
  };
}

/**
 * Express middleware to wrap async route handlers and standardize responses
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await fn(req, res, next);
      
      // If the result is already an ApiResponse, send it directly
      if (result && typeof result === 'object' && 'status' in result && 'data' in result && 'message' in result) {
        res.status((result as ApiResponse<unknown>).status).json(result);
        return;
      }
      
      // Otherwise wrap it in a success response
      const response = createSuccessResponse(result);
      res.status(response.status).json(response);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Express middleware to handle empty responses
 */
export function emptyResponseHandler(req: Request, res: Response, next: NextFunction): void {
  const oldJson = res.json.bind(res);
  res.json = function(body: unknown) {
    if (body === undefined || body === null) {
      const response = createEmptySuccessResponse();
      return oldJson(response);
    }
    return oldJson(body);
  };
  next();
} 
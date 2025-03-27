/**
 * Error Handling Utilities
 */

import { ApiErrorResponse, ErrorCode } from '../types/api.types';

/**
 * Base API Error class that all specific error types extend
 */
export class ApiError extends Error {
  status: number;
  error_code: ErrorCode;
  details?: Record<string, any>;

  constructor(
    message: string,
    status: number,
    error_code: ErrorCode,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.error_code = error_code;
    this.details = details;
    
    // This ensures that instanceof checks work properly in TypeScript
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Convert this error to a standardized API error response
   */
  toResponse(): ApiErrorResponse {
    return {
      status: this.status,
      data: null,
      message: this.message,
      error_code: this.error_code,
      details: this.details,
      metadata: {
        data_completeness: 'incomplete',
        last_updated: new Date().toISOString(),
        source: 'Error'
      }
    };
  }
}

/**
 * Validation Error (400 Bad Request)
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      message,
      400,
      ErrorCode.VALIDATION_ERROR,
      details
    );
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not Found Error (404 Not Found)
 */
export class NotFoundError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      message,
      404,
      ErrorCode.NOT_FOUND,
      details
    );
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Internal Server Error (500 Internal Server Error)
 */
export class InternalServerError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      message,
      500,
      ErrorCode.INTERNAL_SERVER_ERROR,
      details
    );
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * External API Error (502 Bad Gateway)
 */
export class ExternalApiError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(
      message,
      502,
      ErrorCode.EXTERNAL_API_ERROR,
      details
    );
    Object.setPrototypeOf(this, ExternalApiError.prototype);
  }
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Convert any error to an ApiErrorResponse
 */
export function handleError(error: unknown): ApiErrorResponse {
  if (isApiError(error)) {
    return error.toResponse();
  }
  
  // For regular errors or unknown objects, convert to InternalServerError
  const internalError = new InternalServerError(
    error instanceof Error ? error.message : 'An unexpected error occurred',
    { 
      original_error: error instanceof Error ? error.stack : String(error) 
    }
  );
  
  return internalError.toResponse();
}

/**
 * Express middleware for handling errors
 */
export function errorMiddleware(err: unknown, req: any, res: any, next: any): void {
  const errorResponse = handleError(err);
  res.status(errorResponse.status).json(errorResponse);
} 
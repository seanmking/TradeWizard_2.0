/**
 * Error handling utilities
 */

export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function handleApiError(error: unknown): {
  message: string;
  statusCode: number;
} {
  console.error('API Error:', error);
  
  if (error instanceof ApiError) {
    return {
      message: error.message,
      statusCode: error.statusCode
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500
    };
  }
  
  return {
    message: 'An unexpected error occurred',
    statusCode: 500
  };
}

export function formatErrorResponse(error: unknown): {
  status: string;
  code: number;
  message: string;
} {
  const { message, statusCode } = handleApiError(error);
  
  return {
    status: 'error',
    code: statusCode,
    message
  };
} 
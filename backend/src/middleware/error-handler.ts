import { Request, Response, NextFunction } from 'express';
import PerformanceMonitor from '../utils/performance-monitor';

class ErrorHandler {
  // General error handling middleware
  static handleError(
    err: Error, 
    req: Request, 
    res: Response, 
    next: NextFunction
  ) {
    // Log the error
    PerformanceMonitor.logError(err, {
      path: req.path,
      method: req.method,
      body: req.body
    });

    // Determine error type and response
    if (err instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        type: 'validation',
        message: err.message,
        details: err.details
      });
    }

    if (err instanceof AuthorizationError) {
      return res.status(403).json({
        status: 'error',
        type: 'authorization',
        message: err.message
      });
    }

    if (err instanceof ResourceNotFoundError) {
      return res.status(404).json({
        status: 'error',
        type: 'not_found',
        message: err.message
      });
    }

    // Catch-all for unhandled errors
    res.status(500).json({
      status: 'error',
      type: 'internal_server_error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message
    });
  }

  // Rate limiting middleware
  static rateLimiter(
    req: Request, 
    res: Response, 
    next: NextFunction
  ) {
    // TODO: Implement more sophisticated rate limiting
    const requestCount = parseInt(req.get('X-Request-Count') || '0');
    
    if (requestCount > 100) {
      return res.status(429).json({
        status: 'error',
        type: 'rate_limit',
        message: 'Too many requests, please try again later'
      });
    }

    next();
  }

  // Validate request input
  static validateInput(schema: any) {
    return (req: Request, res: Response, next: NextFunction) => {
      const { error } = schema.validate(req.body);
      
      if (error) {
        throw new ValidationError(
          'Invalid input', 
          error.details.map((detail: any) => detail.message)
        );
      }

      next();
    };
  }
}

// Custom Error Classes
class ValidationError extends Error {
  details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

class ResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

export {
  ErrorHandler,
  ValidationError,
  AuthorizationError,
  ResourceNotFoundError
};

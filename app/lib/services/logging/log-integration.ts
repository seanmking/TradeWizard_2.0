/**
 * Logging Integration Utilities
 * 
 * Provides helpers to integrate structured logging throughout the application.
 */

import loggingService, { LogContext, LogLevel } from './index';

/**
 * Create a component-specific logger
 * @param component - Component name for context
 * @returns Object with logging methods bound to the component
 */
export function createComponentLogger(component: string) {
  return {
    error: (message: string, context: Omit<LogContext, 'component'> = {}, error?: Error) => {
      loggingService.error(message, { ...context, component }, error);
    },
    
    warn: (message: string, context: Omit<LogContext, 'component'> = {}) => {
      loggingService.warn(message, { ...context, component });
    },
    
    info: (message: string, context: Omit<LogContext, 'component'> = {}) => {
      loggingService.info(message, { ...context, component });
    },
    
    http: (message: string, context: Omit<LogContext, 'component'> = {}) => {
      loggingService.http(message, { ...context, component });
    },
    
    debug: (message: string, context: Omit<LogContext, 'component'> = {}) => {
      loggingService.debug(message, { ...context, component });
    },
    
    verbose: (message: string, context: Omit<LogContext, 'component'> = {}) => {
      loggingService.verbose(message, { ...context, component });
    },
    
    log: (level: LogLevel, message: string, context: Omit<LogContext, 'component'> = {}, error?: Error) => {
      loggingService.log(level, message, { ...context, component }, error);
    }
  };
}

/**
 * Create a logger for class instances
 * Decorates a class to provide logging methods and context
 */
export function withLogging<T extends { new(...args: any[]): {} }>(Class: T, component?: string) {
  return class extends Class {
    protected logger = component 
      ? createComponentLogger(component) 
      : createComponentLogger(Class.name);
    
    constructor(...args: any[]) {
      super(...args);
      this.logger.debug(`Initialized ${Class.name}`);
    }
  };
}

/**
 * Create a service logger for dependency injection
 * @param name - Service name for context
 */
export function createServiceLogger(name: string) {
  return {
    // Service initialization and lifecycle logging
    serviceStarted: (context: Omit<LogContext, 'component' | 'action'> = {}) => {
      loggingService.info(`Service ${name} started`, { ...context, component: name, action: 'start' });
    },
    
    serviceStopped: (context: Omit<LogContext, 'component' | 'action'> = {}) => {
      loggingService.info(`Service ${name} stopped`, { ...context, component: name, action: 'stop' });
    },
    
    serviceError: (error: Error, context: Omit<LogContext, 'component' | 'action'> = {}) => {
      loggingService.error(
        `Service ${name} encountered an error: ${error.message}`, 
        { ...context, component: name, action: 'error' }, 
        error
      );
    },
    
    // Standard logging methods with service context
    error: (message: string, context: Omit<LogContext, 'component'> = {}, error?: Error) => {
      loggingService.error(message, { ...context, component: name }, error);
    },
    
    warn: (message: string, context: Omit<LogContext, 'component'> = {}) => {
      loggingService.warn(message, { ...context, component: name });
    },
    
    info: (message: string, context: Omit<LogContext, 'component'> = {}) => {
      loggingService.info(message, { ...context, component: name });
    },
    
    debug: (message: string, context: Omit<LogContext, 'component'> = {}) => {
      loggingService.debug(message, { ...context, component: name });
    }
  };
}

/**
 * Log method execution with timing information
 * Can be used as a method decorator or function wrapper
 */
export function logMethod(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor;
export function logMethod(
  options: { component: string; action?: string }
): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export function logMethod(
  targetOrOptions: any,
  propertyKey?: string,
  descriptor?: PropertyDescriptor
): any {
  // Handle both decorator forms
  if (propertyKey && descriptor) {
    return logMethodImplementation(targetOrOptions, propertyKey, descriptor);
  } else {
    return (target: any, key: string, desc: PropertyDescriptor) => {
      return logMethodImplementation(target, key, desc, targetOrOptions);
    };
  }
}

/**
 * Implementation of method logging
 */
function logMethodImplementation(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
  options: { component: string; action?: string } = { component: 'unknown' }
): PropertyDescriptor {
  const originalMethod = descriptor.value;
  const className = target.constructor.name;
  const component = options.component || className;
  const methodName = propertyKey;
  
  descriptor.value = function(...args: any[]) {
    const startTime = Date.now();
    const context: LogContext = {
      component,
      action: options.action || methodName,
      arguments: args.map(arg => 
        typeof arg === 'object' && arg !== null 
          ? Object.keys(arg).reduce((acc, key) => {
              // Don't log large objects or sensitive data
              if (typeof arg[key] === 'function' || key.toLowerCase().includes('password')) {
                return acc;
              }
              acc[key] = arg[key];
              return acc;
            }, {})
          : arg
      )
    };
    
    loggingService.debug(`${className}.${methodName} called`, context);
    
    try {
      const result = originalMethod.apply(this, args);
      
      // Handle promises
      if (result && typeof result.then === 'function') {
        return result
          .then((value: any) => {
            const duration = Date.now() - startTime;
            loggingService.debug(
              `${className}.${methodName} completed in ${duration}ms`, 
              { ...context, duration: `${duration}ms` }
            );
            return value;
          })
          .catch((error: Error) => {
            const duration = Date.now() - startTime;
            loggingService.error(
              `${className}.${methodName} failed after ${duration}ms: ${error.message}`,
              { ...context, duration: `${duration}ms` },
              error
            );
            throw error;
          });
      }
      
      // Handle synchronous methods
      const duration = Date.now() - startTime;
      loggingService.debug(
        `${className}.${methodName} completed in ${duration}ms`, 
        { ...context, duration: `${duration}ms` }
      );
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      loggingService.error(
        `${className}.${methodName} failed after ${duration}ms: ${(error as Error).message}`,
        { ...context, duration: `${duration}ms` },
        error as Error
      );
      throw error;
    }
  };
  
  return descriptor;
}

/**
 * Express middleware to log all API requests
 */
export const requestLogger = loggingService.createExpressMiddleware();

/**
 * Log unhandled exceptions and rejections
 */
export function setupGlobalErrorLogging(): void {
  // Catch unhandled exceptions
  process.on('uncaughtException', (error) => {
    loggingService.error(
      'Uncaught Exception', 
      { component: 'process', action: 'uncaughtException' }, 
      error
    );
    
    // Give time for logs to be written before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  // Catch unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    loggingService.error(
      'Unhandled Promise Rejection', 
      { 
        component: 'process', 
        action: 'unhandledRejection',
        reason: reason instanceof Error ? reason.message : String(reason)
      },
      reason instanceof Error ? reason : new Error(String(reason))
    );
  });
} 
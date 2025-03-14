/**
 * Centralized Logging System
 * 
 * Implements a structured logging system using Winston with support for
 * multiple transports, log levels, and context-aware logging.
 */

import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import 'winston-daily-rotate-file';
import { createGunzip } from 'zlib';
import { createReadStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

// Log levels with corresponding priorities
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
  SILLY = 'silly'
}

// Context information to include with logs
export interface LogContext {
  requestId?: string;
  userId?: string;
  component?: string;
  sessionId?: string;
  action?: string;
  ip?: string;
  [key: string]: any; // Additional custom fields
}

// Configuration options for the logging service
export interface LoggingOptions {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  logDir: string;
  maxFiles: string;
  maxSize: string;
  compressAfterDays: number;
  prettyPrint: boolean;
  colorize: boolean;
  enableMetrics: boolean;
  enableCorrelationIds: boolean;
  redactFields: string[];
}

// Log entry metrics for monitoring
export interface LogMetrics {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  httpCount: number;
  debugCount: number;
  lastErrorTime?: Date;
  messagesByComponent: Record<string, number>;
}

/**
 * Centralized Logging Service
 * Provides structured logging with multiple transports and context awareness
 */
export class LoggingService {
  private logger: winston.Logger;
  private options: LoggingOptions;
  private metrics: LogMetrics;
  
  /**
   * Create a new logging service instance
   * @param options - Configuration options
   */
  constructor(options: Partial<LoggingOptions> = {}) {
    // Default options
    this.options = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: process.env.NODE_ENV === 'production',
      logDir: './logs',
      maxFiles: '14d',
      maxSize: '20m',
      compressAfterDays: 7,
      prettyPrint: process.env.NODE_ENV !== 'production',
      colorize: process.env.NODE_ENV !== 'production',
      enableMetrics: true,
      enableCorrelationIds: true,
      redactFields: ['password', 'token', 'secret', 'apiKey', 'creditCard'],
      ...options
    };
    
    // Initialize metrics
    this.metrics = {
      totalLogs: 0,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      httpCount: 0,
      debugCount: 0,
      messagesByComponent: {}
    };
    
    // Create Winston logger
    this.logger = this.createLogger();
  }
  
  /**
   * Log an error message
   * @param message - Log message
   * @param context - Additional context
   * @param error - Error object
   */
  error(message: string, context: LogContext = {}, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
  
  /**
   * Log a warning message
   * @param message - Log message
   * @param context - Additional context
   */
  warn(message: string, context: LogContext = {}): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  /**
   * Log an info message
   * @param message - Log message
   * @param context - Additional context
   */
  info(message: string, context: LogContext = {}): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * Log an HTTP request
   * @param message - Log message
   * @param context - Additional context
   */
  http(message: string, context: LogContext = {}): void {
    this.log(LogLevel.HTTP, message, context);
  }
  
  /**
   * Log a debug message
   * @param message - Log message
   * @param context - Additional context
   */
  debug(message: string, context: LogContext = {}): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  /**
   * Log a verbose message
   * @param message - Log message
   * @param context - Additional context
   */
  verbose(message: string, context: LogContext = {}): void {
    this.log(LogLevel.VERBOSE, message, context);
  }
  
  /**
   * Generic log method
   * @param level - Log level
   * @param message - Log message
   * @param context - Additional context
   * @param error - Optional error object
   */
  log(level: LogLevel, message: string, context: LogContext = {}, error?: Error): void {
    // Prepare log entry
    const logEntry: Record<string, any> = {
      message,
      timestamp: new Date().toISOString(),
      ...this.redactSensitiveData({ ...context })
    };
    
    // Add error details if available
    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    // Log the entry
    this.logger.log(level, message, logEntry);
    
    // Update metrics
    if (this.options.enableMetrics) {
      this.updateMetrics(level, context.component);
    }
  }
  
  /**
   * Create Express middleware for HTTP request logging
   */
  createExpressMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] || 
                      req.headers['x-correlation-id'] || 
                      this.generateRequestId();
      
      // Create context with request info
      const context: LogContext = {
        requestId: requestId as string,
        method: req.method,
        url: req.url,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer || req.headers.referrer
      };
      
      // Track request start time
      const startTime = Date.now();
      
      // Log incoming request
      this.http(`Incoming ${req.method} request to ${req.url}`, context);
      
      // Add request ID to response headers
      if (this.options.enableCorrelationIds) {
        res.setHeader('X-Request-ID', requestId);
      }
      
      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logContext: LogContext = {
          ...context,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          contentLength: res.getHeader('content-length') || 0
        };
        
        // Use appropriate log level based on status code
        if (res.statusCode >= 500) {
          this.error(`${req.method} ${req.url} responded with ${res.statusCode} (${duration}ms)`, logContext);
        } else if (res.statusCode >= 400) {
          this.warn(`${req.method} ${req.url} responded with ${res.statusCode} (${duration}ms)`, logContext);
        } else {
          this.info(`${req.method} ${req.url} responded with ${res.statusCode} (${duration}ms)`, logContext);
        }
      });
      
      next();
    };
  }
  
  /**
   * Get current logging metrics
   */
  getMetrics(): LogMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Search logs by criteria
   * @param criteria - Search criteria
   * @param limit - Maximum number of results
   * @param offset - Result offset
   */
  async searchLogs(criteria: Record<string, any>, limit: number = 100, offset: number = 0): Promise<any[]> {
    // This is a simplified implementation
    // In a real implementation, this would search through log files
    
    const results: any[] = [];
    
    // Example: read the most recent log file
    try {
      if (this.options.enableFile) {
        // This is just a placeholder - in a real implementation
        // we would have proper log searching functionality
        console.log(`Searching logs with criteria: ${JSON.stringify(criteria)}`);
      }
    } catch (error) {
      this.error('Error searching logs', { searchCriteria: criteria }, error as Error);
    }
    
    return results;
  }
  
  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Create Winston logger instance
   */
  private createLogger(): winston.Logger {
    const { format } = winston;
    
    // Define formats
    const customFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      this.options.prettyPrint
        ? format.printf(({ level, message, timestamp, ...rest }) => {
            const restString = Object.keys(rest).length
              ? JSON.stringify(rest, null, 2)
              : '';
              
            return `${timestamp} [${level.toUpperCase()}]: ${message} ${restString}`;
          })
        : format.json()
    );
    
    // Define transports
    const transports: winston.transport[] = [];
    
    // Add console transport
    if (this.options.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: this.options.colorize
            ? format.combine(format.colorize(), customFormat)
            : customFormat
        })
      );
    }
    
    // Add file transports
    if (this.options.enableFile) {
      // Regular log files - daily rotation
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: `${this.options.logDir}/application-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: this.options.maxSize,
          maxFiles: this.options.maxFiles,
          format: format.combine(format.uncolorize(), customFormat)
        })
      );
      
      // Error log files - daily rotation
      transports.push(
        new winston.transports.DailyRotateFile({
          filename: `${this.options.logDir}/errors-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: this.options.maxSize,
          maxFiles: this.options.maxFiles,
          level: 'error',
          format: format.combine(format.uncolorize(), customFormat)
        })
      );
    }
    
    // Create and return logger
    return winston.createLogger({
      level: this.options.level,
      levels: winston.config.npm.levels,
      transports
    });
  }
  
  /**
   * Update metrics after logging
   * @param level - Log level
   * @param component - Component name
   */
  private updateMetrics(level: LogLevel, component?: string): void {
    this.metrics.totalLogs++;
    
    // Update level-specific counts
    switch (level) {
      case LogLevel.ERROR:
        this.metrics.errorCount++;
        this.metrics.lastErrorTime = new Date();
        break;
      case LogLevel.WARN:
        this.metrics.warnCount++;
        break;
      case LogLevel.INFO:
        this.metrics.infoCount++;
        break;
      case LogLevel.HTTP:
        this.metrics.httpCount++;
        break;
      case LogLevel.DEBUG:
      case LogLevel.VERBOSE:
      case LogLevel.SILLY:
        this.metrics.debugCount++;
        break;
    }
    
    // Update component-specific counts
    if (component) {
      this.metrics.messagesByComponent[component] = 
        (this.metrics.messagesByComponent[component] || 0) + 1;
    }
  }
  
  /**
   * Redact sensitive information
   * @param data - Data to redact
   */
  private redactSensitiveData(data: Record<string, any>): Record<string, any> {
    const result = { ...data };
    
    const redactValue = (obj: any, key: string, path: string = ''): any => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.keys(obj).forEach(k => {
        const currentPath = path ? `${path}.${k}` : k;
        const value = obj[k];
        
        if (this.shouldRedact(k)) {
          obj[k] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          redactValue(value, k, currentPath);
        }
      });
    };
    
    redactValue(result, '');
    return result;
  }
  
  /**
   * Check if a field should be redacted
   * @param field - Field name
   */
  private shouldRedact(field: string): boolean {
    return this.options.redactFields.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$', 'i');
        return regex.test(field);
      }
      return field.toLowerCase() === pattern.toLowerCase();
    });
  }
}

// Create a singleton instance with default options
const loggingService = new LoggingService();

export default loggingService; 
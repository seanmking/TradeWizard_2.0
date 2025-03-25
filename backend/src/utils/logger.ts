type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: any;
}

export class Logger {
  private service: string;
  private minLevel: LogLevel;

  constructor(service: string, minLevel: LogLevel = 'info') {
    this.service = service;
    this.minLevel = minLevel;
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: any): void {
    this.log('error', message, error);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      ...(data && { data })
    };

    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement production logging
      console.log(JSON.stringify(entry));
    } else {
      const color = this.getLogColor(level);
      console.log(
        `${color}[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.service}] ${entry.message}${
          data ? '\n' + JSON.stringify(data, null, 2) : ''
        }\x1b[0m`
      );
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private getLogColor(level: LogLevel): string {
    switch (level) {
      case 'debug':
        return '\x1b[90m'; // Gray
      case 'info':
        return '\x1b[32m'; // Green
      case 'warn':
        return '\x1b[33m'; // Yellow
      case 'error':
        return '\x1b[31m'; // Red
      default:
        return '';
    }
  }
} 
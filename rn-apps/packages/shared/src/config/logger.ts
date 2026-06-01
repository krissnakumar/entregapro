import { ENV } from './env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'] as const;
    const currentLevel = levels.indexOf(ENV.LOG_LEVEL);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= currentLevel;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };
  }

  private logEntry(entry: LogEntry): void {
    // Keep in memory for debugging
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const output = `${prefix} ${entry.message}`;

    if (entry.error) {
      if (entry.level === 'error') {
        console.error(output, entry.error, entry.context);
      } else {
        console.warn(output, entry.error, entry.context);
      }
    } else {
      if (entry.level === 'error') {
        console.error(output, entry.context);
      } else if (entry.level === 'warn') {
        console.warn(output, entry.context);
      } else {
        console.log(output, entry.context);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.logEntry(this.createEntry('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.logEntry(this.createEntry('info', message, context));
    }
  }

  warn(message: string, errorOrContext?: Error | LogContext | unknown, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      let error: Error | undefined;
      let finalContext: LogContext | undefined;
      
      if (errorOrContext instanceof Error) {
        error = errorOrContext;
        finalContext = context;
      } else if (errorOrContext && typeof errorOrContext === 'object') {
        finalContext = errorOrContext as LogContext;
      }
      
      this.logEntry(this.createEntry('warn', message, finalContext, error));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logEntry(this.createEntry('error', message, context, errorObj));
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = new Logger();

/**
 * Error handler for consistent error handling across the app
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string = 'UNKNOWN_ERROR',
    public context?: LogContext,
  ) {
    super(message);
    this.name = 'AppError';
  }

  log(): void {
    logger.error(this.message, this, { code: this.code, ...this.context });
  }
}

/**
 * Handles network errors specifically
 */
export class NetworkError extends AppError {
  constructor(message: string, context?: LogContext) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

/**
 * Handles authentication errors
 */
export class AuthError extends AppError {
  constructor(message: string, context?: LogContext) {
    super(message, 'AUTH_ERROR', context);
    this.name = 'AuthError';
  }
}

/**
 * Handles validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: LogContext) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

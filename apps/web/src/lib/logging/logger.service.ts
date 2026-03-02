/**
 * Structured Logging Service
 * 
 * Provides consistent logging with levels, correlation IDs, and context enrichment.
 * In production, logs are sent to the backend for aggregation.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  userId?: string;
  organizationId?: string;
  component?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Type for monitoring service
interface MonitoringService {
  captureException(error: Error): void;
}

interface WindowWithMonitoring extends Window {
  __monitoring?: MonitoringService;
}

class LoggerService {
  private static instance: LoggerService;
  private correlationId: string | null = null;
  private userId: string | null = null;
  private organizationId: string | null = null;
  private isDevelopment = import.meta.env.DEV;
  private logQueue: LogEntry[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxQueueSize: number = 100;

  private constructor() {
    if (!this.isDevelopment) {
      // In production, periodically flush logs to backend
      setInterval(() => this.flush(), this.flushInterval);
    }
  }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Set correlation ID for the current request/session
   */
  setCorrelationId(id: string) {
    this.correlationId = id;
  }

  /**
   * Set user context for logging
   */
  setUserContext(userId: string, organizationId: string) {
    this.userId = userId;
    this.organizationId = organizationId;
  }

  /**
   * Clear user context (on logout)
   */
  clearUserContext() {
    this.userId = null;
    this.organizationId = null;
  }

  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId || undefined,
      userId: this.userId || undefined,
      organizationId: this.organizationId || undefined,
      metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    }

    return entry;
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, unknown>) {
    if (!this.isDevelopment) return; // Only log debug in development
    this.log('debug', message, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, unknown>) {
    this.log('info', message, metadata);
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, unknown>) {
    this.log('warn', message, metadata);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>) {
    this.log('error', message, metadata, error);
  }

  /**
   * Log with specific level
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>, error?: Error) {
    const entry = this.createLogEntry(level, message, metadata, error);

    // In development, log to console with formatting
    if (this.isDevelopment) {
      this.logToConsole(entry);
    } else {
      // In production, queue for backend
      this.queueLog(entry);
    }

    // For errors, also track in monitoring service if available
    if (level === 'error' && typeof window !== 'undefined') {
      const monitoring = (window as WindowWithMonitoring).__monitoring;
      if (monitoring) {
        monitoring.captureException(error || new Error(message));
      }
    }
  }

  /**
   * Log to console with formatting (development only)
   */
  private logToConsole(entry: LogEntry) {
    const styles = {
      debug: 'color: #6b7280', // gray
      info: 'color: #3b82f6',   // blue
      warn: 'color: #f59e0b',   // orange
      error: 'color: #ef4444',  // red
    };

    const prefix = `[${entry.level.toUpperCase()}]`;
    const correlationInfo = entry.correlationId ? ` [${entry.correlationId.substring(0, 8)}]` : '';
    const userInfo = entry.userId ? ` 👤${entry.userId.substring(0, 4)}` : '';

    console.log(
      `%c${prefix}${correlationInfo}${userInfo} ${entry.message}`,
      styles[entry.level]
    );

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console.log('  📦 Metadata:', entry.metadata);
    }

    if (entry.error) {
      console.log('  🔥 Error:', entry.error);
      if (entry.error.stack) {
        console.log(entry.error.stack);
      }
    }
  }

  /**
   * Queue log for batch sending to backend
   */
  private queueLog(entry: LogEntry) {
    this.logQueue.push(entry);

    // If queue is too large, flush immediately
    if (this.logQueue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * Flush log queue to backend
   */
  private async flush() {
    if (this.logQueue.length === 0) return;

    const logs = [...this.logQueue];
    this.logQueue = [];

    try {
      // Send to backend logging endpoint
      const response = await fetch('/api/v1/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs }),
        keepalive: true, // Important for logs during page unload
      });

      if (!response.ok) {
        console.warn('Failed to send logs to backend:', await response.text());
      }
    } catch (error) {
      // Silently fail in production - don't let logging break the app
      if (this.isDevelopment) {
        console.warn('Failed to flush logs:', error);
      }
    }
  }

  /**
   * Create a child logger with component context
   */
  child(component: string) {
    return new ChildLogger(this, component);
  }

  /**
   * Measure execution time of an async function
   */
  async time<T>(
    action: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.info(`⏱️ ${action} completed`, { ...metadata, duration, status: 'success' });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`⏱️ ${action} failed`, error instanceof Error ? error : undefined, {
        ...metadata,
        duration,
        status: 'error',
      });
      throw error;
    }
  }

  /**
   * Measure execution time of a synchronous function
   */
  timeSync<T>(action: string, fn: () => T, metadata?: Record<string, unknown>): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.info(`⏱️ ${action} completed`, { ...metadata, duration, status: 'success' });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`⏱️ ${action} failed`, error instanceof Error ? error : undefined, {
        ...metadata,
        duration,
        status: 'error',
      });
      throw error;
    }
  }
}

/**
 * Child logger with component context
 */
class ChildLogger {
  constructor(
    private parent: LoggerService,
    private component: string
  ) {}

  debug(message: string, metadata?: Record<string, unknown>) {
    this.parent.debug(message, { ...metadata, component: this.component });
  }

  info(message: string, metadata?: Record<string, unknown>) {
    this.parent.info(message, { ...metadata, component: this.component });
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.parent.warn(message, { ...metadata, component: this.component });
  }

  error(message: string, error?: Error, metadata?: Record<string, unknown>) {
    this.parent.error(message, error, { ...metadata, component: this.component });
  }

  async time<T>(action: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    return this.parent.time(`${this.component}.${action}`, fn, metadata);
  }

  timeSync<T>(action: string, fn: () => T, metadata?: Record<string, unknown>): T {
    return this.parent.timeSync(`${this.component}.${action}`, fn, metadata);
  }
}

// Export singleton instance
export const logger = LoggerService.getInstance();

// Export convenience functions
export const setCorrelationId = (id: string) => logger.setCorrelationId(id);
export const setUserContext = (userId: string, organizationId: string) => 
  logger.setUserContext(userId, organizationId);
export const clearUserContext = () => logger.clearUserContext();
export const generateCorrelationId = () => logger.generateCorrelationId();
// apps/api/src/shared/logging/logger.service.ts

import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import { als } from '../als';

/**
 * Extended log info interface for Winston
 */
interface LogInfo {
  level: string;
  message: string;
  timestamp?: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Application Logger Service
 *
 * Provides structured logging with:
 * - Request context injection (requestId, tenantId, userId)
 * - Multiple log transports (console, file)
 * - Log rotation (5MB max, 5 files)
 * - Environment-aware log levels
 *
 * @example
 * ```typescript
 * constructor(private logger: AppLogger) {
 *   this.logger.log('Application started');
 *   this.logger.error('Error occurred', error.stack, { context: 'Service' });
 * }
 * ```
 */
@Injectable()
export class AppLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    // Use centralized log directory at project root
    const logDir = path.join(__dirname, '../../../../logs/api');

    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Custom format to inject request context
    const requestContextFormat = winston.format((info: LogInfo) => {
      const store = als.getStore();
      if (store) {
        if (store.requestId && typeof store.requestId === 'string') {
          info.requestId = store.requestId;
        }
        if (store.tenantId && typeof store.tenantId === 'string') {
          info.tenantId = store.tenantId;
        }
        if (store.userId && typeof store.userId === 'string') {
          info.userId = store.userId;
        }
      }
      return info;
    });

    // Custom console format with safe string conversion
    const consoleFormat = winston.format.printf((info: LogInfo) => {
      const timestamp = info.timestamp ? String(info.timestamp) : '';
      const level = info.level ? String(info.level) : '';
      const message = info.message ? String(info.message) : '';

      // Safe request ID extraction
      const reqStr =
        info.requestId && typeof info.requestId === 'string'
          ? ` [Req:${info.requestId.substring(0, 8)}]`
          : '';

      const tenantStr =
        info.tenantId && typeof info.tenantId === 'string'
          ? ` [Tenant:${info.tenantId.substring(0, 8)}]`
          : '';

      const userStr =
        info.userId && typeof info.userId === 'string'
          ? ` [User:${info.userId.substring(0, 8)}]`
          : '';

      // Extract meta (exclude standard fields by creating a new object)
      const meta: Record<string, unknown> = {};
      for (const key of Object.keys(info)) {
        if (
          key !== 'level' &&
          key !== 'message' &&
          key !== 'timestamp' &&
          key !== 'requestId' &&
          key !== 'tenantId' &&
          key !== 'userId'
        ) {
          meta[key] = info[key];
        }
      }

      const metaStr = Object.keys(meta).length
        ? ` ${JSON.stringify(meta)}`
        : '';

      return `${timestamp}${reqStr}${tenantStr}${userStr} ${level}: ${message}${metaStr}`;
    });

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        requestContextFormat(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            consoleFormat,
          ),
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            requestContextFormat(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880,
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            requestContextFormat(),
            winston.format.json(),
          ),
        }),
      ],
    });
  }

  /**
   * Log an info message
   */
  log(message: string, context?: Record<string, unknown>): void {
    this.logger.info(message, context);
  }

  /**
   * Log an error message
   */
  error(
    message: string,
    trace?: string,
    context?: Record<string, unknown>,
  ): void {
    this.logger.error(message, { trace, ...context });
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(message, context);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(message, context);
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, context?: Record<string, unknown>): void {
    this.logger.verbose(message, context);
  }
}

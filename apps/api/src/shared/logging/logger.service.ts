// apps/api/src/shared/logging/logger.service.ts

import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import { als, AlsStore } from '../als'; // ✅ Import AlsStore type

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

    // Custom format to inject request context with proper typing
    const requestContextFormat = winston.format((info) => {
      const store = als.getStore();
      if (store) {
        // ✅ Safely add context with type checking
        if (store.requestId) info.requestId = store.requestId;
        if (store.tenantId) info.tenantId = store.tenantId;
        if (store.userId) info.userId = store.userId;
      }
      return info;
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
            winston.format.printf(({ level, message, timestamp, requestId, tenantId, userId, ...meta }) => {
              // ✅ Safe string operations with type guards
              const reqStr = requestId && typeof requestId === 'string' 
                ? ` [Req:${requestId.substring(0,8)}]` 
                : '';
              
              const tenantStr = tenantId && typeof tenantId === 'string' 
                ? ` [Tenant:${tenantId.substring(0,8)}]` 
                : '';
              
              const userStr = userId && typeof userId === 'string' 
                ? ` [User:${userId.substring(0,8)}]` 
                : '';
              
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp}${reqStr}${tenantStr}${userStr} ${level}: ${message}${metaStr}`;
            }),
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

  log(message: string, context?: any) {
    this.logger.info(message, context);
  }

  error(message: string, trace?: string, context?: any) {
    this.logger.error(message, { trace, ...context });
  }

  warn(message: string, context?: any) {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: any) {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: any) {
    this.logger.verbose(message, context);
  }
}
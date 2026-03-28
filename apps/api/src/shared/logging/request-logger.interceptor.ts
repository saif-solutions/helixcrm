// apps/api/src/shared/logging/request-logger.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger } from './logger.service';
import { RequestWithId } from '../types/request-with-id';
import type { Response } from 'express';

/**
 * Extended response interface
 */
interface ExtendedResponse extends Response {
  statusCode: number;
}

/**
 * Request Logger Interceptor
 *
 * Logs all incoming requests and their responses including:
 * - Request start time and details
 * - Response status code and duration
 * - Error details if request fails
 *
 * @example
 * ```typescript
 * // In main.ts
 * app.useGlobalInterceptors(new RequestLoggerInterceptor(appLogger));
 * ```
 */
@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  constructor(private logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context.switchToHttp().getResponse<ExtendedResponse>();

    const requestId = request.requestId || 'interceptor-missing';
    const startTime = Date.now();

    // Log request start
    this.logger.log('Request started', {
      requestId,
      method: request.method,
      url: request.url,
      userId: request.user?.sub,
      organizationId: request.user?.organizationId,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    return next.handle().pipe(
      tap({
        next: (): void => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logger.log('Request completed', {
            requestId,
            statusCode,
            duration: `${duration}ms`,
            userId: request.user?.sub,
            organizationId: request.user?.organizationId,
          });
        },
        error: (error: Error | HttpException): void => {
          const duration = Date.now() - startTime;
          const status =
            error instanceof HttpException ? error.getStatus() : 500;
          const errorMessage = error.message || 'Unknown error';
          const errorStack = error.stack;

          this.logger.error('Request failed', errorStack, {
            requestId,
            statusCode: status,
            duration: `${duration}ms`,
            userId: request.user?.sub,
            organizationId: request.user?.organizationId,
            error: errorMessage,
          });
        },
      }),
    );
  }
}

// File: apps/api/src/shared/logging/request-logger.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger } from './logger.service';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  constructor(private logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
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
        next: (data) => {
          const duration = Date.now() - startTime;
          this.logger.log('Request completed', {
            requestId,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            userId: request.user?.sub,
            organizationId: request.user?.organizationId,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error('Request failed', error.stack, {
            requestId,
            statusCode: error.status || 500,
            duration: `${duration}ms`,
            userId: request.user?.sub,
            organizationId: request.user?.organizationId,
            error: error.message,
          });
        },
      }),
    );
  }
}
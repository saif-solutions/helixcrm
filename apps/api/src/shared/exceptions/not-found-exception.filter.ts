import {
  ExceptionFilter,
  Catch,
  NotFoundException,
  ArgumentsHost,
} from '@nestjs/common';
import { Response } from 'express';
import { RequestWithId } from '../types/request-with-id';

/**
 * Standardized not found error response interface
 */
interface NotFoundErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  error: string;
  requestId: string;
}

/**
 * Exception filter specifically for handling 404 Not Found errors
 * Provides consistent response format for missing routes
 *
 * @example
 * ```typescript
 * // In main.ts
 * app.useGlobalFilters(new NotFoundExceptionFilter());
 * ```
 */
@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const status = exception.getStatus();

    // Get request ID from request or response header as fallback
    const requestId =
      request.requestId ||
      (response.getHeader('X-Request-ID') as string) ||
      'middleware-missing';

    // Create standardized error response
    const errorResponse: NotFoundErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: `Cannot ${request.method} ${request.url}`,
      error: 'Not Found',
      requestId,
    };

    response.status(status).json(errorResponse);
  }
}

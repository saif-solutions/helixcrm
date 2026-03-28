import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { RequestWithId } from '../types/request-with-id';

/**
 * Standardized error response interface
 */
interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  error?: string;
  requestId?: string;
  code?: string;
}

/**
 * HTTP exception response structure
 */
interface HttpExceptionResponse {
  message: string | string[];
  error?: string;
  code?: string;
  statusCode?: number;
}

/**
 * Global exception filter that handles all uncaught exceptions
 * Provides consistent error response format and proper logging
 *
 * @example
 * ```typescript
 * // In main.ts
 * app.useGlobalFilters(new GlobalExceptionFilter());
 * ```
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    // Get request ID from request or response header as fallback
    const requestId =
      request.requestId ||
      (response.getHeader('X-Request-ID') as string) ||
      'unknown';

    const path = request.url;
    const method = request.method;

    // Initialize variables with proper typing
    let status: number;
    let message: string;
    let errorType: string;
    let code: string | undefined;

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Type-safe handling of exception response
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorType = 'HttpException';
      } else {
        const responseObj = exceptionResponse as HttpExceptionResponse;
        // Handle message which could be string or string array
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
        } else {
          message = responseObj.message || 'An error occurred';
        }
        errorType = responseObj.error || 'HttpException';
        code = responseObj.code;
      }
    } else {
      // Handle unknown exceptions
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorType = 'InternalServerError';
      code = 'INTERNAL_SERVER_ERROR';

      // Log unexpected errors with full context
      const errorDetails = this.formatErrorDetails(exception);
      this.logger.error({
        requestId,
        method,
        path,
        ...errorDetails,
        timestamp: new Date().toISOString(),
      });
    }

    // Never expose stack traces in production
    const isProduction = process.env.NODE_ENV === 'production';
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path,
      message: isProduction && status >= 500 ? 'Something went wrong' : message,
      error: errorType,
      requestId,
    };

    // Only add code if it exists
    if (code) {
      errorResponse.code = code;
    }

    // Log all client errors (4xx) and server errors (5xx)
    if (status >= 400) {
      const logData = {
        requestId,
        method,
        path,
        status,
        errorType,
        message,
        timestamp: new Date().toISOString(),
      };

      if (status >= 500) {
        this.logger.error(logData);
      } else {
        this.logger.warn(logData);
      }
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Format error details for logging
   */
  private formatErrorDetails(exception: unknown): Record<string, unknown> {
    if (exception instanceof Error) {
      return {
        errorType: exception.name,
        errorMessage: exception.message,
        stack: exception.stack,
      };
    }

    return {
      errorType: 'UnknownError',
      errorValue: exception,
    };
  }
}

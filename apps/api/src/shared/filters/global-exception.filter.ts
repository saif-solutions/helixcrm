import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { als } from '../als';

/**
 * Standardized error response interface
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  requestId: string;
  timestamp: string;
  path?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * HTTP exception response structure
 */
interface HttpExceptionResponse {
  message: string | string[];
  error?: string;
  code?: string;
  statusCode?: number;
  [key: string]: unknown;
}

/**
 * Validation error details
 */
interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
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
@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  // Environment configuration
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Main exception handler
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get request ID from ALS or generate fallback
    const requestId = als.getStore()?.requestId || this.generateRequestId();

    // Extract request information
    const path = request.url;
    const method = request.method;
    const timestamp = new Date().toISOString();

    // Process the exception
    const { status, errorResponse } = this.processException(
      exception,
      requestId,
      path,
      method,
      timestamp,
    );

    // Log the error
    this.logError(exception, status, requestId, path, method, errorResponse);

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Process exception and build standardized error response
   */
  private processException(
    exception: unknown,
    requestId: string,
    path: string,
    method: string,
    timestamp: string,
  ): { status: number; errorResponse: ErrorResponse } {
    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      return this.processHttpException(exception, requestId, path, timestamp);
    }

    // Handle validation errors (class-validator)
    if (this.isValidationError(exception)) {
      return this.processValidationError(exception, requestId, path, timestamp);
    }

    // Handle Prisma errors
    if (this.isPrismaError(exception)) {
      return this.processPrismaError(exception, requestId, path, timestamp);
    }

    // Handle unknown errors
    return this.processUnknownError(exception, requestId, path, timestamp);
  }

  /**
   * Process HTTP exception
   */
  private processHttpException(
    exception: HttpException,
    requestId: string,
    path: string,
    timestamp: string,
  ): { status: number; errorResponse: ErrorResponse } {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let error: string | undefined;
    let code: string | undefined;
    let details: Record<string, unknown> | undefined;

    // Type-safe handling of exception response
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = 'HttpException';
    } else {
      const responseObj = exceptionResponse as HttpExceptionResponse;

      // Handle message which could be string or string array
      if (Array.isArray(responseObj.message)) {
        message = responseObj.message.join(', ');
      } else {
        message = responseObj.message || exception.message;
      }

      error = responseObj.error;
      code = responseObj.code;

      // Extract additional details (excluding standard fields)
      // Create a new object without the standard fields to capture custom properties
      const customDetails: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(responseObj)) {
        if (key !== 'message' && key !== 'error' && key !== 'statusCode') {
          customDetails[key] = value;
        }
      }

      if (Object.keys(customDetails).length > 0) {
        details = customDetails;
      }
    }

    // Don't expose internal error details in production for 5xx errors
    const shouldHideDetails = this.isProduction && status >= 500;

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: shouldHideDetails
        ? 'An internal server error occurred'
        : message,
      requestId,
      timestamp,
      path,
      error,
      code,
      details: shouldHideDetails ? undefined : details,
    };

    return { status, errorResponse };
  }

  /**
   * Process validation errors (class-validator)
   */
  private processValidationError(
    exception: unknown,
    requestId: string,
    path: string,
    timestamp: string,
  ): { status: number; errorResponse: ErrorResponse } {
    const status = HttpStatus.BAD_REQUEST;
    const validationErrors = this.extractValidationErrors(exception);

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: 'Validation failed',
      requestId,
      timestamp,
      path,
      error: 'ValidationError',
      code: 'VALIDATION_FAILED',
      details: {
        errors: validationErrors,
      },
    };

    return { status, errorResponse };
  }

  /**
   * Process Prisma database errors
   */
  private processPrismaError(
    exception: unknown,
    requestId: string,
    path: string,
    timestamp: string,
  ): { status: number; errorResponse: ErrorResponse } {
    const error = exception as {
      code?: string;
      meta?: Record<string, unknown>;
    };
    const prismaCode = error.code;

    let status: HttpStatus;
    let message: string;
    let userMessage: string;
    let code: string;

    // Map Prisma error codes to user-friendly messages
    if (prismaCode === 'P2002') {
      status = HttpStatus.CONFLICT;
      message = 'A record with this value already exists';
      userMessage = message;
      code = 'UNIQUE_CONSTRAINT_VIOLATION';
    } else if (prismaCode === 'P2003') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Referenced record does not exist';
      userMessage = message;
      code = 'FOREIGN_KEY_CONSTRAINT_VIOLATION';
    } else if (prismaCode === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      message = 'Record not found';
      userMessage = message;
      code = 'RECORD_NOT_FOUND';
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Database error occurred';
      userMessage = this.isDevelopment
        ? message
        : 'An internal server error occurred';
      code = 'DATABASE_ERROR';
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: userMessage,
      requestId,
      timestamp,
      path,
      error: 'DatabaseError',
      code,
      details: this.isDevelopment
        ? {
            prismaCode,
            meta: error.meta,
          }
        : undefined,
    };

    return { status, errorResponse };
  }

  /**
   * Process unknown/unexpected errors
   */
  private processUnknownError(
    exception: unknown,
    requestId: string,
    path: string,
    timestamp: string,
  ): { status: number; errorResponse: ErrorResponse } {
    const status = HttpStatus.INTERNAL_SERVER_ERROR;

    // Get error details for logging
    const errorMessage = this.getErrorMessage(exception);
    const errorStack = this.getErrorStack(exception);

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: this.isProduction
        ? 'An internal server error occurred'
        : errorMessage,
      requestId,
      timestamp,
      path,
      error: 'InternalServerError',
      code: 'INTERNAL_SERVER_ERROR',
      details: this.isDevelopment
        ? {
            stack: errorStack,
          }
        : undefined,
    };

    return { status, errorResponse };
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(
    exception: unknown,
    status: number,
    requestId: string,
    path: string,
    method: string,
    errorResponse: ErrorResponse,
  ): void {
    const logContext = {
      requestId,
      path,
      method,
      status,
      error: errorResponse.error,
      code: errorResponse.code,
      timestamp: errorResponse.timestamp,
    };

    // Log with appropriate level - convert status to number for safe comparison
    const statusCode = Number(status);

    if (statusCode >= 500) {
      // Server errors - always log full details
      this.logger.error(
        `[${requestId}] ${method} ${path} - ${statusCode}: ${errorResponse.message}`,
        this.getErrorStack(exception),
        logContext,
      );
    } else if (statusCode >= 400) {
      // Client errors - log as warning with details
      this.logger.warn(
        `[${requestId}] ${method} ${path} - ${statusCode}: ${errorResponse.message}`,
        logContext,
      );
    } else {
      // Other errors - log as debug
      this.logger.debug(
        `[${requestId}] ${method} ${path} - ${statusCode}: ${errorResponse.message}`,
        logContext,
      );
    }
  }

  /**
   * Extract validation errors from exception
   */
  private extractValidationErrors(exception: unknown): ValidationErrorDetail[] {
    // Check for class-validator errors
    const errorObj = exception as {
      response?: { message?: string | string[] };
      getResponse?: () => { message?: string | string[] };
    };

    let messages: string[] = [];

    if (errorObj.getResponse) {
      const response = errorObj.getResponse();
      if (response && typeof response === 'object' && 'message' in response) {
        const msg = (response as { message: string | string[] }).message;
        messages = Array.isArray(msg) ? msg : [msg];
      }
    } else if (errorObj.response?.message) {
      messages = Array.isArray(errorObj.response.message)
        ? errorObj.response.message
        : [errorObj.response.message];
    }

    return messages.map((msg, index) => ({
      field: `field_${index}`,
      message: msg,
    }));
  }

  /**
   * Check if exception is a validation error
   */
  private isValidationError(exception: unknown): boolean {
    const errorObj = exception as {
      name?: string;
      response?: { message?: unknown };
    };
    return (
      errorObj.name === 'BadRequestException' && !!errorObj.response?.message
    );
  }

  /**
   * Check if exception is a Prisma error
   */
  private isPrismaError(exception: unknown): boolean {
    const errorObj = exception as {
      constructor?: { name?: string };
      code?: string;
    };
    return (
      errorObj.constructor?.name === 'PrismaClientKnownRequestError' ||
      errorObj.constructor?.name === 'PrismaClientValidationError' ||
      !!errorObj.code
    );
  }

  /**
   * Safely extract error message
   */
  private getErrorMessage(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.message;
    }

    if (typeof exception === 'string') {
      return exception;
    }

    return 'Unknown error occurred';
  }

  /**
   * Safely extract error stack trace
   */
  private getErrorStack(exception: unknown): string | undefined {
    if (exception instanceof Error) {
      return exception.stack;
    }

    return undefined;
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
}

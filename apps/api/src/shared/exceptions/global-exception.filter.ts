import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestWithId } from '../types/request-with-id';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  error?: string;
  requestId?: string;
  code?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    
    // Get request ID from request or response header as fallback
    const requestId = request.requestId || 
                     (response.getHeader('X-Request-ID') as string) || 
                     'unknown';
    
    const path = request.url;
    const method = request.method;

    let status: number;
    let message: string;
    let error: string = 'UnknownError';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = 'HttpException';
      } else {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || 'An error occurred';
        error = responseObj.error || 'HttpException';
        code = responseObj.code;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';
      code = 'INTERNAL_SERVER_ERROR';
      
      // Log unexpected errors
      const errorDetails = exception instanceof Error ? {
        message: exception.message,
        stack: exception.stack,
      } : { unknownError: exception };
      
      this.logger.error({
        requestId,
        method,
        path,
        ...errorDetails,
      });
    }

    // Never expose stack traces in production
    const isProduction = process.env.NODE_ENV === 'production';
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path,
      message: isProduction && status >= 500 ? 'Something went wrong' : message,
      error,
      requestId,
    };

    // Only add code if it exists
    if (code) {
      errorResponse.code = code;
    }

    // Log all errors (except 404 maybe)
    if (status >= 400) {
      this.logger.warn({
        requestId,
        method,
        path,
        status,
        error: message,
      });
    }

    response.status(status).json(errorResponse);
  }
}

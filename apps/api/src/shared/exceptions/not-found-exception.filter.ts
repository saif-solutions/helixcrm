import {
  ExceptionFilter,
  Catch,
  NotFoundException,
  ArgumentsHost,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestWithId } from '../types/request-with-id';

@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const status = exception.getStatus();

    // Get request ID from request or response header as fallback
    const requestId = request.requestId || 
                     (response.getHeader('X-Request-ID') as string) || 
                     'middleware-missing';
    
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: `Cannot ${request.method} ${request.url}`,
      error: 'Not Found',
      requestId,
    });
  }
}

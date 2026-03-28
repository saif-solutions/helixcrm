import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extended Request interface with optional custom properties
 */
interface ExtendedRequest extends Request {
  id?: string;
}

/**
 * Custom decorator to extract or generate a request ID from the request
 * @returns The request ID from headers or a generated fallback
 *
 * @example
 * ```typescript
 * @Get()
 * getData(@RequestId() requestId: string) {
 *   this.logger.log(`Processing request: ${requestId}`);
 *   // ...
 * }
 * ```
 */
export const RequestId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<ExtendedRequest>();

    // Try to get request ID from headers
    const headerRequestId = request.headers['x-request-id'];

    // Return header value if it's a valid string
    if (typeof headerRequestId === 'string' && headerRequestId.trim()) {
      return headerRequestId;
    }

    // Try to get custom ID from request object
    if (request.id && typeof request.id === 'string' && request.id.trim()) {
      return request.id;
    }

    // Generate a fallback request ID
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  },
);

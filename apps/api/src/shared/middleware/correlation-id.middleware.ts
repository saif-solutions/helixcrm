// apps/api/src/shared/middleware/correlation-id.middleware.ts

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extended request interface with correlation and request IDs
 */
interface RequestWithIds extends Request {
  correlationId?: string;
  requestId?: string;
}

/**
 * Correlation ID Middleware
 *
 * Adds correlation and request IDs to each request for tracing and debugging.
 * - correlationId: For tracking requests across services (propagated to downstream services)
 * - requestId: Unique identifier for this specific request instance
 *
 * Features:
 * - Preserves incoming correlation IDs from headers
 * - Generates new IDs if none exist
 * - Sets response headers for client tracing
 * - Logs IDs for debugging
 *
 * @example
 * ```typescript
 * // In app.module.ts
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(CorrelationIdMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  use(req: RequestWithIds, res: Response, next: NextFunction): void {
    const startTime = this.isProduction ? undefined : performance.now();

    // Get correlation ID from header or generate new one
    const correlationId = this.getCorrelationId(req);
    const requestId = uuidv4();

    // Attach to request object with proper typing
    req.correlationId = correlationId;
    req.requestId = requestId;

    // Set response headers for client tracing
    res.setHeader('X-Correlation-Id', correlationId);
    res.setHeader('X-Request-Id', requestId);

    // Log in development
    if (!this.isProduction) {
      const executionTime = performance.now() - (startTime ?? 0);
      this.logger.debug(
        `IDs assigned - Correlation: ${correlationId.substring(0, 8)}... Request: ${requestId.substring(0, 8)}...`,
        {
          correlationId,
          requestId,
          executionTime: `${executionTime.toFixed(2)}ms`,
        },
      );
    }

    next();
  }

  /**
   * Get correlation ID from request headers or generate new one
   */
  private getCorrelationId(req: RequestWithIds): string {
    // Check for existing correlation ID in headers
    const headerId = req.headers['x-correlation-id'];
    if (headerId && typeof headerId === 'string' && headerId.trim()) {
      return headerId.trim();
    }

    // Check for existing correlation ID on request (from upstream)
    if (
      req.correlationId &&
      typeof req.correlationId === 'string' &&
      req.correlationId.trim()
    ) {
      return req.correlationId.trim();
    }

    // Generate new correlation ID
    return uuidv4();
  }
}

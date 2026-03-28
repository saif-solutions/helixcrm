// apps/api/src/shared/middleware/request-context.middleware.ts

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { als } from '../als';

/**
 * Extended request interface with request ID
 */
interface RequestWithId extends Request {
  requestId?: string;
  correlationId?: string;
}

/**
 * Initial store context for ALS (Async Local Storage)
 */
interface AlsStore {
  requestId: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Request Context Middleware
 *
 * Sets up Async Local Storage (ALS) context for each request.
 * This allows request-scoped data to be accessed anywhere in the application
 * without passing it through function parameters.
 *
 * The context stores:
 * - requestId: Unique identifier for this request
 * - correlationId: For cross-service tracing
 * - tenantId: Current tenant context (set by TenantGuard)
 * - userId: Current authenticated user (set by AuthGuard)
 * - userEmail: User's email for logging
 * - roles: User's roles for permission checks
 * - permissions: User's permissions for authorization
 *
 * @example
 * ```typescript
 * // In app.module.ts
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(RequestContextMiddleware).forRoutes('*');
 *   }
 * }
 *
 * // Usage in any service
 * import { als } from '../als';
 * const store = als.getStore();
 * console.log(store?.requestId); // Access current request ID
 * ```
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const startTime = this.isProduction ? undefined : performance.now();

    // Get request ID from header or generate new one
    const incomingId = req.header('X-Request-ID');
    const requestId =
      incomingId && typeof incomingId === 'string' && incomingId.trim()
        ? incomingId.trim()
        : randomUUID();

    // Get correlation ID from request (set by CorrelationIdMiddleware)
    const correlationId = req.correlationId || req.header('X-Correlation-Id');

    // Set request ID on request object and response header
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Create initial ALS context
    const store: AlsStore = {
      requestId,
      correlationId:
        correlationId && typeof correlationId === 'string'
          ? correlationId
          : undefined,
      tenantId: undefined, // Will be set by TenantGuard
      userId: undefined, // Will be set after authentication
      userEmail: undefined,
      roles: undefined,
      permissions: undefined,
    };

    // Log context creation in development
    if (!this.isProduction) {
      const executionTime = performance.now() - (startTime ?? 0);
      this.logger.debug(
        `ALS context created - RequestId: ${requestId.substring(0, 8)}...`,
        {
          requestId: requestId.substring(0, 8),
          correlationId:
            correlationId && typeof correlationId === 'string'
              ? correlationId.substring(0, 8)
              : undefined,
          executionTime: `${executionTime.toFixed(2)}ms`,
        },
      );
    }

    // Run the entire request within the ALS context
    als.run(store, () => {
      next();
    });
  }
}

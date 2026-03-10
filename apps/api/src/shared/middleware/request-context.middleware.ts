// apps/api/src/shared/middleware/request-context.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { als } from '../als'; // ✅ Import the SINGLE ALS instance

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incomingId = req.header('X-Request-ID');
    const requestId = incomingId || randomUUID();

    // Set request ID on request object and response header
    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // ✅ Use the single ALS instance
    // Create initial context
    const store = {
      requestId,
      tenantId: undefined, // Will be set by TenantGuard
      userId: undefined, // Will be set after authentication
      userEmail: undefined,
      roles: undefined,
      permissions: undefined,
    };

    // ✅ Run the entire request within the single ALS context
    als.run(store, () => {
      next();
    });
  }
}

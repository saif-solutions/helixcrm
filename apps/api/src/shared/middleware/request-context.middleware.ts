// apps/api/src/shared/middleware/request-context.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { TenantContextStorage } from '../tenant/tenant.context';
import { TenantContext } from '../tenant/tenant.types';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incomingId = req.header('X-Request-ID');
    const requestId = incomingId || randomUUID();

    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // CRITICAL: Create initial context with proper TenantContext type
    const initialContext: TenantContext = {
      tenantId: 'PENDING',
      organizationId: 'PENDING',
      isSystemContext: false,
      resolvedAt: new Date(),
      source: 'pending',  // ✅ Fixed: Use 'pending' which is allowed in the union type
      requestId: requestId,
    };

    // CRITICAL: Run the entire request within this AsyncLocalStorage context
    TenantContextStorage.run(initialContext, () => {
      next();
    });
  }
}
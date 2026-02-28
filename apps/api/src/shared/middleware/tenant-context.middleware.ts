// apps/api/src/shared/middleware/tenant-context.middleware.ts

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from '../tenant/context/tenant-context.service';
import { withTenantContext } from '../tenant/tenant.context';

// Extend Express Request type
declare module 'express' {
  interface Request {
    user?: {
      sub: string;
      id?: string;
      organizationId?: string;
      org?: string;
      email?: string;
      roles?: string[];
      permissions?: string[];
      [key: string]: any;
    };
    organizationId?: string;
    tenantContext?: any;
  }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(private readonly tenantContextService: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    try {
      // Skip for public paths
      const publicPaths = ['/health', '/metrics', '/public', '/docs', '/api-docs', '/auth/login', '/auth/register'];
      if (publicPaths.some(path => req.path.includes(path))) {
        return next();
      }

      // Try to get tenant from header first
      let tenantId = req.headers['x-tenant-id'] as string;
      let source: 'header' | 'token' | 'system' = 'header';

      // If header exists, use it
      if (tenantId) {
        this.logger.debug(`Using tenant from header: ${tenantId}`);
      } else {
        // No header - set to PENDING, not SYSTEM
        tenantId = 'PENDING';
        source = 'system';
        this.logger.debug(`No tenant header, setting PENDING context for ${req.path}`);
      }

      // Create context
      const context = {
        tenantId: tenantId,
        organizationId: tenantId,
        isSystemContext: source === 'system',
        resolvedAt: new Date(),
        source: source as 'header' | 'token' | 'system',
        userId: req.user?.id || req.user?.sub,
        userEmail: req.user?.email,
        roles: req.user?.roles || [],
        permissions: req.user?.permissions || [],
      };

      // Store in request
      (req as any).tenantContext = context;
      req.organizationId = tenantId;

      // Log what we're setting
      this.logger.debug(`Setting initial context: ${tenantId} (${source})`);

      // Run rest of request with this context
      withTenantContext(context, () => {
        next();
      });
    } catch (error) {
      this.logger.error(`Tenant context middleware error: ${error.message}`);
      next();
    }
  }
}
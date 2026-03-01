// apps/api/src/shared/middleware/tenant-context.middleware.ts

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from '../tenant/context/tenant-context.service';
import { setTenantContext } from '../tenant/tenant.context';
import { TenantContext } from '../tenant/tenant.types';

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
    tenantContext?: TenantContext;
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
        this.logger.debug(`Skipping tenant context for public path: ${req.path}`);
        return next();
      }

      // Try to get tenant from header first (for service-to-service calls)
      let tenantId = req.headers['x-tenant-id'] as string;
      let source: 'header' | 'pending' | 'system' = 'header';
      let isSystemContext = false;

      // If header exists, use it
      if (tenantId) {
        this.logger.debug(`Using tenant from header: ${tenantId}`);
        source = 'header';
        isSystemContext = false;
      } else {
        // No header - set to PENDING
        tenantId = 'PENDING';
        source = 'pending';
        isSystemContext = false;
        this.logger.debug(`No tenant header, setting PENDING context for ${req.path}`);
      }

      // Create context
      const context: TenantContext = {
        tenantId: tenantId,
        organizationId: tenantId,
        isSystemContext: isSystemContext,
        resolvedAt: new Date(),
        source: source,
        userId: req.user?.id || req.user?.sub,
        userEmail: req.user?.email,
        roles: req.user?.roles || [],
        permissions: req.user?.permissions || [],
      };

      // Store in request for backward compatibility
      (req as any).tenantContext = context;
      req.organizationId = tenantId;

      // CRITICAL: Set the context directly using setTenantContext
      // This ensures it's available for the entire request
      setTenantContext(context);

      this.logger.debug(`Tenant context middleware - set context: ${tenantId} (${source})`);

      next();
    } catch (error) {
      this.logger.error(`Tenant context middleware error: ${error.message}`);
      // Still continue, but log error
      next();
    }
  }
}

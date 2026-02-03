// apps/api/src/shared/tenant/context/tenant-context.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { TenantContext, TenantContextOptions, ITenantContextService } from './tenant-context.interface';
import { TenantUser } from './tenant-types.interface';
import { Request } from 'express';

@Injectable()
export class TenantContextService implements ITenantContextService {
  private readonly logger = new Logger(TenantContextService.name);
  
  // Store context by request ID
  private contexts: Map<string, TenantContext> = new Map();
  // Track which request ID is "current" for this service instance
  private currentRequestId: string | null = null;

  constructor() {}

  /**
   * Resolve tenant context for the current request
   * Called by TenantGuard - sets this as the current request
   */
  resolveContext(request: Request, options: TenantContextOptions = {}): TenantContext {
    const requestId = this.getRequestId(request);
    this.currentRequestId = requestId;
    
    if (this.contexts.has(requestId)) {
      return this.contexts.get(requestId)!;
    }

    const { allowSystemContext = false, requireTenantContext = true } = options;
    
    // Try to get tenant from various sources
    let tenantId: string | undefined;
    let source: 'header' | 'token' | 'system' = 'header';
    
    // 1. Check request organizationId (set by middleware)
    if ((request as any).organizationId) {
      tenantId = (request as any).organizationId;
      source = 'header';
    }
    // 2. Check user token (from auth guard)
    else if ((request.user as TenantUser)?.organizationId) {
      tenantId = (request.user as TenantUser).organizationId;
      source = 'token';
    }
    // 3. Check if this is a system context
    else if (allowSystemContext && this.isSystemRequest(request)) {
      tenantId = 'SYSTEM';
      source = 'system';
    }
    // 4. No tenant found
    else {
      if (requireTenantContext) {
        this.logger.error('Tenant context required but not found', {
          path: request.path,
          method: request.method,
        });
        throw new Error('Tenant context required');
      }
      // Allow without tenant (system context)
      tenantId = 'SYSTEM';
      source = 'system';
    }

    const context: TenantContext = {
      tenantId,
      isSystemContext: source === 'system',
      resolvedAt: new Date(),
      source,
    };

    // Store context
    this.contexts.set(requestId, context);

    // Store in request for debugging
    (request as any).tenantContext = context;

    this.logger.debug(`Tenant context resolved: ${tenantId} (${source})`);
    
    // Clean up old contexts (simple cleanup)
    if (this.contexts.size > 1000) {
      this.cleanupOldContexts();
    }
    
    return context;
  }

  /**
   * Get tenant ID (throws if not resolved)
   */
  getTenantId(): string {
    const context = this.getCurrentContext();
    return context.tenantId;
  }

  /**
   * Get tenant name (if available)
   */
  getTenantName(): string | undefined {
    const context = this.getCurrentContext();
    return context.tenantName;
  }

  /**
   * Check if this is a system context
   */
  isSystemContext(): boolean {
    const context = this.getCurrentContext();
    return context.isSystemContext;
  }

  /**
   * Assert that tenant context exists (non-system)
   */
  assertTenantContext(): void {
    const context = this.getCurrentContext();
    if (context.isSystemContext) {
      throw new Error('Tenant context required but system context found');
    }
  }

  /**
   * Assert that this is NOT a system context
   */
  assertNotSystemContext(): void {
    const context = this.getCurrentContext();
    if (context.isSystemContext) {
      throw new Error('System context not allowed for this operation');
    }
  }

  /**
   * Get raw context (for debugging)
   */
  getRawContext(): TenantContext {
    return this.getCurrentContext();
  }

  /**
   * Check if request appears to be a system request
   */
  private isSystemRequest(request: Request): boolean {
    const path = request.path;
    const method = request.method;
    
    // System paths (adjust as needed)
    const systemPaths = [
      '/health',
      '/metrics',
      '/system/',
      '/admin/',
      '/migration',
      '/seed',
    ];
    
    return systemPaths.some(systemPath => path.startsWith(systemPath));
  }

  /**
   * Get context for current request
   */
  private getCurrentContext(): TenantContext {
    if (!this.currentRequestId) {
      throw new Error('No current request context. Ensure TenantGuard runs before using TenantContextService methods.');
    }
    
    const context = this.contexts.get(this.currentRequestId);
    
    if (!context) {
      throw new Error('Tenant context not resolved. Ensure TenantGuard runs before using TenantContextService.');
    }
    
    return context;
  }

  /**
   * Get unique request ID
   */
  private getRequestId(request: Request): string {
    // Use correlation ID if available, otherwise generate one
    return (request as any).id || 
           (request as any).correlationId || 
           `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old contexts
   */
  private cleanupOldContexts(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (const [requestId, context] of this.contexts.entries()) {
      if (context.resolvedAt.getTime() < oneHourAgo) {
        this.contexts.delete(requestId);
      }
    }
  }
}

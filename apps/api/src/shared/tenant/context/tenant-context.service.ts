// apps/api/src/shared/tenant/context/tenant-context.service.ts

import { Injectable, Logger, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { 
  TenantContext, 
  TenantContextOptions, 
  ITenantContextService,
  TenantUser,
  TenantContextValidationError,
  TenantIsolationViolationError,
  JwtUser,
  toRLSContext
} from '../tenant.types';
import { 
  withTenantContext, 
  getTenantContext,
  requireTenantContext,
  TenantContextStorage,
  TenantContextMissingError
} from '../tenant.context';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService implements ITenantContextService {
  private readonly logger = new Logger(TenantContextService.name);

  constructor(
    @Inject(REQUEST) private readonly request: Request
  ) {}

/**
 * Get user role (if available)
 */
getUserRole(): string | undefined {
  const context = getTenantContext();
  return context?.userRole;
}

/**
 * Get RLS-compatible context
 */
getRLSContext(): { organizationId: string; userId?: string; role?: string } {
  const context = getTenantContext();
  if (!context) {
    throw new TenantContextValidationError('Tenant context not resolved');
  }
  
  return {
    organizationId: context.organizationId,
    userId: context.userId,
    role: context.userRole,
  };
}


  /**
   * Resolve tenant context for the current request
   * Called by TenantGuard - sets this as the current request
   */
  resolveContext(request: Request, options: TenantContextOptions = {}): TenantContext {
    const { allowSystemContext = false, requireTenantContext = true } = options;
    
    // Check if context already exists in AsyncLocalStorage for this request
    const existingContext = getTenantContext();
    if (existingContext) {
      this.logger.debug(`Reusing existing tenant context: ${existingContext.tenantId}`);
      return existingContext;
    }

    // Try to get tenant from various sources
    let tenantId: string | undefined;
    let source: 'header' | 'token' | 'system' = 'header';
    let userId: string | undefined;
    let userEmail: string | undefined;
    
    // 1. Check request organizationId (set by middleware)
    if ((request as any).organizationId) {
      tenantId = (request as any).organizationId;
      source = 'header';
    }
    // 2. Check user token (from auth guard)
    else if ((request.user as TenantUser)?.organizationId) {
      const user = request.user as TenantUser;
      tenantId = user.organizationId;
      userId = user.id || user.sub;
      userEmail = user.email;
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
          hasUser: !!request.user,
          userHasOrgId: !!(request.user as TenantUser)?.organizationId,
        });
        throw new TenantContextValidationError('Tenant context required but not found');
      }
      // Allow without tenant (system context)
      tenantId = 'SYSTEM';
      source = 'system';
    }

    const context: TenantContext = {
      tenantId: tenantId!,
      organizationId: tenantId!,
      isSystemContext: source === 'system',
      resolvedAt: new Date(),
      source,
      userId,
      userEmail,
    };

    // Store in AsyncLocalStorage
    const wrappedFn = () => {
      // Also keep in request for debugging/backward compatibility
      (request as any).tenantContext = context;
      
      this.logger.debug(`Tenant context resolved: ${tenantId} (${source})`, {
        userId,
        userEmail,
        isSystem: source === 'system',
      });
      
      return context;
    };

    return withTenantContext(context, wrappedFn);
  }

  /**
   * Get tenant ID (throws if not resolved)
   */
  getTenantId(): string {
    const context = getTenantContext();
    if (!context) {
      throw new TenantContextValidationError(
        'Tenant context not resolved. Ensure TenantGuard runs before using TenantContextService methods.'
      );
    }
    return context.tenantId;
  }

  /**
   * Get organization ID (alias for getTenantId)
   */
  getOrganizationId(): string {
    return this.getTenantId();
  }

  /**
   * Get tenant name (if available)
   */
  getTenantName(): string | undefined {
    const context = getTenantContext();
    if (!context) {
      throw new TenantContextValidationError('Tenant context not resolved');
    }
    return context.tenantName;
  }

  /**
   * Check if this is a system context
   */
  isSystemContext(): boolean {
    const context = getTenantContext();
    if (!context) {
      throw new TenantContextValidationError('Tenant context not resolved');
    }
    return context.isSystemContext;
  }

  /**
   * Get user ID (if available)
   */
  getUserId(): string | undefined {
    const context = getTenantContext();
    return context?.userId;
  }

  /**
   * Get user email (if available)
   */
  getUserEmail(): string | undefined {
    const context = getTenantContext();
    return context?.userEmail;
  }

  /**
   * Get user roles (if available)
   */
  getUserRoles(): string[] | undefined {
    const context = getTenantContext();
    return context?.roles;
  }

  /**
   * Get user permissions (if available)
   */
  getUserPermissions(): string[] | undefined {
    const context = getTenantContext();
    return context?.permissions;
  }

  /**
   * Assert that tenant context exists (non-system)
   */
  assertTenantContext(): void {
    const context = getTenantContext();
    if (!context) {
      throw new TenantContextValidationError('Tenant context not resolved');
    }
    if (context.isSystemContext) {
      throw new TenantContextValidationError('Tenant context required but system context found');
    }
  }

  /**
   * Assert that this is NOT a system context
   */
  assertNotSystemContext(): void {
    const context = getTenantContext();
    if (!context) {
      throw new TenantContextValidationError('Tenant context not resolved');
    }
    if (context.isSystemContext) {
      throw new TenantContextValidationError('System context not allowed for this operation');
    }
  }

  /**
   * Validate entity belongs to current tenant
   */
  validateTenantOwnership(entity: { organizationId: string }, entityType?: string, entityId?: string): void {
    const currentTenantId = this.getTenantId();
    if (entity.organizationId !== currentTenantId) {
      throw new TenantIsolationViolationError(
        currentTenantId,
        entity.organizationId,
        entityType,
        entityId
      );
    }
  }

  /**
   * Get raw context (for debugging)
   */
  getRawContext(): TenantContext {
    const context = getTenantContext();
    if (!context) {
      throw new TenantContextValidationError('Tenant context not resolved');
    }
    return { ...context }; // Return copy to prevent mutation
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
      '/public/',
      '/docs',
      '/api-docs',
    ];
    
    // System methods on any path
    const systemMethods = ['OPTIONS', 'HEAD'];
    
    return systemPaths.some(systemPath => path.startsWith(systemPath)) ||
           systemMethods.includes(method);
  }

  /**
   * Clear tenant context (for testing)
   */
  clearContext(): void {
    // AsyncLocalStorage automatically clears at request end
    // This is mainly for testing
    this.logger.debug('Tenant context cleared');
  }
}
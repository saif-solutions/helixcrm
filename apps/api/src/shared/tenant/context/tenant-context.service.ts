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
  toRLSContext,
} from '../tenant.types';
import {
  withTenantContext,
  getTenantContext,
  requireTenantContext,
  TenantContextStorage,
  TenantContextMissingError,
} from '../tenant.context';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService implements ITenantContextService {
  private readonly logger = new Logger(TenantContextService.name);
  
  // Store the resolved context
  private resolvedContext: TenantContext | null = null;

  constructor(@Inject(REQUEST) private readonly request: Request) {}

  /**
   * Get user role (if available)
   */
  getUserRole(): string | undefined {
    const context = this.getCurrentContext();
    return context?.userRole;
  }

  /**
   * Get RLS-compatible context
   */
  getRLSContext(): { organizationId: string; userId?: string; role?: string } {
    const context = this.getCurrentContext();
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
   * Get the current context from AsyncLocalStorage or return cached
   */
  private getCurrentContext(): TenantContext | undefined {
    // First try AsyncLocalStorage
    const asyncContext = getTenantContext();
    if (asyncContext) {
      return asyncContext;
    }
    
    // Fall back to cached context
    return this.resolvedContext || undefined;
  }

  /**
   * ENTERPRISE FIX: Enhanced tenant resolution with proper context propagation
   * Called by TenantGuard - sets the context for the current request
   */
  resolveContext(
    request: Request,
    options: TenantContextOptions = {},
  ): TenantContext {
    const { allowSystemContext = false, requireTenantContext = true } = options;

    // Check if context already exists in AsyncLocalStorage for this request
    const existingContext = getTenantContext();
    if (existingContext) {
      this.logger.debug(
        `Reusing existing tenant context: ${existingContext.tenantId}`,
      );
      this.resolvedContext = existingContext;
      return existingContext;
    }

    // Try multiple sources for tenant ID
    let tenantId: string | undefined;
    let source: 'header' | 'token' | 'system' | 'user' = 'header';
    let userId: string | undefined;
    let userEmail: string | undefined;
    let userRoles: string[] | undefined;
    let userPermissions: string[] | undefined;

    // SOURCE 1: Request header (explicit override - useful for testing)
    const headerOrgId = request.headers['x-organization-id'] as string;
    if (headerOrgId) {
      tenantId = headerOrgId;
      source = 'header';
      this.logger.debug(`Tenant from header: ${tenantId}`);
    }

    // SOURCE 2: User object from auth (most common)
    const user = (request as any).user;
    if (!tenantId && user) {
      // Handle both property naming conventions
      tenantId = user.organizationId || user.org;
      userId = user.id || user.sub;
      userEmail = user.email;
      userRoles = user.roles;
      userPermissions = user.permissions;
      source = 'token';
      this.logger.debug(`Tenant from user token: ${tenantId}`);
    }

    // SOURCE 3: Request organizationId (set by middleware)
    if (!tenantId && (request as any).organizationId) {
      tenantId = (request as any).organizationId;
      source = 'header';
      this.logger.debug(`Tenant from request.organizationId: ${tenantId}`);
    }

    // SOURCE 4: System context (if allowed)
    if (!tenantId && allowSystemContext && this.isSystemRequest(request)) {
      tenantId = 'SYSTEM';
      source = 'system';
    }

    // SOURCE 5: Allow empty tenant if not required
    if (!tenantId && !requireTenantContext) {
      tenantId = 'SYSTEM';
      source = 'system';
    }

    // Validate tenant was found if required
    if (requireTenantContext && !tenantId) {
      this.logger.error('Tenant context required but not found', {
        path: request.path,
        method: request.method,
        hasUser: !!user,
        hasHeaderOrgId: !!headerOrgId,
        userObject: user ? {
          hasId: !!(user.id || user.sub),
          hasOrgId: !!(user.organizationId || user.org),
          hasEmail: !!user.email,
        } : null,
      });
      throw new TenantContextValidationError(
        'Tenant context required but not found',
      );
    }

    // Create context object
    const context: TenantContext = {
      tenantId: tenantId!,
      organizationId: tenantId!,
      isSystemContext: source === 'system',
      resolvedAt: new Date(),
      source,
      userId,
      userEmail,
      roles: userRoles,
      permissions: userPermissions,
    };

    // CRITICAL FIX: Store in AsyncLocalStorage for the entire request
    // We need to run the rest of the request within this context
    this.resolvedContext = context;
    
    // Also keep in request for debugging/backward compatibility
    (request as any).tenantContext = context;
    
    this.logger.debug(`Tenant context resolved: ${tenantId} (${source})`, {
      userId,
      userEmail,
      isSystem: source === 'system',
      hasRoles: userRoles?.length,
      hasPermissions: userPermissions?.length,
    });

    // IMPORTANT: We don't call withTenantContext here because that would
    // only wrap the callback, not the entire request. The TenantGuard
    // should be the one to wrap the entire request handling.
    
    return context;
  }

  /**
   * Initialize tenant context for the request
   * This should be called at the start of request processing
   */
  initializeContext(): void {
    const context = this.resolvedContext;
    if (!context) {
      this.logger.error('Cannot initialize context: No context resolved');
      throw new TenantContextValidationError('No tenant context resolved');
    }

    // Ensure context is in AsyncLocalStorage
    const existingContext = getTenantContext();
    if (!existingContext) {
      // This should be called by the TenantGuard that wraps the entire request
      this.logger.debug('Context not in AsyncLocalStorage - will be set by guard');
    }
  }

  /**
   * Get tenant ID (throws if not resolved)
   */
  getTenantId(): string {
    // First try AsyncLocalStorage
    const asyncContext = getTenantContext();
    if (asyncContext) {
      return asyncContext.tenantId;
    }
    
    // Then try cached context
    if (this.resolvedContext) {
      return this.resolvedContext.tenantId;
    }

    // Log more details about the error
    this.logger.error('Tenant context not resolved', {
      hasRequest: !!this.request,
      path: this.request?.path,
      method: this.request?.method,
      hasUser: !!(this.request as any)?.user,
      resolvedContext: !!this.resolvedContext,
    });
    
    throw new TenantContextValidationError(
      'Tenant context not resolved. Ensure TenantGuard runs before using TenantContextService methods.',
    );
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
    const context = this.getCurrentContext();
    if (!context) {
      throw new TenantContextValidationError('Tenant context not resolved');
    }
    return context.tenantName;
  }

  /**
   * Check if this is a system context
   */
  isSystemContext(): boolean {
    const context = this.getCurrentContext();
    if (!context) {
      throw new TenantContextValidationError('Tenant context not resolved');
    }
    return context.isSystemContext;
  }

  /**
   * Get user ID (if available)
   */
  getUserId(): string | undefined {
    const context = this.getCurrentContext();
    return context?.userId;
  }

  /**
   * Get user email (if available)
   */
  getUserEmail(): string | undefined {
    const context = this.getCurrentContext();
    return context?.userEmail;
  }

  /**
   * Get user roles (if available)
   */
  getUserRoles(): string[] | undefined {
    const context = this.getCurrentContext();
    return context?.roles;
  }

  /**
   * Get user permissions (if available)
   */
  getUserPermissions(): string[] | undefined {
    const context = this.getCurrentContext();
    return context?.permissions;
  }

  /**
   * Assert that tenant context exists (non-system)
   */
  assertTenantContext(): void {
    const context = this.getCurrentContext();
    if (!context) {
      throw new TenantContextValidationError('Tenant context not resolved');
    }
    if (context.isSystemContext) {
      throw new TenantContextValidationError(
        'Tenant context required but system context found',
      );
    }
  }

  /**
   * Assert that this is NOT a system context
   */
  assertNotSystemContext(): void {
    const context = this.getCurrentContext();
    if (!context) {
      throw new TenantContextValidationError('Tenant context not resolved');
    }
    if (context.isSystemContext) {
      throw new TenantContextValidationError(
        'System context not allowed for this operation',
      );
    }
  }

  /**
   * Validate entity belongs to current tenant
   */
  validateTenantOwnership(
    entity: { organizationId: string },
    entityType?: string,
    entityId?: string,
  ): void {
    const currentTenantId = this.getTenantId();
    if (entity.organizationId !== currentTenantId) {
      throw new TenantIsolationViolationError(
        currentTenantId,
        entity.organizationId,
        entityType,
        entityId,
      );
    }
  }

  /**
   * Get raw context (for debugging)
   */
  getRawContext(): TenantContext {
    const context = this.getCurrentContext();
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

    return (
      systemPaths.some((systemPath) => path.startsWith(systemPath)) ||
      systemMethods.includes(method)
    );
  }

  /**
   * Clear tenant context (for testing)
   */
  clearContext(): void {
    this.resolvedContext = null;
    this.logger.debug('Tenant context cleared');
  }
}
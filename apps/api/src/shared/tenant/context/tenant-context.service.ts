// apps/api/src/shared/tenant/context/tenant-context.service.ts

import { Injectable, Logger } from '@nestjs/common'; // ✅ Removed Scope, Inject, REQUEST
import {
  TenantContext,
  TenantContextOptions,
  ITenantContextService,
  TenantContextValidationError,
  TenantIsolationViolationError,
} from '../tenant.types';
import { getTenantContext, requireTenantContext } from '../tenant.context';

@Injectable() // ✅ SINGLETON
export class TenantContextService implements ITenantContextService {
  private readonly logger = new Logger(TenantContextService.name);

  getUserRole(): string | undefined {
    return this.getCurrentContext()?.userRole;
  }

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
   * Get current context - ALWAYS from AsyncLocalStorage, no fallbacks
   */
  private getCurrentContext(): TenantContext | undefined {
    return getTenantContext();
  }

  /**
   * Resolve context - called by TenantGuard
   * This should NEVER be called directly by services
   */
  resolveContext(
    request: any,
    options: TenantContextOptions = {},
  ): TenantContext {
    const { allowSystemContext = false, requireTenantContext = true } = options;

    // Check if context already exists
    const existingContext = getTenantContext();
    if (existingContext) {
      this.logger.debug(
        `Reusing existing tenant context: ${existingContext.tenantId}`,
      );
      return existingContext;
    }

    // If no context exists, this is a configuration error
    this.logger.error(
      'No tenant context found - RequestContextMiddleware not running?',
      {
        path: request.path,
        method: request.method,
        hasUser: !!request.user,
      },
    );

    throw new TenantContextValidationError(
      'Tenant context not initialized. RequestContextMiddleware must run before TenantGuard.',
    );
  }

  /**
   * Get tenant ID - throws if not resolved
   */
  getTenantId(): string {
    try {
      return requireTenantContext().tenantId;
    } catch (error) {
      this.logger.error('Tenant context not resolved', {
        error: error.message,
      });
      throw new TenantContextValidationError(
        'Tenant context not resolved. Ensure TenantGuard runs before using TenantContextService methods.',
      );
    }
  }

  getOrganizationId(): string {
    return this.getTenantId();
  }

  getTenantName(): string | undefined {
    return this.getCurrentContext()?.tenantName;
  }

  isSystemContext(): boolean {
    return this.getCurrentContext()?.isSystemContext ?? false;
  }

  getUserId(): string | undefined {
    return this.getCurrentContext()?.userId;
  }

  getUserEmail(): string | undefined {
    return this.getCurrentContext()?.userEmail;
  }

  getUserRoles(): string[] | undefined {
    return this.getCurrentContext()?.roles;
  }

  getUserPermissions(): string[] | undefined {
    return this.getCurrentContext()?.permissions;
  }

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

  getRawContext(): TenantContext {
    const context = this.getCurrentContext();
    if (!context) {
      throw new TenantContextValidationError('Tenant context not resolved');
    }
    return { ...context };
  }
}

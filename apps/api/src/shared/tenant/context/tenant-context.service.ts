// apps/api/src/shared/tenant/context/tenant-context.service.ts

import { Injectable, Logger } from '@nestjs/common';
import {
  TenantContext,
  ITenantContextService,
  TenantContextValidationError,
  TenantIsolationViolationError,
} from '../tenant.types';
import { getTenantContext, requireTenantContext } from '../tenant.context';

// ==================== TYPE DEFINITIONS ====================

/**
 * Request interface for resolveContext method
 */
interface RequestWithUser {
  path?: string;
  method?: string;
  user?: unknown;
  [key: string]: unknown;
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for error with message
 */
function hasErrorMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Safely extract error message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (hasErrorMessage(error)) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

// ==================== SERVICE ====================

@Injectable()
export class TenantContextService implements ITenantContextService {
  private readonly logger = new Logger(TenantContextService.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  /**
   * Get user role from current context
   */
  getUserRole(): string | undefined {
    return this.getCurrentContext()?.userRole;
  }

  /**
   * Get RLS context for database queries
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
   * Get current context from AsyncLocalStorage
   */
  private getCurrentContext(): TenantContext | undefined {
    return getTenantContext();
  }

  /**
   * Resolve context - called by TenantGuard
   * This should NEVER be called directly by services
   *
   * @param request - The HTTP request object
   */
  resolveContext(request: RequestWithUser): TenantContext {
    // Check if context already exists
    const existingContext = getTenantContext();
    if (existingContext) {
      if (!this.isProduction) {
        this.logger.debug(
          `Reusing existing tenant context: ${existingContext.tenantId}`,
        );
      }
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
      const errorMessage = getErrorMessage(error);
      this.logger.error('Tenant context not resolved', {
        error: errorMessage,
      });
      throw new TenantContextValidationError(
        'Tenant context not resolved. Ensure TenantGuard runs before using TenantContextService methods.',
      );
    }
  }

  /**
   * Get organization ID (alias for tenantId)
   */
  getOrganizationId(): string {
    return this.getTenantId();
  }

  /**
   * Get tenant name
   */
  getTenantName(): string | undefined {
    return this.getCurrentContext()?.tenantName;
  }

  /**
   * Check if current context is system context
   */
  isSystemContext(): boolean {
    return this.getCurrentContext()?.isSystemContext ?? false;
  }

  /**
   * Get user ID from current context
   */
  getUserId(): string | undefined {
    return this.getCurrentContext()?.userId;
  }

  /**
   * Get user email from current context
   */
  getUserEmail(): string | undefined {
    return this.getCurrentContext()?.userEmail;
  }

  /**
   * Get user roles from current context
   */
  getUserRoles(): string[] | undefined {
    return this.getCurrentContext()?.roles;
  }

  /**
   * Get user permissions from current context
   */
  getUserPermissions(): string[] | undefined {
    return this.getCurrentContext()?.permissions;
  }

  /**
   * Assert that tenant context exists and is not system context
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
   * Assert that we are not in system context
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
   * Validate that an entity belongs to the current tenant
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
   * Get raw tenant context (read-only copy)
   */
  getRawContext(): TenantContext {
    const context = this.getCurrentContext();
    if (!context) {
      throw new TenantContextValidationError('Tenant context not resolved');
    }
    return { ...context };
  }
}

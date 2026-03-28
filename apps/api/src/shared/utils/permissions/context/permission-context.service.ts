// apps/api/src/shared/permissions/context/permission-context.service.ts

import { Injectable, Logger } from '@nestjs/common';
import {
  RequestPermissionContext,
  IPermissionContext,
  PermissionContextOptions,
} from './permission-context.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { getTenantContext } from '../../tenant/tenant.context';

// ==================== TYPE DEFINITIONS ====================

/**
 * Extended tenant context with permission context
 */
interface ExtendedTenantContext {
  tenantId?: string;
  organizationId?: string;
  requestId?: string;
  permissionContext?: RequestPermissionContext;
  [key: string]: unknown;
}

/**
 * User with roles from database
 */
interface UserWithRoles {
  id: string;
  UserRoles?: Array<{
    role?: {
      name: string;
      permissions?: Array<{
        permission?: {
          code: string;
        };
      }>;
    };
  }>;
}

/**
 * Permission fetch result
 */
interface PermissionFetchResult {
  permissions: string[];
  roles: string[];
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for extended tenant context
 */
function isExtendedTenantContext(
  context: unknown,
): context is ExtendedTenantContext {
  return (
    typeof context === 'object' && context !== null && 'tenantId' in context
  );
}

/**
 * Type guard for user with roles
 */
function isUserWithRoles(user: unknown): user is UserWithRoles {
  return typeof user === 'object' && user !== null && 'id' in user;
}

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

/**
 * Mask user ID for logging
 */
function maskUserId(userId: string): string {
  if (userId.length <= 8) return '****';
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
}

// ==================== SERVICE ====================

@Injectable()
export class PermissionContextService implements IPermissionContext {
  private readonly logger = new Logger(PermissionContextService.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build permission context for the current request
   * Called ONCE by PermissionGuard
   */
  async buildContext(
    options: PermissionContextOptions,
  ): Promise<RequestPermissionContext> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const rawTenantContext = getTenantContext();

    if (!isExtendedTenantContext(rawTenantContext)) {
      throw new Error(
        'Tenant context not initialized - RequestContextMiddleware must run first',
      );
    }

    const tenantContext = rawTenantContext;

    if (!this.isProduction) {
      this.logger.debug(
        `Building permission context - Tenant: ${tenantContext.tenantId}, RequestId: ${tenantContext.requestId}`,
      );
    }

    // Check if context already exists in ALS
    if (tenantContext.permissionContext) {
      if (!this.isProduction) {
        this.logger.debug(
          `Reusing existing permission context for request ${tenantContext.requestId}`,
        );
      }
      return tenantContext.permissionContext;
    }

    const { userId, tenantId, jwtPermissions } = options;

    let permissions: string[];
    let source: 'jwt' | 'database';
    let roles: string[] = [];

    // Try JWT permissions first (fastest)
    if (
      jwtPermissions &&
      Array.isArray(jwtPermissions) &&
      jwtPermissions.length > 0
    ) {
      permissions = jwtPermissions;
      source = 'jwt';
      if (!this.isProduction) {
        this.logger.debug(
          `Using JWT permissions for user ${maskUserId(userId)} (${permissions.length} permissions)`,
        );
      }
    } else {
      // Fall back to database
      const result = await this.fetchPermissionsFromDatabase(userId, tenantId);
      permissions = result.permissions;
      roles = result.roles;
      source = 'database';
      if (!this.isProduction) {
        this.logger.debug(
          `Fetched ${permissions.length} permissions from DB for user ${maskUserId(userId)}`,
        );
      }
    }

    // Build the context
    const context: RequestPermissionContext = {
      userId,
      tenantId,
      allowedPermissions: new Set(permissions),
      roles,
      isSystemContext: false,
      builtAt: new Date(),
      source,
    };

    // Store in AsyncLocalStorage
    tenantContext.permissionContext = context;

    if (!this.isProduction) {
      this.logger.debug(
        `Permission context built for request ${tenantContext.requestId}`,
        {
          permissionCount: permissions.length,
          roleCount: roles.length,
          source,
        },
      );
    }

    return context;
  }

  /**
   * Fetch permissions from database
   */
  private async fetchPermissionsFromDatabase(
    userId: string,
    tenantId: string,
  ): Promise<PermissionFetchResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          UserRoles: {
            where: { organizationId: tenantId },
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!isUserWithRoles(user) || !user.UserRoles) {
        return { permissions: [], roles: [] };
      }

      const permissions = new Set<string>();
      const roles = new Set<string>();

      for (const userRole of user.UserRoles) {
        const role = userRole.role;
        if (role) {
          roles.add(role.name);

          const rolePermissions = role.permissions;
          if (rolePermissions && Array.isArray(rolePermissions)) {
            for (const rolePermission of rolePermissions) {
              const permission = rolePermission.permission;
              if (permission && permission.code) {
                permissions.add(permission.code);
              }
            }
          }
        }
      }

      return {
        permissions: Array.from(permissions),
        roles: Array.from(roles),
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Failed to fetch permissions from DB: ${errorMessage}`);
      return { permissions: [], roles: [] };
    }
  }

  /**
   * Get current permission context
   */
  private getContext(): RequestPermissionContext {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const rawTenantContext = getTenantContext();

    if (!isExtendedTenantContext(rawTenantContext)) {
      throw new Error('Tenant context not initialized');
    }

    const tenantContext = rawTenantContext;

    if (!tenantContext.permissionContext) {
      const error = new Error(
        `Permission context not built for request ${tenantContext.requestId || 'unknown'}. Ensure PermissionGuard runs before using PermissionContextService.`,
      );
      this.logger.error(error.message);
      throw error;
    }

    return tenantContext.permissionContext;
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: string | string[]): boolean {
    const context = this.getContext();
    if (Array.isArray(permission)) {
      return permission.some((p) => context.allowedPermissions.has(p));
    }
    return context.allowedPermissions.has(permission);
  }

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    const context = this.getContext();
    return permissions.every((p) => context.allowedPermissions.has(p));
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    const context = this.getContext();
    return permissions.some((p) => context.allowedPermissions.has(p));
  }

  /**
   * Get all permissions for current user
   */
  getPermissions(): string[] {
    return Array.from(this.getContext().allowedPermissions);
  }

  /**
   * Get all roles for current user
   */
  getRoles(): string[] {
    return this.getContext().roles;
  }

  /**
   * Get current user ID
   */
  getUserId(): string {
    return this.getContext().userId;
  }

  /**
   * Get current tenant ID
   */
  getTenantId(): string {
    return this.getContext().tenantId;
  }

  /**
   * Check if in system context
   */
  isSystemContext(): boolean {
    return this.getContext().isSystemContext;
  }

  /**
   * Get context source (jwt or database)
   */
  getSource(): string {
    return this.getContext().source;
  }

  /**
   * Get raw permission context
   */
  getRawContext(): RequestPermissionContext {
    return this.getContext();
  }

  /**
   * Check if permission context is initialized
   */
  isInitialized(): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      const rawTenantContext = getTenantContext();
      if (!isExtendedTenantContext(rawTenantContext)) {
        return false;
      }
      return !!rawTenantContext.permissionContext;
    } catch {
      return false;
    }
  }
}

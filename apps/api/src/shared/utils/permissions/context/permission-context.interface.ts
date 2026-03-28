// apps/api/src/shared/permissions/context/permission-context.interface.ts

/**
 * RequestPermissionContext
 * Single source of truth for user permissions within a request
 * Built ONCE per request in PermissionGuard, consumed everywhere downstream
 */
export interface RequestPermissionContext {
  userId: string;
  tenantId: string;
  allowedPermissions: Set<string>;
  roles: string[];
  isSystemContext: boolean;
  builtAt: Date;
  source: 'jwt' | 'database' | 'cache';
}

/**
 * Permission context that can be injected into services
 */
export interface IPermissionContext {
  hasPermission(permission: string | string[]): boolean;
  hasAllPermissions(permissions: string[]): boolean;
  hasAnyPermission(permissions: string[]): boolean;
  getPermissions(): string[];
  getRoles(): string[];
  getUserId(): string;
  getTenantId(): string;
  isSystemContext(): boolean;
  getSource(): string;
}

/**
 * Options for building permission context
 */
export interface PermissionContextOptions {
  userId: string;
  tenantId: string;
  jwtPermissions?: string[];
  skipCache?: boolean;
}

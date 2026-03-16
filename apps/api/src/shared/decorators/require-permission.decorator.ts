// apps/api/src/shared/decorators/require-permission.decorator.ts

import {
  SetMetadata,
  CustomDecorator,
  applyDecorators,
  Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

// ==================== CONSTANTS ====================

export const PERMISSION_KEY = 'permissions';
export const PERMISSION_MODE_KEY = 'permissionMode';
export const IS_PUBLIC_KEY = 'isPublic';
export const REQUIRED_PERMISSIONS_KEY = PERMISSION_KEY;

// ==================== ENUMS ====================

export enum PermissionMode {
  ANY = 'any',
  ALL = 'all',
}

// ==================== INTERFACES ====================

export interface PermissionOptions {
  permissions: string[];
  mode?: PermissionMode;
  message?: string;
}

// ==================== TYPE GUARDS ====================

function isValidPermission(permission: string): boolean {
  // Validate permission format (e.g., "resource:action")
  const permissionRegex = /^[a-z]+(?:\.[a-z]+)?:[a-z]+$/;
  return permissionRegex.test(permission);
}

// ==================== DECORATOR FACTORIES ====================

/**
 * Require specific permission(s) to access a route
 * @param permissions One or more permission codes (e.g., 'deal:read', 'pipeline:write')
 * @param mode Permission mode - 'any' (default) or 'all'
 * @param message Custom error message
 * @returns Custom decorator
 *
 * @example
 * ```typescript
 * @RequirePermission('deal:read')
 * @RequirePermission(['deal:read', 'deal:write'], PermissionMode.ALL)
 * ```
 */
export const RequirePermission = (
  permissions: string | string[],
  mode: PermissionMode = PermissionMode.ANY,
  message?: string,
): CustomDecorator<string> => {
  // Normalize to array
  const permsArray = Array.isArray(permissions) ? permissions : [permissions];

  // Validate permissions in development
  if (process.env.NODE_ENV !== 'production') {
    const invalidPermissions = permsArray.filter((p) => !isValidPermission(p));
    if (invalidPermissions.length > 0) {
      throw new Error(
        `Invalid permission format: ${invalidPermissions.join(', ')}. ` +
          'Permissions should follow the pattern "resource:action" (e.g., "deal:read")',
      );
    }
  }

  return SetMetadata(PERMISSION_KEY, {
    permissions: permsArray,
    mode,
    message,
  });
};

/**
 * Public route - no authentication required
 * Also adds Swagger documentation for public endpoints
 * @returns Custom decorator
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() { return 'OK'; }
 * ```
 */
export const Public = (): ReturnType<typeof applyDecorators> => {
  return applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: 'Public endpoint - no authentication required',
    }),
  );
};

/**
 * Admin only route - requires admin role or equivalent permissions
 * @returns Custom decorator
 *
 * @example
 * ```typescript
 * @AdminOnly()
 * @Delete('users/:id')
 * deleteUser() { ... }
 * ```
 */
export const AdminOnly = (): CustomDecorator<string> => {
  return SetMetadata(PERMISSION_KEY, {
    permissions: ['system:admin'],
    mode: PermissionMode.ANY,
    message: 'Admin access required',
  });
};

/**
 * Require all specified permissions
 * @param permissions One or more permission codes
 * @returns Custom decorator
 *
 * @example
 * ```typescript
 * @RequireAllPermissions(['deal:read', 'deal:write'])
 * updateDeal() { ... }
 * ```
 */
export const RequireAllPermissions = (
  permissions: string | string[],
): CustomDecorator<string> => {
  return RequirePermission(permissions, PermissionMode.ALL);
};

/**
 * Require any of the specified permissions (default behavior)
 * @param permissions One or more permission codes
 * @returns Custom decorator
 *
 * @example
 * ```typescript
 * @RequireAnyPermission(['deal:read', 'deal:write'])
 * viewDeal() { ... }
 * ```
 */
export const RequireAnyPermission = (
  permissions: string | string[],
): CustomDecorator<string> => {
  return RequirePermission(permissions, PermissionMode.ANY);
};

/**
 * Check if a user has required permissions
 * @param userPermissions User's permission set
 * @param required Required permission options
 * @returns boolean indicating if user has access
 */
export const hasRequiredPermissions = (
  userPermissions: Set<string>,
  required: { permissions: string[]; mode: PermissionMode },
): boolean => {
  if (required.mode === PermissionMode.ALL) {
    return required.permissions.every((p) => userPermissions.has(p));
  }
  return required.permissions.some((p) => userPermissions.has(p));
};

/**
 * Get permission metadata from handler and class
 * @param reflector NestJS Reflector instance
 * @param handler Route handler function
 * @param classRef Controller class
 * @returns Permission options or null
 */
export const getPermissionMetadata = (
  reflector: Reflector,
  handler: (...args: unknown[]) => unknown,
  classRef: Type<any>,
): PermissionOptions | null => {
  return reflector.getAllAndOverride<PermissionOptions>(PERMISSION_KEY, [
    handler,
    classRef,
  ]);
};

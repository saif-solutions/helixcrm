// apps/api/src/shared/decorators/require-permission.decorator.ts

import {
  SetMetadata,
  CustomDecorator,
  applyDecorators,
  Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

// ==================== CONSTANTS ====================

export const PERMISSION_KEY = 'permissions';
export const PERMISSION_MODE_KEY = 'permissionMode';
export const IS_PUBLIC_KEY = 'isPublic';
export const REQUIRED_PERMISSIONS_KEY = PERMISSION_KEY;

// ==================== ENUMS ====================

export enum PermissionMode {
  /** User must have ANY of the specified permissions */
  ANY = 'any',
  /** User must have ALL of the specified permissions */
  ALL = 'all',
}

// ==================== INTERFACES ====================

export interface PermissionOptions {
  /** Array of permission codes required for access */
  permissions: string[];
  /** Mode for permission checking (ANY or ALL) */
  mode?: PermissionMode;
  /** Custom error message when permission check fails */
  message?: string;
  /** Whether to skip permission check (useful for debugging) */
  skip?: boolean;
  /** Custom resource name for better error messages */
  resource?: string;
  /** Required permission level (1-5) */
  level?: 1 | 2 | 3 | 4 | 5;
}

export interface PermissionMetadata extends PermissionOptions {
  /** Normalized mode with default */
  mode: PermissionMode;
  /** Whether to skip check */
  skip: boolean;
}

// ==================== VALIDATION ====================

/**
 * Permission format: resource:action or resource.subresource:action
 * Examples:
 * - deal:read
 * - deal:write
 * - pipeline.stage:create
 * - system:admin
 */
const PERMISSION_REGEX = /^[a-z]+(?:\.[a-z]+)?:[a-z]+$/;

/**
 * Validate permission format
 */
function isValidPermission(permission: string): boolean {
  return PERMISSION_REGEX.test(permission);
}

/**
 * Validate and normalize permissions array
 */
function validatePermissions(permissions: string[], context: string): void {
  if (process.env.NODE_ENV !== 'production') {
    if (!permissions || permissions.length === 0) {
      throw new Error(`${context}: At least one permission is required`);
    }

    const invalidPermissions = permissions.filter((p) => !isValidPermission(p));
    if (invalidPermissions.length > 0) {
      throw new Error(
        `${context}: Invalid permission format: ${invalidPermissions.join(', ')}. ` +
          'Permissions should follow the pattern "resource:action" or "resource.subresource:action" ' +
          '(e.g., "deal:read", "pipeline.stage:create")',
      );
    }
  }
}

// ==================== DECORATOR FACTORIES ====================

/**
 * Require specific permission(s) to access a route
 *
 * @param permissions - One or more permission codes (e.g., 'deal:read', 'pipeline:write')
 * @param mode - Permission mode - 'any' (default) or 'all'
 * @param message - Custom error message
 * @returns Custom decorator
 *
 * @example
 * ```typescript
 * // Single permission
 * @RequirePermission('deal:read')
 * @Get(':id')
 * getDeal() { ... }
 *
 * // Multiple permissions with ANY mode (default)
 * @RequirePermission(['deal:read', 'deal:write'], PermissionMode.ANY)
 * @Get()
 * getDeals() { ... }
 *
 * // Multiple permissions with ALL mode
 * @RequirePermission(['deal:read', 'deal:write'], PermissionMode.ALL)
 * @Post()
 * createDeal() { ... }
 *
 * // With custom error message
 * @RequirePermission('deal:admin', PermissionMode.ANY, 'Admin access required to manage deals')
 * @Delete(':id')
 * deleteDeal() { ... }
 * ```
 */
export const RequirePermission = (
  permissions: string | string[],
  mode: PermissionMode = PermissionMode.ANY,
  message?: string,
): CustomDecorator<string> => {
  // Normalize to array
  const permsArray = Array.isArray(permissions) ? permissions : [permissions];

  // Validate permissions
  validatePermissions(permsArray, 'RequirePermission');

  // Create options object
  const options: PermissionOptions = {
    permissions: permsArray,
    mode,
    message,
    skip: false,
  };

  return SetMetadata(PERMISSION_KEY, options);
};

/**
 * Public route - no authentication required
 * Also adds Swagger documentation for public endpoints
 *
 * @param options - Optional configuration
 * @returns Custom decorator
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() { return 'OK'; }
 *
 * @Public({ description: 'Public registration endpoint - open to all users' })
 * @Post('register')
 * register() { ... }
 * ```
 */
export const Public = (options?: {
  description?: string;
}): ReturnType<typeof applyDecorators> => {
  const description =
    options?.description || 'Public endpoint - no authentication required';

  return applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    SetMetadata(PERMISSION_KEY, {
      permissions: [],
      mode: PermissionMode.ANY,
      skip: true,
    }),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description, // Use the description variable here
    }),
    ApiForbiddenResponse({
      description: 'Not applicable for public endpoints',
    }),
  );
};

/**
 * Admin only route - requires admin role or equivalent permissions
 *
 * @param message - Custom error message
 * @returns Custom decorator
 *
 * @example
 * ```typescript
 * @AdminOnly()
 * @Delete('users/:id')
 * deleteUser() { ... }
 *
 * @AdminOnly('Only system administrators can perform this action')
 * @Post('system/config')
 * updateSystemConfig() { ... }
 * ```
 */
export const AdminOnly = (message?: string): CustomDecorator<string> => {
  return SetMetadata(PERMISSION_KEY, {
    permissions: ['system:admin'],
    mode: PermissionMode.ANY,
    message: message || 'Admin access required',
    resource: 'system',
    level: 5,
  });
};

/**
 * Owner only route - requires user to be the owner of the resource
 * Combines with permission checks for additional security
 *
 * @param resourceType - Type of resource (e.g., 'deal', 'contact')
 * @returns Custom decorator
 *
 * @example
 * ```typescript
 * @OwnerOnly('deal')
 * @Put(':id')
 * updateDeal(@Param('id') id: string, @CurrentUser() user: User) { ... }
 * ```
 */
export const OwnerOnly = (resourceType: string): CustomDecorator<string> => {
  return SetMetadata(PERMISSION_KEY, {
    permissions: [`${resourceType}:owner`],
    mode: PermissionMode.ANY,
    message: `You can only access your own ${resourceType}`,
    resource: resourceType,
  });
};

/**
 * Require all specified permissions
 *
 * @param permissions - One or more permission codes
 * @param message - Custom error message
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
  message?: string,
): CustomDecorator<string> => {
  return RequirePermission(permissions, PermissionMode.ALL, message);
};

/**
 * Require any of the specified permissions (default behavior)
 *
 * @param permissions - One or more permission codes
 * @param message - Custom error message
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
  message?: string,
): CustomDecorator<string> => {
  return RequirePermission(permissions, PermissionMode.ANY, message);
};

/**
 * Require specific permission level (1-5)
 *
 * @param level - Required permission level (1 = lowest, 5 = highest)
 * @returns Custom decorator
 *
 * @example
 * ```typescript
 * @RequireLevel(3)
 * @Post('deals')
 * createDeal() { ... }
 * ```
 */
export const RequireLevel = (
  level: 1 | 2 | 3 | 4 | 5,
): CustomDecorator<string> => {
  if (level < 1 || level > 5) {
    throw new Error(
      `RequireLevel: level must be between 1 and 5, got ${level}`,
    );
  }

  return SetMetadata(PERMISSION_KEY, {
    permissions: [`system:level${level}`],
    mode: PermissionMode.ANY,
    message: `Level ${level} permission required`,
    level,
  });
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if a user has required permissions
 *
 * @param userPermissions - User's permission set
 * @param required - Required permission options
 * @returns boolean indicating if user has access
 *
 * @example
 * ```typescript
 * const hasAccess = hasRequiredPermissions(
 *   user.permissions,
 *   { permissions: ['deal:read'], mode: PermissionMode.ANY }
 * );
 * ```
 */
export const hasRequiredPermissions = (
  userPermissions: Set<string>,
  required: PermissionOptions,
): boolean => {
  // Skip check if specified
  if (required.skip) {
    return true;
  }

  // No permissions required
  if (!required.permissions || required.permissions.length === 0) {
    return true;
  }

  // Check based on mode
  if (required.mode === PermissionMode.ALL) {
    return required.permissions.every((p) => userPermissions.has(p));
  }

  // Default to ANY mode
  return required.permissions.some((p) => userPermissions.has(p));
};

/**
 * Get permission metadata from handler and class
 *
 * @param reflector - NestJS Reflector instance
 * @param handler - Route handler function
 * @param classRef - Controller class
 * @returns Permission options or null
 *
 * @example
 * ```typescript
 * const permissions = getPermissionMetadata(reflector, handler, controller);
 * if (permissions) {
 *   // Check permissions
 * }
 * ```
 */
export const getPermissionMetadata = (
  reflector: Reflector,
  handler: (...args: unknown[]) => unknown,
  classRef: Type<unknown>,
): PermissionOptions | null => {
  const metadata = reflector.getAllAndOverride<PermissionOptions>(
    PERMISSION_KEY,
    [handler, classRef],
  );

  return metadata || null;
};

/**
 * Check if route is public (no authentication required)
 *
 * @param reflector - NestJS Reflector instance
 * @param handler - Route handler function
 * @param classRef - Controller class
 * @returns boolean indicating if route is public
 *
 * @example
 * ```typescript
 * if (isPublicRoute(reflector, handler, controller)) {
 *   // Skip authentication
 * }
 * ```
 */
export const isPublicRoute = (
  reflector: Reflector,
  handler: (...args: unknown[]) => unknown,
  classRef: Type<unknown>,
): boolean => {
  const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    handler,
    classRef,
  ]);

  return isPublic === true;
};

/**
 * Merge permission options from class and handler
 * Handler-level permissions override class-level
 *
 * @param classPermissions - Class-level permission options
 * @param handlerPermissions - Handler-level permission options
 * @returns Merged permission options
 *
 * @example
 * ```typescript
 * const merged = mergePermissions(
 *   { permissions: ['deal:read'], mode: PermissionMode.ANY },
 *   { permissions: ['deal:write'], mode: PermissionMode.ALL }
 * );
 * // Result: { permissions: ['deal:write'], mode: PermissionMode.ALL }
 * ```
 */
export const mergePermissions = (
  classPermissions: PermissionOptions | null,
  handlerPermissions: PermissionOptions | null,
): PermissionOptions | null => {
  // Handler permissions take precedence
  if (handlerPermissions) {
    return handlerPermissions;
  }

  return classPermissions;
};

/**
 * Format permissions for logging and error messages
 *
 * @param permissions - Array of permission codes
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * console.log(formatPermissions(['deal:read', 'deal:write']));
 * // Output: 'deal:read, deal:write'
 * ```
 */
export const formatPermissions = (permissions: string[]): string => {
  return permissions.join(', ');
};

/**
 * Parse permission string into resource and action
 *
 * @param permission - Permission code (e.g., 'deal:read')
 * @returns Object with resource and action
 *
 * @example
 * ```typescript
 * const { resource, action } = parsePermission('deal.stage:create');
 * // resource: 'deal.stage', action: 'create'
 * ```
 */
export const parsePermission = (
  permission: string,
): { resource: string; action: string } => {
  const [resource, action] = permission.split(':');
  return { resource, action };
};

import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const PERMISSION_KEY = 'permissions';
export const PERMISSION_OPTIONS_KEY = 'permissionOptions';

/**
 * Require specific permission(s) to access a route
 * @param permissions One or more permission codes (e.g., 'deals.read', 'pipelines.write')
 * @returns Custom decorator
 */
export const RequirePermission = (
  permissions: string | string[],
): CustomDecorator<string> => {
  const permsArray = Array.isArray(permissions) ? permissions : [permissions];
  
  return SetMetadata(PERMISSION_KEY, permsArray);
};

/**
 * Public route - no authentication required
 * @returns Custom decorator
 */
export const Public = (): CustomDecorator<string> => {
  return SetMetadata(PERMISSION_KEY, []);
};

/**
 * Admin only route - requires admin role or equivalent permissions
 * @returns Custom decorator
 */
export const AdminOnly = (): CustomDecorator<string> => {
  return SetMetadata(PERMISSION_KEY, ['rbac.manage']);
};
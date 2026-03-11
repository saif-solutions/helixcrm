import React from 'react';
import { usePermission } from '../../lib/hooks/usePermission';

interface RequirePermissionProps {
  /**
   * Single permission required (e.g., "contact:read")
   */
  permission?: string;

  /**
   * Multiple permissions - user needs ANY of these
   */
  anyPermission?: string[];

  /**
   * Multiple permissions - user needs ALL of these
   */
  allPermissions?: string[];

  /**
   * Role required
   */
  role?: string;

  /**
   * Fallback content to show when permission denied
   */
  fallback?: React.ReactNode;

  /**
   * Children to render when permission granted
   */
  children: React.ReactNode;
}

/**
 * Component to conditionally render based on permissions
 *
 * Examples:
 *
 * // Single permission
 * <RequirePermission permission="contact:read">
 *   <ContactList />
 * </RequirePermission>
 *
 * // Any of multiple permissions
 * <RequirePermission anyPermission={["contact:write", "contact:delete"]}>
 *   <EditButton />
 * </RequirePermission>
 *
 * // With fallback
 * <RequirePermission
 *   permission="admin:access"
 *   fallback={<div>Access denied</div>}
 * >
 *   <AdminPanel />
 * </RequirePermission>
 */
export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  anyPermission,
  allPermissions,
  role,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole } = usePermission();

  // Check role if specified
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check any permission
  if (anyPermission && anyPermission.length > 0 && !hasAnyPermission(anyPermission)) {
    return <>{fallback}</>;
  }

  // Check all permissions
  if (allPermissions && allPermissions.length > 0 && !hasAllPermissions(allPermissions)) {
    return <>{fallback}</>;
  }

  // Permission granted
  return <>{children}</>;
};

import { useMemo } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { Permission, PermissionContext } from '../../lib/types/permission.types';

export function usePermission(): PermissionContext {
  const { user } = useAuthStore();

  const permissions = useMemo(() => {
    // Get permissions from user object (set by backend)
    // If user has admin role, they have all permissions
    if (user?.role === 'admin') {
      // Return a wildcard that matches all permission checks
      return ['*'];
    }
    
    // Return actual permissions from user object
    return user?.permissions || [];
  }, [user]);

  const roles = useMemo(() => {
    return user?.role ? [user.role] : [];
  }, [user]);

  const hasPermission = (permission: Permission | string): boolean => {
    // Admin has all permissions
    if (permissions.includes('*')) {
      return true;
    }
    
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: (Permission | string)[]): boolean => {
    // Admin has all permissions
    if (permissions.includes('*')) {
      return true;
    }
    
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (requiredPermissions: (Permission | string)[]): boolean => {
    // Admin has all permissions
    if (permissions.includes('*')) {
      return true;
    }
    
    return requiredPermissions.every(permission => permissions.includes(permission));
  };

  const hasRole = (role: string): boolean => {
    // roles array contains 'admin' | 'user' | 'manager'
    // We need to check if the passed string matches any of them
    return roles.some(r => r === role);
  };

  return {
    permissions: permissions.filter(p => p !== '*') as Permission[],
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  };
}
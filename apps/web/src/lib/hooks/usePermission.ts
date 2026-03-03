// apps/web/src/lib/hooks/usePermission.ts

import { useMemo } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { Permission, PermissionContext } from '../../lib/types/permission.types';

export function usePermission(): PermissionContext {
  const { user, isAuthenticated } = useAuthStore();

  const permissions = useMemo(() => {
    if (!user) return [];
    
    // Check for admin via roles array (now matches backend)
    const isAdmin = Array.isArray(user.roles) && user.roles.includes('admin');
    
    if (isAdmin) {
      return ['*'];
    }
    
    // Return actual permissions from user object
    return user.permissions || [];
  }, [user]);

  const roles = useMemo(() => {
    return user?.roles || [];
  }, [user]);

  const hasPermission = (permission: Permission | string): boolean => {
    if (!isAuthenticated || !user) return false;
    
    // Admin has all permissions
    if (permissions.includes('*')) {
      return true;
    }
    
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: (Permission | string)[]): boolean => {
    if (!isAuthenticated || !user) return false;
    
    // Admin has all permissions
    if (permissions.includes('*')) {
      return true;
    }
    
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (requiredPermissions: (Permission | string)[]): boolean => {
    if (!isAuthenticated || !user) return false;
    
    // Admin has all permissions
    if (permissions.includes('*')) {
      return true;
    }
    
    return requiredPermissions.every(permission => permissions.includes(permission));
  };

  const hasRole = (role: string): boolean => {
    if (!isAuthenticated || !user) return false;
    return Array.isArray(user.roles) && user.roles.includes(role);
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
// Permission types matching backend colon format
export type Permission =
  | 'user:read'
  | 'user:write'
  | 'user:delete'
  | 'contact:read'
  | 'contact:write'
  | 'contact:delete'
  | 'lead:read'
  | 'lead:write'
  | 'lead:delete'
  | 'deal:read'
  | 'deal:write'
  | 'deal:delete'
  | 'pipeline:read'
  | 'pipeline:write'
  | 'pipeline:manage'
  | 'report:read'
  | 'admin:access'
  | 'settings:manage'
  | 'audit:read';

// Permission check result
export interface PermissionContext {
  permissions: Permission[];
  roles: string[];
  hasPermission: (permission: Permission | string) => boolean;
  hasAnyPermission: (permissions: (Permission | string)[]) => boolean;
  hasAllPermissions: (permissions: (Permission | string)[]) => boolean;
  hasRole: (role: string) => boolean;
}

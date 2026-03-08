// test/factories/audit-log.factory.ts
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export enum AuditEntityType {
  USER = 'USER',
  LEAD = 'LEAD',
  DEAL = 'DEAL',
  CONTACT = 'CONTACT',
  PIPELINE = 'PIPELINE',
}

export const createMockAuditLog = (overrides = {}) => ({
  id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  action: AuditAction.CREATE,
  entityType: AuditEntityType.USER,
  entityId: 'entity-123',
  userId: 'user-123',
  tenantId: 'tenant-123',
  changes: { field: 'name', old: 'Old', new: 'New' },
  metadata: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
  timestamp: new Date('2024-01-01'),
  ...overrides,
});
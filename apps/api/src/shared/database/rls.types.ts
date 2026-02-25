export interface RLSConfig {
  enabled: boolean;
  featureFlag: string;
  bypassRole?: string;
}

export interface TenantContext {
  tenantId?: string; // Optional alias
  organizationId: string; // REQUIRED: This is what policies use
  userId?: string;
  role?: string; // For super_admin bypass
  userRole?: string; // Alias for role
  ipAddress?: string;
}

export enum RLSErrorCode {
  TENANT_CONTEXT_MISSING = 'TENANT_CONTEXT_MISSING',
  RLS_NOT_ENABLED = 'RLS_NOT_ENABLED',
  UNAUTHORIZED_TENANT_ACCESS = 'UNAUTHORIZED_TENANT_ACCESS',
}

export class RLSError extends Error {
  constructor(
    public code: RLSErrorCode,
    message: string,
    public context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'RLSError';
  }
}

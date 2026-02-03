// apps/api/src/shared/tenant/context/tenant-context.interface.ts

/**
 * TenantContext - Represents tenant isolation for a request
 */
export interface TenantContext {
  tenantId: string;
  tenantName?: string;
  isSystemContext: boolean;
  resolvedAt: Date;
  source: 'header' | 'token' | 'system';
}

/**
 * Options for resolving tenant context
 */
export interface TenantContextOptions {
  // If true, allows system context (no tenant)
  allowSystemContext?: boolean;
  // If true, fails hard if tenant context missing
  requireTenantContext?: boolean;
}

/**
 * Service interface for tenant context
 */
export interface ITenantContextService {
  getTenantId(): string;
  getTenantName(): string | undefined;
  isSystemContext(): boolean;
  assertTenantContext(): void;
  assertNotSystemContext(): void;
}

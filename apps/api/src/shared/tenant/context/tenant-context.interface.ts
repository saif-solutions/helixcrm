// apps/api/src/shared/tenant/context/tenant-context.interface.ts

import { Request } from 'express';

/**
 * JWT User structure used by your auth system
 * This matches what's in jwt-payload.interface.ts
 */
export interface JwtUser {
  sub: string; // user id
  email: string;
  organizationId: string;
  role: string;
  tokenVersion: number;
  permissions: string[];
  roles: string[];
  iat?: number;
  exp?: number;
  [key: string]: string | number | string[] | undefined; // Allow additional JWT claims with proper typing
}

/**
 * TenantContext - Represents tenant isolation for a request
 * SINGLE SOURCE OF TRUTH for TenantContext type
 */
export interface TenantContext {
  // Core tenant identification
  tenantId: string;
  organizationId: string; // Same as tenantId, for clarity

  // Tenant metadata
  tenantName?: string;

  // User information (if authenticated)
  userId?: string;
  userEmail?: string;
  userRole?: string;
  roles?: string[];
  permissions?: string[];

  // Context metadata
  isSystemContext: boolean;
  resolvedAt: Date;
  source: 'header' | 'token' | 'system' | 'pending';
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
  // Core tenant access
  getTenantId(): string;
  getOrganizationId(): string;
  getTenantName(): string | undefined;
  isSystemContext(): boolean;

  // Context validation
  assertTenantContext(): void;
  assertNotSystemContext(): void;

  // User context (if available)
  getUserId(): string | undefined;
  getUserEmail(): string | undefined;
  getUserRole(): string | undefined;
  getUserRoles(): string[] | undefined;
  getUserPermissions(): string[] | undefined;

  // Raw context access
  getRawContext(): TenantContext;

  // RLS compatibility
  getRLSContext(): { organizationId: string; userId?: string; role?: string };
}

/**
 * Extended Express Request with tenant context
 */
export interface TenantRequest extends Request {
  organizationId?: string;
  tenantContext?: TenantContext;
  user?: JwtUser;
}

/**
 * Extended User type with organizationId
 * For database/entity representations
 */
export interface TenantUser {
  id: string;
  organizationId?: string;
  sub?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  permissions?: string[];
  roles?: string[];
}

/**
 * Tenant context validation error
 */
export class TenantContextValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextValidationError';
  }
}

/**
 * Tenant isolation violation error
 */
export class TenantIsolationViolationError extends Error {
  constructor(
    public readonly expectedTenantId: string,
    public readonly actualTenantId: string,
    public readonly entityType?: string,
    public readonly entityId?: string,
  ) {
    super(
      `Tenant isolation violation: Expected tenant ${expectedTenantId}, ` +
        `but entity belongs to tenant ${actualTenantId}` +
        (entityType ? ` (${entityType}: ${entityId})` : ''),
    );
    this.name = 'TenantIsolationViolationError';
  }
}

/**
 * Convert application TenantContext to RLS TenantContext
 */
export function toRLSContext(context: TenantContext): {
  organizationId: string;
  userId?: string;
  role?: string;
  userRole?: string;
} {
  return {
    organizationId: context.organizationId,
    userId: context.userId,
    role: context.userRole,
    userRole: context.userRole,
  };
}

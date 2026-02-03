// apps/api/src/shared/tenant/context/tenant-types.interface.ts

import { Request } from 'express';

/**
 * Extended Express Request with tenant context
 */
export interface TenantRequest extends Request {
  organizationId?: string;
  tenantContext?: any;
}

/**
 * Extended User type with organizationId
 */
export interface TenantUser {
  id: string;
  organizationId?: string;
  sub?: string;
  permissions?: string[];
  // Add other user properties as needed
}

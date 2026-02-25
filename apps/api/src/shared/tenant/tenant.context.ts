// apps/api/src/shared/tenant/tenant.context.ts
import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext } from './tenant.types';

export class TenantContextMissingError extends Error {
  constructor() {
    super(
      'Tenant context is missing. Ensure TenantGuard runs before accessing tenant context.',
    );
    this.name = 'TenantContextMissingError';
  }
}

export const TenantContextStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get the current tenant context (throws if missing)
 */
export function requireTenantContext(): TenantContext {
  const context = TenantContextStorage.getStore();
  if (!context) {
    throw new TenantContextMissingError();
  }
  return context;
}

/**
 * Get tenant context (returns undefined if missing)
 */
export function getTenantContext(): TenantContext | undefined {
  return TenantContextStorage.getStore();
}

/**
 * Run a function with tenant context
 */
export function withTenantContext<T>(context: TenantContext, fn: () => T): T {
  return TenantContextStorage.run(context, fn);
}

/**
 * Get tenant ID safely
 */
export function getTenantId(): string {
  return requireTenantContext().tenantId;
}

/**
 * Get organization ID (alias for tenantId)
 */
export function getOrganizationId(): string {
  return requireTenantContext().organizationId;
}

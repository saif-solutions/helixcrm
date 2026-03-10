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

// Add a flag to track if we're in debug mode
const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Set the tenant context for the current async scope
 * This replaces any existing context
 */
export function setTenantContext(context: TenantContext): void {
  const currentContext = TenantContextStorage.getStore();

  // CRITICAL: Never replace a valid (non-PENDING) context with PENDING
  if (
    currentContext &&
    currentContext.tenantId !== 'PENDING' &&
    context.tenantId === 'PENDING'
  ) {
    if (DEBUG) {
      console.log(
        `[TenantContext] BLOCKED: Attempt to replace valid context ${currentContext.tenantId} with PENDING`,
      );
    }
    return;
  }

  if (DEBUG) {
    console.log(
      `[TenantContext] Setting context: ${context.tenantId} (${context.source})`,
    );
  }

  // Enter with the new context
  TenantContextStorage.enterWith(context);

  if (DEBUG) {
    const verify = TenantContextStorage.getStore();
    console.log(
      `[TenantContext] Verified context after set: ${verify?.tenantId}`,
    );
  }
}

/**
 * Get the current tenant context (throws if missing)
 */
export function requireTenantContext(): TenantContext {
  const context = TenantContextStorage.getStore();
  if (DEBUG) {
    console.log(
      `[TenantContext] requireTenantContext returning: ${context?.tenantId || 'undefined'}`,
    );
  }
  if (!context) {
    throw new TenantContextMissingError();
  }
  return context;
}

/**
 * Get tenant context (returns undefined if missing)
 */
export function getTenantContext(): TenantContext | undefined {
  const context = TenantContextStorage.getStore();
  if (DEBUG) {
    console.log(
      `[TenantContext] getTenantContext returning: ${context?.tenantId || 'undefined'}`,
    );
  }
  return context;
}

/**
 * Run a function with tenant context
 */
export function withTenantContext<T>(context: TenantContext, fn: () => T): T {
  if (DEBUG) {
    console.log(`[TenantContext] Running with context: ${context.tenantId}`);
  }
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

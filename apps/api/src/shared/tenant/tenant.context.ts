// apps/api/src/shared/tenant/tenant.context.ts

import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext } from './tenant.types';

// ==================== CONSTANTS ====================

const DEBUG = process.env.NODE_ENV === 'development';
const PENDING_CONTEXT_ID = 'PENDING';

// ==================== STORAGE ====================

/**
 * AsyncLocalStorage instance for tenant context propagation
 * This ensures tenant context is isolated per request/async operation
 */
export const TenantContextStorage = new AsyncLocalStorage<TenantContext>();

// ==================== CUSTOM ERRORS ====================

/**
 * Error thrown when tenant context is accessed but not set
 */
export class TenantContextMissingError extends Error {
  constructor() {
    super(
      'Tenant context is missing. Ensure TenantGuard runs before accessing tenant context.',
    );
    this.name = 'TenantContextMissingError';
  }
}

// ==================== CONTEXT MANAGEMENT ====================

/**
 * Set the tenant context for the current async scope
 * This replaces any existing context in the current scope
 *
 * @param context - The tenant context to set
 *
 * @example
 * ```typescript
 * setTenantContext({
 *   tenantId: 'org-123',
 *   organizationId: 'org-123',
 *   isSystemContext: false,
 *   source: 'token',
 *   resolvedAt: new Date(),
 * });
 * ```
 */
export function setTenantContext(context: TenantContext): void {
  const currentContext = TenantContextStorage.getStore();

  // CRITICAL: Never replace a valid (non-PENDING) context with PENDING
  if (
    currentContext &&
    currentContext.tenantId !== PENDING_CONTEXT_ID &&
    context.tenantId === PENDING_CONTEXT_ID
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
 *
 * @returns The current tenant context
 * @throws {TenantContextMissingError} If no context exists
 *
 * @example
 * ```typescript
 * try {
 *   const context = requireTenantContext();
 *   console.log(context.tenantId);
 * } catch (error) {
 *   // Handle missing context
 * }
 * ```
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
 *
 * @returns The current tenant context or undefined
 *
 * @example
 * ```typescript
 * const context = getTenantContext();
 * if (context) {
 *   // Use context
 * }
 * ```
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
 *
 * @param context - The tenant context to use
 * @param fn - The function to execute within the context
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const result = withTenantContext(tenantContext, () => {
 *   return someService.doSomething();
 * });
 * ```
 */
export function withTenantContext<T>(context: TenantContext, fn: () => T): T {
  if (DEBUG) {
    console.log(`[TenantContext] Running with context: ${context.tenantId}`);
  }
  return TenantContextStorage.run(context, fn);
}

// ==================== CONVENIENCE GETTERS ====================

/**
 * Get tenant ID safely
 *
 * @returns The current tenant ID
 * @throws {TenantContextMissingError} If no context exists
 */
export function getTenantId(): string {
  return requireTenantContext().tenantId;
}

/**
 * Get organization ID (alias for tenantId)
 *
 * @returns The current organization ID
 * @throws {TenantContextMissingError} If no context exists
 */
export function getOrganizationId(): string {
  return requireTenantContext().organizationId;
}

/**
 * Check if current context is system context
 *
 * @returns True if in system context, false otherwise
 */
export function isSystemContext(): boolean {
  return getTenantContext()?.isSystemContext ?? false;
}

/**
 * Get user ID from current context
 *
 * @returns The current user ID or undefined
 */
export function getCurrentUserId(): string | undefined {
  return getTenantContext()?.userId;
}

/**
 * Get user roles from current context
 *
 * @returns The current user roles or undefined
 */
export function getCurrentUserRoles(): string[] | undefined {
  return getTenantContext()?.roles;
}

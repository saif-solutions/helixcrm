// apps/api/src/shared/als.ts

import { AsyncLocalStorage } from 'async_hooks';

/**
 * Async Local Storage store interface
 * Holds request-scoped context data
 */
export interface AlsStore {
  /** Unique request identifier */
  requestId: string;
  /** Current tenant ID for multi-tenancy */
  tenantId?: string;
  /** Current authenticated user ID */
  userId?: string;
  /** Current user's email */
  userEmail?: string;
  /** User's roles for authorization */
  roles?: string[];
  /** User's permissions for authorization */
  permissions?: string[];
  /** Additional metadata for the request */
  metadata?: Record<string, unknown>;
}

// Single source of truth for AsyncLocalStorage
export const als = new AsyncLocalStorage<AlsStore>();

/**
 * Get the current ALS store
 */
export function getStore(): AlsStore | undefined {
  return als.getStore();
}

/**
 * Get tenant ID from current context
 */
export function getTenantId(): string | undefined {
  return als.getStore()?.tenantId;
}

/**
 * Set tenant ID in current context
 */
export function setTenantId(tenantId: string): void {
  const store = als.getStore();
  if (store) {
    store.tenantId = tenantId;
  }
}

/**
 * Get request ID from current context
 */
export function getRequestId(): string | undefined {
  return als.getStore()?.requestId;
}

/**
 * Set user information in current context
 */
export function setUserInfo(
  userId: string,
  email: string,
  roles: string[],
  permissions: string[],
): void {
  const store = als.getStore();
  if (store) {
    store.userId = userId;
    store.userEmail = email;
    store.roles = roles;
    store.permissions = permissions;
  }
}

/**
 * Require tenant ID - throws if not set
 */
export function requireTenantId(): string {
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new Error('Tenant context is required but not set');
  }
  return tenantId;
}

/**
 * Clear user information from current context
 */
export function clearUserInfo(): void {
  const store = als.getStore();
  if (store) {
    store.userId = undefined;
    store.userEmail = undefined;
    store.roles = undefined;
    store.permissions = undefined;
  }
}

/**
 * Set metadata in current context
 */
export function setMetadata(metadata: Record<string, unknown>): void {
  const store = als.getStore();
  if (store) {
    store.metadata = { ...store.metadata, ...metadata };
  }
}

/**
 * Get metadata from current context
 */
export function getMetadata(): Record<string, unknown> | undefined {
  return als.getStore()?.metadata;
}

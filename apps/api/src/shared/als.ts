// apps/api/src/shared/als.ts

import { AsyncLocalStorage } from 'async_hooks';

export interface AlsStore {
  requestId: string;
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}

// Single source of truth for AsyncLocalStorage
export const als = new AsyncLocalStorage<AlsStore>();

// Helper functions
export function getStore(): AlsStore | undefined {
  return als.getStore();
}

export function getTenantId(): string | undefined {
  return als.getStore()?.tenantId;
}

export function setTenantId(tenantId: string): void {
  const store = als.getStore();
  if (store) {
    store.tenantId = tenantId;
  }
}

export function getRequestId(): string | undefined {
  return als.getStore()?.requestId;
}

export function setUserInfo(userId: string, email: string, roles: string[], permissions: string[]): void {
  const store = als.getStore();
  if (store) {
    store.userId = userId;
    store.userEmail = email;
    store.roles = roles;
    store.permissions = permissions;
  }
}

export function requireTenantId(): string {
  const tenantId = getTenantId();
  if (!tenantId) {
    throw new Error('Tenant context is required but not set');
  }
  return tenantId;
}
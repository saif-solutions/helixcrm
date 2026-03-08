// test/factories/user.factory.ts
import { jest } from '@jest/globals';

// Local Role enum - self-contained for testing
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const createMockUser = (overrides: Partial<any> = {}) => {
  const password = overrides.passwordHash ?? overrides.password ?? 'hashed-password';
  
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email: 'test@example.com',
    // Include ALL possible field names that might be used
    password: password,
    passwordHash: password,
    hashedPassword: password,
    firstName: 'Test',
    lastName: 'User',
    role: Role.USER,
    isActive: true,
    tenantId: 'tenant-123',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    tokenVersion: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
};

export const createMockAdmin = (overrides = {}) => 
  createMockUser({ role: Role.ADMIN, ...overrides });

export const createMockTenantAdmin = (overrides = {}) => 
  createMockUser({ role: Role.TENANT_ADMIN, ...overrides });

export const createMockSuperAdmin = (overrides = {}) => 
  createMockUser({ role: Role.SUPER_ADMIN, ...overrides });
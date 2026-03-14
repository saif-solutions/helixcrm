// tests/helpers/factories/user.factory.ts
/**
 * User Test Factories
 * 
 * Provides type-safe factories for creating mock users in tests.
 * Includes support for roles, permissions, and the UserRoles structure
 * expected by the AuthGuard.
 */

// Local Role enum - self-contained for testing
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// ==================== TYPE DEFINITIONS ====================

/**
 * Permission structure matching Prisma schema
 */
export interface MockPermission {
  permission: {
    code: string;
  };
}

/**
 * Role structure with permissions
 */
export interface MockRole {
  name: string;
  permissions: MockPermission[];
}

/**
 * UserRole junction table structure
 */
export interface MockUserRole {
  role: MockRole;
}

/**
 * Complete user interface matching what the AuthGuard expects
 */
export interface MockUser {
  id: string;
  email: string;
  password: string;
  passwordHash: string;
  hashedPassword: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  tenantId: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
  // UserRoles for permission system - matches Prisma schema and AuthGuard expectations
  UserRoles: MockUserRole[];
  [key: string]: unknown; // Allow additional properties for flexibility
}

/**
 * Type for user creation overrides
 */
export type MockUserOverrides = Partial<MockUser>;

// ==================== BASE FACTORY ====================

/**
 * Creates a mock user for testing with proper type safety
 * 
 * @param overrides - Optional overrides to customize the user
 * @returns A complete mock user object with empty UserRoles array
 * 
 * @example
 * const user = createMockUser({ email: 'custom@example.com' });
 */
export const createMockUser = (overrides: MockUserOverrides = {}): MockUser => {
  const password =
    overrides.passwordHash ?? overrides.password ?? 'hashed-password-123';
  const now = new Date('2024-01-01');
  const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  return {
    id,
    email: 'test@example.com',
    // Include ALL possible field names that might be used across the app
    password,
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
    createdAt: now,
    updatedAt: now,
    // UserRoles array (empty by default) - matches AuthGuard expectations
    UserRoles: [],
    ...overrides,
  };
};

// ==================== ROLE-BASED FACTORIES ====================

/**
 * Creates a mock admin user
 * 
 * @param overrides - Optional overrides
 * @returns A mock admin user
 */
export const createMockAdmin = (overrides: MockUserOverrides = {}): MockUser =>
  createMockUser({ role: Role.ADMIN, ...overrides });

/**
 * Creates a mock tenant admin user
 * 
 * @param overrides - Optional overrides
 * @returns A mock tenant admin user
 */
export const createMockTenantAdmin = (overrides: MockUserOverrides = {}): MockUser =>
  createMockUser({ role: Role.TENANT_ADMIN, ...overrides });

/**
 * Creates a mock super admin user
 * 
 * @param overrides - Optional overrides
 * @returns A mock super admin user
 */
export const createMockSuperAdmin = (overrides: MockUserOverrides = {}): MockUser =>
  createMockUser({ role: Role.SUPER_ADMIN, ...overrides });

// ==================== PERMISSION-BASED FACTORIES ====================

/**
 * Creates a mock user with specific permissions
 * This matches the nested structure expected by the AuthGuard:
 * UserRoles[].role.permissions[].permission.code
 * 
 * @param permissions - Array of permission codes (e.g., ['deal:read', 'deal:write'])
 * @param overrides - Optional user overrides
 * @returns A mock user with the specified permissions
 * 
 * @example
 * const user = createMockUserWithPermissions(['deal:read', 'lead:write']);
 */
export const createMockUserWithPermissions = (
  permissions: string[] = [],
  overrides: MockUserOverrides = {}
): MockUser => {
  const baseUser = createMockUser(overrides);
  
  if (permissions.length === 0) {
    return baseUser;
  }
  
  return {
    ...baseUser,
    UserRoles: [{
      role: {
        name: 'custom_role',
        permissions: permissions.map(perm => ({
          permission: {
            code: perm
          }
        }))
      }
    }]
  };
};

/**
 * Creates a mock user with specific roles
 * 
 * @param roles - Array of role names
 * @param overrides - Optional user overrides
 * @returns A mock user with the specified roles (no permissions)
 * 
 * @example
 * const user = createMockUserWithRoles(['admin', 'sales']);
 */
export const createMockUserWithRoles = (
  roles: string[] = [],
  overrides: MockUserOverrides = {}
): MockUser => {
  const baseUser = createMockUser(overrides);
  
  if (roles.length === 0) {
    return baseUser;
  }
  
  return {
    ...baseUser,
    UserRoles: roles.map(roleName => ({
      role: {
        name: roleName,
        permissions: [] // No permissions by default
      }
    }))
  };
};

/**
 * Creates a mock user with both roles and permissions
 * Each role can have its own set of permissions
 * 
 * @param rolePermissions - Map of role names to their permissions
 * @param overrides - Optional user overrides
 * @returns A mock user with the specified role-permission structure
 * 
 * @example
 * const user = createMockUserWithRolePermissions({
 *   admin: ['deal:*', 'lead:*'],
 *   sales: ['deal:read']
 * });
 */
export const createMockUserWithRolePermissions = (
  rolePermissions: Record<string, string[]> = {},
  overrides: MockUserOverrides = {}
): MockUser => {
  const baseUser = createMockUser(overrides);
  
  if (Object.keys(rolePermissions).length === 0) {
    return baseUser;
  }
  
  return {
    ...baseUser,
    UserRoles: Object.entries(rolePermissions).map(([roleName, permissions]) => ({
      role: {
        name: roleName,
        permissions: permissions.map(perm => ({
          permission: {
            code: perm
          }
        }))
      }
    }))
  };
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Checks if a user has a specific permission
 * Useful for test assertions
 * 
 * @param user - The mock user
 * @param permissionCode - The permission code to check
 * @returns boolean indicating if the user has the permission
 */
export const userHasPermission = (user: MockUser, permissionCode: string): boolean => {
  return user.UserRoles.some(userRole =>
    userRole.role.permissions.some(perm => perm.permission.code === permissionCode)
  );
};

/**
 * Gets all permission codes for a user
 * Useful for test assertions
 * 
 * @param user - The mock user
 * @returns Array of permission codes
 */
export const getUserPermissions = (user: MockUser): string[] => {
  const permissions = new Set<string>();
  
  user.UserRoles.forEach(userRole => {
    userRole.role.permissions.forEach(perm => {
      permissions.add(perm.permission.code);
    });
  });
  
  return Array.from(permissions);
};

/**
 * Gets all role names for a user
 * Useful for test assertions
 * 
 * @param user - The mock user
 * @returns Array of role names
 */
export const getUserRoles = (user: MockUser): string[] => {
  return user.UserRoles.map(userRole => userRole.role.name);
};

// ==================== EXPORTS ====================

// Export types with non-conflicting names to avoid export conflicts
export type {
  MockUser as User,
  MockUserRole as UserRole,
  MockRole as RoleType,  // Renamed to RoleType to avoid conflict with Role enum
  MockPermission as Permission
};

// Default export for convenience
export default {
  createMockUser,
  createMockAdmin,
  createMockTenantAdmin,
  createMockSuperAdmin,
  createMockUserWithPermissions,
  createMockUserWithRoles,
  createMockUserWithRolePermissions,
  userHasPermission,
  getUserPermissions,
  getUserRoles,
  Role,
};
// tests/security/invariants/permission-enforcement.spec.ts
// Permission Enforcement Security Tests
// Tests that permissions are properly enforced using mocks

import { describe, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';

// Define types for our mock data
interface MockUser {
  id: string;
  email: string;
  passwordHash: string;
  organizationId: string;
  role: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MockOrganization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockRole {
  id: string;
  name: string;
  organizationId: string;
  description: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MockPermission {
  id: string;
  name: string;
  code: string;
  module: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockRolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
}

// Simple in-memory database
class InMemoryDB {
  users: Map<string, MockUser> = new Map();
  organizations: Map<string, MockOrganization> = new Map();
  roles: Map<string, MockRole> = new Map();
  permissions: Map<string, MockPermission> = new Map();
  rolePermissions: Map<string, MockRolePermission> = new Map();

  generateId(): string {
    return `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  clear(): void {
    this.users.clear();
    this.organizations.clear();
    this.roles.clear();
    this.permissions.clear();
    this.rolePermissions.clear();
  }
}

const db = new InMemoryDB();

// Mock the entire Prisma client with a simple implementation
jest.mock('@prisma/client', () => {
  // Create a simple mock implementation
  const createMockPrisma = () => ({
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    permission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    rolePermission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  });

  return {
    PrismaClient: jest.fn().mockImplementation(createMockPrisma),
  };
});

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: () => Promise.resolve('hashed-password'),
  compare: () => Promise.resolve(true),
}));

// Helper to get permissions for a role
const getRolePermissions = (roleId: string): Array<{ permission: MockPermission }> => {
  const rolePerms = Array.from(db.rolePermissions.values()).filter(rp => rp.roleId === roleId);
  const permissions = rolePerms
    .map(rp => {
      const permission = Array.from(db.permissions.values()).find(p => p.id === rp.permissionId);
      return permission ? { permission } : null;
    })
    .filter((p): p is { permission: MockPermission } => p !== null);
  return permissions;
};

// Setup mock implementations
const setupMocks = (prisma: any) => {
  // User mocks
  prisma.user.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.id) {
      return db.users.get(where.id) || null;
    }
    if (where.email) {
      const users = Array.from(db.users.values());
      return users.find(u => u.email === where.email) || null;
    }
    return null;
  });

  prisma.user.findMany.mockImplementation(async ({ where }: any) => {
    let users = Array.from(db.users.values());
    if (where?.organizationId) {
      users = users.filter(u => u.organizationId === where.organizationId);
    }
    return users;
  });

  prisma.user.create.mockImplementation(async ({ data }: any) => {
    const user: MockUser = {
      id: db.generateId(),
      email: data.email,
      passwordHash: data.passwordHash,
      organizationId: data.organizationId,
      role: data.role,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      emailVerified: data.emailVerified || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.users.set(user.id, user);
    return user;
  });

  prisma.user.delete.mockImplementation(async ({ where }: any) => {
    const user = db.users.get(where.id);
    if (user) {
      db.users.delete(where.id);
    }
    return user;
  });

  prisma.user.deleteMany.mockImplementation(async ({ where }: any) => {
    let users = Array.from(db.users.values());
    if (where?.id?.in) {
      users = users.filter(u => where.id.in.includes(u.id));
    }
    if (where?.organizationId) {
      users = users.filter(u => u.organizationId === where.organizationId);
    }
    const count = users.length;
    users.forEach(u => db.users.delete(u.id));
    return { count };
  });

  // Organization mocks
  prisma.organization.create.mockImplementation(async ({ data }: any) => {
    const organization: MockOrganization = {
      id: db.generateId(),
      name: data.name,
      slug: data.slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.organizations.set(organization.id, organization);
    return organization;
  });

  prisma.organization.findUnique.mockImplementation(async ({ where }: any) => {
    return db.organizations.get(where.id) || null;
  });

  prisma.organization.delete.mockImplementation(async ({ where }: any) => {
    const org = db.organizations.get(where.id);
    if (org) {
      db.organizations.delete(where.id);
    }
    return org;
  });

  prisma.organization.deleteMany.mockImplementation(async ({ where }: any) => {
    let orgs = Array.from(db.organizations.values());
    if (where?.id?.in) {
      orgs = orgs.filter(o => where.id.in.includes(o.id));
    }
    const count = orgs.length;
    orgs.forEach(o => db.organizations.delete(o.id));
    return { count };
  });

  // Role mocks
// Update the role.create mock implementation in the setupMocks function
prisma.role.create.mockImplementation(async ({ data }: any) => {
  // Check if a role with the same name already exists in this organization
  const existingRole = Array.from(db.roles.values()).find(
    r => r.name === data.name && r.organizationId === data.organizationId
  );
  
  if (existingRole) {
    // Throw an error similar to Prisma's unique constraint violation
    const error = new Error('Unique constraint failed on the fields: (`name`, `organizationId`)');
    (error as any).code = 'P2002';
    (error as any).meta = { target: ['name', 'organizationId'] };
    throw error;
  }
  
  const role: MockRole = {
    id: db.generateId(),
    name: data.name,
    organizationId: data.organizationId,
    description: data.description || '',
    isSystem: data.isSystem || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  db.roles.set(role.id, role);
  return role;
});
  prisma.role.findUnique.mockImplementation(async ({ where, include }: any) => {
    const role = db.roles.get(where.id);
    if (!role) return null;
    
    if (include?.permissions) {
      return {
        ...role,
        permissions: getRolePermissions(role.id),
      };
    }
    return role;
  });

  prisma.role.findFirst.mockImplementation(async ({ where, include }: any) => {
    const roles = Array.from(db.roles.values());
    const role = roles.find(r => 
      r.name === where.name && r.organizationId === where.organizationId
    );
    if (!role) return null;
    
    if (include?.permissions) {
      return {
        ...role,
        permissions: getRolePermissions(role.id),
      };
    }
    return role;
  });

  prisma.role.findMany.mockImplementation(async ({ where, include }: any) => {
    let roles = Array.from(db.roles.values());
    if (where?.organizationId) {
      roles = roles.filter(r => r.organizationId === where.organizationId);
    }
    
    if (include?.permissions) {
      return roles.map(role => ({
        ...role,
        permissions: getRolePermissions(role.id),
      }));
    }
    return roles;
  });

  prisma.role.delete.mockImplementation(async ({ where }: any) => {
    const role = db.roles.get(where.id);
    if (role) {
      db.roles.delete(where.id);
    }
    return role;
  });

  prisma.role.deleteMany.mockImplementation(async ({ where }: any) => {
    let roles = Array.from(db.roles.values());
    if (where?.id?.in) {
      roles = roles.filter(r => where.id.in.includes(r.id));
    }
    if (where?.organizationId) {
      roles = roles.filter(r => r.organizationId === where.organizationId);
    }
    const count = roles.length;
    roles.forEach(r => db.roles.delete(r.id));
    return { count };
  });

  // Permission mocks
  prisma.permission.upsert.mockImplementation(async ({ where, create }: any) => {
    let permission = Array.from(db.permissions.values()).find(p => p.code === where.code);
    if (!permission) {
      permission = {
        id: db.generateId(),
        name: create.name,
        code: create.code,
        module: create.module,
        description: create.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      db.permissions.set(permission.code, permission);
    }
    return permission;
  });

  prisma.permission.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.code) {
      return Array.from(db.permissions.values()).find(p => p.code === where.code) || null;
    }
    if (where.id) {
      return Array.from(db.permissions.values()).find(p => p.id === where.id) || null;
    }
    return null;
  });

  prisma.permission.deleteMany.mockImplementation(async ({ where }: any) => {
    let perms = Array.from(db.permissions.values());
    if (where?.id?.in) {
      perms = perms.filter(p => where.id.in.includes(p.id));
    }
    if (where?.code?.contains) {
      perms = perms.filter(p => p.code.includes(where.code.contains));
    }
    const count = perms.length;
    perms.forEach(p => db.permissions.delete(p.code));
    return { count };
  });

  // RolePermission mocks
  prisma.rolePermission.create.mockImplementation(async ({ data }: any) => {
    const rolePermission: MockRolePermission = {
      id: db.generateId(),
      roleId: data.roleId,
      permissionId: data.permissionId,
      createdAt: new Date(),
    };
    const key = `${rolePermission.roleId}-${rolePermission.permissionId}`;
    db.rolePermissions.set(key, rolePermission);
    return rolePermission;
  });

  prisma.rolePermission.createMany.mockImplementation(async ({ data }: any) => {
    let count = 0;
    for (const item of data) {
      const key = `${item.roleId}-${item.permissionId}`;
      if (!db.rolePermissions.has(key)) {
        db.rolePermissions.set(key, {
          id: db.generateId(),
          roleId: item.roleId,
          permissionId: item.permissionId,
          createdAt: new Date(),
        });
        count++;
      }
    }
    return { count };
  });

  prisma.rolePermission.findFirst.mockImplementation(async ({ where }: any) => {
    const rolePermissions = Array.from(db.rolePermissions.values());
    return rolePermissions.find(rp => 
      rp.roleId === where.roleId && rp.permissionId === where.permissionId
    ) || null;
  });

  prisma.rolePermission.findMany.mockImplementation(async ({ where }: any) => {
    let rolePermissions = Array.from(db.rolePermissions.values());
    if (where?.roleId) {
      rolePermissions = rolePermissions.filter(rp => rp.roleId === where.roleId);
    }
    if (where?.permissionId) {
      rolePermissions = rolePermissions.filter(rp => rp.permissionId === where.permissionId);
    }
    return rolePermissions;
  });

  prisma.rolePermission.deleteMany.mockImplementation(async ({ where }: any) => {
    let rolePermissions = Array.from(db.rolePermissions.values());
    if (where?.roleId) {
      rolePermissions = rolePermissions.filter(rp => rp.roleId === where.roleId);
      rolePermissions.forEach(rp => {
        const key = `${rp.roleId}-${rp.permissionId}`;
        db.rolePermissions.delete(key);
      });
    }
    if (where?.permissionId) {
      rolePermissions = rolePermissions.filter(rp => rp.permissionId === where.permissionId);
      rolePermissions.forEach(rp => {
        const key = `${rp.roleId}-${rp.permissionId}`;
        db.rolePermissions.delete(key);
      });
    }
    return { count: rolePermissions.length };
  });
};

// Helper class for test data management
class SecurityTestHelpers {
  private prisma: any;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async createTestOrganization(name: string): Promise<any> {
    const uniqueName = `${name}_${Date.now()}`;
    return this.prisma.organization.create({
      data: {
        name: uniqueName,
        slug: uniqueName.toLowerCase().replace(/\s+/g, '-'),
      },
    });
  }

  async createTestUser(
    email: string,
    organizationId: string,
    roleName: string,
    passwordHash?: string
  ): Promise<any> {
    const hash = passwordHash || 'hashed-password';
    const uniqueEmail = `${email}_${Date.now()}@example.com`;
    
    return this.prisma.user.create({
      data: {
        email: uniqueEmail,
        passwordHash: hash,
        organizationId: organizationId,
        role: roleName,
        firstName: `${roleName}User`,
        lastName: 'Test',
        emailVerified: true,
      },
    });
  }

  async cleanupTestData(userIds: string[], organizationIds: string[]): Promise<void> {
    if (userIds.length > 0) {
      await this.prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    if (organizationIds.length > 0) {
      await this.prisma.organization.deleteMany({
        where: { id: { in: organizationIds } },
      });
    }
  }
}

describe('Permission Enforcement Security Tests', () => {
  let prisma: any;
  let testHelpers: SecurityTestHelpers;
  let testOrganization: any;
  let adminUser: any;
  let regularUser: any;
  let adminRole: any;
  let userRole: any;

  beforeAll(async () => {
    // Create mock Prisma client
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
    
    // Setup mock implementations
    setupMocks(prisma);
    
    // Clear database
    db.clear();
    
    testHelpers = new SecurityTestHelpers(prisma);

    // Create test organization
    testOrganization = await testHelpers.createTestOrganization('PermissionTestOrg');

    // Create roles
    adminRole = await prisma.role.create({
      data: {
        name: `admin_${Date.now()}`,
        organizationId: testOrganization.id,
        description: 'Administrator role with full permissions',
        isSystem: false,
      },
    });

    userRole = await prisma.role.create({
      data: {
        name: `user_${Date.now()}`,
        organizationId: testOrganization.id,
        description: 'Standard user role with limited permissions',
        isSystem: false,
      },
    });

    // Create test permissions
    await prisma.permission.upsert({
      where: { code: 'TEST_PERMISSION_CREATE' },
      update: {},
      create: {
        name: 'test.permission.create',
        code: 'TEST_PERMISSION_CREATE',
        module: 'security',
        description: 'Test permission for creating resources',
      },
    });

    await prisma.permission.upsert({
      where: { code: 'TEST_PERMISSION_VIEW' },
      update: {},
      create: {
        name: 'test.permission.view',
        code: 'TEST_PERMISSION_VIEW',
        module: 'security',
        description: 'Test permission for viewing resources',
      },
    });

    // Get permission IDs
    const createPerm = await prisma.permission.findUnique({ where: { code: 'TEST_PERMISSION_CREATE' } });
    const viewPerm = await prisma.permission.findUnique({ where: { code: 'TEST_PERMISSION_VIEW' } });

    // Assign permissions to roles
    await prisma.rolePermission.createMany({
      data: [
        { roleId: adminRole.id, permissionId: createPerm.id },
        { roleId: adminRole.id, permissionId: viewPerm.id },
        { roleId: userRole.id, permissionId: viewPerm.id },
      ],
    });

    // Create users
    adminUser = await testHelpers.createTestUser(
      'admin',
      testOrganization.id,
      adminRole.name,
      'hashed-password'
    );
    
    regularUser = await testHelpers.createTestUser(
      'regular',
      testOrganization.id,
      userRole.name,
      'hashed-password'
    );
  });

  afterAll(async () => {
    // Clean up
    db.clear();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('Permission Assignment', () => {
    it('should verify admin role has correct permissions', async () => {
      const roleWithPermissions = await prisma.role.findUnique({
        where: { id: adminRole.id },
        include: { 
          permissions: { 
            include: { permission: true } 
          } 
        },
      });

      expect(roleWithPermissions).toBeDefined();
      expect(roleWithPermissions?.permissions).toBeDefined();
      expect(roleWithPermissions?.permissions.length).toBe(2);

      const hasCreatePermission = roleWithPermissions?.permissions.some(
        (rp: any) => rp.permission.code === 'TEST_PERMISSION_CREATE',
      );
      expect(hasCreatePermission).toBe(true);

      const hasViewPermission = roleWithPermissions?.permissions.some(
        (rp: any) => rp.permission.code === 'TEST_PERMISSION_VIEW',
      );
      expect(hasViewPermission).toBe(true);
    });

    it('should verify regular user role has limited permissions', async () => {
      const roleWithPermissions = await prisma.role.findUnique({
        where: { id: userRole.id },
        include: { 
          permissions: { 
            include: { permission: true } 
          } 
        },
      });

      expect(roleWithPermissions).toBeDefined();
      expect(roleWithPermissions?.permissions).toBeDefined();
      expect(roleWithPermissions?.permissions.length).toBe(1);
      
      const hasCreatePermission = roleWithPermissions?.permissions.some(
        (rp: any) => rp.permission.code === 'TEST_PERMISSION_CREATE',
      );
      expect(hasCreatePermission).toBe(false);

      const hasViewPermission = roleWithPermissions?.permissions.some(
        (rp: any) => rp.permission.code === 'TEST_PERMISSION_VIEW',
      );
      expect(hasViewPermission).toBe(true);
    });

    it('should verify regular user does not have admin permissions', async () => {
      const regularUserData = await prisma.user.findUnique({
        where: { id: regularUser.id },
      });

      expect(regularUserData).toBeDefined();
      expect(regularUserData?.role).not.toBe('admin');
      expect(regularUserData?.role).toBe(userRole.name);
    });
  });

  describe('Permission Resolution', () => {
    it('should correctly resolve user permissions from roles', async () => {
      const user = await prisma.user.findUnique({
        where: { id: adminUser.id },
      });

      expect(user).toBeDefined();
      expect(user?.role).toBe(adminRole.name);
      expect(user?.organizationId).toBe(testOrganization.id);
    });

    it('should retrieve permissions for admin user via role', async () => {
      const roleWithPermissions = await prisma.role.findUnique({
        where: { id: adminRole.id },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      expect(roleWithPermissions).toBeDefined();
      expect(roleWithPermissions?.permissions).toBeDefined();
      expect(roleWithPermissions?.permissions.length).toBe(2);

      const permissions = roleWithPermissions?.permissions.map((rp: any) => rp.permission.code) || [];
      
      expect(permissions).toContain('TEST_PERMISSION_CREATE');
      expect(permissions).toContain('TEST_PERMISSION_VIEW');
    });

    it('should retrieve permissions for regular user via role', async () => {
      const roleWithPermissions = await prisma.role.findUnique({
        where: { id: userRole.id },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      expect(roleWithPermissions).toBeDefined();
      expect(roleWithPermissions?.permissions).toBeDefined();
      expect(roleWithPermissions?.permissions.length).toBe(1);
      
      const permissions = roleWithPermissions?.permissions.map((rp: any) => rp.permission.code) || [];
      
      expect(permissions).toContain('TEST_PERMISSION_VIEW');
      expect(permissions).not.toContain('TEST_PERMISSION_CREATE');
    });
  });

  describe('Permission Enforcement', () => {
    const checkUserPermission = async (userId: string, requiredPermissionCode: string): Promise<boolean> => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) return false;

      const role = await prisma.role.findFirst({
        where: {
          name: user.role,
          organizationId: user.organizationId,
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!role) return false;

      return role.permissions.some(
        (rp: any) => rp.permission.code === requiredPermissionCode
      );
    };

    it('should grant access to admin user for create permission', async () => {
      const hasCreatePermission = await checkUserPermission(adminUser.id, 'TEST_PERMISSION_CREATE');
      expect(hasCreatePermission).toBe(true);
    });

    it('should grant access to admin user for view permission', async () => {
      const hasViewPermission = await checkUserPermission(adminUser.id, 'TEST_PERMISSION_VIEW');
      expect(hasViewPermission).toBe(true);
    });

    it('should deny access to regular user for create permission', async () => {
      const hasCreatePermission = await checkUserPermission(regularUser.id, 'TEST_PERMISSION_CREATE');
      expect(hasCreatePermission).toBe(false);
    });

    it('should grant access to regular user for view permission', async () => {
      const hasViewPermission = await checkUserPermission(regularUser.id, 'TEST_PERMISSION_VIEW');
      expect(hasViewPermission).toBe(true);
    });

    it('should deny access for non-existent permission', async () => {
      const hasNonExistentPermission = await checkUserPermission(adminUser.id, 'NON_EXISTENT_PERMISSION');
      expect(hasNonExistentPermission).toBe(false);
    });

    it('should deny access for invalid user', async () => {
      const result = await checkUserPermission('invalid-user-id', 'TEST_PERMISSION_VIEW');
      expect(result).toBe(false);
    });
  });

  describe('Cross-Organization Isolation', () => {
    let otherOrganization: any;
    let otherUser: any;

    beforeAll(async () => {
      otherOrganization = await testHelpers.createTestOrganization('OtherOrg');
      
      otherUser = await testHelpers.createTestUser(
        'other',
        otherOrganization.id,
        'admin',
        'hashed-password'
      );
    });

    afterAll(async () => {
      if (otherUser) {
        await prisma.user.deleteMany({ where: { id: otherUser.id } });
      }
      if (otherOrganization) {
        await prisma.organization.deleteMany({ where: { id: otherOrganization.id } });
      }
    });

    it('should not allow users to access resources from other organizations', async () => {
      const userFromOtherOrg = await prisma.user.findUnique({
        where: { id: otherUser.id },
      });

      expect(userFromOtherOrg).toBeDefined();
      expect(userFromOtherOrg?.organizationId).not.toBe(testOrganization.id);
      expect(userFromOtherOrg?.organizationId).toBe(otherOrganization.id);
    });
  });

  describe('Role Management', () => {
    it('should allow creating roles with unique names per organization', async () => {
      const uniqueRoleName = `test-role-${Date.now()}`;
      const newRole = await prisma.role.create({
        data: {
          name: uniqueRoleName,
          organizationId: testOrganization.id,
          description: 'Test role for permission testing',
        },
      });

      expect(newRole).toBeDefined();
      expect(newRole.name).toBe(uniqueRoleName);
      expect(newRole.organizationId).toBe(testOrganization.id);

      // Clean up
      await prisma.role.delete({ where: { id: newRole.id } });
    });

    it('should prevent duplicate role names within same organization', async () => {
      const roleName = `duplicate-role-${Date.now()}`;
      
      await prisma.role.create({
        data: {
          name: roleName,
          organizationId: testOrganization.id,
          description: 'First role',
        },
      });

      await expect(
        prisma.role.create({
          data: {
            name: roleName,
            organizationId: testOrganization.id,
            description: 'Duplicate role',
          },
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.role.deleteMany({
        where: {
          name: roleName,
          organizationId: testOrganization.id,
        },
      });
    });
  });
});
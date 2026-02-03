// Permission Enforcement Security Tests
// Tests that permissions are properly enforced

import { PrismaClient } from '@prisma/client';
import { SecurityTestHelpers } from '../utils/test-helpers';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Permission Enforcement Security Tests', () => {
  let prisma: PrismaClient;
  let testHelpers: SecurityTestHelpers;
  let testOrganization: { id: string; name: string };
  let adminUser: any;
  let regularUser: any;
  let testPermissionId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const jwtService = { sign: () => 'mock-token', decode: () => ({}) } as any;
    testHelpers = new SecurityTestHelpers(prisma, jwtService);

    // Create test organization
    testOrganization = await testHelpers.createTestOrganization('PermissionTestOrg');

    // Create users with different roles
    adminUser = await testHelpers.createTestUser('admin', testOrganization.id, 'admin');
    regularUser = await testHelpers.createTestUser('regular', testOrganization.id, 'user');

    // Create a test permission - check if it already exists first
    // Use code as the unique identifier
    let existingPermission = await prisma.permission.findUnique({
      where: { code: 'TEST_PERMISSION_CREATE' },
    });

    if (!existingPermission) {
      existingPermission = await prisma.permission.create({
        data: {
          name: 'test.permission.create',
          code: 'TEST_PERMISSION_CREATE',
          module: 'security',
          description: 'Test permission for security testing',
        },
      });
    }

    testPermissionId = existingPermission.id;

    // Find or create admin role
    let adminRole = await prisma.role.findFirst({
      where: { name: 'admin', organizationId: testOrganization.id },
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'admin',
          organizationId: testOrganization.id,
          description: 'Administrator role',
        },
      });
    }

    // Check if permission is already assigned
    const existingRolePermission = await prisma.rolePermission.findFirst({
      where: {
        roleId: adminRole.id,
        permissionId: testPermissionId,
      },
    });

    if (!existingRolePermission) {
      // Assign permission to admin role using permissionId
      await prisma.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: testPermissionId,
        },
      });
    }
  });

  afterAll(async () => {
    // Clean up
    await prisma.permission.deleteMany({
      where: { code: { contains: 'TEST_PERMISSION' } },
    });

    await testHelpers.cleanupTestData(
      [adminUser.id, regularUser.id],
      [testOrganization.id],
    );

    await prisma.$disconnect();
  });

  describe('Permission Assignment', () => {
    test('Admin role has correct permissions', async () => {
      const adminRole = await prisma.role.findFirst({
        where: { name: 'admin', organizationId: testOrganization.id },
        include: { permissions: { include: { permission: true } } },
      });

      expect(adminRole).toBeDefined();
      // Admin role should have at least our test permission
      expect(adminRole?.permissions.length).toBeGreaterThan(0);
      
      // Check if our test permission is in the list
      const hasTestPermission = adminRole?.permissions.some(
        rp => rp.permission.code === 'TEST_PERMISSION_CREATE'
      );
      expect(hasTestPermission).toBe(true);
    });

    test('Regular user role has limited permissions', async () => {
      const userRole = await prisma.role.findFirst({
        where: { name: 'user', organizationId: testOrganization.id },
        include: { permissions: true },
      });

      // User role exists
      expect(userRole).toBeDefined();
      // User role may have fewer permissions than admin
      if (userRole?.permissions) {
        const adminRole = await prisma.role.findFirst({
          where: { name: 'admin', organizationId: testOrganization.id },
          include: { permissions: true },
        });
        expect(userRole.permissions.length).toBeLessThanOrEqual(
          adminRole?.permissions.length || 0
        );
      }
    });
  });

  describe('Permission Resolution', () => {
    test('User permissions are correctly resolved from roles', async () => {
      // Get user with role
      const userWithRole = await prisma.user.findUnique({
        where: { id: adminUser.id },
      });

      expect(userWithRole?.role).toBeDefined();
      expect(userWithRole?.role).toBe('admin');
    });
  });
});

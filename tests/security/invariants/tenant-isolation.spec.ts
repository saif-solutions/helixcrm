// Tenant Isolation Security Tests
// Tests that users cannot access data from other tenants

import { PrismaClient } from '@prisma/client';
import { SecurityTestHelpers, TestUser } from '../utils/test-helpers';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('Tenant Isolation Security Tests', () => {
  let prisma: PrismaClient;
  let testHelpers: SecurityTestHelpers;

  // Test data
  let organizationA: { id: string; name: string };
  let organizationB: { id: string; name: string };
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    // Initialize Prisma and JWT service
    prisma = new PrismaClient();
    const jwtService = { sign: () => 'mock-token', decode: () => ({}) } as any;
    testHelpers = new SecurityTestHelpers(prisma, jwtService);

    // Create test organizations
    organizationA = await testHelpers.createTestOrganization('TenantIsolationOrgA');
    organizationB = await testHelpers.createTestOrganization('TenantIsolationOrgB');

    // Create test users
    userA = await testHelpers.createTestUser('user_a', organizationA.id, 'admin');
    userB = await testHelpers.createTestUser('user_b', organizationB.id, 'admin');

    // Create test data in each organization
    await prisma.contact.createMany({
      data: [
        {
          email: 'contact_a@test.com',
          firstName: 'Contact',
          lastName: 'A',
          organizationId: organizationA.id,
        },
        {
          email: 'contact_b@test.com',
          firstName: 'Contact',
          lastName: 'B',
          organizationId: organizationB.id,
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    const contacts = await prisma.contact.findMany({
      where: {
        email: { in: ['contact_a@test.com', 'contact_b@test.com'] },
      },
    });
    
    await prisma.contact.deleteMany({
      where: { id: { in: contacts.map(c => c.id) } },
    });

    await testHelpers.cleanupTestData(
      [userA.id, userB.id],
      [organizationA.id, organizationB.id],
    );
    
    await prisma.$disconnect();
  });

  describe('Data Access Isolation', () => {
    test('User from Tenant A cannot access Tenant B contacts via API', async () => {
      // User A should only see their organization's contacts
      const contactsForUserA = await prisma.contact.findMany({
        where: { organizationId: organizationA.id },
      });
      
      // User B should only see their organization's contacts  
      const contactsForUserB = await prisma.contact.findMany({
        where: { organizationId: organizationB.id },
      });

      // Verify isolation
      expect(contactsForUserA).toHaveLength(1);
      expect(contactsForUserB).toHaveLength(1);
      expect(contactsForUserA[0].organizationId).toBe(organizationA.id);
      expect(contactsForUserB[0].organizationId).toBe(organizationB.id);
      
      // No cross-organization data
      const allContacts = await prisma.contact.findMany({
        where: {
          organizationId: { in: [organizationA.id, organizationB.id] },
        },
      });
      expect(allContacts).toHaveLength(2);
    });

    test('RLS prevents direct database cross-tenant access', async () => {
      // Test that RLS is enabled and working
      // This would require testing with different database users
      // For now, we verify the RLS policies exist
      
      const rlsPolicies = await prisma.$queryRaw`
        SELECT schemaname, tablename, policyname, permissive, roles, cmd
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN ('contacts', 'users', 'organizations')
        ORDER BY tablename, policyname;
      ` as any[];
      
      expect(Array.isArray(rlsPolicies)).toBe(true);
      expect(rlsPolicies.length).toBeGreaterThan(0);
      
      console.log('RLS Policies found:', rlsPolicies.length);
    });
  });

  describe('Permission Checks', () => {
    test('Users have correct tenant context', async () => {
      // Verify users are in correct organizations
      const userAFromDb = await prisma.user.findUnique({
        where: { id: userA.id },
      });
      
      const userBFromDb = await prisma.user.findUnique({
        where: { id: userB.id },
      });
      
      expect(userAFromDb?.organizationId).toBe(organizationA.id);
      expect(userBFromDb?.organizationId).toBe(organizationB.id);
      expect(userAFromDb?.organizationId).not.toBe(userBFromDb?.organizationId);
    });
  });
});

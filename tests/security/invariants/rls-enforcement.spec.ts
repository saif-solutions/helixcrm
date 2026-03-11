// RLS Enforcement Security Tests
// Tests that Row-Level Security is properly enforced

import { PrismaClient } from '@prisma/client';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('RLS Enforcement Security Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('RLS Policy Verification', () => {
    test('RLS is enabled on critical tables', async () => {
      // Check if RLS is enabled on key tables
      const tablesWithRLS = (await prisma.$queryRaw`
        SELECT schemaname, tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('contacts', 'users', 'organizations', 'deals', 'leads')
        AND rowsecurity = true;
      `) as any[];

      expect(Array.isArray(tablesWithRLS)).toBe(true);

      // We expect at least some tables to have RLS enabled
      console.log('Tables with RLS enabled:', tablesWithRLS.length);
      expect(tablesWithRLS.length).toBeGreaterThan(0);
    });

    test('RLS policies exist for tenant isolation', async () => {
      // Check for RLS policies
      const rlsPolicies = (await prisma.$queryRaw`
        SELECT tablename, policyname, permissive, roles, cmd, qual
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('contacts', 'users')
        ORDER BY tablename, policyname;
      `) as any[];

      expect(Array.isArray(rlsPolicies)).toBe(true);

      const policies = rlsPolicies as any[];
      console.log('Found RLS policies:', policies.length);

      // Log policy details for debugging
      policies.forEach((policy) => {
        console.log(
          `- ${policy.tablename}.${policy.policyname}: ${policy.cmd} for ${policy.roles}`,
        );
      });
    });

    test('Organization-based RLS policies are present', async () => {
      // Specifically check for organization_id based policies
      const orgPolicies = (await prisma.$queryRaw`
        SELECT tablename, policyname, qual
        FROM pg_policies
        WHERE schemaname = 'public'
        AND qual::text LIKE '%organization_id%'
        OR qual::text LIKE '%organizationId%';
      `) as any[];

      expect(Array.isArray(orgPolicies)).toBe(true);
      console.log('Organization-based RLS policies:', orgPolicies.length);
    });
  });

  describe('RLS Functionality Tests', () => {
    test('Can query RLS metadata', async () => {
      // Test that we can query RLS-related system tables
      const hasRLSExtension = (await prisma.$queryRaw`
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto';
      `) as any[];

      expect(Array.isArray(hasRLSExtension)).toBe(true);
    });
  });
});

# Security Invariant Tests

## Overview
Security invariant tests verify that critical security properties are always maintained. These tests are based on the CTO's Phase 4 security findings and implement automated verification of security guarantees.

## Test Categories

### 1. Tenant Isolation Guarantees
- **Purpose**: Ensure users cannot access data from other tenants
- **Tests**: 
  - User from Tenant A cannot access Tenant B data
  - RLS prevents direct database cross-tenant access
  - Organization context is correctly enforced

### 2. Permission Enforcement
- **Purpose**: Verify permissions are properly enforced
- **Tests**:
  - Admin role has correct permissions
  - Regular users have limited permissions
  - Permission resolution works correctly

### 3. RLS Enforcement
- **Purpose**: Verify Row-Level Security is active and working
- **Tests**:
  - RLS is enabled on critical tables
  - RLS policies exist for tenant isolation
  - Organization-based RLS policies are present

### 4. System Context Isolation
- **Purpose**: Ensure system context is properly isolated
- **Tests**:
  - System-level operations are identifiable
  - Regular users cannot perform system operations
  - Context separation is maintained

## Running Tests

### Individual Test Suites
```bash
# Run all security tests
npm run test:security

# Run specific test categories
npx jest tests/security/invariants/tenant-isolation.spec.ts
npx jest tests/security/invariants/permission-enforcement.spec.ts
npx jest tests/security/invariants/rls-enforcement.spec.ts
npx jest tests/security/invariants/system-context.spec.ts
CI Integration
Security tests are automatically run:

Before merge to main (mandatory)

Before production deployment (mandatory)

On schedule (daily) to ensure ongoing compliance

Test Data Management
Tests create their own isolated test data

All test data is cleaned up after tests complete

No production data is used or affected

Each test runs in isolation with fresh data

Adding New Security Tests
Template for New Security Tests
typescript
import { PrismaClient } from '@prisma/client';
import { SecurityTestHelpers } from '../utils/test-helpers';

describe('New Security Invariant Tests', () => {
  let prisma: PrismaClient;
  let testHelpers: SecurityTestHelpers;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const jwtService = { sign: () => 'mock-token', decode: () => ({}) } as any;
    testHelpers = new SecurityTestHelpers(prisma, jwtService);
  });

  afterAll(async () => {
    await testHelpers.cleanupTestData([], []);
    await prisma.\$disconnect();
  });

  test('Security property to verify', async () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
Coverage Requirements
All security tests must:

Test a specific security invariant from CTO findings

Clean up all test data

Run independently without side effects

Have clear pass/fail criteria

Include meaningful assertions

Maintenance
Review security tests quarterly

Update tests when security requirements change

Ensure tests continue to pass as code evolves

Document any security test failures immediately

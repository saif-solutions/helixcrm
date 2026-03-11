# Helix CRM - Test Strategy Document

**Version:** 6.0 (Enterprise Edition)  
**Last Updated:** 2026-03-11  
**Owner:** Engineering Team  
**Status:** Approved

## ⚡ Quick Reference Card

| What                       | Where                         | Command                              |
| -------------------------- | ----------------------------- | ------------------------------------ |
| **Run all unit tests**     | `/tests/unit/api/`            | `npm run test:unit`                  |
| **Run single test**        | Any                           | `npm test -- -t "test name"`         |
| **Add new auth test**      | `/tests/unit/api/auth/`       | -                                    |
| **Add new security test**  | `/tests/security/`            | -                                    |
| **Add new component test** | `/tests/unit/web/components/` | -                                    |
| **Run E2E tests**          | `/tests/e2e/`                 | `npm run test:e2e` (main only)       |
| **Run performance tests**  | `/tests/performance/`         | `npm run test:performance` (nightly) |
| **Debug flaky test**       | -                             | `npm test -- --runInBand`            |
| **Check test coverage**    | -                             | `npm run test:coverage`              |

**Golden Rule**: If you touch code, you must update/add tests in the same PR.

---

## ��� Document Purpose

This document defines the testing strategy for Helix CRM, establishing standards, patterns, and practices for all testing activities. It serves as the single source of truth for how we test our application.

---

## ��� Testing Philosophy

### Core Principles

1. **Risk-Based Testing**: Focus testing effort on critical business functions and security boundaries
2. **Shift-Left**: Find defects as early as possible in the development cycle
3. **Test Independence**: Tests should be isolated, deterministic, and not depend on external state
4. **Ownership**: Teams own the testing of their modules
5. **Automation First**: Automate tests at the appropriate level; manual testing only for exploratory
6. **Flaky Tests Are Bugs**: Any non-deterministic test must be fixed or quarantined within 24 hours
7. **Parallel Safety**: Tests must be safe to run in parallel
8. **Backward Compatibility**: Never break existing contracts
9. **Behavior Over Implementation**: Test what the code does, not how it does it

### Quality Goals

- **Production Readiness**: All critical paths must be tested before release
- **Security First**: Security invariants must never be violated
- **Tenant Isolation**: No cross-tenant data leakage
- **API Contract Compliance**: APIs must adhere to defined contracts
- **Observability**: Logging, metrics, and audit trails must be verified
- **Data Integrity**: Database migrations must preserve data
- **Performance SLOs**: Meet response time targets under load

### Definition of Done

A feature is considered complete when:

- ✅ Unit tests are written and passing
- ✅ Integration tests are added for cross-module interactions
- ✅ Security invariants are validated
- ✅ API contracts are updated and tested
- ✅ CI pipeline passes all stages
- ✅ Documentation is updated
- ✅ Test ownership is assigned
- ✅ No flaky tests introduced
- ✅ Tests assert behavior, not implementation

---

## ��� Test Pyramid

╱╲
╱ ╲
╱ E2E ╲ ← 3% (10-15 critical flows)
╱ Tests ╲
╱**\_\_\_\_**╲
╱ ╲
╱ Security ╲ ← 7% (25+ security invariants)
╱ Tests ╲
╱******\_\_\_\_******╲
╱ ╲
╱ Integration Tests ╲ ← 20% (50+ tests)
╱ ╲
╱──────────────────────────╲
╫ Unit Tests (250+) ╫ ← 70% (Fast, isolated)
╹────────────────────────────╹

text

**Target Distribution**:

- **Unit Tests**: 70% (250+ tests, <100ms each)
- **Integration Tests**: 20% (50+ tests, <1s each)
- **Security Tests**: 7% (25+ invariants)
- **E2E Tests**: 3% (10-15 critical flows)

---

## ���️ Test Architecture

### Repository Structure

helixcrm/
├── apps/ # Applications
│ ├── api/ # Backend app
│ │ ├── src/
│ │ └── tests/
│ │ └── smoke/ # App boot & configuration tests
│ │ ├── app-start.spec.ts
│ │ └── module-wiring.spec.ts
│ │
│ └── web/ # Frontend app
│ ├── src/
│ └── tests/
│ └── component/ # Component-level tests
│ ├── atoms/
│ ├── molecules/
│ └── organisms/
│
├── packages/ # Shared packages
│ └── auth-core/
│ ├── src/
│ └── tests/ # Package-specific tests
│ ├── unit/
│ └── integration/
│
├── tests/ # ALL system-level tests
│ ├── unit/ # Unit tests for app modules
│ │ ├── api/ # Backend module tests
│ │ │ ├── auth/
│ │ │ ├── deals/
│ │ │ ├── leads/
│ │ │ └── ...
│ │ │
│ │ └── web/ # Frontend unit tests
│ │ ├── components/
│ │ ├── hooks/
│ │ ├── stores/
│ │ └── api-client/
│ │
│ ├── integration/ # Integration tests
│ │ ├── modules/ # Cross-module collaboration
│ │ ├── database/ # Database/repository tests
│ │ ├── external/ # External service integration
│ │ └── api/ # API integration (controllers + services)
│ │
│ ├── e2e/ # End-to-end API flows
│ │ └── api/
│ │ ├── auth.flow.e2e-spec.ts
│ │ ├── deals.flow.e2e-spec.ts
│ │ └── ...
│ │
│ ├── security/ # Security invariants
│ │ ├── invariants/
│ │ ├── rls/
│ │ └── tenant-isolation/
│ │
│ ├── contracts/ # Contract tests
│ │ ├── api/
│ │ └── auth-core/
│ │
│ ├── performance/ # Performance/load tests
│ │ └── load-tests.suite.ts
│ │
│ ├── observability/ # Logging, metrics, audit tests
│ │ ├── audit-logs.spec.ts
│ │ ├── metrics.spec.ts
│ │ ├── correlation-id.spec.ts
│ │ └── error-logging.spec.ts
│ │
│ ├── chaos/ # Resilience tests (nightly only)
│ │ └── service-outage.spec.ts
│ │
│ └── helpers/ # Shared test utilities
│ ├── factories/
│ ├── mocks/
│ │ ├── handlers.ts # MSW handlers
│ │ └── server.ts # MSW server setup
│ ├── test-containers/ # Test container setup
│ ├── database.ts # Prisma test client
│ └── setup.ts # Global test setup
│
└── docs/ # Documentation
└── TEST_STRATEGY.md # This document

text

### ��� Clear Test Location Rules

| Test Type               | Location                         | Example                                               | Command                             |
| ----------------------- | -------------------------------- | ----------------------------------------------------- | ----------------------------------- |
| **Backend Unit Tests**  | `/tests/unit/api/[module]/`      | `/tests/unit/api/auth/auth.service.spec.ts`           | `npm run test:unit:api`             |
| **Frontend Unit Tests** | `/tests/unit/web/[category]/`    | `/tests/unit/web/components/Button.test.tsx`          | `npm run test:unit:web`             |
| **Package Tests**       | `/packages/[name]/tests/`        | `/packages/auth-core/tests/unit/jwt.service.spec.ts`  | `cd packages/auth-core && npm test` |
| **Smoke Tests**         | `/apps/api/tests/smoke/`         | `/apps/api/tests/smoke/app-start.spec.ts`             | `npm run test:smoke`                |
| **Integration Tests**   | `/tests/integration/[category]/` | `/tests/integration/modules/auth-audit.int-spec.ts`   | `npm run test:integration`          |
| **E2E Tests**           | `/tests/e2e/api/`                | `/tests/e2e/api/auth.flow.e2e-spec.ts`                | `npm run test:e2e`                  |
| **Security Tests**      | `/tests/security/`               | `/tests/security/invariants/tenant-isolation.spec.ts` | `npm run test:security`             |
| **Performance Tests**   | `/tests/performance/`            | `/tests/performance/load-tests.suite.ts`              | `npm run test:performance`          |

**❌ DO NOT** put unit tests in `/apps/api/tests/unit/` - that directory is deprecated.

---

## ��� Test Ownership

Each domain module owns its test suite with clear accountability:

| Domain                  | Owner         | Test Location                 | Criticality  | CI Stage          |
| ----------------------- | ------------- | ----------------------------- | ------------ | ----------------- |
| **Auth**                | Auth Team     | `tests/unit/api/auth/`        | ��� Critical | unit-tests        |
| **Leads**               | CRM Team      | `tests/unit/api/leads/`       | ��� High     | unit-tests        |
| **Deals**               | CRM Team      | `tests/unit/api/deals/`       | ��� High     | unit-tests        |
| **Pipelines**           | CRM Team      | `tests/unit/api/pipelines/`   | ��� High     | unit-tests        |
| **Contacts**            | CRM Team      | `tests/unit/api/contacts/`    | ��� Medium   | unit-tests        |
| **Frontend Components** | Web Team      | `tests/unit/web/components/`  | ��� High     | unit-tests-web    |
| **Frontend Hooks**      | Web Team      | `tests/unit/web/hooks/`       | ��� Medium   | unit-tests-web    |
| **Audit**               | Platform Team | `tests/observability/`        | ��� Critical | observability     |
| **Security**            | Security Team | `tests/security/`             | ��� Critical | security-tests    |
| **Database**            | Platform Team | `tests/integration/database/` | ��� Critical | integration-tests |
| **API Contracts**       | Platform Team | `tests/contracts/api/`        | ��� High     | contract-tests    |
| **Performance**         | DevOps        | `tests/performance/`          | ��� Medium   | nightly           |

**Ownership Rules**:

- Owners are responsible for test maintenance
- PRs affecting a domain require owner review
- Flaky tests are escalated to owners
- Coverage goals are tracked per domain
- Owners must review test changes in their domain

---

## ��� Test Levels

### 0. Smoke Tests (App-Level)

**Purpose**: Verify application boots and core modules wire correctly

**Location**: `apps/api/tests/smoke/`, `apps/web/tests/component/`

**Characteristics**:

- Fast startup verification (<5s)
- Catch configuration errors early
- Run in CI before other tests
- Must pass within 10 seconds

**Example**:

```typescript
// apps/api/tests/smoke/app-start.spec.ts
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

describe('App Bootstrap', () => {
  it('should initialize all modules', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication();
    await app.init();
    expect(app).toBeDefined();
    await app.close();
  });
});
1. Unit Tests
Purpose: Verify individual components in isolation

Location:

Package tests: packages/*/tests/unit/ (package internals)

App module tests: tests/unit/api/[module]/ (app business logic)

Frontend tests: tests/unit/web/[category]/ (components, hooks, stores)

Characteristics:

Mock all external dependencies

Fast execution (< 100ms per test)

High coverage of business logic

No database access

Target: 250+ tests

Coverage Goals:

Critical business logic: 80-90%

Infrastructure code: 60%

Overall coverage: ~70%

Backend Unit Test Example
typescript
// tests/unit/api/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { AuthService } from '../../../../apps/api/src/modules/auth/auth.service';
import { PrismaService } from '../../../../apps/api/src/shared/prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  it('should hash password correctly', async () => {
    const password = 'test123';
    const hashed = await authService.hashPassword(password);
    expect(hashed).not.toBe(password);
    expect(hashed).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
  });
});
Frontend Component Test Example
typescript
// tests/unit/web/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../../apps/web/src/components/atoms/Button/Button';

describe('Button', () => {
  it('should render children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(<Button onClick={onClick}>Click me</Button>);
    await user.click(screen.getByText('Click me'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
Frontend Hook Test Example
typescript
// tests/unit/web/hooks/usePermission.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { usePermission } from '../../../apps/web/src/lib/hooks/usePermission';
import { apiClient } from '../../../apps/web/src/lib/api/client';

jest.mock('../../../apps/web/src/lib/api/client');

describe('usePermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when user has permission', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { hasPermission: true }
    });

    const { result } = renderHook(() => usePermission('deals:create'));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasPermission).toBe(true);
  });

  it('should return false when user lacks permission', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { hasPermission: false }
    });

    const { result } = renderHook(() => usePermission('deals:create'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasPermission).toBe(false);
  });
});
Store Test Example (Zustand)
typescript
// tests/unit/web/stores/auth.store.test.ts
import { createAuthStore } from '../../../apps/web/src/stores/auth.store';

describe('AuthStore', () => {
  beforeEach(() => {
    const store = createAuthStore();
    store.getState().reset();
  });

  it('should set user on login', () => {
    const store = createAuthStore();
    const user = { id: '1', email: 'test@example.com' };

    store.getState().setUser(user);

    expect(store.getState().user).toEqual(user);
    expect(store.getState().isAuthenticated).toBe(true);
  });

  it('should clear user on logout', () => {
    const store = createAuthStore();
    store.getState().setUser({ id: '1', email: 'test@example.com' });
    store.getState().logout();

    expect(store.getState().user).toBeNull();
    expect(store.getState().isAuthenticated).toBe(false);
  });
});
2. Integration Tests
Level 2a: Module Integration
Purpose: Verify collaboration between modules

Location: tests/integration/modules/

Characteristics:

Test real module interactions

Use test containers for DB

Verify cross-cutting concerns

Target: 20+ tests

Example:

typescript
// tests/integration/modules/auth-audit.int-spec.ts
import { Test } from '@nestjs/testing';
import { AuthModule } from '../../../apps/api/src/modules/auth/auth.module';
import { AuditLogsModule } from '../../../apps/api/src/modules/audit-logs/audit-logs.module';
import { PrismaService } from '../../../apps/api/src/shared/prisma/prisma.service';

describe('Auth + Audit Integration', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule, AuditLogsModule],
    }).compile();

    prisma = module.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRaw`BEGIN`;
  });

  afterEach(async () => {
    await prisma.$executeRaw`ROLLBACK`;
  });

  it('should log all authentication attempts', async () => {
    // Test AuthModule calling AuditLogModule
  });
});
Level 2b: Database Integration
Purpose: Verify data layer correctness

Location: tests/integration/database/

⚠️ IMPORTANT: Prisma Connection Pooling Risk
Using $executeRaw BEGIN/ROLLBACK may not isolate tests correctly because Prisma can use different connections from the pool.

✅ Correct Pattern: Per-Test Transaction Client

typescript
// tests/helpers/database.ts
import { PrismaClient } from '@prisma/client';

// Configure test database URL
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/helix_test',
    },
  },
});

export async function withTestTransaction<T>(
  testFn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  let result: T;

  await prisma.$transaction(async (tx) => {
    result = await testFn(tx as unknown as PrismaClient);
    // Force rollback by throwing (preserves result)
    throw new Error('ROLLBACK');
  }).catch((err) => {
    if (err.message !== 'ROLLBACK') {
      throw err; // Real error, not rollback
    }
  });

  return result!;
}

// Usage in tests:
it('should create a user', async () => {
  await withTestTransaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashed',
        organizationId: 'test-tenant-1',
      },
    });
    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
✅ Isolation Verification Test

typescript
// tests/integration/database/isolation.spec.ts
import { withTestTransaction, prisma } from '../../helpers/database';

describe('Database Isolation', () => {
  it('should not leak data between transactions', async () => {
    // Test 1: Create data in transaction
    await withTestTransaction(async (tx) => {
      await tx.user.create({
        data: {
          email: 'leak-test@example.com',
          passwordHash: 'hashed',
          organizationId: 'test-tenant-1',
        },
      });
    });

    // Test 2: Verify data doesn't exist in new transaction
    await withTestTransaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email: 'leak-test@example.com' },
      });
      expect(user).toBeNull(); // Should pass if isolation works
    });
  });
});
Database Migration Testing:

typescript
// tests/integration/database/migrations.spec.ts
import { prisma } from '../../helpers/database';
import { execSync } from 'child_process';

describe('Database Migrations', () => {
  it('should apply cleanly', async () => {
    // Reset database
    execSync('npx prisma migrate reset --force');

    // Run migrations
    execSync('npx prisma migrate deploy');

    // Verify schema
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    expect(Array.isArray(tables)).toBe(true);
  });

  it('should maintain RLS policies after migration', async () => {
    const result = await prisma.$queryRaw`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename IN ('users', 'deals', 'leads')
    `;

    for (const row of result as any[]) {
      expect(row.rowsecurity).toBe(true);
    }
  });
});
Level 2c: API Integration
Purpose: Verify controllers with services and database

Location: tests/integration/api/

Example:

typescript
// tests/integration/api/auth.int-spec.ts
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../../apps/api/src/app.module';
import { withTestTransaction } from '../../helpers/database';

describe('Auth API Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 401 for invalid credentials', async () => {
    await withTestTransaction(async (tx) => {
      // Create test user in this transaction
      await tx.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: '$2b$10$...', // hashed 'password'
          organizationId: 'test-tenant-1',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });
  });
});
Level 2d: External Service Integration
Purpose: Verify integration with external services

Location: tests/integration/external/

Example with nock (HTTP mocking):

typescript
// tests/integration/external/api-mocking.int-spec.ts
import nock from 'nock';
import { PaymentService } from '../../../apps/api/src/modules/payments/payment.service';

describe('Payment Service Integration', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    nock.cleanAll();
  });

  it('should handle successful payment', async () => {
    // Mock Stripe API
    nock('https://api.stripe.com')
      .post('/v1/charges')
      .reply(200, { id: 'ch_123', status: 'succeeded' });

    const result = await paymentService.charge(1000, 'tok_visa');

    expect(result.id).toBe('ch_123');
    expect(result.status).toBe('succeeded');
  });

  it('should handle payment failure', async () => {
    nock('https://api.stripe.com')
      .post('/v1/charges')
      .reply(402, { error: { message: 'Card declined' } });

    await expect(paymentService.charge(1000, 'tok_chargeDeclined'))
      .rejects.toThrow('Card declined');
  });
});
External Dependency Resilience:

typescript
// tests/integration/external/queue.int-spec.ts
import { QueueService } from '../../../apps/api/src/modules/queue/queue.service';
import { withTestContainers } from '../../helpers/test-containers';

describe('BullMQ Integration', () => {
  it('should retry on failure with exponential backoff', async () => {
    const queue = new QueueService();

    const job = await queue.add('test-job', { data: 'test' });

    // Simulate failure
    await expect(queue.process(job.id)).rejects.toThrow();

    // Verify retry count increased
    const updatedJob = await queue.getJob(job.id);
    expect(updatedJob.attempts).toBe(1);
  });

  it('should recover after Redis restart', async () => {
    // This test would run in nightly chaos tests
    // Requires test containers to restart Redis
  });
});
3. End-to-End Tests
Purpose: Verify complete user flows through API

Location: tests/e2e/api/

Characteristics:

Test full HTTP stack

Include authentication, middleware, guards

Use test containers for all services

Limited to 10-15 critical flows

Run only on main branch or with 'run-e2e' label

Example:

typescript
// tests/e2e/api/deals.flow.e2e-spec.ts
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../../apps/api/src/app.module';
import { createTestUser, getAuthToken } from '../../helpers/auth';

describe('Lead to Deal Flow (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    // Create test user and get token
    const user = await createTestUser();
    authToken = await getAuthToken(user);
    tenantId = user.organizationId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete full sales cycle', async () => {
    // 1. Create lead
    const createLeadResponse = await request(app.getHttpServer())
      .post('/leads')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Lead',
        email: 'lead@example.com',
        value: 10000,
      });

    expect(createLeadResponse.status).toBe(201);
    const leadId = createLeadResponse.body.id;

    // 2. Convert to deal
    const convertResponse = await request(app.getHttpServer())
      .post(`/leads/${leadId}/convert`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(convertResponse.status).toBe(201);
    const dealId = convertResponse.body.id;

    // 3. Move through pipeline stages
    const stages = ['qualification', 'proposal', 'negotiation'];

    for (const stage of stages) {
      const moveResponse = await request(app.getHttpServer())
        .patch(`/deals/${dealId}/stage`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stageId: stage });

      expect(moveResponse.status).toBe(200);
      expect(moveResponse.body.stage).toBe(stage);
    }

    // 4. Win deal
    const winResponse = await request(app.getHttpServer())
      .patch(`/deals/${dealId}/win`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ closedDate: new Date().toISOString() });

    expect(winResponse.status).toBe(200);
    expect(winResponse.body.status).toBe('won');
  });
});
Critical Flows (10-15 total):

User registration and login

Lead creation and conversion

Deal pipeline management

Multi-tenant isolation

Reporting and analytics

Password reset flow

Team member invitation

Export functionality

Webhook delivery

File upload/download

4. Security Tests
Purpose: Verify security invariants never break

Location: tests/security/

Characteristics:

Test security boundaries

Verify tenant isolation

Test permission enforcement

Run first in CI pipeline

Must pass before any other tests

Target: 25+ invariants

Critical Invariants (Must Never Fail):

Tenant Isolation: No cross-tenant data access

Permission Enforcement: Users can't access unauthorized resources

RLS Always Enabled: Row-level security is active

Audit Logs Immutable: Logs cannot be modified

Refresh Tokens Single Use: Tokens are invalidated after use

Authentication Bypass: Unauthenticated requests are rejected

CSRF Protection: Mutating requests without token are rejected

Rate Limiting: Brute force attacks are blocked

Password Hashing: Passwords are never stored in plaintext

Data Validation: Invalid input is rejected

Error Handling: No sensitive data in error responses

SQL Injection: Input sanitization works

Mass Assignment: Users cannot modify restricted fields (role, organizationId)

ID Enumeration: Users cannot enumerate other tenant IDs

Session Fixation: Session IDs are regenerated after login

Tagging Critical Tests:

typescript
// tests/security/invariants/tenant-isolation.spec.ts
describe('@critical Tenant Isolation', () => {
  it('should prevent cross-tenant data access', async () => {
    // Test security boundary
  });
});
��� Merge Blockers:
Security tests are explicit merge blockers:

PRs cannot be merged if any security invariant fails

Critical security tests (@critical) run first in CI

Security test failures auto-assign to @security-team

Bypassing security tests requires CTO approval

Security test suite must be 100% green before release

Examples:

typescript
// tests/security/invariants/mass-assignment.spec.ts
describe('Mass Assignment Protection', () => {
  it('should prevent users from setting admin role', async () => {
    const response = await request(app)
      .patch('/users/me')
      .send({ role: 'admin' });
    expect(response.body.role).not.toBe('admin');
  });
});

// tests/security/invariants/id-enumeration.spec.ts
describe('ID Enumeration Protection', () => {
  it('should return 404 for non-existent resources', async () => {
    const response = await request(app)
      .get('/api/users/999999');
    expect(response.status).toBe(404);
  });
});
5. Contract Tests
Purpose: Verify API and package contracts

Location: tests/contracts/

Characteristics:

Test against OpenAPI specification

Verify package interfaces

Ensure backward compatibility

Target: 15+ tests

API Backward Compatibility Rules:

No breaking changes in v1 API

New fields must be optional

Removed fields require version bump

Deprecated endpoints must be marked

Contract tests must pass before deployment

Example:

typescript
// tests/contracts/api/auth.contract.spec.ts
import * as swagger from '@apidevtools/swagger-parser';
import * as path from 'path';

describe('Auth API Contract', () => {
  it('should match OpenAPI specification', async () => {
    const apiSpec = await swagger.parse(
      path.join(__dirname, '../../../apps/api/swagger.json')
    );

    expect(apiSpec.paths['/auth/login']).toBeDefined();
    expect(apiSpec.paths['/auth/login'].post).toBeDefined();

    const bodySchema = apiSpec.paths['/auth/login'].post.requestBody;
    expect(bodySchema).toBeDefined();
    expect(bodySchema.content['application/json'].schema.properties.email)
      .toBeDefined();
    expect(bodySchema.content['application/json'].schema.properties.password)
      .toBeDefined();
  });
});
6. Observability Tests
Purpose: Verify logging, metrics, and audit trails

Location: tests/observability/

Characteristics:

Test audit log generation

Verify metrics emission

Ensure structured logging

Test correlation ID propagation

Target: 10+ tests

Observability Invariants:
Every request must include:

request_id - For tracing

tenant_id - For multi-tenancy

user_id (if authenticated) - For audit
All errors must emit structured logs with stack traces

Examples:

typescript
// tests/observability/correlation-id.spec.ts
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

describe('Correlation ID Propagation', () => {
  it('should maintain same correlation ID across services', async () => {
    const correlationId = uuidv4();

    const response = await request(app.getHttpServer())
      .get('/api/deals')
      .set('X-Request-ID', correlationId);

    expect(response.headers['x-request-id']).toBe(correlationId);
  });
});

// tests/observability/audit-logs.spec.ts
describe('Audit Logging', () => {
  it('should create audit log on login', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    // Verify audit log was created
    const auditLogs = await prisma.auditLog.findMany({
      where: { action: 'LOGIN_SUCCESS' },
    });

    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].actorEmail).toBe('test@example.com');
  });
});
7. Performance Tests
Purpose: Verify system meets performance SLOs

Location: tests/performance/

Characteristics:

Load tests with k6

Measure response times

Test under concurrent load

Run in CI on schedule (nightly), not per commit

Target: 5+ scenarios

SLOs (Service Level Objectives):

95th percentile response time < 300ms (initial target)

99th percentile (P99) latency < 500ms

99.9% availability

Support 1000 concurrent users (scalable target)

⚠️ Measurement Conditions:
These metrics must be measured under representative load:

Minimum 500 concurrent users during load tests

Realistic data distribution (not just empty database)

Including database queries, not just cached responses

Network latency simulated (if testing remotely)

Test Environment:

Run in staging environment with production-like data volume

Use k6 with ramp-up stages to simulate real traffic patterns

Measure over 5-minute sustained periods, not spikes

Example (k6):

javascript
// tests/performance/load-tests.suite.ts
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 200 }, // Ramp up to 200
    { duration: '3m', target: 200 }, // Stay at 200
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests <300ms
    http_req_failed: ['rate<0.01'],   // <1% failure rate
  },
};

export default function() {
  // Test health endpoint
  const res = http.get('http://localhost:3000/api/health');

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);

  sleep(1);
}
Run command:

bash
k6 run tests/performance/load-tests.suite.ts
8. Chaos Tests
Purpose: Verify system resilience when dependencies fail

Location: tests/chaos/

Characteristics:

Test system behavior during outages

Kill dependencies and verify recovery

Run only in nightly builds

Must never block PR merges

Document recovery procedures

Example:

typescript
// tests/chaos/service-outage.spec.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

describe('Redis Outage Resilience', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  it('should degrade gracefully when Redis is down', async () => {
    // Stop Redis container
    await execAsync('docker stop helix-redis');

    // Wait for service to detect outage
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify API still responds (with degraded functionality)
    const response = await fetch('http://localhost:3000/api/deals');
    expect(response.status).toBe(200);

    // Verify rate limiting is disabled (or fallback works)
    const multipleRequests = await Promise.all([
      fetch('http://localhost:3000/api/deals'),
      fetch('http://localhost:3000/api/deals'),
      fetch('http://localhost:3000/api/deals'),
    ]);

    multipleRequests.forEach(r => expect(r.status).toBe(200));

    // Restart Redis
    await execAsync('docker start helix-redis');

    // Wait for recovery
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verify full functionality restored
    const recoveredResponse = await fetch('http://localhost:3000/api/deals');
    expect(recoveredResponse.status).toBe(200);
  });
});
��� Test Data Strategy
Test Data Policy
Tests must create their own data using factories

No shared global fixtures except:

Default test tenant (ID: test-tenant-1)

Admin user (ID: admin-1, email: admin@helix-test.com)

System user (ID: system-1, email: system@helix-test.com)

Seed scripts must be deterministic and idempotent

Never rely on production data dumps

Cleanup handled automatically via transaction rollback

Manual cleanup is discouraged - use transactions instead

Factory Pattern
typescript
// tests/helpers/factories/user.factory.ts
import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker';

export const createUser = (overrides = {}) => ({
  id: randomUUID(), // ✅ Cryptographically unique
  email: faker.internet.email(), // ✅ Realistic, unique emails
  passwordHash: '$2b$10$' + randomUUID().replace(/-/g, ''), // Mock hash
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  organizationId: 'test-tenant-1',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// For parallel test safety:
export const createUniqueUser = (overrides = {}) =>
  createUser({
    email: `test-${randomUUID()}@helix-test.com`,
    ...overrides
  });
Seed Data Strategy
typescript
// tests/helpers/seed.ts
import { PrismaClient } from '@prisma/client';

export const seedTestTenant = async (prisma: PrismaClient) => {
  return prisma.organization.upsert({
    where: { id: 'test-tenant-1' },
    update: {},
    create: {
      id: 'test-tenant-1',
      name: 'Test Organization',
      slug: 'test-org',
      settings: { features: { analytics: true } },
    },
  });
};

export const seedAdminUser = async (prisma: PrismaClient) => {
  await seedTestTenant(prisma);

  return prisma.user.upsert({
    where: { email: 'admin@helix-test.com' },
    update: {},
    create: {
      id: 'admin-1',
      email: 'admin@helix-test.com',
      passwordHash: '$2b$10$testhash',
      firstName: 'Admin',
      lastName: 'User',
      organizationId: 'test-tenant-1',
      role: 'admin',
    },
  });
};
External API Mocking with MSW (Frontend)
typescript
// tests/helpers/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/deals', () => {
    return HttpResponse.json([
      { id: '1', name: 'Test Deal 1', value: 10000 },
      { id: '2', name: 'Test Deal 2', value: 25000 },
    ]);
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as any;
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        accessToken: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
      });
    }
    return new HttpResponse(null, { status: 401 });
  }),

  http.get('/api/user/profile', () => {
    return HttpResponse.json({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
    });
  }),
];

// tests/helpers/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// Setup in vitest.setup.ts
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
��� Test Environments
Local Development
yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: helix_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5432:5432"
    tmpfs: /var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    tmpfs: /data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"
      - "8025:8025"
Test Database Configuration
bash
# .env.test
DATABASE_URL="postgresql://test:test@localhost:5432/helix_test?schema=public"
REDIS_URL="redis://localhost:6379"
NODE_ENV="test"
JWT_SECRET="test-secret"
JWT_REFRESH_SECRET="test-refresh-secret"
CI Environment
Ephemeral containers per job

Automatic cleanup

Parallel test execution

Resource limits enforced

Health check waits before tests (30s timeout)

Retry failed container startups (3 attempts)

Staging Environment
Production-like configuration

Isolated test data

Regular test runs against staging

Performance monitoring with real traffic patterns

��� Parallel Execution Policy
Tests must be safe to run in parallel:

Rules:

✅ No shared database state (use transactions)

✅ No global mutable variables

✅ Use random ephemeral ports (specify port 0 for OS assignment)

typescript
// Good - OS assigns random available port
const server = app.listen(0);
const port = server.address().port;
✅ Unique test data (use factories with UUIDs)

✅ No filesystem collisions (use os.tmpdir() + UUID)

✅ No hardcoded timeouts (use dynamic waits)

Enforcement:

typescript
// jest.config.js
module.exports = {
  maxWorkers: '50%',
  maxConcurrency: 10,
  testTimeout: 10000,
};
��� CI/CD Pipeline Strategy
Pipeline Architecture
text
PR Pipeline (Fast: ~2-3 min)
        ┌───────────────┐
        │  Install      │
        │  (cached)     │
        └───────┬───────┘
                │
        ┌───────┴───────────────────┐
        │           │               │
   Security Tests  Lint         Typecheck
   (@critical)     (15s)         (20s)
        │           │               │
        └───────┬───┴───────────────┘
                │
           Unit Tests
            (40s)
                │
                ↓
       Integration Tests
            (60s)
                │
                ↓
         Contract Tests
            (15s)
                │
                ↓
             Build
            (30s)
                │
            ✅ Ready
Package.json Scripts Location
All test scripts are defined in the root package.json for centralized execution:

json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest tests/unit --maxWorkers=50%",
    "test:unit:api": "jest tests/unit/api --maxWorkers=50%",
    "test:unit:web": "vitest tests/unit/web",
    "test:integration": "jest tests/integration --maxWorkers=50%",
    "test:security": "jest tests/security",
    "test:contract": "jest tests/contracts",
    "test:observability": "jest tests/observability",
    "test:e2e": "jest tests/e2e --maxWorkers=2",
    "test:performance": "k6 run tests/performance/load-tests.suite.ts",
    "test:chaos": "jest tests/chaos --runInBand",
    "test:critical": "jest --testNamePattern='@critical'",
    "test:coverage": "jest --coverage",
    "test:coverage:ci": "jest --coverage --ci --coverageReporters=json lcov text",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:security && npm run test:contract && npm run test:observability && npm run test:e2e"
  }
}
CI Configuration
yaml
# .github/workflows/ci.yml
name: Helix CRM CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci

      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
            .jest-cache
            .turbo
          key: ${{ runner.os }}-modules-${{ hashFiles('package-lock.json') }}

  security-tests:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - run: npm run test:security -- --testNamePattern="@critical"
      - name: Run npm audit
        run: npm audit --production --audit-level=high

  lint:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - run: npm run lint
      - run: npm run format:check

  typecheck:
    needs: install
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - run: npm run typecheck

  unit-tests:
    needs: [install, security-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - run: npm run test:unit -- --maxWorkers=50%
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          flags: unit

  integration-tests:
    needs: [install, unit-tests]
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        ports:
          - 5432:5432
        env:
          POSTGRES_DB: helix_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - run: npm run test:integration -- --maxWorkers=50%
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          flags: integration

  contract-tests:
    needs: [install, integration-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - run: npm run test:contract

  build:
    needs: [lint, typecheck, unit-tests, integration-tests, security-tests, contract-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - run: npm run build
      - name: Test Docker build
        run: docker build -t helixcrm-api ./apps/api

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: 'ci-failures'
          slack-message: '❌ CI failed in ${{ github.workflow }} - ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}'
E2E Workflow (.github/workflows/e2e.yml)
yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
    types: [labeled]  # Run when PR has 'run-e2e' label

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.labels.*.name, 'run-e2e') || github.event_name == 'push'

    services:
      postgres:
        image: postgres:15
        ports:
          - 5432:5432
        env:
          POSTGRES_DB: helix_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:e2e

      - name: Retry flaky tests
        if: failure()
        uses: nick-fields/retry@v2
        with:
          timeout_minutes: 10
          max_attempts: 3
          command: npm run test:e2e -- --testPathPattern=flaky
Nightly Workflow (.github/workflows/nightly.yml)
yaml
name: Nightly Tests

on:
  schedule:
    - cron: "0 2 * * *"  # 2 AM daily

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:performance

  chaos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:chaos

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx depcheck
      - run: npx knip

  dependency-update-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm update
      - run: npm test  # Test with updated dependencies
CI Failure Notifications
Test Type	Failure Notifies	Channel	SLA
Security Tests	@security-team	#security-alerts	Fix within 4 hours
Critical Tests	@engineering-leads	#critical-alerts	Fix within 1 hour
Unit/Integration	Domain owners	#ci-failures	Fix within 24 hours
Performance	@devops	#performance	Review within 1 week
E2E	QA Team	#e2e-results	Fix before release
��� Flaky Test Policy
Definition
A flaky test is any test that passes and fails intermittently without code changes.

Policy
Immediate Action: Any flaky test must be addressed within 24 hours

Quarantine: If not fixable immediately, move to tests/quarantine/

Tagging: Mark flaky tests with @flaky JSDoc comment

No Merges: PRs cannot be merged with flaky tests in critical paths

Monitoring: Track flaky test rate in CI dashboard

Root Cause: Document why test became flaky after fixing

Escalation: Flaky tests in critical paths escalate to Tech Lead

Quarantine Process
bash
# Move flaky test to quarantine
mkdir -p tests/quarantine
git mv tests/unit/api/flaky.spec.ts tests/quarantine/
echo "Flaky test quarantined until 2026-04-11" > tests/quarantine/README.md
Flaky Test Template
typescript
/**
 * @flaky
 * Reason: Race condition in async operation
 * Quarantined: 2026-03-11
 * Owner: @auth-team
 * Fixed by: 2026-03-18
 */
��� Test Review Guidelines
During PR review, verify:

Behavior, not implementation: Does the test assert what the code does, not how?

Failure validity: Would the test fail if the code is broken?

Isolation: Does the test avoid shared state?

Mocking minimal: Are mocks used only for external dependencies?

Deterministic: Does the test produce the same result every time?

No console logs: Are debugging statements removed?

Proper assertions: Are there meaningful assertions (not just expect(true))?

No hardcoded IDs: Are all IDs generated uniquely?

Cleanup: Is database state properly isolated (transactions)?

Documentation: Is the test purpose clear?

Coverage: Does it maintain or improve coverage?

Speed: Is the test reasonably fast? (<100ms for unit, <1s for integration)

��� Test Versioning Policy
When behavior changes:

Update tests in the same PR as the code change

Remove deprecated tests within 1 release cycle

Never assert outdated behavior - tests must match current requirements

Mark breaking changes with version tags in contract tests

Document API version changes in API contract tests

��� Testing Anti-Patterns (What NOT To Do)
❌ Tests Longer Than 5 Seconds
If a test takes >5s, it's not a unit test - move to integration.

❌ E2E Tests Replacing Integration Tests
E2E tests should be <15 total. Don't use them for detailed validation.

❌ Mocking the System Under Test
Don't mock what you're testing - mock dependencies only.

❌ Testing Implementation Details
Test behavior, not internal methods or private state.

❌ Shared Fixtures Between Tests
Tests become coupled and brittle. Each test creates its own data.

❌ Using sleep() in Tests
Use proper waits, retries, or event emitters instead.

❌ Ignoring Flaky Tests
Flaky tests undermine confidence. Fix or quarantine immediately.

❌ Hardcoding IDs
Tests should generate unique IDs, not rely on specific values.

❌ Testing Third-Party Code
Assume libraries work - test your integration, not their internals.

❌ Console Logs in Tests
Use proper debuggers or test output formatters.

❌ Skipping Security Tests
Security tests must always run and pass before merge.

��� Critical System Tests (Must Never Fail)
These 15 tests must always pass before deployment:

#	Test	Category	Owner	Tag	Why Critical
1	Tenant Isolation	Security	Security	@critical	Prevents data leaks
2	Authentication Bypass	Security	Auth	@critical	Blocks unauthorized access
3	Permission Enforcement	Security	Auth	@critical	Ensures proper access control
4	RLS Enabled	Database	Platform	@critical	Enforces tenant boundaries
5	Audit Logging	Observability	Platform	@critical	Compliance requirement
6	SQL Injection	Security	Security	@critical	Prevents database attacks
7	CSRF Protection	Security	Auth	@critical	Blocks cross-site requests
8	Rate Limiting	Security	Auth	@critical	Prevents brute force
9	Password Hashing	Security	Auth	@critical	Protects credentials
10	Refresh Token Rotation	Security	Auth	@critical	Prevents token reuse
11	Mass Assignment	Security	Security	@critical	Prevents privilege escalation
12	ID Enumeration	Security	Security	@critical	Prevents data mining
13	Data Validation	API	Platform	@critical	Ensures data integrity
14	Error Handling	API	Platform	@critical	Prevents info leakage
15	Migration Integrity	Database	Platform	@critical	Preserves data
These tests run first in the CI pipeline and block merges if they fail.

Run them with:

bash
npm run test:critical
��� Test Coverage Goals
Test Type	Current	Target (Q2)	Target (Q3)	Owner	Critical Paths
Unit Tests (API)	51	150	250+	Domain Teams	80-90%
Unit Tests (Web)	0	50	100+	Web Team	70-80%
Integration	0	30	50+	Domain Teams	90%+
Security	7	15	25+	Security Team	100%
Contract	2	8	15+	Platform Team	100%
E2E	1	6	12-15	QA Team	100%
Observability	0	5	10+	Platform Team	90%+
Performance	0	3	5+	DevOps	SLO met
Chaos	0	3	5+	DevOps	N/A
��� Test Debugging Guide
Running Specific Tests
bash
# Run by test name pattern
npm test -- -t "should hash password"

# Run specific file
npm test -- tests/unit/api/auth/auth.service.spec.ts

# Run tests in a specific directory
npm test -- tests/unit/api/auth

# Run with verbose output
npm test -- --verbose
Debugging with Node Inspector
bash
# Run with inspector
node --inspect-brk node_modules/.bin/jest --runInBand tests/unit/api/auth/auth.service.spec.ts

# Then open chrome://inspect in Chrome
Debugging with VSCode
json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "${fileBasename}",
        "--runInBand",
        "--detectOpenHandles"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
Debugging Flaky Tests
bash
# Run multiple times to reproduce
npm test -- --testPathPattern=flaky --runInBand --repeat=10

# Add logs and run with --verbose
npm test -- --testPathPattern=flaky --verbose
⚡ Test Speed Optimization
Keep Tests Fast
Use --maxWorkers=50% in CI

Mock expensive operations (email, payments)

Use transaction rollback instead of truncate

Profile slow tests with --verbose

Use --onlyChanged to run only affected tests locally

Identify Slow Tests
bash
# Show test timing
npm test -- --verbose

# Generate performance profile
npm test -- --json --outputFile=test-results.json
Optimize Database Tests
Use transaction rollback (fastest)

Limit test data to minimum required

Use test containers with tmpfs for speed

Parallelize with multiple connections

��� Coverage Reporting
Local Coverage
bash
npm run test:coverage
open coverage/lcov-report/index.html
CI Coverage
yaml
# In CI workflow
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    flags: ${{ matrix.test-type }}
    fail_ci_if_error: true
Coverage Thresholds
javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'apps/api/src/modules/auth/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
};
��� Future Strategic Additions (Optional)
1. Mutation Testing
Measure test quality by introducing bugs and seeing if tests catch them.

bash
npm install --save-dev stryker
npx stryker run
Goal: Mutation score > 60%

2. Cross-Package Contract Testing
Test contracts between packages (especially auth-core and apps).

Location: tests/contracts/packages/

Use consumer-driven contracts to verify compatibility.

3. Snapshot Testing for API Schemas
Using Jest snapshot feature for:

OpenAPI schemas

Configuration outputs

DTO serialization

GraphQL schemas (if added)

4. Dependency Update Testing
Nightly workflow already includes npm update + test run.

Goal: Detect breaking library updates within 24 hours.

5. Chaos Testing Expansion
Add scenarios:

Database connection loss

Network latency injection

Disk full simulation

CPU throttling

✅ PR Testing Checklist
Copy this into your PR description:

markdown
## Testing Checklist

### Code Changes
- [ ] Unit tests added/updated for changed code
- [ ] Integration tests added for cross-module changes
- [ ] Frontend tests added/updated (if UI changes)
- [ ] Security invariants still pass
- [ ] API contract updated (if API changed)

### Test Quality
- [ ] All tests pass locally (`npm test`)
- [ ] No flaky tests introduced
- [ ] Test coverage maintained or improved
- [ ] Test data uses factories, not hardcoded IDs
- [ ] No console logs or debug code

### CI
- [ ] CI pipeline passes
- [ ] Security tests pass (`@critical` tests)
- [ ] No new linting/type errors
��� Best Practices
Do's
✅ Write tests before fixing bugs (test-driven debugging)
✅ Keep tests isolated and independent
✅ Use factories for test data
✅ Use transactions for database tests
✅ Run tests locally before pushing
✅ Use test containers for database tests
✅ Mock external APIs, but test integration with containers
✅ Document flaky tests immediately
✅ Cache CI dependencies aggressively
✅ Run security tests first in CI
✅ Generate unique IDs for test data
✅ Clean up via transactions (not manual)
✅ Tag critical tests with @critical
✅ Review tests during PR

Don'ts
❌ Share state between tests
❌ Use console.log for debugging tests
❌ Write tests that depend on specific IDs
❌ Ignore flaky tests - fix them
❌ Test implementation details
❌ Use sleep() in tests - use proper waits
❌ Commit tests that require manual setup
❌ Write more than 15 E2E tests
❌ Mock the system under test
❌ Hardcode test data
❌ Skip security tests
❌ Let tests run longer than 5 seconds
❌ Use shared fixtures

��� Immediate Next Steps
Set up test containers infrastructure (docker-compose.test.yml)

Configure test database with .env.test

Migrate existing 51 unit tests to tests/unit/api/

Create smoke tests in apps/api/tests/smoke/

Write 15 critical security tests (tag with @critical)

Set up CI pipeline with optimized stages

Create test helpers (factories, mocks, database utilities)

Configure MSW for frontend API mocking

Establish flaky test monitoring dashboard

Configure GitHub Actions workflows (CI, E2E, Nightly)

Assign test ownership per domain

Create migration test suite for database changes

Document test review guidelines in PR template

Set up nightly chaos tests for resilience validation

Add coverage reporting with Codecov

��� References
NestJS Testing Documentation

Jest Documentation

Vitest Documentation

Testing Library Documentation

MSW Documentation

Testcontainers for Node

k6 Performance Testing

OWASP Testing Guide

Testing Microservices

Our Test Architecture Decision

GitHub Actions Documentation

Stryker Mutation Testing

✅ Document Approval
Role	Name	Date	Signature
Tech Lead
QA Lead
Engineering Manager
Security Lead
DevOps Lead
Product Manager
*This document is a living document. Last reviewed: 2026-03-11*
```

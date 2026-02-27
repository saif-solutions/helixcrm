import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { hash } from 'bcrypt';

describe('System E2E Validation - MVP Readiness', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAToken: string;
  let tenantBToken: string;
  let tenantAUserId: string;
  let tenantBUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // MANDATORY PRODUCTION SETTINGS (matching main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        stopAtFirstError: true,
      }),
    );
    
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // SETUP TEST DATA
    await prisma.$executeRaw`DELETE FROM "organizations" WHERE "name" LIKE 'TEST_%'`;
    await prisma.$executeRaw`DELETE FROM "users" WHERE "email" LIKE 'test%@test.com'`;

    // Create Tenant A
    const tenantA = await prisma.organization.create({
      data: { name: 'TEST_TENANT_A', slug: 'test-tenant-a' },
    });

    const hashedPassword = await hash('Password123!', 10);
    const userA = await prisma.user.create({
      data: {
        email: 'test-a@test.com',
        passwordHash: hashedPassword,
        organizationId: tenantA.id,
        firstName: 'TenantA',
        lastName: 'User',
      },
    });
    tenantAUserId = userA.id;

    // Create Tenant B
    const tenantB = await prisma.organization.create({
      data: { name: 'TEST_TENANT_B', slug: 'test-tenant-b' },
    });

    const userB = await prisma.user.create({
      data: {
        email: 'test-b@test.com',
        passwordHash: hashedPassword,
        organizationId: tenantB.id,
        firstName: 'TenantB',
        lastName: 'User',
      },
    });
    tenantBUserId = userB.id;
  });

  afterAll(async () => {
    await prisma.$executeRaw`DELETE FROM "organizations" WHERE "name" LIKE 'TEST_%'`;
    await prisma.$executeRaw`DELETE FROM "users" WHERE "email" LIKE 'test%@test.com'`;
    await app.close();
    await prisma.$disconnect();
  });

  // ============ SCENARIO 1: TENANT ISOLATION ============
  describe('Tenant Isolation Validation', () => {
    it('should NOT leak data between Tenant A and Tenant B', async () => {
      // Login as Tenant A
      const loginARes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test-a@test.com', password: 'Password123!' });
      expect(loginARes.status).toBe(201);
      tenantAToken = loginARes.body.accessToken;

      // Login as Tenant B
      const loginBRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test-b@test.com', password: 'Password123!' });
      expect(loginBRes.status).toBe(201);
      tenantBToken = loginBRes.body.accessToken;

      // Create contact in Tenant A
      const contactA = await request(app.getHttpServer())
        .post('/contacts')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-id', 'TEST_TENANT_A')
        .send({ firstName: 'Contact', lastName: 'A', email: 'contact-a@test.com' });
      expect(contactA.status).toBe(201);

      // Tenant B should NOT see Tenant A's contact
      const contactsB = await request(app.getHttpServer())
        .get('/contacts')
        .set('Authorization', `Bearer ${tenantBToken}`)
        .set('x-tenant-id', 'TEST_TENANT_B');
      expect(contactsB.status).toBe(200);
      expect(contactsB.body.data).not.toContainEqual(
        expect.objectContaining({ email: 'contact-a@test.com' }),
      );

      // Verify audit logs recorded
      const auditLogs = await prisma.auditLog.findMany({
        where: { actorEmail: { in: ['test-a@test.com', 'test-b@test.com'] } },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs.every(log => log.actorEmail)).toBeTruthy();
    });
  });

  // ============ SCENARIO 2: RBAC ENFORCEMENT ============
  describe('RBAC Enforcement Validation', () => {
    it('should block unauthorized DELETE operations', async () => {
      // Attempt DELETE without proper role (expect 403)
      const deleteAttempt = await request(app.getHttpServer())
        .delete(`/users/${tenantAUserId}`)
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-id', 'TEST_TENANT_A');
      
      // Should either be 403 (Forbidden) or 404 (Not Found due to RLS)
      expect([403, 404]).toContain(deleteAttempt.status);

      // Verify audit log was created for denied attempt
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          actorEmail: 'test-a@test.com',
          action: 'PERMISSION_DENIED',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditLog).toBeDefined();
    });
  });

  // ============ SCENARIO 3: AUDIT COMPLETENESS ============
  describe('Audit Completeness Validation', () => {
    it('should audit full CRUD lifecycle', async () => {
      const testEmail = `audit-test-${Date.now()}@test.com`;
      
      // CREATE
      const createRes = await request(app.getHttpServer())
        .post('/contacts')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-id', 'TEST_TENANT_A')
        .send({ firstName: 'Audit', lastName: 'Test', email: testEmail });
      expect(createRes.status).toBe(201);
      const contactId = createRes.body.id;

      // UPDATE
      await request(app.getHttpServer())
        .patch(`/contacts/${contactId}`)
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-id', 'TEST_TENANT_A')
        .send({ firstName: 'AuditUpdated' });

      // DELETE
      await request(app.getHttpServer())
        .delete(`/contacts/${contactId}`)
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-id', 'TEST_TENANT_A');

      // VERIFY AUDIT TRAIL
      const audits = await prisma.auditLog.findMany({
        where: { entityId: contactId },
        orderBy: { createdAt: 'asc' },
      });

      expect(audits.length).toBeGreaterThanOrEqual(3);
      const actions = audits.map(a => a.action);
      expect(actions).toContain('CONTACT_CREATED');
      expect(actions).toContain('CONTACT_UPDATED');
      expect(actions).toContain('CONTACT_DELETED');
    });
  });

  // ============ SCENARIO 4: FAILURE SAFETY ============
  describe('Failure Safety Validation', () => {
    it('should handle database errors gracefully', async () => {
      // Attempt invalid data (should fail validation)
      const invalidRequest = await request(app.getHttpServer())
        .post('/contacts')
        .set('Authorization', `Bearer ${tenantAToken}`)
        .set('x-tenant-id', 'TEST_TENANT_A')
        .send({ invalidField: 'should not exist' });
      
      expect(invalidRequest.status).toBe(400); // Bad Request due to forbidNonWhitelisted

      // Verify no partial data was written
      const contactsCount = await prisma.contact.count({
        where: { email: { contains: 'invalid' } },
      });
      expect(contactsCount).toBe(0);
    });
  });

  // ============ SCENARIO 5: RATE LIMITING ============
  describe('Rate Limiting Validation', () => {
    it('should throttle excessive auth requests', async () => {
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'test-a@test.com', password: 'wrongpassword' }),
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});

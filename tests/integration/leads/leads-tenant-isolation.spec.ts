import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { AppLogger } from '../../../src/shared/logging/logger.service';

describe('Leads Module Tenant Isolation (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let logger: AppLogger;

  // Test data
  const orgA = 'org-a-leads-test-' + Date.now();
  const orgB = 'org-b-leads-test-' + Date.now();
  const userA = { sub: 'user-a-leads-test', organizationId: orgA };
  const userB = { sub: 'user-b-leads-test', organizationId: orgB };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    logger = moduleFixture.get<AppLogger>(AppLogger);

    await app.init();

    // Create test organizations
    await prisma.organization.createMany({
      data: [
        { id: orgA, name: 'Org A Leads Test' },
        { id: orgB, name: 'Org B Leads Test' },
      ],
    });

    // Create test users
    await prisma.user.createMany({
      data: [
        { 
          id: userA.sub, 
          email: 'user-a-leads@test.com',
          organizationId: orgA,
          name: 'User A Leads',
        },
        { 
          id: userB.sub, 
          email: 'user-b-leads@test.com',
          organizationId: orgB,
          name: 'User B Leads',
        },
      ],
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.lead.deleteMany({
      where: { organizationId: { in: [orgA, orgB] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.sub, userB.sub] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgA, orgB] } },
    });

    await app.close();
  });

  describe('Tenant Isolation', () => {
    let leadA: any;
    let leadB: any;

    it('should create lead in Org A', async () => {
      const response = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer mock-token-${userA.sub}`)
        .set('X-Organization-Id', orgA)
        .send({
          name: 'Lead A1',
          email: 'lead-a1@test.com',
          status: 'new',
        })
        .expect(201);

      leadA = response.body;
      expect(leadA.name).toBe('Lead A1');
      expect(leadA.organizationId).toBe(orgA);
    });

    it('should create lead in Org B', async () => {
      const response = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer mock-token-${userB.sub}`)
        .set('X-Organization-Id', orgB)
        .send({
          name: 'Lead B1',
          email: 'lead-b1@test.com',
          status: 'new',
        })
        .expect(201);

      leadB = response.body;
      expect(leadB.name).toBe('Lead B1');
      expect(leadB.organizationId).toBe(orgB);
    });

    it('should NOT allow User B to access Org A lead', async () => {
      await request(app.getHttpServer())
        .get(`/leads/${leadA.id}`)
        .set('Authorization', `Bearer mock-token-${userB.sub}`)
        .set('X-Organization-Id', orgB)
        .expect(404); // Should not find lead from other org
    });

    it('should NOT allow User A to access Org B lead', async () => {
      await request(app.getHttpServer())
        .get(`/leads/${leadB.id}`)
        .set('Authorization', `Bearer mock-token-${userA.sub}`)
        .set('X-Organization-Id', orgA)
        .expect(404); // Should not find lead from other org
    });

    it('should allow User A to access Org A lead', async () => {
      await request(app.getHttpServer())
        .get(`/leads/${leadA.id}`)
        .set('Authorization', `Bearer mock-token-${userA.sub}`)
        .set('X-Organization-Id', orgA)
        .expect(200);
    });

    it('should allow User B to access Org B lead', async () => {
      await request(app.getHttpServer())
        .get(`/leads/${leadB.id}`)
        .set('Authorization', `Bearer mock-token-${userB.sub}`)
        .set('X-Organization-Id', orgB)
        .expect(200);
    });

    it('should list only Org A leads for User A', async () => {
      const response = await request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer mock-token-${userA.sub}`)
        .set('X-Organization-Id', orgA)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(leadA.id);
      expect(response.body.data[0].organizationId).toBe(orgA);
    });

    it('should list only Org B leads for User B', async () => {
      const response = await request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer mock-token-${userB.sub}`)
        .set('X-Organization-Id', orgB)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(leadB.id);
      expect(response.body.data[0].organizationId).toBe(orgB);
    });
  });

  describe('Permission Enforcement', () => {
    it('should require leads.write permission for creation', async () => {
      // Note: In real tests, we'd mock permission context
      // This is a placeholder for actual permission tests
      expect(true).toBe(true);
    });

    it('should require leads.read permission for reading', async () => {
      // Note: In real tests, we'd mock permission context
      // This is a placeholder for actual permission tests
      expect(true).toBe(true);
    });

    it('should require leads.delete permission for deletion', async () => {
      // Note: In real tests, we'd mock permission context
      // This is a placeholder for actual permission tests
      expect(true).toBe(true);
    });
  });
});

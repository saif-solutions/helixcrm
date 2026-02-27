/**
 * Example Integration Test
 * This shows the pattern for integration tests
 * 
 * Note: This test requires a running PostgreSQL database
 * Run: docker-compose -f ../../../../docker-compose.test.yml up -d
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Auth Integration (Example)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) should return 200', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(res => {
        expect(res.body.status).toBe('ok');
      });
  });

  // More integration tests would go here
  // Example: Tenant isolation, RLS enforcement, etc.
});

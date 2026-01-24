import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';

describe('Analytics Endpoints', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/analytics/deals should return 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/api/v1/analytics/deals')
      .expect(401);
  });

  it('GET /api/v1/analytics/revenue should return 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/api/v1/analytics/revenue')
      .expect(401);
  });

  it('GET /api/v1/analytics/pipeline should return 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/api/v1/analytics/pipeline')
      .expect(401);
  });

  it('GET /api/v1/analytics/activity should return 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/api/v1/analytics/activity')
      .expect(401);
  });

  it('GET /api/v1/analytics/export should return 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/api/v1/analytics/export')
      .expect(401);
  });
});
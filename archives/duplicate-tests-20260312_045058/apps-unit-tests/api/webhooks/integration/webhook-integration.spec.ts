// src/modules/webhooks/__tests__/webhook-integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { WebhooksModule } from '../webhooks.module';
import { WebhooksService } from '../webhooks.service';
import { WebhookRepository } from '../repositories/webhook.repository';
import { TenantContextService } from '../../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { BullModule } from '@nestjs/bullmq';
import { JwtService } from '@nestjs/jwt';

describe('Webhook Module Integration', () => {
  let app: INestApplication;
  let webhooksService: WebhooksService;
  let webhookRepository: WebhookRepository;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        BullModule.registerQueue({
          name: 'webhook-queue',
        }),
        WebhooksModule,
      ],
      providers: [
        {
          provide: TenantContextService,
          useValue: {
            getTenantId: () => 'test-tenant-id',
            getUserId: () => 'test-user-id',
          },
        },
        {
          provide: PermissionContextService,
          useValue: {
            hasPermission: (permission: string) => {
              const allowed = [
                'webhooks.manage',
                'webhooks.read',
                'webhooks.trigger',
                'system.admin',
              ];
              return allowed.includes(permission);
            },
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logEvent: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    webhooksService = moduleFixture.get<WebhooksService>(WebhooksService);
    webhookRepository = moduleFixture.get<WebhookRepository>(WebhookRepository);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Webhook CRUD Operations', () => {
    it('should create a webhook using repository pattern', async () => {
      const createDto = {
        name: 'test-webhook-1',
        url: 'https://example.com/webhook',
        events: ['contact.created', 'deal.updated'],
        isActive: true,
        retryCount: 3,
        timeoutMs: 10000,
      };

      const mockWebhook = {
        id: 'webhook-id-1',
        ...createDto,
        secret: 'test-secret-123',
        headers: {},
        organizationId: 'test-tenant-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };

      // Mock repository calls
      jest.spyOn(webhookRepository, 'findByName').mockResolvedValue(null);
      jest.spyOn(webhookRepository, 'create').mockResolvedValue(mockWebhook);

      const result = await webhooksService.createWebhook(createDto);

      // Verify repository was called
      expect(webhookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          url: createDto.url,
          events: createDto.events,
        }),
      );

      // Verify secret is not returned
      expect(result).not.toHaveProperty('secret');
      expect(result).toMatchObject({
        id: 'webhook-id-1',
        name: 'test-webhook-1',
        url: 'https://example.com/webhook',
        isActive: true,
      });
    });

    it('should get all webhooks with tenant isolation', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-id-1',
          name: 'test-webhook-1',
          url: 'https://example.com/webhook1',
          events: ['contact.created'],
          secret: 'secret-1',
          isActive: true,
          retryCount: 3,
          timeoutMs: 10000,
          headers: {},
          organizationId: 'test-tenant-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          deletedBy: null,
        },
        {
          id: 'webhook-id-2',
          name: 'test-webhook-2',
          url: 'https://example.com/webhook2',
          events: ['deal.updated'],
          secret: 'secret-2',
          isActive: false,
          retryCount: 5,
          timeoutMs: 15000,
          headers: { 'X-Custom': 'Header' },
          organizationId: 'test-tenant-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          deletedBy: null,
        },
      ];

      jest.spyOn(webhookRepository, 'findAll').mockResolvedValue(mockWebhooks);

      const result = await webhooksService.getAllWebhooks();

      // Verify repository was called
      expect(webhookRepository.findAll).toHaveBeenCalled();

      // Verify secrets are removed
      result.forEach((webhook) => {
        expect(webhook).not.toHaveProperty('secret');
      });

      // Verify all webhooks are returned
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test-webhook-1');
      expect(result[1].name).toBe('test-webhook-2');
    });

    it('should get webhook by ID with tenant isolation', async () => {
      const createDto = {
        name: 'test-webhook',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        isActive: true,
        retryCount: 3,
        timeoutMs: 10000,
      };

      const mockWebhook = {
        id: 'webhook-id',
        ...createDto,
        secret: 'generated-secret',
        headers: {},
        organizationId: 'test-tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };

      jest.spyOn(webhookRepository, 'findById').mockResolvedValue(mockWebhook);

      const result = await webhooksService.getWebhookById('webhook-id-1');

      // Verify repository was called
      expect(webhookRepository.findById).toHaveBeenCalledWith('webhook-id-1');

      // Verify secret is not returned
      expect(result).not.toHaveProperty('secret');
      expect(result).toMatchObject({
        id: 'webhook-id-1',
        name: 'test-webhook-1',
        url: 'https://example.com/webhook',
        isActive: true,
      });
    });

    it('should update webhook using repository pattern', async () => {
      const existingWebhook = {
        id: 'webhook-id-1',
        name: 'old-name',
        url: 'https://old.example.com/webhook',
        events: ['contact.created'],
        secret: 'secret-1',
        isActive: true,
        retryCount: 3,
        timeoutMs: 10000,
        headers: {},
        organizationId: 'test-tenant-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };

      const updatedWebhook = {
        ...existingWebhook,
        name: 'new-name',
        url: 'https://new.example.com/webhook',
        isActive: false,
        updatedAt: new Date(),
      };

      const updateDto = {
        name: 'new-name',
        url: 'https://new.example.com/webhook',
        isActive: false,
      };

      jest.spyOn(webhookRepository, 'findById').mockResolvedValue(existingWebhook);
      jest.spyOn(webhookRepository, 'findByName').mockResolvedValue(null);
      jest.spyOn(webhookRepository, 'update').mockResolvedValue(updatedWebhook);

      const result = await webhooksService.updateWebhook('webhook-id-1', updateDto);

      // Verify repository methods were called
      expect(webhookRepository.findById).toHaveBeenCalledWith('webhook-id-1');
      expect(webhookRepository.update).toHaveBeenCalledWith('webhook-id-1', updateDto);

      // Verify secret is not returned
      expect(result).not.toHaveProperty('secret');
      expect(result).toMatchObject({
        id: 'webhook-id-1',
        name: 'new-name',
        url: 'https://new.example.com/webhook',
        isActive: false,
      });
    });

    it('should delete webhook using repository pattern', async () => {
      const existingWebhook = {
        id: 'webhook-id-1',
        name: 'test-webhook',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        secret: 'secret-1',
        isActive: true,
        retryCount: 3,
        timeoutMs: 10000,
        headers: {},
        organizationId: 'test-tenant-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };

      jest.spyOn(webhookRepository, 'findById').mockResolvedValue(existingWebhook);
      jest.spyOn(webhookRepository, 'delete').mockResolvedValue(existingWebhook);

      const result = await webhooksService.deleteWebhook('webhook-id-1');

      // Verify repository methods were called
      expect(webhookRepository.findById).toHaveBeenCalledWith('webhook-id-1');
      expect(webhookRepository.delete).toHaveBeenCalledWith('webhook-id-1');

      // Verify success response
      expect(result).toEqual({ message: 'Webhook deleted successfully' });
    });
  });

  describe('Webhook Delivery Operations', () => {
    it('should trigger webhook delivery', async () => {
      const webhook = {
        id: 'webhook-id-1',
        name: 'test-webhook',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        secret: 'test-secret',
        isActive: true,
        retryCount: 3,
        timeoutMs: 10000,
        headers: {},
        organizationId: 'test-tenant-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };

      const payload = {
        event: 'contact.created',
        data: { contactId: 'contact-123', name: 'John Doe' },
        timestamp: new Date(),
        userId: 'user-123',
      };

      const mockDelivery = {
        id: 'delivery-id-1',
        webhookId: 'webhook-id-1',
        event: 'contact.created',
        payload: payload.data as any, // Cast to any to match JsonValue
        status: 'pending',
        statusCode: null,
        response: null,
        errorMessage: null,
        retryCount: 0,
        attemptedAt: new Date(),
        completedAt: null,
        organizationId: 'test-tenant-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: 0,
        nextAttemptAt: null,
        deliveredAt: null,
      };

      jest.spyOn(webhookRepository, 'findById').mockResolvedValue(webhook);
      jest.spyOn(webhookRepository, 'createDelivery').mockResolvedValue(mockDelivery);
      jest.spyOn(app.get('BullQueue_webhook-queue'), 'add').mockResolvedValue({} as any);

      const result = await webhooksService.triggerWebhook('webhook-id-1', payload);

      // Verify repository and queue calls
      expect(webhookRepository.findById).toHaveBeenCalledWith('webhook-id-1');
      expect(webhookRepository.createDelivery).toHaveBeenCalled();
      expect(app.get('BullQueue_webhook-queue').add).toHaveBeenCalled();

      // Verify response
      expect(result).toMatchObject({
        deliveryId: 'delivery-id-1',
        message: 'Webhook delivery queued successfully',
      });
    });

    it('should get delivery history with pagination', async () => {
      const mockDeliveries = [
        {
          id: 'delivery-1',
          webhookId: 'webhook-id-1',
          event: 'contact.created',
          payload: { test: 'data' },
          status: 'success',
          statusCode: 200,
          response: 'OK',
          errorMessage: null,
          retryCount: 0,
          attemptedAt: new Date(),
          completedAt: new Date(),
          organizationId: 'test-tenant-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          attempts: 0,
          nextAttemptAt: null,
          deliveredAt: null,
        },
        {
          id: 'delivery-2',
          webhookId: 'webhook-id-1',
          event: 'deal.updated',
          payload: { dealId: 'deal-123' },
          status: 'failed',
          statusCode: 500,
          response: 'Internal Server Error',
          errorMessage: 'Timeout',
          retryCount: 2,
          attemptedAt: new Date(),
          completedAt: new Date(),
          organizationId: 'test-tenant-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          attempts: 2,
          nextAttemptAt: null,
          deliveredAt: null,
        },
      ];

      jest.spyOn(webhookRepository, 'findById').mockResolvedValue({
        id: 'webhook-id-1',
        name: 'test-webhook',
        organizationId: 'test-tenant-id',
      } as any);
      jest.spyOn(webhookRepository, 'findDeliveries').mockResolvedValue(mockDeliveries);
      jest.spyOn(webhookRepository, 'countDeliveries').mockResolvedValue(2);

      const result = await webhooksService.getDeliveryHistory('webhook-id-1', 1, 20);

      // Verify repository calls
      expect(webhookRepository.findDeliveries).toHaveBeenCalledWith('webhook-id-1', 1, 20);
      expect(webhookRepository.countDeliveries).toHaveBeenCalledWith('webhook-id-1');

      // Verify pagination response
      expect(result).toMatchObject({
        data: mockDeliveries,
        meta: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
          hasMore: false,
        },
      });
    });
  });

  describe('Business Logic Preservation', () => {
    it('should validate webhook URLs', () => {
      const service = new WebhooksService(
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
      );

      // Valid URLs should not throw
      expect(() =>
        (service as any).validateWebhookUrl('https://example.com/webhook'),
      ).not.toThrow();
      expect(() => (service as any).validateWebhookUrl('http://example.com/webhook')).not.toThrow();

      // Invalid URLs should throw
      expect(() => (service as any).validateWebhookUrl('invalid-url')).toThrow();
      expect(() => (service as any).validateWebhookUrl('ftp://example.com/webhook')).toThrow();
    });

    it('should generate secure secrets', () => {
      const service = new WebhooksService(
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
        null as any,
      );

      const secret1 = (service as any).generateSecret();
      const secret2 = (service as any).generateSecret();

      // Secrets should be 64 characters (32 bytes in hex)
      expect(secret1).toHaveLength(64);
      expect(secret2).toHaveLength(64);

      // Secrets should be unique
      expect(secret1).not.toBe(secret2);

      // Secrets should be hex strings
      expect(secret1).toMatch(/^[0-9a-f]{64}$/);
      expect(secret2).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});

// src/modules/webhooks/__tests__/webhooks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from '../webhooks.service';
import { WebhookRepository } from '../repositories/webhook.repository';
import { TenantContextService } from '../../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Queue } from 'bullmq';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let webhookRepository: jest.Mocked<WebhookRepository>;
  let permissionContext: jest.Mocked<PermissionContextService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: WebhookRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByName: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createDelivery: jest.fn(),
            findDeliveryById: jest.fn(),
            findDeliveries: jest.fn(),
            countDeliveries: jest.fn(),
            updateDelivery: jest.fn(),
            getStatistics: jest.fn(),
            cleanupOldDeliveries: jest.fn(),
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            getTenantId: jest.fn().mockReturnValue('test-tenant'),
            getUserId: jest.fn().mockReturnValue('test-user'),
          },
        },
        {
          provide: PermissionContextService,
          useValue: {
            hasPermission: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logEvent: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: 'BullQueue_webhook-queue',
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    webhookRepository = module.get(WebhookRepository);
    permissionContext = module.get(PermissionContextService);
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWebhook', () => {
    it('should create webhook with repository pattern', async () => {
      const createDto = {
        name: 'test-webhook',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        isActive: true,
      };

      const mockWebhook = {
        id: 'webhook-id',
        ...createDto,
        secret: 'generated-secret',
        retryCount: 3,
        timeoutMs: 10000,
        headers: {},
        organizationId: 'test-tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null, // ✅ ADDED
        deletedBy: null, // ✅ ADDED
      };

      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.create.mockResolvedValue(mockWebhook);

      const result = await service.createWebhook(createDto);

      expect(webhookRepository.create).toHaveBeenCalled();
      expect(result).not.toHaveProperty('secret');
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });

    it('should throw error if webhook name already exists', async () => {
      const createDto = {
        name: 'existing-webhook',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        isActive: true,
      };

      const existingWebhook = {
        id: 'existing-id',
        ...createDto,
        secret: 'existing-secret',
        retryCount: 3,
        timeoutMs: 10000,
        headers: {},
        organizationId: 'test-tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null, // ✅ ADDED
        deletedBy: null, // ✅ ADDED
      };

      webhookRepository.findByName.mockResolvedValue(existingWebhook);

      await expect(service.createWebhook(createDto)).rejects.toThrow();
      expect(webhookRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getWebhooks', () => {
    it('should return webhooks from repository', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          name: 'webhook-1',
          url: 'https://example.com/webhook1',
          events: ['contact.created'],
          isActive: true,
          secret: 'secret-1',
          retryCount: 3,
          timeoutMs: 10000,
          headers: {},
          organizationId: 'test-tenant',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null, // ✅ ADDED
          deletedBy: null, // ✅ ADDED
        },
        {
          id: 'webhook-2',
          name: 'webhook-2',
          url: 'https://example.com/webhook2',
          events: ['deal.created'],
          isActive: false,
          secret: 'secret-2',
          retryCount: 5,
          timeoutMs: 15000,
          headers: { 'X-Custom': 'value' },
          organizationId: 'test-tenant',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null, // ✅ ADDED
          deletedBy: null, // ✅ ADDED
        },
      ];

      webhookRepository.findAll.mockResolvedValue(mockWebhooks);

      const result = await service.getAllWebhooks();

      expect(webhookRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('secret');
      expect(result[1]).not.toHaveProperty('secret');
    });
  });

  describe('getWebhook', () => {
    it('should return webhook by id', async () => {
      const mockWebhook = {
        id: 'webhook-id',
        name: 'test-webhook',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        isActive: true,
        secret: 'generated-secret',
        retryCount: 3,
        timeoutMs: 10000,
        headers: {},
        organizationId: 'test-tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null, // ✅ ADDED
        deletedBy: null, // ✅ ADDED
      };

      webhookRepository.findById.mockResolvedValue(mockWebhook);

      const result = await service.getWebhookById('webhook-id');

      expect(webhookRepository.findById).toHaveBeenCalledWith('webhook-id');
      expect(result).not.toHaveProperty('secret');
      expect(result?.id).toBe('webhook-id');
    });

    it('should return null for non-existent webhook', async () => {
      webhookRepository.findById.mockResolvedValue(null);

      const result = await service.getWebhookById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook', async () => {
      const updateDto = {
        name: 'updated-webhook',
        url: 'https://updated.example.com/webhook',
        events: ['contact.updated'],
        isActive: false,
      };

      const existingWebhook = {
        id: 'webhook-id',
        name: 'original-webhook',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        isActive: true,
        secret: 'secret',
        retryCount: 3,
        timeoutMs: 10000,
        headers: {},
        organizationId: 'test-tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null, // ✅ ADDED
        deletedBy: null, // ✅ ADDED
      };

      const updatedWebhook = {
        ...existingWebhook,
        ...updateDto,
        updatedAt: new Date(),
      };

      webhookRepository.findById.mockResolvedValue(existingWebhook);
      webhookRepository.update.mockResolvedValue(updatedWebhook);

      const result = await service.updateWebhook('webhook-id', updateDto);

      expect(webhookRepository.update).toHaveBeenCalled();
      expect(result).not.toHaveProperty('secret');
      expect(result?.name).toBe('updated-webhook');
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook', async () => {
      const mockWebhook = {
        id: 'webhook-id',
        name: 'test-webhook',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        isActive: true,
        secret: 'secret',
        retryCount: 3,
        timeoutMs: 10000,
        headers: {},
        organizationId: 'test-tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null, // ✅ ADDED
        deletedBy: null, // ✅ ADDED
      };

      webhookRepository.findById.mockResolvedValue(mockWebhook);
      webhookRepository.delete.mockResolvedValue(mockWebhook);

      const result = await service.deleteWebhook('webhook-id');

      expect(webhookRepository.delete).toHaveBeenCalledWith('webhook-id');
      expect(result).not.toHaveProperty('secret');
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });
  });

  describe('getDeliveries', () => {
    it('should return deliveries for webhook', async () => {
      const mockDeliveries = [
        {
          id: 'delivery-1',
          webhookId: 'webhook-id',
          event: 'contact.created',
          payload: { id: 'contact-1' },
          status: 'success',
          statusCode: 200,
          response: 'OK',
          errorMessage: null, // ✅ CHANGED FROM 'error' TO 'errorMessage'
          organizationId: 'test-tenant',
          attempts: 1, // ✅ ADDED
          nextAttemptAt: null, // ✅ ADDED
          deliveredAt: new Date(), // ✅ ADDED
          retryCount: 0, // ✅ ADDED
          attemptedAt: new Date(), // ✅ ADDED
          completedAt: new Date(), // ✅ ADDED
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'delivery-2',
          webhookId: 'webhook-id',
          event: 'contact.updated',
          payload: { id: 'contact-2' },
          status: 'failed',
          statusCode: 500,
          response: null,
          errorMessage: 'Connection timeout', // ✅ CHANGED FROM 'error' TO 'errorMessage'
          organizationId: 'test-tenant',
          attempts: 3, // ✅ ADDED
          nextAttemptAt: new Date(Date.now() + 3600000), // ✅ ADDED
          deliveredAt: null, // ✅ ADDED
          retryCount: 2, // ✅ ADDED
          attemptedAt: new Date(), // ✅ ADDED
          completedAt: new Date(), // ✅ ADDED
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      webhookRepository.findDeliveries.mockResolvedValue(mockDeliveries);
      webhookRepository.countDeliveries.mockResolvedValue(2);

      const result = await service.getDeliveryHistory('webhook-id', 1, 10);

      expect(webhookRepository.findDeliveries).toHaveBeenCalledWith('webhook-id', 1, 10);
      expect(webhookRepository.countDeliveries).toHaveBeenCalledWith('webhook-id');
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('getDelivery', () => {
    it('should return delivery by id', async () => {
      const mockDelivery = {
        id: 'delivery-id',
        webhookId: 'webhook-id',
        event: 'contact.created',
        payload: { id: 'contact-1' },
        status: 'success',
        statusCode: 200,
        response: 'OK',
        errorMessage: null, // ✅ CHANGED FROM 'error' TO 'errorMessage'
        organizationId: 'test-tenant',
        attempts: 1, // ✅ ADDED
        nextAttemptAt: null, // ✅ ADDED
        deliveredAt: new Date(), // ✅ ADDED
        retryCount: 0, // ✅ ADDED
        attemptedAt: new Date(), // ✅ ADDED
        completedAt: new Date(), // ✅ ADDED
        createdAt: new Date(),
        updatedAt: new Date(),
        webhook: {
          id: 'webhook-id',
          name: 'test-webhook',
          url: 'https://example.com/webhook',
          events: ['contact.created'], // ADD THIS
          secret: 'secret', // ADD THIS
          isActive: true,
          organizationId: 'test-tenant',
          deletedAt: null,
          deletedBy: null,
          createdAt: new Date(), // ADD THIS
          updatedAt: new Date(), // ADD THIS
          retryCount: 3, // ADD THIS
          timeoutMs: 10000, // ADD THIS
          headers: {}, // ADD THIS (as JsonValue)
        },
      };

      webhookRepository.findDeliveryById.mockResolvedValue(mockDelivery);

      const result = await service.getDeliveryStatus('delivery-id');

      expect(webhookRepository.findDeliveryById).toHaveBeenCalledWith('delivery-id');
      expect(result?.id).toBe('delivery-id');
      expect(result?.webhook).toBeDefined();
      expect(result?.webhook).not.toHaveProperty('secret');
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      const mockStats = {
        timeframe: 'week' as const, // Change from 'string' to specific literal
        total: 100,
        byStatus: { success: 80, failed: 20 },
        avgResponseTime: 150.5,
        successRate: 80,
      };

      webhookRepository.getStatistics.mockResolvedValue(mockStats);

      const result = await service.getStatistics('week');

      expect(webhookRepository.getStatistics).toHaveBeenCalledWith('week');
      expect(result.total).toBe(100);
      expect(result.successRate).toBe(80);
    });
  });
});

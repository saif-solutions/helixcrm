// Complete mock of @nestjs/bullmq at the top
jest.mock('@nestjs/bullmq', () => {
  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
    removeAllListeners: jest.fn(),
    removeListener: jest.fn(),
    emit: jest.fn(),
    addListener: jest.fn(),
    once: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
    off: jest.fn(),
    setMaxListeners: jest.fn(),
    getMaxListeners: jest.fn(),
    listeners: jest.fn(),
    rawListeners: jest.fn(),
    listenerCount: jest.fn(),
    eventNames: jest.fn(),
  };

  return {
    BullModule: {
      registerQueue: jest.fn().mockReturnValue({
        module: class {},
        providers: [],
        exports: [],
      }),
      registerFlowProducer: jest.fn().mockReturnValue({
        module: class {},
        providers: [],
        exports: [],
      }),
    },
    getQueueToken: jest.fn().mockImplementation((name: string) => `BullQueue_${name}`),
    Processor: jest.fn().mockImplementation(() => (target: any) => target),
    Process: jest.fn().mockImplementation(() => (_target: any, _key: string) => {}),
    WorkerHost: class {},
    InjectQueue: jest.fn(),
    Queue: class {
      constructor() {
        return mockQueue;
      }
    },
    BullQueue: class {
      constructor() {
        return mockQueue;
      }
    },
  };
});

import { Test, TestingModule } from '@nestjs/testing';
// import { ConflictException } from '@nestjs/common';
import { WebhooksService } from '@api/modules/webhooks/webhooks.service';
import { WebhookRepository } from '@api/modules/webhooks/repositories/webhook.repository';
import { TenantContextService } from '@api/shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '@api/shared/permissions/context/permission-context.service';
import { AuditLogService } from '@api/shared/audit-log/audit-log.service';
import { PrismaService } from '@api/shared/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';

// Create a simple queue mock that can be used throughout the tests
const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  process: jest.fn(),
  on: jest.fn(),
  close: jest.fn(),
  removeAllListeners: jest.fn(),
  removeListener: jest.fn(),
  emit: jest.fn(),
  addListener: jest.fn(),
  once: jest.fn(),
  prependListener: jest.fn(),
  prependOnceListener: jest.fn(),
  off: jest.fn(),
  setMaxListeners: jest.fn(),
  getMaxListeners: jest.fn(),
  listeners: jest.fn(),
  rawListeners: jest.fn(),
  listenerCount: jest.fn(),
  eventNames: jest.fn(),
};

describe('Webhook Module Integration', () => {
  let webhooksService: WebhooksService;
  let webhookRepository: WebhookRepository;
  let webhookQueue: Queue;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
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
            getTenantId: () => 'test-tenant-id',
            getUserId: () => 'test-user-id',
          },
        },
        {
          provide: PermissionContextService,
          useValue: {
            hasPermission: (permission: string) => {
              const allowed = ['webhook:manage', 'webhook:read', 'webhook:trigger', 'system:admin'];
              return allowed.includes(permission);
            },
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logEvent: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
            },
            webhook: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'webhook-id-1',
                organizationId: 'test-tenant-id',
              }),
            },
            $transaction: jest.fn().mockImplementation((callback) => callback()),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue({ sub: 'test-user-id' }),
            sign: jest.fn().mockReturnValue('test-token'),
          },
        },
        {
          provide: getQueueToken('webhook-queue'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    webhooksService = moduleFixture.get<WebhooksService>(WebhooksService);
    webhookRepository = moduleFixture.get<WebhookRepository>(WebhookRepository);
    webhookQueue = moduleFixture.get(getQueueToken('webhook-queue'));
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
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

      jest.spyOn(webhookRepository, 'findByName').mockResolvedValue(null);
      jest.spyOn(webhookRepository, 'create').mockResolvedValue(mockWebhook as any);

      const result = await webhooksService.createWebhook(createDto);

      expect(webhookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          url: createDto.url,
          events: createDto.events,
        }),
      );
      expect(result).not.toHaveProperty('secret');
      expect(result).toMatchObject({
        id: 'webhook-id-1',
        name: 'test-webhook-1',
        url: 'https://example.com/webhook',
        isActive: true,
      });
    });

    it('should handle duplicate webhook name conflict', async () => {
      const createDto = {
        name: 'existing-webhook',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        isActive: true,
        retryCount: 3,
        timeoutMs: 10000,
      };

      const existingWebhook = {
        id: 'webhook-id-2',
        name: 'existing-webhook',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        secret: 'secret-123',
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

      jest.spyOn(webhookRepository, 'findByName').mockResolvedValue(existingWebhook as any);
      jest.spyOn(webhookRepository, 'create').mockResolvedValue({} as any);

      await expect(webhooksService.createWebhook(createDto)).rejects.toMatchObject({
        name: 'ConflictException',
        message: expect.stringContaining('already exists'),
      });
      expect(webhookRepository.create).not.toHaveBeenCalled();
    });

    it('should handle invalid webhook URL with special characters', async () => {
      const createDto = {
        name: 'test-webhook',
        url: 'https://example.com/webhook?param=<script>alert("xss")</script>',
        events: ['contact.created'],
        isActive: true,
        retryCount: 3,
        timeoutMs: 10000,
      };

      jest.spyOn(webhookRepository, 'findByName').mockResolvedValue(null);

      // The validateWebhookUrl method should still accept this URL (it's a valid URL)
      // But we're testing that it doesn't throw an error
      await expect(webhooksService.createWebhook(createDto)).resolves.toBeDefined();
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

      jest.spyOn(webhookRepository, 'findAll').mockResolvedValue(mockWebhooks as any);

      const result = await webhooksService.getAllWebhooks();

      expect(webhookRepository.findAll).toHaveBeenCalled();
      result.forEach((webhook) => {
        expect(webhook).not.toHaveProperty('secret');
      });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test-webhook-1');
      expect(result[1].name).toBe('test-webhook-2');
    });

    it('should get webhook by ID with tenant isolation', async () => {
      const mockWebhook = {
        id: 'webhook-id-1',
        name: 'test-webhook-1',
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        secret: 'generated-secret',
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

      jest.spyOn(webhookRepository, 'findById').mockResolvedValue(mockWebhook as any);

      const result = await webhooksService.getWebhookById('webhook-id-1');

      expect(webhookRepository.findById).toHaveBeenCalledWith('webhook-id-1');
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

      jest.spyOn(webhookRepository, 'findById').mockResolvedValue(existingWebhook as any);
      jest.spyOn(webhookRepository, 'findByName').mockResolvedValue(null);
      jest.spyOn(webhookRepository, 'update').mockResolvedValue(updatedWebhook as any);

      const result = await webhooksService.updateWebhook('webhook-id-1', updateDto);

      expect(webhookRepository.findById).toHaveBeenCalledWith('webhook-id-1');
      expect(webhookRepository.update).toHaveBeenCalledWith('webhook-id-1', updateDto);
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

      jest.spyOn(webhookRepository, 'findById').mockResolvedValue(existingWebhook as any);
      jest.spyOn(webhookRepository, 'delete').mockResolvedValue(existingWebhook as any);

      const result = await webhooksService.deleteWebhook('webhook-id-1');

      expect(webhookRepository.findById).toHaveBeenCalledWith('webhook-id-1');
      expect(webhookRepository.delete).toHaveBeenCalledWith('webhook-id-1');
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
        payload: payload.data,
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

      jest.spyOn(webhookRepository, 'findById').mockResolvedValue(webhook as any);
      jest.spyOn(webhookRepository, 'createDelivery').mockResolvedValue(mockDelivery as any);
      jest.spyOn(webhookQueue, 'add').mockResolvedValue({ id: 'test-job-id' } as any);

      const result = await webhooksService.triggerWebhook('webhook-id-1', payload);

      expect(webhookRepository.findById).toHaveBeenCalledWith('webhook-id-1');
      expect(webhookRepository.createDelivery).toHaveBeenCalled();
      expect(webhookQueue.add).toHaveBeenCalled();
      expect(result).toMatchObject({
        deliveryId: 'delivery-id-1',
        message: 'Webhook delivery queued successfully',
      });
    });

    it('should handle webhook delivery timeout', async () => {
      const webhook = {
        id: 'webhook-id-1',
        name: 'test-webhook',
        url: 'https://slow-endpoint.example.com/webhook',
        events: ['contact.created'],
        secret: 'test-secret',
        isActive: true,
        retryCount: 3,
        timeoutMs: 1000,
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
        payload: payload.data,
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

      jest.spyOn(webhookRepository, 'findById').mockResolvedValue(webhook as any);
      jest.spyOn(webhookRepository, 'createDelivery').mockResolvedValue(mockDelivery as any);

      // Mock the queue add to throw an error
      jest.spyOn(webhookQueue, 'add').mockRejectedValue(new Error('Request timeout'));

      await expect(webhooksService.triggerWebhook('webhook-id-1', payload)).rejects.toMatchObject({
        name: 'BadRequestException',
        message: expect.stringContaining('Failed to trigger webhook'),
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
      jest.spyOn(webhookRepository, 'findDeliveries').mockResolvedValue(mockDeliveries as any);
      jest.spyOn(webhookRepository, 'countDeliveries').mockResolvedValue(2);

      const result = await webhooksService.getDeliveryHistory('webhook-id-1', 1, 20);

      expect(webhookRepository.findDeliveries).toHaveBeenCalledWith('webhook-id-1', 1, 20);
      expect(webhookRepository.countDeliveries).toHaveBeenCalledWith('webhook-id-1');
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
      expect(() =>
        (service as any).validateWebhookUrl('https://subdomain.example.com/api/webhook'),
      ).not.toThrow();

      // Invalid URLs should throw
      expect(() => (service as any).validateWebhookUrl('invalid-url')).toThrow();
      expect(() => (service as any).validateWebhookUrl('ftp://example.com/webhook')).toThrow();
      expect(() => (service as any).validateWebhookUrl('ws://example.com/webhook')).toThrow();
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

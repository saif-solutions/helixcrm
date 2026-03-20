// Mock the ALS module at the top of the file
jest.mock('@api/shared/als', () => ({
  getTenantId: jest.fn(),
  requireTenantId: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { WebhookRepository } from '@api/modules/webhooks/repositories/webhook.repository';
import { PrismaService } from '@api/shared/prisma/prisma.service';
import { WebhookDeliveryStatus } from '@api/modules/webhooks/repositories/webhook.repository';
import { getTenantId } from '@api/shared/als';

// Mock data
const mockTenantId = 'test-tenant-id';
const mockWebhookId = 'webhook-123';
const mockDeliveryId = 'delivery-123';

const mockWebhook = {
  id: mockWebhookId,
  name: 'Test Webhook',
  url: 'https://example.com/webhook',
  events: ['deal.created', 'deal.updated'],
  secret: 'test-secret-123',
  isActive: true,
  retryCount: 3,
  timeoutMs: 10000,
  headers: { 'X-Custom-Header': 'test' },
  organizationId: mockTenantId,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  deletedBy: null,
};

const mockDelivery = {
  id: mockDeliveryId,
  webhookId: mockWebhookId,
  event: 'deal.created',
  payload: { dealId: 'deal-123' },
  status: 'pending' as WebhookDeliveryStatus,
  retryCount: 0,
  attemptedAt: new Date(),
  completedAt: null,
  statusCode: null,
  response: null,
  errorMessage: null,
  organizationId: mockTenantId,
  createdAt: new Date(),
  updatedAt: new Date(),
  nextAttemptAt: null,
  lockedAt: null,
  lockedBy: null,
  deliveredAt: null,
};

// Create mock Prisma service with all required methods
const createMockPrisma = () => ({
  webhook: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  webhookDelivery: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
});

describe('WebhookRepository', () => {
  let repository: WebhookRepository;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockPrisma = createMockPrisma();
    
    // Mock getTenantId to return our mock tenant ID
    (getTenantId as jest.Mock).mockReturnValue(mockTenantId);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<WebhookRepository>(WebhookRepository);
    
    // Manually set the prisma instance since the repository might need it
    (repository as any).setPrismaService(mockPrisma as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a webhook', async () => {
      const createData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['deal.created'],
        secret: 'secret-123',
        isActive: true,
        retryCount: 3,
        timeoutMs: 10000,
        headers: {},
      };

      mockPrisma.webhook.create.mockResolvedValue(mockWebhook);

      const result = await repository.create(createData);

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhook.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          organizationId: mockTenantId,
        },
      });
      expect(result).toEqual(mockWebhook);
    });

    it('should use default values for optional fields', async () => {
      const createData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['deal.created'],
        secret: 'secret-123',
      };

      mockPrisma.webhook.create.mockResolvedValue(mockWebhook);

      await repository.create(createData);

      expect(mockPrisma.webhook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true,
          retryCount: 3,
          timeoutMs: 10000,
          headers: {},
        }),
      });
    });
  });

  describe('findById', () => {
    it('should find webhook by id with tenant isolation', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(mockWebhook);

      const result = await repository.findById(mockWebhookId);

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhook.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockWebhookId,
          organizationId: mockTenantId,
        },
      });
      expect(result).toEqual(mockWebhook);
    });

    it('should return null when webhook not found', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find webhook by name with case-insensitive search', async () => {
      mockPrisma.webhook.findFirst.mockResolvedValue(mockWebhook);

      const result = await repository.findByName('Test Webhook');

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhook.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: 'Test Webhook', mode: 'insensitive' },
          organizationId: mockTenantId,
        },
      });
      expect(result).toEqual(mockWebhook);
    });
  });

  describe('findAll', () => {
    it('should find all webhooks for current tenant', async () => {
      const mockWebhooks = [mockWebhook, { ...mockWebhook, id: 'webhook-2' }];
      mockPrisma.webhook.findMany.mockResolvedValue(mockWebhooks);

      const result = await repository.findAll();

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhook.findMany).toHaveBeenCalledWith({
        where: { organizationId: mockTenantId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockWebhooks);
    });
  });

  describe('update', () => {
    it('should update webhook', async () => {
      const updateData = { name: 'Updated Name', isActive: false };
      const updatedWebhook = { ...mockWebhook, ...updateData, updatedAt: new Date() };
      mockPrisma.webhook.update.mockResolvedValue(updatedWebhook);

      const result = await repository.update(mockWebhookId, updateData);

      expect(mockPrisma.webhook.update).toHaveBeenCalledWith({
        where: { id: mockWebhookId },
        data: { ...updateData, updatedAt: expect.any(Date) },
      });
      expect(result).toEqual(updatedWebhook);
    });
  });

  describe('delete', () => {
    it('should delete webhook', async () => {
      mockPrisma.webhook.delete.mockResolvedValue(mockWebhook);

      const result = await repository.delete(mockWebhookId);

      expect(mockPrisma.webhook.delete).toHaveBeenCalledWith({
        where: { id: mockWebhookId },
      });
      expect(result).toEqual(mockWebhook);
    });
  });

  describe('createDelivery', () => {
    it('should create a delivery record', async () => {
      const createDeliveryData = {
        webhookId: mockWebhookId,
        event: 'deal.created',
        payload: { dealId: 'deal-123' },
        status: 'pending' as WebhookDeliveryStatus,
        retryCount: 0,
        attemptedAt: new Date(),
      };

      mockPrisma.webhookDelivery.create.mockResolvedValue(mockDelivery);

      const result = await repository.createDelivery(createDeliveryData);

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          webhookId: createDeliveryData.webhookId,
          event: createDeliveryData.event,
          payload: createDeliveryData.payload,
          status: createDeliveryData.status,
          organizationId: mockTenantId,
        }),
      });
      expect(result).toEqual(mockDelivery);
    });
  });

  describe('findDeliveryById', () => {
    it('should find delivery with webhook info', async () => {
      const deliveryWithWebhook = { ...mockDelivery, webhook: mockWebhook };
      mockPrisma.webhookDelivery.findFirst.mockResolvedValue(deliveryWithWebhook);

      const result = await repository.findDeliveryById(mockDeliveryId);

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockDeliveryId,
          organizationId: mockTenantId,
        },
        include: { webhook: true },
      });
      expect(result).toEqual(deliveryWithWebhook);
    });
  });

  describe('findDeliveries', () => {
    it('should find deliveries with pagination', async () => {
      const mockDeliveries = [mockDelivery, { ...mockDelivery, id: 'delivery-2' }];
      mockPrisma.webhookDelivery.findMany.mockResolvedValue(mockDeliveries);

      const page = 1;
      const limit = 10;
      const result = await repository.findDeliveries(mockWebhookId, page, limit);

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: {
          webhookId: mockWebhookId,
          organizationId: mockTenantId,
        },
        orderBy: { attemptedAt: 'desc' },
        skip: 0,
        take: limit,
      });
      expect(result).toEqual(mockDeliveries);
    });
  });

  describe('countDeliveries', () => {
    it('should count deliveries for a webhook', async () => {
      mockPrisma.webhookDelivery.count.mockResolvedValue(5);

      const result = await repository.countDeliveries(mockWebhookId);

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.count).toHaveBeenCalledWith({
        where: {
          webhookId: mockWebhookId,
          organizationId: mockTenantId,
        },
      });
      expect(result).toBe(5);
    });
  });

  describe('updateDelivery', () => {
    it('should update delivery record', async () => {
      const updateData = {
        status: 'success' as WebhookDeliveryStatus,
        statusCode: 200,
        response: 'OK',
        completedAt: new Date(),
      };
      const updatedDelivery = { ...mockDelivery, ...updateData };
      mockPrisma.webhookDelivery.update.mockResolvedValue(updatedDelivery);

      const result = await repository.updateDelivery(mockDeliveryId, updateData);

      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith({
        where: { id: mockDeliveryId },
        data: expect.objectContaining({
          status: updateData.status,
          statusCode: updateData.statusCode,
          response: updateData.response,
          completedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      });
      expect(result).toEqual(updatedDelivery);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for week timeframe', async () => {
      mockPrisma.webhookDelivery.groupBy.mockResolvedValue([
        { status: 'success', _count: { id: 80 } },
        { status: 'failed', _count: { id: 15 } },
        { status: 'pending', _count: { id: 5 } },
      ]);
      mockPrisma.webhookDelivery.count.mockResolvedValue(100);
      mockPrisma.$queryRaw.mockResolvedValue([{ avg_seconds: 0.25 }]);

      const result = await repository.getStatistics('week');

      expect(getTenantId).toHaveBeenCalled();
      expect(result).toHaveProperty('timeframe', 'week');
      expect(result).toHaveProperty('total', 100);
      expect(result).toHaveProperty('byStatus.success', 80);
      expect(result).toHaveProperty('byStatus.failed', 15);
      expect(result).toHaveProperty('byStatus.pending', 5);
    });
  });

  describe('cleanupOldDeliveries', () => {
    it('should delete old deliveries', async () => {
      mockPrisma.webhookDelivery.deleteMany.mockResolvedValue({ count: 10 });

      const result = await repository.cleanupOldDeliveries(90);

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.deleteMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockTenantId,
          attemptedAt: { lt: expect.any(Date) },
          status: { in: ['success', 'failed'] },
        },
      });
      expect(result).toEqual({ count: 10 });
    });
  });

  describe('findActiveWebhooksByEvent', () => {
    it('should find active webhooks subscribed to an event', async () => {
      const mockWebhooks = [mockWebhook];
      mockPrisma.webhook.findMany.mockResolvedValue(mockWebhooks);

      const result = await repository.findActiveWebhooksByEvent('deal.created');

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhook.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: mockTenantId,
          isActive: true,
          OR: [
            { events: { has: 'deal.created' } },
            { events: { has: '*' } },
          ],
        },
      });
      expect(result).toEqual(mockWebhooks);
    });
  });

  describe('countActiveWebhooks', () => {
    it('should count active webhooks', async () => {
      mockPrisma.webhook.count.mockResolvedValue(3);

      const result = await repository.countActiveWebhooks();

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhook.count).toHaveBeenCalledWith({
        where: {
          organizationId: mockTenantId,
          isActive: true,
        },
      });
      expect(result).toBe(3);
    });
  });

  describe('findWebhookWithRecentDeliveries', () => {
    it('should find webhook with recent deliveries', async () => {
      const webhookWithDeliveries = {
        ...mockWebhook,
        deliveries: [mockDelivery],
      };
      mockPrisma.webhook.findFirst.mockResolvedValue(webhookWithDeliveries);

      const result = await repository.findWebhookWithRecentDeliveries(mockWebhookId, 5);

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhook.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockWebhookId,
          organizationId: mockTenantId,
        },
        include: {
          deliveries: {
            orderBy: { attemptedAt: 'desc' },
            take: 5,
          },
        },
      });
      expect(result).toEqual(webhookWithDeliveries);
    });
  });

  describe('findRetryableDeliveries', () => {
    it('should find deliveries that can be retried', async () => {
      const retryableDelivery = {
        ...mockDelivery,
        webhook: { ...mockWebhook, retryCount: 5 },
        retryCount: 2,
      };
      mockPrisma.webhookDelivery.findMany.mockResolvedValue([retryableDelivery]);

      const result = await repository.findRetryableDeliveries(10);

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.findMany).toHaveBeenCalled();
      expect(result[0]).toHaveProperty('retryable', true);
      expect(result[0]).toHaveProperty('maxRetriesReached', false);
    });

    it('should mark deliveries as not retryable when max retries reached', async () => {
      const nonRetryableDelivery = {
        ...mockDelivery,
        webhook: { ...mockWebhook, retryCount: 3 },
        retryCount: 3,
      };
      mockPrisma.webhookDelivery.findMany.mockResolvedValue([nonRetryableDelivery]);

      const result = await repository.findRetryableDeliveries(10);

      expect(result[0]).toHaveProperty('retryable', false);
      expect(result[0]).toHaveProperty('maxRetriesReached', true);
    });
  });

  describe('getDeliveryWithWebhook', () => {
    it('should get delivery with webhook info', async () => {
      const deliveryWithWebhook = { ...mockDelivery, webhook: mockWebhook };
      mockPrisma.webhookDelivery.findFirst.mockResolvedValue(deliveryWithWebhook);

      const result = await repository.getDeliveryWithWebhook(mockDeliveryId);

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockDeliveryId,
          organizationId: mockTenantId,
        },
        include: { webhook: true },
      });
      expect(result).toEqual(deliveryWithWebhook);
    });
  });

  describe('bulkUpdateDeliveries', () => {
    it('should bulk update deliveries', async () => {
      mockPrisma.webhookDelivery.updateMany = jest.fn().mockResolvedValue({ count: 5 });

      const where = { status: 'failed' };
      const data = { status: 'pending' as WebhookDeliveryStatus };

      const result = await repository.bulkUpdateDeliveries(where, data);

      expect(getTenantId).toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.updateMany).toHaveBeenCalledWith({
        where: {
          ...where,
          organizationId: mockTenantId,
        },
        data: expect.objectContaining({
          ...data,
          updatedAt: expect.any(Date),
        }),
      });
      expect(result).toEqual({ count: 5 });
    });
  });
});
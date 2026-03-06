import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from '../../../src/modules/webhooks/webhooks.service';
import { WebhookRepository } from '../../../src/modules/webhooks/repositories/webhook.repository';
import { TenantContextService } from '../../../src/shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../../src/shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../../src/shared/audit-log/audit-log.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

// Mock implementations
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

const mockWebhookRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createDelivery: jest.fn(),
  findDeliveries: jest.fn(),
  countDeliveries: jest.fn(),
  findDeliveryById: jest.fn(),
  updateDelivery: jest.fn(),
  getStatistics: jest.fn(),
  cleanupOldDeliveries: jest.fn(),
};

const mockAuditLogService = {
  logEvent: jest.fn(),
};

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue('org-123'),
  getUserId: jest.fn().mockReturnValue('user-123'),
};

// Create a permission context that we can control per test
const mockPermissionContext = {
  hasPermission: jest.fn(),
};

const mockWebhookQueue = {
  add: jest.fn(),
};

// Mock data
const createMockWebhook = (overrides = {}) => ({
  id: 'webhook-123',
  name: 'Test Webhook',
  url: 'https://example.com/webhook',
  events: ['deal.created', 'deal.updated'],
  secret: 'test-secret-123',
  isActive: true,
  retryCount: 3,
  timeoutMs: 10000,
  headers: { 'X-Custom-Header': 'test' },
  organizationId: 'org-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

const createMockDelivery = (overrides = {}) => ({
  id: 'delivery-123',
  webhookId: 'webhook-123',
  event: 'deal.created',
  payload: { dealId: 'deal-123', amount: 10000 },
  status: 'pending',
  retryCount: 0,
  attemptedAt: new Date(),
  completedAt: null,
  statusCode: null,
  response: null,
  error: null,
  webhook: createMockWebhook(),
  ...overrides,
});

describe('WebhooksService', () => {
  let service: WebhooksService;
  let webhookRepository: typeof mockWebhookRepository;
  let tenantContext: typeof mockTenantContext;
  let permissionContext: typeof mockPermissionContext;
  let auditLog: typeof mockAuditLogService;
  let prisma: typeof mockPrismaService;
  let webhookQueue: typeof mockWebhookQueue;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set default permissions to true
    mockPermissionContext.hasPermission.mockReturnValue(true);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WebhookRepository, useValue: mockWebhookRepository },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: PermissionContextService, useValue: mockPermissionContext },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: getQueueToken('webhook-queue'), useValue: mockWebhookQueue },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    webhookRepository = module.get(WebhookRepository);
    tenantContext = module.get(TenantContextService);
    permissionContext = module.get(PermissionContextService);
    auditLog = module.get(AuditLogService);
    prisma = module.get(PrismaService);
    webhookQueue = module.get(getQueueToken('webhook-queue'));

    prisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
  });

  describe('createWebhook', () => {
    const createDto = {
      name: 'New Webhook',
      url: 'https://api.example.com/webhook',
      events: ['deal.created', 'contact.updated'],
      secret: 'custom-secret',
      isActive: true,
      retryCount: 5,
      timeoutMs: 15000,
      headers: { 'X-API-Key': 'test-key' },
    };

    const mockWebhook = createMockWebhook({
      name: 'New Webhook',
      url: 'https://api.example.com/webhook',
      events: ['deal.created', 'contact.updated'],
    });

    it('should successfully create a webhook', async () => {
      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.create.mockResolvedValue(mockWebhook);

      const result = await service.createWebhook(createDto);

      expect(result).toEqual({
        id: mockWebhook.id,
        name: mockWebhook.name,
        url: mockWebhook.url,
        events: mockWebhook.events,
        isActive: mockWebhook.isActive,
        retryCount: mockWebhook.retryCount,
        timeoutMs: mockWebhook.timeoutMs,
        headers: mockWebhook.headers,
        organizationId: mockWebhook.organizationId,
        createdAt: mockWebhook.createdAt,
        updatedAt: mockWebhook.updatedAt,
        deletedAt: mockWebhook.deletedAt,
      });
      expect(webhookRepository.findByName).toHaveBeenCalledWith('New Webhook');
      expect(webhookRepository.create).toHaveBeenCalledWith({
        name: 'New Webhook',
        url: 'https://api.example.com/webhook',
        events: ['deal.created', 'contact.updated'],
        secret: 'custom-secret',
        isActive: true,
        retryCount: 5,
        timeoutMs: 15000,
        headers: { 'X-API-Key': 'test-key' },
      });
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should generate a secret if not provided', async () => {
      const dtoWithoutSecret = { ...createDto, secret: undefined };
      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.create.mockResolvedValue(mockWebhook);

      await service.createWebhook(dtoWithoutSecret);

      expect(webhookRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        secret: expect.any(String),
      }));
    });

    it('should use default values for optional fields', async () => {
      const minimalDto = {
        name: 'Minimal Webhook',
        url: 'https://api.example.com/webhook',
        events: ['deal.created'],
      };

      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.create.mockResolvedValue(createMockWebhook({ name: 'Minimal Webhook' }));

      await service.createWebhook(minimalDto);

      expect(webhookRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        isActive: true,
        retryCount: 3,
        timeoutMs: 10000,
        headers: {},
      }));
    });

    it('should throw ConflictException if webhook name already exists', async () => {
      webhookRepository.findByName.mockResolvedValue(createMockWebhook());

      await expect(service.createWebhook(createDto)).rejects.toThrow(ConflictException);
      expect(webhookRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if URL is invalid', async () => {
      const invalidDto = { ...createDto, url: 'not-a-url' };

      await expect(service.createWebhook(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should check permission before creating', async () => {
      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.create.mockResolvedValue(mockWebhook);

      await service.createWebhook(createDto);

      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:manage');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.createWebhook(createDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateWebhook', () => {
    const updateDto = {
      name: 'Updated Webhook',
      url: 'https://updated.example.com/webhook',
      events: ['deal.deleted'],
      isActive: false,
    };

    const existingWebhook = createMockWebhook();
    const updatedWebhook = createMockWebhook({
      name: 'Updated Webhook',
      url: 'https://updated.example.com/webhook',
      events: ['deal.deleted'],
      isActive: false,
    });

    beforeEach(() => {
      webhookRepository.findById.mockResolvedValue(existingWebhook);
    });

    it('should successfully update a webhook', async () => {
      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.update.mockResolvedValue(updatedWebhook);

      const result = await service.updateWebhook('webhook-123', updateDto);

      expect(result).toEqual({
        id: updatedWebhook.id,
        name: updatedWebhook.name,
        url: updatedWebhook.url,
        events: updatedWebhook.events,
        isActive: updatedWebhook.isActive,
        retryCount: updatedWebhook.retryCount,
        timeoutMs: updatedWebhook.timeoutMs,
        headers: updatedWebhook.headers,
        organizationId: updatedWebhook.organizationId,
        createdAt: updatedWebhook.createdAt,
        updatedAt: updatedWebhook.updatedAt,
        deletedAt: updatedWebhook.deletedAt,
      });
      expect(webhookRepository.update).toHaveBeenCalledWith('webhook-123', updateDto);
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if webhook not found', async () => {
      webhookRepository.findById.mockResolvedValue(null);

      await expect(service.updateWebhook('webhook-123', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new name already exists', async () => {
      webhookRepository.findByName.mockResolvedValue({ id: 'another-webhook', name: 'Updated Webhook' });

      await expect(service.updateWebhook('webhook-123', { name: 'Updated Webhook' })).rejects.toThrow(ConflictException);
    });

    it('should validate URL if provided', async () => {
      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.update.mockResolvedValue(updatedWebhook);

      await service.updateWebhook('webhook-123', { url: 'https://valid.com/webhook' });

      expect(webhookRepository.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if URL is invalid', async () => {
      await expect(service.updateWebhook('webhook-123', { url: 'invalid' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteWebhook', () => {
    const mockWebhook = createMockWebhook();

    beforeEach(() => {
      webhookRepository.findById.mockResolvedValue(mockWebhook);
    });

    it('should successfully delete a webhook', async () => {
      await service.deleteWebhook('webhook-123');

      expect(webhookRepository.delete).toHaveBeenCalledWith('webhook-123');
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if webhook not found', async () => {
      webhookRepository.findById.mockResolvedValue(null);

      await expect(service.deleteWebhook('webhook-123')).rejects.toThrow(NotFoundException);
    });

    it('should check permission before deleting', async () => {
      await service.deleteWebhook('webhook-123');

      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:manage');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.deleteWebhook('webhook-123')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAllWebhooks', () => {
    const mockWebhooks = [
      createMockWebhook({ id: 'webhook-1', name: 'Webhook 1' }),
      createMockWebhook({ id: 'webhook-2', name: 'Webhook 2' }),
    ];

    it('should return all webhooks without secrets', async () => {
      webhookRepository.findAll.mockResolvedValue(mockWebhooks);

      const result = await service.getAllWebhooks();

      expect(result).toEqual([
        {
          id: mockWebhooks[0].id,
          name: mockWebhooks[0].name,
          url: mockWebhooks[0].url,
          events: mockWebhooks[0].events,
          isActive: mockWebhooks[0].isActive,
          retryCount: mockWebhooks[0].retryCount,
          timeoutMs: mockWebhooks[0].timeoutMs,
          headers: mockWebhooks[0].headers,
          organizationId: mockWebhooks[0].organizationId,
          createdAt: mockWebhooks[0].createdAt,
          updatedAt: mockWebhooks[0].updatedAt,
          deletedAt: mockWebhooks[0].deletedAt,
        },
        {
          id: mockWebhooks[1].id,
          name: mockWebhooks[1].name,
          url: mockWebhooks[1].url,
          events: mockWebhooks[1].events,
          isActive: mockWebhooks[1].isActive,
          retryCount: mockWebhooks[1].retryCount,
          timeoutMs: mockWebhooks[1].timeoutMs,
          headers: mockWebhooks[1].headers,
          organizationId: mockWebhooks[1].organizationId,
          createdAt: mockWebhooks[1].createdAt,
          updatedAt: mockWebhooks[1].updatedAt,
          deletedAt: mockWebhooks[1].deletedAt,
        },
      ]);
      expect(webhookRepository.findAll).toHaveBeenCalled();
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:read');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.getAllWebhooks()).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getWebhookById', () => {
    const mockWebhook = createMockWebhook();

    it('should return webhook without secret', async () => {
      webhookRepository.findById.mockResolvedValue(mockWebhook);

      const result = await service.getWebhookById('webhook-123');

      expect(result).toEqual({
        id: mockWebhook.id,
        name: mockWebhook.name,
        url: mockWebhook.url,
        events: mockWebhook.events,
        isActive: mockWebhook.isActive,
        retryCount: mockWebhook.retryCount,
        timeoutMs: mockWebhook.timeoutMs,
        headers: mockWebhook.headers,
        organizationId: mockWebhook.organizationId,
        createdAt: mockWebhook.createdAt,
        updatedAt: mockWebhook.updatedAt,
        deletedAt: mockWebhook.deletedAt,
      });
      expect(webhookRepository.findById).toHaveBeenCalledWith('webhook-123');
    });

    it('should throw NotFoundException if webhook not found', async () => {
      webhookRepository.findById.mockResolvedValue(null);

      await expect(service.getWebhookById('webhook-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('triggerWebhook', () => {
    const payload = {
      event: 'deal.created',
      data: { dealId: 'deal-123', amount: 10000 },
      timestamp: new Date(),
      userId: 'user-123',
      metadata: { source: 'test' },
    };

    const mockWebhook = createMockWebhook();
    const mockDelivery = createMockDelivery();

    beforeEach(() => {
      webhookRepository.findById.mockResolvedValue(mockWebhook);
      webhookRepository.createDelivery.mockResolvedValue(mockDelivery);
    });

    it('should successfully trigger a webhook', async () => {
      const result = await service.triggerWebhook('webhook-123', payload);

      expect(result).toHaveProperty('deliveryId', mockDelivery.id);
      expect(result).toHaveProperty('message');
      expect(webhookRepository.createDelivery).toHaveBeenCalled();
      expect(webhookQueue.add).toHaveBeenCalled();
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if webhook not found', async () => {
      webhookRepository.findById.mockResolvedValue(null);

      await expect(service.triggerWebhook('webhook-123', payload)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if webhook is inactive', async () => {
      webhookRepository.findById.mockResolvedValue({ ...mockWebhook, isActive: false });

      await expect(service.triggerWebhook('webhook-123', payload)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if event not subscribed', async () => {
      webhookRepository.findById.mockResolvedValue({ ...mockWebhook, events: ['different.event'] });

      await expect(service.triggerWebhook('webhook-123', payload)).rejects.toThrow(BadRequestException);
    });

    it('should check permission before triggering', async () => {
      await service.triggerWebhook('webhook-123', payload);

      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:trigger');
    });
  });

  describe('getDeliveryHistory', () => {
    const mockDeliveries = [
      createMockDelivery({ id: 'delivery-1', status: 'success' }),
      createMockDelivery({ id: 'delivery-2', status: 'failed' }),
    ];

    beforeEach(() => {
      webhookRepository.findById.mockResolvedValue(createMockWebhook());
    });

    it('should return paginated delivery history', async () => {
      webhookRepository.findDeliveries.mockResolvedValue(mockDeliveries);
      webhookRepository.countDeliveries.mockResolvedValue(2);

      const result = await service.getDeliveryHistory('webhook-123', 1, 10);

      expect(result).toEqual({
        data: mockDeliveries,
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
          hasMore: false,
        },
      });
      expect(webhookRepository.findDeliveries).toHaveBeenCalledWith('webhook-123', 1, 10);
    });

    it('should throw NotFoundException if webhook not found', async () => {
      webhookRepository.findById.mockResolvedValue(null);

      await expect(service.getDeliveryHistory('webhook-123', 1, 10)).rejects.toThrow(NotFoundException);
    });

    it('should check permission before fetching', async () => {
      webhookRepository.findDeliveries.mockResolvedValue([]);
      webhookRepository.countDeliveries.mockResolvedValue(0);

      await service.getDeliveryHistory('webhook-123', 1, 10);

      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:read');
    });
  });

  describe('getDeliveryStatus', () => {
    const mockDelivery = createMockDelivery();

    it('should return delivery status', async () => {
      webhookRepository.findDeliveryById.mockResolvedValue(mockDelivery);

      const result = await service.getDeliveryStatus('delivery-123');

      expect(result).toEqual(mockDelivery);
    });

    it('should throw NotFoundException if delivery not found', async () => {
      webhookRepository.findDeliveryById.mockResolvedValue(null);

      await expect(service.getDeliveryStatus('delivery-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('retryDelivery', () => {
    const mockDelivery = createMockDelivery({
      status: 'failed',
      retryCount: 2,
      webhook: createMockWebhook({ retryCount: 5 }),
    });

    beforeEach(() => {
      webhookRepository.findDeliveryById.mockResolvedValue(mockDelivery);
    });

    it('should successfully retry a failed delivery', async () => {
      webhookRepository.updateDelivery.mockResolvedValue({ ...mockDelivery, status: 'pending', retryCount: 3 });

      const result = await service.retryDelivery('delivery-123');

      expect(result).toHaveProperty('deliveryId', 'delivery-123');
      expect(result).toHaveProperty('message');
      expect(webhookRepository.updateDelivery).toHaveBeenCalled();
      expect(webhookQueue.add).toHaveBeenCalled();
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if delivery not found', async () => {
      webhookRepository.findDeliveryById.mockResolvedValue(null);

      await expect(service.retryDelivery('delivery-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if delivery status is not failed', async () => {
      webhookRepository.findDeliveryById.mockResolvedValue({ ...mockDelivery, status: 'success' });

      await expect(service.retryDelivery('delivery-123')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if max retries reached', async () => {
      webhookRepository.findDeliveryById.mockResolvedValue({
        ...mockDelivery,
        retryCount: 5,
        webhook: createMockWebhook({ retryCount: 5 }),
      });

      await expect(service.retryDelivery('delivery-123')).rejects.toThrow(ConflictException);
    });

    it('should check permission before retrying', async () => {
      webhookRepository.updateDelivery.mockResolvedValue(mockDelivery);

      await service.retryDelivery('delivery-123');

      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:manage');
    });
  });

  describe('getStatistics', () => {
    const mockStats = {
      totalWebhooks: 5,
      activeWebhooks: 4,
      totalDeliveries: 100,
      successRate: 85,
      averageResponseTime: 250,
    };

    it('should return webhook statistics', async () => {
      webhookRepository.getStatistics.mockResolvedValue(mockStats);

      const result = await service.getStatistics('week');

      expect(result).toEqual(mockStats);
      expect(webhookRepository.getStatistics).toHaveBeenCalledWith('week');
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:read');
    });

    it('should use default timeframe if not provided', async () => {
      webhookRepository.getStatistics.mockResolvedValue(mockStats);

      const result = await service.getStatistics();

      expect(result).toEqual(mockStats);
      expect(webhookRepository.getStatistics).toHaveBeenCalledWith('week');
    });
  });

  describe('cleanupOldDeliveries', () => {
    it('should cleanup old deliveries', async () => {
      webhookRepository.cleanupOldDeliveries.mockResolvedValue(10);

      const result = await service.cleanupOldDeliveries(30);

      expect(result).toEqual({
        deleted: 10,
        message: 'Successfully deleted 10 old webhook deliveries older than 30 days',
      });
      expect(webhookRepository.cleanupOldDeliveries).toHaveBeenCalledWith(30);
      expect(auditLog.logEvent).toHaveBeenCalled();
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('system:admin');
    });

    it('should use default daysToKeep if not provided', async () => {
      webhookRepository.cleanupOldDeliveries.mockResolvedValue(25);

      const result = await service.cleanupOldDeliveries();

      expect(result).toEqual({
        deleted: 25,
        message: 'Successfully deleted 25 old webhook deliveries older than 90 days',
      });
      expect(webhookRepository.cleanupOldDeliveries).toHaveBeenCalledWith(90);
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.cleanupOldDeliveries()).rejects.toThrow(ForbiddenException);
    });
  });
});
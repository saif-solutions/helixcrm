import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from '@api/modules/webhooks/webhooks.service';
import { WebhookRepository } from '@api/modules/webhooks/repositories/webhook.repository';
import { TenantContextService } from '@api/shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '@api/shared/permissions/context/permission-context.service';
import { AuditLogService } from '@api/shared/audit-log/audit-log.service';
import { PrismaService } from '@api/shared/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

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

const mockPermissionContext = {
  hasPermission: jest.fn(),
};

const mockWebhookQueue: Partial<Queue> = {
  add: jest.fn(),
};

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

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
  deletedBy: null,
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
  errorMessage: null,
  webhook: createMockWebhook(),
  organizationId: 'org-123',
  nextAttemptAt: null,
  deliveredAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ============================================================================
// TEST SUITE
// ============================================================================

describe('WebhooksService', () => {
  let service: WebhooksService;
  let webhookRepository: typeof mockWebhookRepository;
  let _tenantContext: typeof mockTenantContext;
  let permissionContext: typeof mockPermissionContext;
  let _auditLog: typeof mockAuditLogService;
  let _prisma: typeof mockPrismaService;
  let webhookQueue: Partial<Queue>;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Configure default mock behaviors
    mockPermissionContext.hasPermission.mockReturnValue(true);
    mockPrismaService.user.findUnique.mockResolvedValue({ email: 'test@example.com' });

    // Create test module with both possible queue token formats for maximum compatibility
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WebhookRepository, useValue: mockWebhookRepository },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: PermissionContextService, useValue: mockPermissionContext },
        { provide: AuditLogService, useValue: mockAuditLogService },
        // Primary token format
        {
          provide: getQueueToken('webhook-queue'),
          useValue: mockWebhookQueue,
        },
        // Fallback token format (for backward compatibility)
        {
          provide: 'BullQueue_webhook-queue',
          useValue: mockWebhookQueue,
        },
      ],
    }).compile();

    // Resolve dependencies
    service = module.get<WebhooksService>(WebhooksService);
    webhookRepository = module.get(WebhookRepository);
    _tenantContext = module.get(TenantContextService);
    permissionContext = module.get(PermissionContextService);
    _auditLog = module.get(AuditLogService);
    _prisma = module.get(PrismaService);

    // Safely resolve queue with fallback
    try {
      webhookQueue = module.get(getQueueToken('webhook-queue'));
    } catch {
      webhookQueue = module.get('BullQueue_webhook-queue');
    }
  });

  // ============================================================================
  // CREATE WEBHOOK TESTS
  // ============================================================================

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
        createdAt: mockWebhook.createdAt,
        updatedAt: mockWebhook.updatedAt,
      });
      expect(webhookRepository.findByName).toHaveBeenCalledTimes(1);
      expect(webhookRepository.findByName).toHaveBeenCalledWith('New Webhook');
      expect(webhookRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should generate a secret if not provided', async () => {
      const dtoWithoutSecret = { ...createDto, secret: undefined };
      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.create.mockResolvedValue(mockWebhook);

      await service.createWebhook(dtoWithoutSecret);

      expect(webhookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          secret: expect.any(String),
        }),
      );
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

      expect(webhookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          retryCount: 3,
          timeoutMs: 10000,
          headers: {},
        }),
      );
    });

    it('should throw ConflictException if webhook name already exists', async () => {
      webhookRepository.findByName.mockResolvedValue(createMockWebhook());

      await expect(service.createWebhook(createDto)).rejects.toMatchObject({
        name: 'ConflictException',
        message: expect.stringContaining('already exists'),
      });
      expect(webhookRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if URL is invalid', async () => {
      const invalidDto = { ...createDto, url: 'not-a-url' };

      await expect(service.createWebhook(invalidDto)).rejects.toMatchObject({
        name: 'BadRequestException',
        message: expect.stringContaining('Invalid webhook URL'),
      });
    });

    it('should check permission before creating', async () => {
      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.create.mockResolvedValue(mockWebhook);

      await service.createWebhook(createDto);

      expect(permissionContext.hasPermission).toHaveBeenCalledTimes(1);
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:manage');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.createWebhook(createDto)).rejects.toMatchObject({
        name: 'ForbiddenException',
        message: expect.stringContaining('Insufficient permissions'),
      });
    });
  });

  // ============================================================================
  // UPDATE WEBHOOK TESTS
  // ============================================================================

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
        createdAt: updatedWebhook.createdAt,
        updatedAt: updatedWebhook.updatedAt,
      });
      expect(webhookRepository.update).toHaveBeenCalledTimes(1);
      expect(webhookRepository.update).toHaveBeenCalledWith('webhook-123', updateDto);
    });

    it('should throw NotFoundException if webhook not found', async () => {
      webhookRepository.findById.mockResolvedValue(null);

      await expect(service.updateWebhook('webhook-123', updateDto)).rejects.toMatchObject({
        name: 'NotFoundException',
        message: expect.stringContaining('not found'),
      });
    });

    it('should throw ConflictException if new name already exists', async () => {
      webhookRepository.findByName.mockResolvedValue({
        id: 'another-webhook',
        name: 'Updated Webhook',
      });

      await expect(
        service.updateWebhook('webhook-123', { name: 'Updated Webhook' }),
      ).rejects.toMatchObject({
        name: 'ConflictException',
        message: expect.stringContaining('already exists'),
      });
    });

    it('should validate URL if provided', async () => {
      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.update.mockResolvedValue(updatedWebhook);

      await service.updateWebhook('webhook-123', { url: 'https://valid.com/webhook' });

      expect(webhookRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if URL is invalid', async () => {
      await expect(service.updateWebhook('webhook-123', { url: 'invalid' })).rejects.toMatchObject({
        name: 'BadRequestException',
        message: expect.stringContaining('Invalid webhook URL'),
      });
    });

    it('should check permission before updating', async () => {
      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.update.mockResolvedValue(updatedWebhook);

      await service.updateWebhook('webhook-123', updateDto);

      expect(permissionContext.hasPermission).toHaveBeenCalledTimes(1);
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:manage');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.updateWebhook('webhook-123', updateDto)).rejects.toMatchObject({
        name: 'ForbiddenException',
        message: expect.stringContaining('Insufficient permissions'),
      });
    });
  });

  // ============================================================================
  // DELETE WEBHOOK TESTS
  // ============================================================================

  describe('deleteWebhook', () => {
    const mockWebhook = createMockWebhook();

    beforeEach(() => {
      webhookRepository.findById.mockResolvedValue(mockWebhook);
    });

    it('should successfully delete a webhook', async () => {
      const result = await service.deleteWebhook('webhook-123');

      expect(result).toEqual({ message: 'Webhook deleted successfully' });
      expect(webhookRepository.delete).toHaveBeenCalledTimes(1);
      expect(webhookRepository.delete).toHaveBeenCalledWith('webhook-123');
    });

    it('should throw NotFoundException if webhook not found', async () => {
      webhookRepository.findById.mockResolvedValue(null);

      await expect(service.deleteWebhook('webhook-123')).rejects.toMatchObject({
        name: 'NotFoundException',
        message: expect.stringContaining('not found'),
      });
    });

    it('should check permission before deleting', async () => {
      await service.deleteWebhook('webhook-123');

      expect(permissionContext.hasPermission).toHaveBeenCalledTimes(1);
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:manage');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.deleteWebhook('webhook-123')).rejects.toMatchObject({
        name: 'ForbiddenException',
        message: expect.stringContaining('Insufficient permissions'),
      });
    });
  });

  // ============================================================================
  // GET ALL WEBHOOKS TESTS
  // ============================================================================

  describe('getAllWebhooks', () => {
    const mockWebhooks = [
      createMockWebhook({ id: 'webhook-1', name: 'Webhook 1' }),
      createMockWebhook({ id: 'webhook-2', name: 'Webhook 2' }),
    ];

    it('should return all webhooks without secrets', async () => {
      webhookRepository.findAll.mockResolvedValue(mockWebhooks);

      const result = await service.getAllWebhooks();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: mockWebhooks[0].id,
        name: mockWebhooks[0].name,
        url: mockWebhooks[0].url,
        events: mockWebhooks[0].events,
        isActive: mockWebhooks[0].isActive,
        retryCount: mockWebhooks[0].retryCount,
        timeoutMs: mockWebhooks[0].timeoutMs,
        headers: mockWebhooks[0].headers,
        createdAt: mockWebhooks[0].createdAt,
        updatedAt: mockWebhooks[0].updatedAt,
      });
      expect(webhookRepository.findAll).toHaveBeenCalledTimes(1);
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:read');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.getAllWebhooks()).rejects.toMatchObject({
        name: 'ForbiddenException',
        message: expect.stringContaining('Insufficient permissions'),
      });
    });
  });

  // ============================================================================
  // GET WEBHOOK BY ID TESTS
  // ============================================================================

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
        createdAt: mockWebhook.createdAt,
        updatedAt: mockWebhook.updatedAt,
      });
      expect(webhookRepository.findById).toHaveBeenCalledTimes(1);
      expect(webhookRepository.findById).toHaveBeenCalledWith('webhook-123');
    });

    it('should throw NotFoundException if webhook not found', async () => {
      webhookRepository.findById.mockResolvedValue(null);

      await expect(service.getWebhookById('webhook-123')).rejects.toMatchObject({
        name: 'NotFoundException',
        message: expect.stringContaining('not found'),
      });
    });

    it('should check permission before fetching', async () => {
      webhookRepository.findById.mockResolvedValue(mockWebhook);

      await service.getWebhookById('webhook-123');

      expect(permissionContext.hasPermission).toHaveBeenCalledTimes(1);
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:read');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.getWebhookById('webhook-123')).rejects.toMatchObject({
        name: 'ForbiddenException',
        message: expect.stringContaining('Insufficient permissions'),
      });
    });
  });

  // ============================================================================
  // TRIGGER WEBHOOK TESTS
  // ============================================================================

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
      expect(result).toHaveProperty('estimatedDeliveryTime');
      expect(webhookRepository.createDelivery).toHaveBeenCalledTimes(1);
      expect(webhookQueue.add).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if webhook not found', async () => {
      webhookRepository.findById.mockResolvedValue(null);

      await expect(service.triggerWebhook('webhook-123', payload)).rejects.toMatchObject({
        name: 'NotFoundException',
        message: expect.stringContaining('not found'),
      });
    });

    it('should throw ConflictException if webhook is inactive', async () => {
      webhookRepository.findById.mockResolvedValue({ ...mockWebhook, isActive: false });

      await expect(service.triggerWebhook('webhook-123', payload)).rejects.toMatchObject({
        name: 'ConflictException',
        message: expect.stringContaining('not active'),
      });
    });

    it('should throw BadRequestException if event not subscribed', async () => {
      webhookRepository.findById.mockResolvedValue({ ...mockWebhook, events: ['different.event'] });

      await expect(service.triggerWebhook('webhook-123', payload)).rejects.toMatchObject({
        name: 'BadRequestException',
        message: expect.stringContaining('not subscribed'),
      });
    });

    it('should check permission before triggering', async () => {
      await service.triggerWebhook('webhook-123', payload);

      expect(permissionContext.hasPermission).toHaveBeenCalledTimes(1);
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:trigger');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.triggerWebhook('webhook-123', payload)).rejects.toMatchObject({
        name: 'ForbiddenException',
        message: expect.stringContaining('Insufficient permissions'),
      });
    });
  });

  // ============================================================================
  // GET DELIVERY HISTORY TESTS
  // ============================================================================

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
      expect(webhookRepository.findDeliveries).toHaveBeenCalledTimes(1);
      expect(webhookRepository.findDeliveries).toHaveBeenCalledWith('webhook-123', 1, 10);
      expect(webhookRepository.countDeliveries).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if webhook not found', async () => {
      webhookRepository.findById.mockResolvedValue(null);

      await expect(service.getDeliveryHistory('webhook-123', 1, 10)).rejects.toMatchObject({
        name: 'NotFoundException',
        message: expect.stringContaining('not found'),
      });
    });

    it('should check permission before fetching', async () => {
      webhookRepository.findDeliveries.mockResolvedValue([]);
      webhookRepository.countDeliveries.mockResolvedValue(0);

      await service.getDeliveryHistory('webhook-123', 1, 10);

      expect(permissionContext.hasPermission).toHaveBeenCalledTimes(1);
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:read');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.getDeliveryHistory('webhook-123', 1, 10)).rejects.toMatchObject({
        name: 'ForbiddenException',
        message: expect.stringContaining('Insufficient permissions'),
      });
    });
  });

  // ============================================================================
  // GET DELIVERY STATUS TESTS
  // ============================================================================

  describe('getDeliveryStatus', () => {
    const mockDelivery = createMockDelivery();

    it('should return delivery status', async () => {
      webhookRepository.findDeliveryById.mockResolvedValue(mockDelivery);

      const result = await service.getDeliveryStatus('delivery-123');

      expect(result).toMatchObject({
        id: mockDelivery.id,
        webhookId: mockDelivery.webhookId,
        event: mockDelivery.event,
      });
      expect(webhookRepository.findDeliveryById).toHaveBeenCalledTimes(1);
      expect(webhookRepository.findDeliveryById).toHaveBeenCalledWith('delivery-123');
    });

    it('should throw NotFoundException if delivery not found', async () => {
      webhookRepository.findDeliveryById.mockResolvedValue(null);

      await expect(service.getDeliveryStatus('delivery-123')).rejects.toMatchObject({
        name: 'NotFoundException',
        message: expect.stringContaining('not found'),
      });
    });

    it('should check permission before fetching', async () => {
      webhookRepository.findDeliveryById.mockResolvedValue(mockDelivery);

      await service.getDeliveryStatus('delivery-123');

      expect(permissionContext.hasPermission).toHaveBeenCalledTimes(1);
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:read');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.getDeliveryStatus('delivery-123')).rejects.toMatchObject({
        name: 'ForbiddenException',
        message: expect.stringContaining('Insufficient permissions'),
      });
    });
  });

  // ============================================================================
  // RETRY DELIVERY TESTS
  // ============================================================================

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
      const updatedDelivery = {
        ...mockDelivery,
        status: 'pending',
        retryCount: 3,
      };
      webhookRepository.updateDelivery.mockResolvedValue(updatedDelivery);

      const result = await service.retryDelivery('delivery-123');

      expect(result).toEqual({
        deliveryId: updatedDelivery.id,
        message: 'Delivery retry queued successfully',
        retryCount: updatedDelivery.retryCount,
      });
      expect(webhookRepository.updateDelivery).toHaveBeenCalledTimes(1);
      expect(webhookQueue.add).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if delivery not found', async () => {
      webhookRepository.findDeliveryById.mockResolvedValue(null);

      await expect(service.retryDelivery('delivery-123')).rejects.toMatchObject({
        name: 'NotFoundException',
        message: expect.stringContaining('not found'),
      });
    });

    it('should throw ConflictException if delivery status is not failed', async () => {
      webhookRepository.findDeliveryById.mockResolvedValue({ ...mockDelivery, status: 'success' });

      await expect(service.retryDelivery('delivery-123')).rejects.toMatchObject({
        name: 'ConflictException',
        message: expect.stringContaining('Cannot retry delivery with status: success'),
      });
    });

    it('should throw ConflictException if max retries reached', async () => {
      webhookRepository.findDeliveryById.mockResolvedValue({
        ...mockDelivery,
        retryCount: 5,
        webhook: createMockWebhook({ retryCount: 5 }),
      });

      await expect(service.retryDelivery('delivery-123')).rejects.toMatchObject({
        name: 'ConflictException',
        message: expect.stringContaining('Maximum retry attempts reached'),
      });
    });

    it('should check permission before retrying', async () => {
      webhookRepository.updateDelivery.mockResolvedValue(mockDelivery);

      await service.retryDelivery('delivery-123');

      expect(permissionContext.hasPermission).toHaveBeenCalledTimes(1);
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:manage');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.retryDelivery('delivery-123')).rejects.toMatchObject({
        name: 'ForbiddenException',
        message: expect.stringContaining('Insufficient permissions'),
      });
    });
  });

  // ============================================================================
  // GET STATISTICS TESTS
  // ============================================================================

  describe('getStatistics', () => {
    const mockStats = {
      timeframe: 'week' as const,
      total: 100,
      byStatus: { success: 85, failed: 10, pending: 5 },
      avgResponseTime: 250,
      successRate: 85,
    };

    it('should return webhook statistics', async () => {
      webhookRepository.getStatistics.mockResolvedValue(mockStats);

      const result = await service.getStatistics('week');

      expect(result).toEqual({
        timeframe: 'week',
        total: 100,
        success: 85,
        failed: 10,
        pending: 5,
        avgResponseTime: 250,
        successRate: 85,
      });
      expect(webhookRepository.getStatistics).toHaveBeenCalledTimes(1);
      expect(webhookRepository.getStatistics).toHaveBeenCalledWith('week');
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('webhook:read');
    });

    it('should use default timeframe if not provided', async () => {
      webhookRepository.getStatistics.mockResolvedValue(mockStats);

      const result = await service.getStatistics();

      expect(result).toBeDefined();
      expect(webhookRepository.getStatistics).toHaveBeenCalledTimes(1);
      expect(webhookRepository.getStatistics).toHaveBeenCalledWith('week');
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.getStatistics()).rejects.toMatchObject({
        name: 'ForbiddenException',
        message: expect.stringContaining('Insufficient permissions'),
      });
    });
  });

  // ============================================================================
  // CLEANUP OLD DELIVERIES TESTS
  // ============================================================================

  describe('cleanupOldDeliveries', () => {
    it('should cleanup old deliveries', async () => {
      webhookRepository.cleanupOldDeliveries.mockResolvedValue({ count: 10 });

      const result = await service.cleanupOldDeliveries(30);

      expect(result).toEqual({
        deleted: 10,
        message: 'Successfully deleted 10 old webhook deliveries older than 30 days',
      });
      expect(webhookRepository.cleanupOldDeliveries).toHaveBeenCalledTimes(1);
      expect(webhookRepository.cleanupOldDeliveries).toHaveBeenCalledWith(30);
      expect(permissionContext.hasPermission).toHaveBeenCalledWith('system:admin');
    });

    it('should use default daysToKeep if not provided', async () => {
      webhookRepository.cleanupOldDeliveries.mockResolvedValue({ count: 25 });

      const result = await service.cleanupOldDeliveries();

      expect(result).toEqual({
        deleted: 25,
        message: 'Successfully deleted 25 old webhook deliveries older than 90 days',
      });
      expect(webhookRepository.cleanupOldDeliveries).toHaveBeenCalledTimes(1);
      expect(webhookRepository.cleanupOldDeliveries).toHaveBeenCalledWith(90);
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      permissionContext.hasPermission.mockReturnValue(false);

      await expect(service.cleanupOldDeliveries()).rejects.toMatchObject({
        name: 'ForbiddenException',
        message: expect.stringContaining('Insufficient permissions'),
      });
    });
  });
});

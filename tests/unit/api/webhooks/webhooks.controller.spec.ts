import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from '@api/modules/webhooks/webhooks.controller';
import { WebhooksService } from '@api/modules/webhooks/webhooks.service';

// Mock the guards
jest.mock('../../../src/shared/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../../../src/shared/guards/tenant.guard', () => ({
  TenantGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../../../src/shared/guards/permission.guard', () => ({
  PermissionGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

// Mock service
const mockWebhooksService = {
  createWebhook: jest.fn(),
  getAllWebhooks: jest.fn(),
  getWebhookById: jest.fn(),
  updateWebhook: jest.fn(),
  deleteWebhook: jest.fn(),
  triggerWebhook: jest.fn(),
  getDeliveryHistory: jest.fn(),
  getDeliveryStatus: jest.fn(),
  retryDelivery: jest.fn(),
  getStatistics: jest.fn(),
  cleanupOldDeliveries: jest.fn(),
};

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let webhooksService: typeof mockWebhooksService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: WebhooksService, useValue: mockWebhooksService },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    webhooksService = module.get(WebhooksService);
  });

  describe('createWebhook', () => {
    const createDto = {
      name: 'Test Webhook',
      url: 'https://example.com/webhook',
      events: ['deal.created', 'deal.updated'],
      secret: 'test-secret',
      isActive: true,
      retryCount: 3,
      timeoutMs: 10000,
      headers: { 'X-Custom': 'test' },
    };

    const mockResult = { id: 'webhook-123', ...createDto };

    it('should successfully create a webhook', async () => {
      webhooksService.createWebhook.mockResolvedValue(mockResult);

      const result = await controller.createWebhook(createDto);

      expect(result).toEqual(mockResult);
      expect(webhooksService.createWebhook).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getAllWebhooks', () => {
    const mockWebhooks = [
      { id: 'webhook-1', name: 'Webhook 1' },
      { id: 'webhook-2', name: 'Webhook 2' },
    ];

    it('should return all webhooks', async () => {
      webhooksService.getAllWebhooks.mockResolvedValue(mockWebhooks);

      const result = await controller.getAllWebhooks();

      expect(result).toEqual(mockWebhooks);
      expect(webhooksService.getAllWebhooks).toHaveBeenCalled();
    });
  });

  describe('getWebhookById', () => {
    const webhookId = 'webhook-123';
    const mockWebhook = { id: webhookId, name: 'Test Webhook' };

    it('should return webhook by id', async () => {
      webhooksService.getWebhookById.mockResolvedValue(mockWebhook);

      const result = await controller.getWebhookById(webhookId);

      expect(result).toEqual(mockWebhook);
      expect(webhooksService.getWebhookById).toHaveBeenCalledWith(webhookId);
    });
  });

  describe('updateWebhook', () => {
    const webhookId = 'webhook-123';
    const updateDto = { name: 'Updated Webhook', isActive: false };
    const mockResult = { id: webhookId, ...updateDto };

    it('should successfully update a webhook', async () => {
      webhooksService.updateWebhook.mockResolvedValue(mockResult);

      const result = await controller.updateWebhook(webhookId, updateDto);

      expect(result).toEqual(mockResult);
      expect(webhooksService.updateWebhook).toHaveBeenCalledWith(webhookId, updateDto);
    });
  });

  describe('deleteWebhook', () => {
    const webhookId = 'webhook-123';
    const mockResult = { message: 'Webhook deleted successfully' };

    it('should successfully delete a webhook', async () => {
      webhooksService.deleteWebhook.mockResolvedValue(mockResult);

      const result = await controller.deleteWebhook(webhookId);

      expect(result).toEqual(mockResult);
      expect(webhooksService.deleteWebhook).toHaveBeenCalledWith(webhookId);
    });
  });

  describe('triggerWebhook', () => {
    const webhookId = 'webhook-123';
    const payload = {
      event: 'deal.created',
      data: { dealId: 'deal-123' },
      timestamp: new Date(),
    };
    const mockResult = { deliveryId: 'delivery-123', message: 'Webhook triggered' };

    it('should successfully trigger a webhook', async () => {
      webhooksService.triggerWebhook.mockResolvedValue(mockResult);

      const result = await controller.triggerWebhook(webhookId, payload);

      expect(result).toEqual(mockResult);
      expect(webhooksService.triggerWebhook).toHaveBeenCalledWith(webhookId, payload);
    });
  });

  describe('getDeliveryHistory', () => {
    const webhookId = 'webhook-123';
    const mockHistory = {
      data: [
        { id: 'delivery-1', status: 'success' },
        { id: 'delivery-2', status: 'failed' },
      ],
      meta: { page: 1, limit: 20, total: 2, pages: 1, hasMore: false },
    };

    it('should return delivery history with default pagination', async () => {
      webhooksService.getDeliveryHistory.mockResolvedValue(mockHistory);

      const result = await controller.getDeliveryHistory(webhookId, 1, 20);

      expect(result).toEqual(mockHistory);
      expect(webhooksService.getDeliveryHistory).toHaveBeenCalledWith(webhookId, 1, 20);
    });

    it('should clamp limit to max 100', async () => {
      webhooksService.getDeliveryHistory.mockResolvedValue(mockHistory);

      await controller.getDeliveryHistory(webhookId, 1, 200);

      expect(webhooksService.getDeliveryHistory).toHaveBeenCalledWith(webhookId, 1, 100);
    });

    it('should ensure page is at least 1', async () => {
      webhooksService.getDeliveryHistory.mockResolvedValue(mockHistory);

      await controller.getDeliveryHistory(webhookId, 0, 20);

      expect(webhooksService.getDeliveryHistory).toHaveBeenCalledWith(webhookId, 1, 20);
    });
  });

  describe('getDeliveryStatus', () => {
    const deliveryId = 'delivery-123';
    const mockDelivery = { id: deliveryId, status: 'success' };

    it('should return delivery status', async () => {
      webhooksService.getDeliveryStatus.mockResolvedValue(mockDelivery);

      const result = await controller.getDeliveryStatus(deliveryId);

      expect(result).toEqual(mockDelivery);
      expect(webhooksService.getDeliveryStatus).toHaveBeenCalledWith(deliveryId);
    });
  });

  describe('retryDelivery', () => {
    const deliveryId = 'delivery-123';
    const mockResult = { deliveryId, message: 'Retry queued' };

    it('should retry a failed delivery', async () => {
      webhooksService.retryDelivery.mockResolvedValue(mockResult);

      const result = await controller.retryDelivery(deliveryId);

      expect(result).toEqual(mockResult);
      expect(webhooksService.retryDelivery).toHaveBeenCalledWith(deliveryId);
    });
  });

  describe('getStatistics', () => {
    const mockStats = {
      totalWebhooks: 5,
      activeWebhooks: 4,
      totalDeliveries: 100,
      successRate: 85,
    };

    it('should return statistics with default timeframe', async () => {
      webhooksService.getStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics();

      expect(result).toEqual(mockStats);
      expect(webhooksService.getStatistics).toHaveBeenCalledWith('week');
    });

    it('should return statistics with specified timeframe', async () => {
      webhooksService.getStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics('day');

      expect(result).toEqual(mockStats);
      expect(webhooksService.getStatistics).toHaveBeenCalledWith('day');
    });
  });

  describe('cleanupOldDeliveries', () => {
    const mockResult = { deleted: 10, message: 'Cleanup completed' };

    it('should cleanup old deliveries with default days', async () => {
      webhooksService.cleanupOldDeliveries.mockResolvedValue(mockResult);

      const result = await controller.cleanupOldDeliveries();

      expect(result).toEqual(mockResult);
      expect(webhooksService.cleanupOldDeliveries).toHaveBeenCalledWith(90);
    });

    it('should cleanup old deliveries with specified days', async () => {
      webhooksService.cleanupOldDeliveries.mockResolvedValue(mockResult);

      const result = await controller.cleanupOldDeliveries(30);

      expect(result).toEqual(mockResult);
      expect(webhooksService.cleanupOldDeliveries).toHaveBeenCalledWith(30);
    });
  });
});
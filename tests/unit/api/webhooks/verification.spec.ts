// Updated verification.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from '@api/modules/webhooks/webhooks.service';
import { WebhookRepository } from '@api/modules/webhooks/repositories/webhook.repository';
import { TenantContextService } from '@api/shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '@api/shared/permissions/context/permission-context.service';
import { AuditLogService } from '@api/shared/audit-log/audit-log.service';
import { PrismaService } from '@api/shared/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('Webhook Module Verification', () => {
  let webhooksService: WebhooksService;

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
            getTenantId: () => 'test-tenant',
            getUserId: () => 'test-user',
          },
        },
        {
          provide: PermissionContextService,
          useValue: {
            hasPermission: () => true,
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
              findUnique: jest
                .fn()
                .mockResolvedValue({ email: 'test@example.com' }),
            },
          },
        },
        {
          provide: getQueueToken('webhook-queue'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    webhooksService = module.get<WebhooksService>(WebhooksService);
  });

  it('should be defined', () => {
    expect(webhooksService).toBeDefined();
  });

  it('should have all required methods', () => {
    expect(webhooksService.createWebhook).toBeDefined();
    expect(webhooksService.getAllWebhooks).toBeDefined();
    expect(webhooksService.getWebhookById).toBeDefined();
    expect(webhooksService.updateWebhook).toBeDefined();
    expect(webhooksService.deleteWebhook).toBeDefined();
    expect(webhooksService.triggerWebhook).toBeDefined();
    expect(webhooksService.getDeliveryHistory).toBeDefined();
    expect(webhooksService.getDeliveryStatus).toBeDefined();
    expect(webhooksService.retryDelivery).toBeDefined();
    expect(webhooksService.getStatistics).toBeDefined();
    expect(webhooksService.cleanupOldDeliveries).toBeDefined();
  });
});

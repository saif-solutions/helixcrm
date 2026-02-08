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
      };

      webhookRepository.findByName.mockResolvedValue(null);
      webhookRepository.create.mockResolvedValue(mockWebhook);

      const result = await service.createWebhook(createDto);

      expect(webhookRepository.create).toHaveBeenCalled();
      expect(result).not.toHaveProperty('secret');
      expect(auditLogService.logEvent).toHaveBeenCalled();
    });
  });
});

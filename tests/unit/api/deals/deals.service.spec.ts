import { Test, TestingModule } from '@nestjs/testing';
import { DealsService } from '@api/modules/deals/deals.service';
import { PrismaService } from '@api/shared/prisma/prisma.service';
import { AppLogger } from '@api/shared/logging/logger.service';
import { AuditLogService } from '@api/shared/audit-log/audit-log.service';
import { DealRepository } from '@api/modules/deals/repositories/deal.repository';
import { PermissionContextService } from '@api/shared/permissions/context/permission-context.service';
import { TenantContextService } from '@api/shared/tenant/context/tenant-context.service';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DealStatus } from '@prisma/client';

// Mock implementations
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
  pipeline: {
    findFirst: jest.fn(),
  },
  pipelineStage: {
    findFirst: jest.fn(),
  },
  contact: {
    findFirst: jest.fn(),
  },
  deal: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaService)),
  dealStageHistory: {
    create: jest.fn(),
  },
};

const mockDealRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  getStageHistory: jest.fn(),
  getDealStats: jest.fn(),
  getPipelinePerformance: jest.fn(),
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockAuditLogService = {
  logEvent: jest.fn(),
};

const mockPermissionContext = {
  hasPermission: jest.fn().mockReturnValue(true),
};

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue('org-123'),
  getUserId: jest.fn().mockReturnValue('user-123'),
};

// Complete mock deal data
const createMockDeal = (overrides = {}) => ({
  id: 'deal-123',
  name: 'Test Deal',
  amount: 10000,
  currency: 'USD',
  status: DealStatus.open,
  stageId: 'stage-123',
  pipelineId: 'pipeline-123',
  probability: 50,
  expectedCloseDate: new Date('2025-12-31'),
  contactId: 'contact-123',
  accountId: null,
  ownerUserId: 'user-123',
  organizationId: 'org-123',
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  deletedBy: null,
  stage: {
    id: 'stage-123',
    name: 'Qualification',
    order: 1,
    probability: 50,
  },
  pipeline: {
    id: 'pipeline-123',
    name: 'Default Pipeline',
  },
  ...overrides,
});

describe('DealsService', () => {
  let service: DealsService;
  let prisma: typeof mockPrismaService;
  let dealRepository: typeof mockDealRepository;
  let tenantContext: typeof mockTenantContext;
  let auditLog: typeof mockAuditLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AppLogger, useValue: mockLogger },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: DealRepository, useValue: mockDealRepository },
        { provide: PermissionContextService, useValue: mockPermissionContext },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    service = module.get<DealsService>(DealsService);
    prisma = module.get(PrismaService);
    dealRepository = module.get(DealRepository);
    tenantContext = module.get(TenantContextService);
    auditLog = module.get(AuditLogService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDealDto = {
      name: 'New Deal',
      amount: 5000,
      pipelineId: 'pipeline-123',
      stageId: 'stage-123',
      contactId: 'contact-123',
      currency: 'USD',
    };

    const mockDeal = createMockDeal({
      name: 'Simple Deal', // This will be transformed to title
      amount: 5000, // This will be transformed to value
    });

    beforeEach(() => {
      prisma.pipeline.findFirst.mockResolvedValue({
        id: 'pipeline-123',
        stages: [{ id: 'stage-123', probability: 50 }],
      });
      prisma.contact.findFirst.mockResolvedValue({ id: 'contact-123' });
      prisma.deal.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
    });

    it('should successfully create a deal', async () => {
      dealRepository.create.mockResolvedValue(mockDeal);

      const result = await service.create({ userId: 'user-123', ...createDealDto });

      expect(result).toEqual(mockDeal);
      expect(dealRepository.create).toHaveBeenCalled();
      expect(auditLog.logEvent).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if pipeline not found', async () => {
      prisma.pipeline.findFirst.mockResolvedValue(null);

      await expect(service.create({ userId: 'user-123', ...createDealDto })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if stage does not belong to pipeline', async () => {
      prisma.pipeline.findFirst.mockResolvedValue({
        id: 'pipeline-123',
        stages: [{ id: 'wrong-stage', probability: 50 }],
      });

      await expect(service.create({ userId: 'user-123', ...createDealDto })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if contact not found', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);

      await expect(service.create({ userId: 'user-123', ...createDealDto })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if deal with same name exists', async () => {
      prisma.deal.findFirst.mockResolvedValue({ id: 'existing-deal' });

      await expect(service.create({ userId: 'user-123', ...createDealDto })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('createSimple', () => {
    const createSimpleDto = {
      title: 'Simple Deal',
      value: 5000,
      stageId: 'stage-123',
      contactId: 'contact-123',
      accountId: 'account-123',
      currency: 'USD',
    };

    const mockDeal = createMockDeal();

    beforeEach(() => {
      // Mock getOrCreateDefaultPipeline to return a pipeline with stages
      prisma.pipeline.findFirst
        .mockResolvedValueOnce(null) // First call: no pipeline exists
        .mockResolvedValueOnce({
          // Second call: after creation
          id: 'pipeline-123',
          name: 'Default Sales Pipeline',
          stages: [{ id: 'stage-123', name: 'Qualification', order: 1, probability: 10 }],
        });

      // Mock pipelineStage.findFirst to return the stage
      prisma.pipelineStage.findFirst.mockResolvedValue({
        id: 'stage-123',
        name: 'Qualification',
        order: 1,
        probability: 10,
        pipelineId: 'pipeline-123',
      });

      // Mock transaction for pipeline creation
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          pipeline: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'pipeline-123',
              name: 'Default Sales Pipeline',
              stages: [{ id: 'stage-123', name: 'Qualification', order: 1, probability: 10 }],
            }),
          },
        };
        return callback(tx);
      });

      prisma.deal.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
      dealRepository.create.mockResolvedValue(mockDeal);
    });

    it('should successfully create a simple deal', async () => {
      // Mock the repository to return a deal that will be transformed
      const repositoryDeal = createMockDeal({
        name: 'Simple Deal', // This will become 'title'
        amount: 5000, // This will become 'value'
      });
      dealRepository.create.mockResolvedValue(repositoryDeal);

      const result = await service.createSimple({ userId: 'user-123', ...createSimpleDto });

      // The service transforms the response, so we need to check the transformed properties
      expect(result).toHaveProperty('id', repositoryDeal.id);
      expect(result).toHaveProperty('title', 'Simple Deal');
      expect(result).toHaveProperty('value', 5000);
      expect(result).not.toHaveProperty('name'); // Original property should be removed
      expect(result).not.toHaveProperty('amount'); // Original property should be removed
      expect(dealRepository.create).toHaveBeenCalled();
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw BadRequestException if stage not found', async () => {
      prisma.pipelineStage.findFirst.mockResolvedValue(null);

      await expect(
        service.createSimple({ userId: 'user-123', ...createSimpleDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if deal with same title exists', async () => {
      prisma.deal.findFirst.mockResolvedValue({ id: 'existing-deal' });

      await expect(
        service.createSimple({ userId: 'user-123', ...createSimpleDto }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    const mockDeals = [
      createMockDeal({ id: 'deal-1', name: 'Deal 1' }),
      createMockDeal({ id: 'deal-2', name: 'Deal 2' }),
    ];

    it('should return paginated deals', async () => {
      dealRepository.findAll.mockResolvedValue(mockDeals);
      dealRepository.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockDeals,
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should apply search filter', async () => {
      const query = { page: 1, limit: 10, search: 'test' };
      dealRepository.findAll.mockResolvedValue([]);
      dealRepository.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(dealRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
        orderBy: { createdAt: 'desc' },
        includeDeleted: false,
      });
    });
  });

  describe('findOne', () => {
    const mockDeal = createMockDeal();

    it('should return deal if found', async () => {
      dealRepository.findById.mockResolvedValue(mockDeal);

      const result = await service.findOne('deal-123');

      expect(result).toEqual(mockDeal);
    });

    it('should throw NotFoundException if deal not found', async () => {
      dealRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('deal-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if deal belongs to different tenant', async () => {
      const wrongTenantDeal = createMockDeal({ organizationId: 'different-org' });
      dealRepository.findById.mockResolvedValue(wrongTenantDeal);

      await expect(service.findOne('deal-123')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Deal',
      amount: 15000,
    };

    const existingDeal = createMockDeal();
    const updatedDeal = createMockDeal({ name: 'Updated Deal', amount: 15000 });

    beforeEach(() => {
      dealRepository.findById.mockResolvedValue(existingDeal);
      prisma.pipeline.findFirst.mockResolvedValue({
        id: 'pipeline-123',
        stages: [{ id: 'stage-123', probability: 50 }],
      });
      prisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
      prisma.deal.findFirst.mockResolvedValue(null); // No duplicate name
    });

    it('should successfully update a deal', async () => {
      dealRepository.update.mockResolvedValue(updatedDeal);

      const result = await service.update('deal-123', updateDto, 'user-123');

      expect(result).toEqual(updatedDeal);
      expect(dealRepository.update).toHaveBeenCalledWith({
        id: 'deal-123',
        data: updateDto,
      });
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if deal not found', async () => {
      dealRepository.findById.mockResolvedValue(null);

      await expect(service.update('deal-123', updateDto, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if name already exists', async () => {
      prisma.deal.findFirst.mockResolvedValue({ id: 'another-deal' });

      await expect(
        service.update('deal-123', { name: 'Existing Name' }, 'user-123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    const mockDeal = createMockDeal();

    beforeEach(() => {
      dealRepository.findById.mockResolvedValue(mockDeal);
      prisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
    });

    it('should successfully soft delete a deal', async () => {
      dealRepository.softDelete.mockResolvedValue({ ...mockDeal, deletedAt: new Date() });

      const result = await service.remove('deal-123', 'user-123');

      expect(result).toEqual({ message: 'Deal deleted successfully' });
      expect(dealRepository.softDelete).toHaveBeenCalledWith('deal-123');
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if deal not found', async () => {
      dealRepository.findById.mockResolvedValue(null);

      await expect(service.remove('deal-123', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('moveStage', () => {
    const moveData = {
      stageId: 'stage-456',
      notes: 'Moving to next stage',
    };

    const mockDeal = createMockDeal({
      stage: { id: 'stage-123', name: 'Qualification' },
      pipeline: {
        stages: [
          { id: 'stage-123', name: 'Qualification' },
          { id: 'stage-456', name: 'Proposal', probability: 50 },
        ],
      },
    });

    beforeEach(() => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          deal: {
            findFirst: jest.fn().mockResolvedValue(mockDeal),
            update: jest.fn().mockResolvedValue({ ...mockDeal, stageId: 'stage-456' }),
          },
          dealStageHistory: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });
      prisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
    });

    it('should successfully move deal to another stage', async () => {
      const result = await service.moveStage('deal-123', moveData, 'user-123');

      expect(result).toBeDefined();
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw BadRequestException if moving to same stage', async () => {
      const sameStageData = { stageId: 'stage-123' };

      await expect(service.moveStage('deal-123', sameStageData, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStageHistory', () => {
    const mockHistory = [
      { id: 'history-1', fromStage: { name: 'Qualification' }, toStage: { name: 'Proposal' } },
    ];

    it('should return stage history', async () => {
      dealRepository.findById.mockResolvedValue(createMockDeal());
      dealRepository.getStageHistory.mockResolvedValue(mockHistory);

      const result = await service.getStageHistory('deal-123');

      expect(result).toEqual(mockHistory);
    });

    it('should throw NotFoundException if deal not found', async () => {
      dealRepository.findById.mockResolvedValue(null);

      await expect(service.getStageHistory('deal-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDealStats', () => {
    const mockStats = {
      totalCount: 10,
      totalValue: 100000,
      wonCount: 5,
      wonValue: 75000,
      lostCount: 3,
      openCount: 2,
      averageDealValue: 10000,
      winRate: 50,
    };

    it('should return deal statistics', async () => {
      dealRepository.getDealStats.mockResolvedValue(mockStats);

      const result = await service.getDealStats();

      expect(result).toEqual(mockStats);
    });
  });

  describe('getPipelinePerformance', () => {
    const mockPerformance = [
      { id: 'stage-1', name: 'Qualification', dealCount: 5, totalValue: 50000 },
      { id: 'stage-2', name: 'Proposal', dealCount: 3, totalValue: 30000 },
    ];

    it('should return pipeline performance', async () => {
      dealRepository.getPipelinePerformance.mockResolvedValue(mockPerformance);

      const result = await service.getPipelinePerformance('pipeline-123');

      expect(result).toEqual(mockPerformance);
    });
  });
});

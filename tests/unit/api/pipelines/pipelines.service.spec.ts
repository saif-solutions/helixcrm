import { Test, TestingModule } from '@nestjs/testing';
import { PipelinesService } from '@api/modules/pipelines/pipelines.service';
import { PrismaService } from '@api/shared/prisma/prisma.service';
import { AppLogger } from '@api/shared/logging/logger.service';
import { TenantContextService } from '@api/shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '@api/shared/permissions/context/permission-context.service';
import { AuditLogService } from '@api/shared/audit-log/audit-log.service';
import { PipelineRepository } from '@api/modules/pipelines/repositories/pipeline.repository';
import { NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';

// Mock implementations
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

const mockPipelineRepository = {
  findFirst: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  getDefaultPipeline: jest.fn(),
  findStageById: jest.fn(),
  findStageByOrder: jest.fn(),
  findStagesByPipeline: jest.fn(),
  createStage: jest.fn(),
  updateStage: jest.fn(),
  deleteStage: jest.fn(),
  transaction: jest.fn(),
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

// Complete mock pipeline data
const createMockPipeline = (overrides = {}) => ({
  id: 'pipeline-123',
  name: 'Sales Pipeline',
  description: 'Default sales pipeline',
  isDefault: false,
  organizationId: 'org-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  stages: [
    { id: 'stage-1', name: 'Qualification', order: 0, probability: 10, pipelineId: 'pipeline-123' },
    { id: 'stage-2', name: 'Proposal', order: 1, probability: 50, pipelineId: 'pipeline-123' },
  ],
  _count: { deals: 5 },
  ...overrides,
});

const createMockStage = (overrides = {}) => ({
  id: 'stage-123',
  name: 'Qualification',
  order: 0,
  probability: 10,
  pipelineId: 'pipeline-123',
  deletedAt: null,
  ...overrides,
});

describe('PipelinesService', () => {
  let service: PipelinesService;
  let prisma: typeof mockPrismaService;
  let pipelineRepository: typeof mockPipelineRepository;
  let tenantContext: typeof mockTenantContext;
  let auditLog: typeof mockAuditLogService;
  let permissionContext: typeof mockPermissionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelinesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AppLogger, useValue: mockLogger },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: PermissionContextService, useValue: mockPermissionContext },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: PipelineRepository, useValue: mockPipelineRepository },
      ],
    }).compile();

    service = module.get<PipelinesService>(PipelinesService);
    prisma = module.get(PrismaService);
    pipelineRepository = module.get(PipelineRepository);
    tenantContext = module.get(TenantContextService);
    auditLog = module.get(AuditLogService);
    permissionContext = module.get(PermissionContextService);

    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });
  });

  describe('create', () => {
    const createDto = {
      name: 'New Pipeline',
      description: 'Test pipeline',
      isDefault: false,
    };

    const mockPipeline = createMockPipeline({ name: 'New Pipeline' });

    it('should successfully create a pipeline', async () => {
      pipelineRepository.findFirst.mockResolvedValue(null);
      pipelineRepository.create.mockResolvedValue(mockPipeline);

      const result = await service.create(createDto);

      expect(result).toEqual(mockPipeline);
      expect(pipelineRepository.create).toHaveBeenCalledWith(createDto);
      expect(auditLog.logEvent).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should throw ConflictException if pipeline with same name exists', async () => {
      pipelineRepository.findFirst.mockResolvedValue(createMockPipeline());

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should unset other default pipelines when creating a default pipeline', async () => {
      const defaultDto = { ...createDto, isDefault: true };
      pipelineRepository.findFirst.mockResolvedValue(null);
      pipelineRepository.create.mockResolvedValue({ ...mockPipeline, isDefault: true });

      await service.create(defaultDto);

      expect(pipelineRepository.updateMany).toHaveBeenCalledWith(
        { isDefault: true },
        { isDefault: false }
      );
    });
  });

  describe('findAll', () => {
    const mockPipelines = [
      createMockPipeline({ id: 'pipeline-1', name: 'Pipeline 1' }),
      createMockPipeline({ id: 'pipeline-2', name: 'Pipeline 2' }),
    ];

    it('should return paginated pipelines', async () => {
      pipelineRepository.findMany.mockResolvedValue(mockPipelines);
      pipelineRepository.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockPipelines,
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should apply search filter', async () => {
      const query = { page: 1, limit: 10, search: 'sales' };
      pipelineRepository.findMany.mockResolvedValue([]);
      pipelineRepository.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(pipelineRepository.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
        skip: 0,
        take: 10,
        includeStages: true,
        includeDealCount: true,
      });
    });

    it('should filter by isDefault', async () => {
      const query = { page: 1, limit: 10, isDefault: true };
      pipelineRepository.findMany.mockResolvedValue([]);
      pipelineRepository.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(pipelineRepository.findMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        skip: 0,
        take: 10,
        includeStages: true,
        includeDealCount: true,
      });
    });
  });

  describe('findOne', () => {
    const mockPipeline = createMockPipeline();

    it('should return pipeline if found', async () => {
      pipelineRepository.findById.mockResolvedValue(mockPipeline);

      const result = await service.findOne('pipeline-123');

      expect(result).toEqual(mockPipeline);
    });

    it('should throw NotFoundException if pipeline not found', async () => {
      pipelineRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('pipeline-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Pipeline',
      description: 'Updated description',
      isDefault: true,
    };

    const existingPipeline = createMockPipeline();
    const updatedPipeline = createMockPipeline({
      name: 'Updated Pipeline',
      description: 'Updated description',
      isDefault: true,
    });

    beforeEach(() => {
      pipelineRepository.findById.mockResolvedValue(existingPipeline);
    });

    it('should successfully update a pipeline', async () => {
      pipelineRepository.update.mockResolvedValue(updatedPipeline);

      const result = await service.update('pipeline-123', updateDto);

      expect(result).toEqual(updatedPipeline);
      expect(pipelineRepository.update).toHaveBeenCalledWith('pipeline-123', updateDto);
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should unset other default pipelines when setting as default', async () => {
      pipelineRepository.update.mockResolvedValue(updatedPipeline);

      await service.update('pipeline-123', { isDefault: true });

      expect(pipelineRepository.updateMany).toHaveBeenCalledWith(
        { isDefault: true },
        { isDefault: false }
      );
    });

    it('should throw NotFoundException if pipeline not found', async () => {
      pipelineRepository.findById.mockResolvedValue(null);

      await expect(service.update('pipeline-123', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const mockPipeline = createMockPipeline();

    beforeEach(() => {
      pipelineRepository.findById.mockResolvedValue(mockPipeline);
    });

    it('should successfully delete a pipeline with no deals', async () => {
      const pipelineWithNoDeals = createMockPipeline({ _count: { deals: 0 } });
      pipelineRepository.findById.mockResolvedValue(pipelineWithNoDeals);
      pipelineRepository.findFirst.mockResolvedValue(null);

      await service.remove('pipeline-123');

      expect(pipelineRepository.delete).toHaveBeenCalledWith('pipeline-123');
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw ConflictException if pipeline has deals', async () => {
      const pipelineWithDeals = createMockPipeline({ _count: { deals: 5 } });
      pipelineRepository.findById.mockResolvedValue(pipelineWithDeals);

      await expect(service.remove('pipeline-123')).rejects.toThrow(ConflictException);
      expect(pipelineRepository.delete).not.toHaveBeenCalled();
    });

    it('should set another pipeline as default when deleting default pipeline', async () => {
      const defaultPipeline = createMockPipeline({ isDefault: true, _count: { deals: 0 } });
      const anotherPipeline = createMockPipeline({ id: 'pipeline-456' });
      
      pipelineRepository.findById.mockResolvedValue(defaultPipeline);
      pipelineRepository.findFirst.mockResolvedValue(anotherPipeline);

      await service.remove('pipeline-123');

      expect(pipelineRepository.update).toHaveBeenCalledWith('pipeline-456', { isDefault: true });
    });

    it('should throw NotFoundException if pipeline not found', async () => {
      pipelineRepository.findById.mockResolvedValue(null);

      await expect(service.remove('pipeline-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDefaultPipeline', () => {
    const mockPipeline = createMockPipeline({ isDefault: true });

    it('should return default pipeline', async () => {
      pipelineRepository.getDefaultPipeline.mockResolvedValue(mockPipeline);

      const result = await service.getDefaultPipeline();

      expect(result).toEqual(mockPipeline);
    });

    it('should throw NotFoundException if no default pipeline', async () => {
      pipelineRepository.getDefaultPipeline.mockResolvedValue(null);

      await expect(service.getDefaultPipeline()).rejects.toThrow(NotFoundException);
    });
  });

  describe('createStage', () => {
    const createStageDto = {
      name: 'New Stage',
      order: 2,
      probability: 75,
    };

    const mockPipeline = createMockPipeline();
    const mockStage = createMockStage({ name: 'New Stage', order: 2, probability: 75 });

    beforeEach(() => {
      pipelineRepository.findById.mockResolvedValue(mockPipeline);
    });

    it('should successfully create a stage', async () => {
      pipelineRepository.findStageByOrder.mockResolvedValue(null);
      pipelineRepository.createStage.mockResolvedValue(mockStage);

      const result = await service.createStage('pipeline-123', createStageDto);

      expect(result).toEqual(mockStage);
      expect(pipelineRepository.createStage).toHaveBeenCalledWith({
        ...createStageDto,
        pipelineId: 'pipeline-123',
      });
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if pipeline not found', async () => {
      pipelineRepository.findById.mockResolvedValue(null);

      await expect(service.createStage('pipeline-123', createStageDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if stage with same order exists', async () => {
      pipelineRepository.findStageByOrder.mockResolvedValue(createMockStage());

      await expect(service.createStage('pipeline-123', createStageDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStage', () => {
    const updateDto = {
      name: 'Updated Stage',
      order: 3,
      probability: 80,
    };

    const mockStage = createMockStage();
    const mockPipeline = createMockPipeline();

    beforeEach(() => {
      pipelineRepository.findStageById.mockResolvedValue({
        ...mockStage,
        pipeline: mockPipeline,
      });
    });

    it('should successfully update a stage', async () => {
      pipelineRepository.findStageByOrder.mockResolvedValue(null);
      pipelineRepository.updateStage.mockResolvedValue({ ...mockStage, ...updateDto });

      const result = await service.updateStage('stage-123', updateDto);

      expect(result).toBeDefined();
      expect(pipelineRepository.updateStage).toHaveBeenCalledWith('stage-123', updateDto);
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stage not found', async () => {
      pipelineRepository.findStageById.mockResolvedValue(null);

      await expect(service.updateStage('stage-123', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if stage belongs to different tenant', async () => {
      const stageWithWrongTenant = {
        ...mockStage,
        pipeline: { organizationId: 'different-org' },
      };
      pipelineRepository.findStageById.mockResolvedValue(stageWithWrongTenant);

      await expect(service.updateStage('stage-123', updateDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if order conflicts with existing stage', async () => {
      pipelineRepository.findStageByOrder.mockResolvedValue({ id: 'another-stage' });

      await expect(service.updateStage('stage-123', { order: 3 })).rejects.toThrow(ConflictException);
    });
  });

describe('removeStage', () => {
  const mockStage = createMockStage();
  const mockPipeline = createMockPipeline();

  beforeEach(() => {
    pipelineRepository.findStageById.mockResolvedValue({
      ...mockStage,
      pipeline: mockPipeline,
      _count: { deals: 0 },
    });
    
    // Mock findStagesByPipeline to return stages with non-sequential orders
    pipelineRepository.findStagesByPipeline.mockResolvedValue([
      { id: 'stage-1', order: 0 },
      { id: 'stage-2', order: 2 }, // Note: order 2 after deletion of stage with order 1
    ]);
    
    // Mock updateStage to return the updated stage
    pipelineRepository.updateStage.mockResolvedValue({});
  });

  it('should successfully delete a stage with no deals', async () => {
    await service.removeStage('stage-123');

    expect(pipelineRepository.deleteStage).toHaveBeenCalledWith('stage-123');
    expect(auditLog.logEvent).toHaveBeenCalled();
  });

  it('should reorder remaining stages after deletion', async () => {
    await service.removeStage('stage-123');

    // Should call updateStage at least once to reorder
    expect(pipelineRepository.updateStage).toHaveBeenCalled();
  });

  it('should throw ConflictException if stage has deals', async () => {
    pipelineRepository.findStageById.mockResolvedValue({
      ...mockStage,
      pipeline: mockPipeline,
      _count: { deals: 5 },
    });

    await expect(service.removeStage('stage-123')).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException if stage not found', async () => {
    pipelineRepository.findStageById.mockResolvedValue(null);

    await expect(service.removeStage('stage-123')).rejects.toThrow(NotFoundException);
  });
});

describe('reorderStages', () => {
  const stageIds = ['stage-3', 'stage-1', 'stage-2'];
  const mockPipeline = createMockPipeline();

  beforeEach(() => {
    pipelineRepository.findById.mockResolvedValue(mockPipeline);
    pipelineRepository.findStagesByPipeline.mockResolvedValue([
      { id: 'stage-1', order: 0 },
      { id: 'stage-2', order: 1 },
      { id: 'stage-3', order: 2 },
    ]);
  });

  it('should successfully reorder stages', async () => {
    // Mock the transaction to execute the callback
    pipelineRepository.transaction.mockImplementation(async (callback) => {
      // Create a mock prisma client with update method
      const mockPrisma = {
        pipelineStage: {
          update: jest.fn().mockResolvedValue({}),
        },
      };
      return callback(mockPrisma);
    });

    const result = await service.reorderStages('pipeline-123', stageIds);

    expect(result).toEqual({ message: 'Stages reordered successfully' });
    expect(pipelineRepository.transaction).toHaveBeenCalled();
    expect(auditLog.logEvent).toHaveBeenCalled();
  });

  it('should throw NotFoundException if pipeline not found', async () => {
    pipelineRepository.findById.mockResolvedValue(null);

    await expect(service.reorderStages('pipeline-123', stageIds)).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if any stage not found', async () => {
    pipelineRepository.findStagesByPipeline.mockResolvedValue([
      { id: 'stage-1', order: 0 },
      { id: 'stage-2', order: 1 },
    ]);

    await expect(service.reorderStages('pipeline-123', ['stage-1', 'stage-999'])).rejects.toThrow(NotFoundException);
  });
});
});
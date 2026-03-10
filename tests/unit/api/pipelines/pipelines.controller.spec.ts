import { Test, TestingModule } from '@nestjs/testing';
import { PipelinesController } from '../../../src/modules/pipelines/pipelines.controller';
import { PipelinesService } from '../../../src/modules/pipelines/pipelines.service';
import { ForbiddenException } from '@nestjs/common';

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
const mockPipelinesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getDefaultPipeline: jest.fn(),
  createStage: jest.fn(),
  updateStage: jest.fn(),
  removeStage: jest.fn(),
  reorderStages: jest.fn(),
};

describe('PipelinesController', () => {
  let controller: PipelinesController;
  let pipelinesService: typeof mockPipelinesService;

  const createController = async () => {
    const module = await Test.createTestingModule({
      controllers: [PipelinesController],
      providers: [
        { provide: PipelinesService, useValue: mockPipelinesService },
      ],
    }).compile();

    return module.get<PipelinesController>(PipelinesController);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    controller = await createController();
  });

  describe('create', () => {
    const createPipelineDto = {
      name: 'Sales Pipeline',
      description: 'Main sales pipeline',
      isDefault: false,
    };

    const mockResult = {
      id: 'pipeline-123',
      name: 'Sales Pipeline',
      description: 'Main sales pipeline',
      isDefault: false,
      stages: [],
      _count: { deals: 0 },
    };

    it('should successfully create a pipeline', async () => {
      mockPipelinesService.create.mockResolvedValue(mockResult);

      const result = await controller.create(createPipelineDto);

      expect(result).toEqual(mockResult);
      expect(mockPipelinesService.create).toHaveBeenCalledWith(createPipelineDto);
    });
  });

  describe('findAll', () => {
    const mockResult = {
      data: [
        { id: 'pipeline-1', name: 'Pipeline 1', stages: [], _count: { deals: 5 } },
        { id: 'pipeline-2', name: 'Pipeline 2', stages: [], _count: { deals: 3 } },
      ],
      meta: { page: 1, limit: 20, total: 2, pages: 1 },
    };

    it('should return paginated pipelines with default params', async () => {
      mockPipelinesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(1, 20, undefined);

      expect(result).toEqual(mockResult);
      expect(mockPipelinesService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
      });
    });

    it('should return paginated pipelines with search param', async () => {
      mockPipelinesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(1, 20, 'sales');

      expect(result).toEqual(mockResult);
      expect(mockPipelinesService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'sales',
      });
    });

    it('should validate page and limit values', async () => {
      mockPipelinesService.findAll.mockResolvedValue(mockResult);

      await controller.findAll(0, 200, undefined);

      expect(mockPipelinesService.findAll).toHaveBeenCalledWith({
        page: 1, // Should default to 1
        limit: 100, // Should cap at 100
        search: undefined,
      });
    });
  });

  describe('getDefault', () => {
    const mockResult = {
      id: 'pipeline-123',
      name: 'Default Pipeline',
      isDefault: true,
      stages: [],
      _count: { deals: 10 },
    };

    it('should return default pipeline', async () => {
      mockPipelinesService.getDefaultPipeline.mockResolvedValue(mockResult);

      const result = await controller.getDefault();

      expect(result).toEqual(mockResult);
      expect(mockPipelinesService.getDefaultPipeline).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const pipelineId = 'pipeline-123';
    const mockResult = {
      id: pipelineId,
      name: 'Sales Pipeline',
      stages: [
        { id: 'stage-1', name: 'Qualification', order: 0 },
        { id: 'stage-2', name: 'Proposal', order: 1 },
      ],
      _count: { deals: 5 },
    };

    it('should return a pipeline by id', async () => {
      mockPipelinesService.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne(pipelineId);

      expect(result).toEqual(mockResult);
      expect(mockPipelinesService.findOne).toHaveBeenCalledWith(pipelineId);
    });
  });

  describe('update', () => {
    const pipelineId = 'pipeline-123';
    const updatePipelineDto = {
      name: 'Updated Pipeline',
      description: 'Updated description',
      isDefault: true,
    };
    const mockResult = {
      id: pipelineId,
      name: 'Updated Pipeline',
      description: 'Updated description',
      isDefault: true,
      stages: [],
      _count: { deals: 5 },
    };

    it('should successfully update a pipeline', async () => {
      mockPipelinesService.update.mockResolvedValue(mockResult);

      const result = await controller.update(pipelineId, updatePipelineDto);

      expect(result).toEqual(mockResult);
      expect(mockPipelinesService.update).toHaveBeenCalledWith(pipelineId, updatePipelineDto);
    });
  });

  describe('remove', () => {
    const pipelineId = 'pipeline-123';
    const mockResult = { message: 'Pipeline deleted successfully' };

    it('should successfully delete a pipeline', async () => {
      mockPipelinesService.remove.mockResolvedValue(mockResult);

      const result = await controller.remove(pipelineId);

      expect(result).toEqual(mockResult);
      expect(mockPipelinesService.remove).toHaveBeenCalledWith(pipelineId);
    });
  });

  describe('createStage', () => {
    const pipelineId = 'pipeline-123';
    const createStageDto = {
      name: 'New Stage',
      order: 3,
      probability: 75,
    };
    const mockResult = {
      id: 'stage-123',
      name: 'New Stage',
      order: 3,
      probability: 75,
      pipelineId,
    };

    it('should successfully create a stage', async () => {
      mockPipelinesService.createStage.mockResolvedValue(mockResult);

      const result = await controller.createStage(pipelineId, createStageDto);

      expect(result).toEqual(mockResult);
      expect(mockPipelinesService.createStage).toHaveBeenCalledWith(pipelineId, createStageDto);
    });
  });

  describe('updateStage', () => {
    const stageId = 'stage-123';
    const updateStageDto = {
      name: 'Updated Stage',
      order: 4,
      probability: 80,
    };
    const mockResult = {
      id: stageId,
      name: 'Updated Stage',
      order: 4,
      probability: 80,
      pipelineId: 'pipeline-123',
    };

    it('should successfully update a stage', async () => {
      mockPipelinesService.updateStage.mockResolvedValue(mockResult);

      const result = await controller.updateStage(stageId, updateStageDto);

      expect(result).toEqual(mockResult);
      expect(mockPipelinesService.updateStage).toHaveBeenCalledWith(stageId, updateStageDto);
    });
  });

  describe('removeStage', () => {
    const stageId = 'stage-123';
    const mockResult = { message: 'Stage deleted successfully' };

    it('should successfully delete a stage', async () => {
      mockPipelinesService.removeStage.mockResolvedValue(mockResult);

      const result = await controller.removeStage(stageId);

      expect(result).toEqual(mockResult);
      expect(mockPipelinesService.removeStage).toHaveBeenCalledWith(stageId);
    });
  });

  describe('reorderStages', () => {
    const pipelineId = 'pipeline-123';
    const reorderDto = {
      stageIds: ['stage-3', 'stage-1', 'stage-2'],
    };
    const mockResult = { message: 'Stages reordered successfully' };

    it('should successfully reorder stages', async () => {
      mockPipelinesService.reorderStages.mockResolvedValue(mockResult);

      const result = await controller.reorderStages(pipelineId, reorderDto);

      expect(result).toEqual(mockResult);
      expect(mockPipelinesService.reorderStages).toHaveBeenCalledWith(pipelineId, reorderDto.stageIds);
    });
  });
});
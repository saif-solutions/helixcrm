import { Test, TestingModule } from '@nestjs/testing';
import { DealsController } from '../../../src/modules/deals/deals.controller';
import { DealsService } from '../../../src/modules/deals/deals.service';
import { PermissionContextService } from '../../../src/shared/permissions/context/permission-context.service';
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
const mockDealsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createSimple: jest.fn(),
  moveStage: jest.fn(),
  getDealStats: jest.fn(),
  getPipelinePerformance: jest.fn(),
  getStageHistory: jest.fn(),
};

const mockRequest = {
  user: { sub: 'user-123', organizationId: 'org-123', org: 'org-123' },
};

describe('DealsController', () => {
  let controller: DealsController;
  let dealsService: typeof mockDealsService;

  const createController = async (isInitialized = true) => {
    const mockPermissionContext = {
      isInitialized: jest.fn().mockReturnValue(isInitialized),
    };

    const module = await Test.createTestingModule({
      controllers: [DealsController],
      providers: [
        { provide: DealsService, useValue: mockDealsService },
        { provide: PermissionContextService, useValue: mockPermissionContext },
      ],
    }).compile();

    return module.get<DealsController>(DealsController);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    controller = await createController(true);
  });

  describe('create', () => {
    const createDealDto = {
      name: 'New Deal',
      amount: 5000,
      pipelineId: 'pipeline-123',
      stageId: 'stage-123',
      contactId: 'contact-123',
    };

    const mockResult = { id: 'deal-123', ...createDealDto };

    it('should successfully create a deal', async () => {
      mockDealsService.create.mockResolvedValue(mockResult);

      const result = await controller.create(createDealDto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockDealsService.create).toHaveBeenCalledWith({
        ...createDealDto,
        userId: 'user-123',
      });
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.create(createDealDto, mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const query = {
      page: 1,
      limit: 20,
      search: 'test',
      pipelineId: 'pipeline-123',
      status: 'open',
    };

    const mockResult = {
      data: [{ id: 'deal-1', name: 'Deal 1' }],
      meta: { page: 1, limit: 20, total: 1, pages: 1 },
    };

    it('should return paginated deals', async () => {
      mockDealsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(query, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockDealsService.findAll).toHaveBeenCalledWith(query);
    });

    it('should convert skip/take to page/limit if provided', async () => {
      const queryWithSkipTake = {
        skip: 20,
        take: 10,
      };

      mockDealsService.findAll.mockResolvedValue(mockResult);

      await controller.findAll(queryWithSkipTake as any, mockRequest as any);

      expect(mockDealsService.findAll).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
        page: 3,
        limit: 10,
      });
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.findAll(query, mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.findAll).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if tenant context missing', async () => {
      const requestWithoutTenant = { user: { sub: 'user-123' } };

      try {
        await controller.findAll(query, requestWithoutTenant as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
      expect(mockDealsService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    const mockStats = {
      totalCount: 10,
      totalValue: 100000,
      wonCount: 5,
      wonValue: 75000,
    };

    it('should return deal statistics', async () => {
      mockDealsService.getDealStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockRequest as any, 'pipeline-123');

      expect(result).toEqual(mockStats);
      expect(mockDealsService.getDealStats).toHaveBeenCalledWith('pipeline-123');
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.getStats(mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.getDealStats).not.toHaveBeenCalled();
    });
  });

  describe('getPipelinePerformance', () => {
    const mockPerformance = [
      { stage: 'Qualification', count: 5, value: 50000 },
      { stage: 'Proposal', count: 3, value: 30000 },
    ];

    it('should return pipeline performance', async () => {
      mockDealsService.getPipelinePerformance.mockResolvedValue(mockPerformance);

      const result = await controller.getPipelinePerformance(mockRequest as any, 'pipeline-123');

      expect(result).toEqual(mockPerformance);
      expect(mockDealsService.getPipelinePerformance).toHaveBeenCalledWith('pipeline-123');
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.getPipelinePerformance(mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.getPipelinePerformance).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const dealId = 'deal-123';
    const mockDeal = { id: dealId, name: 'Test Deal' };

    it('should return a deal by id', async () => {
      mockDealsService.findOne.mockResolvedValue(mockDeal);

      const result = await controller.findOne(dealId, mockRequest as any, false); // Pass boolean, not string

      expect(result).toEqual(mockDeal);
      expect(mockDealsService.findOne).toHaveBeenCalledWith(dealId, false);
    });

    it('should handle includeDeleted parameter', async () => {
      mockDealsService.findOne.mockResolvedValue(mockDeal);

      await controller.findOne(dealId, mockRequest as any, true); // Pass boolean, not string

      expect(mockDealsService.findOne).toHaveBeenCalledWith(dealId, true);
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.findOne(dealId, mockRequest as any, false);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('getStageHistory', () => {
    const dealId = 'deal-123';
    const mockHistory = [{ fromStage: 'Qualification', toStage: 'Proposal', date: new Date() }];

    it('should return stage history', async () => {
      mockDealsService.getStageHistory.mockResolvedValue(mockHistory);

      const result = await controller.getStageHistory(dealId, mockRequest as any);

      expect(result).toEqual(mockHistory);
      expect(mockDealsService.getStageHistory).toHaveBeenCalledWith(dealId);
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.getStageHistory(dealId, mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.getStageHistory).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const dealId = 'deal-123';
    const updateDealDto = { name: 'Updated Deal', amount: 7500 };
    const mockResult = { id: dealId, ...updateDealDto };

    it('should successfully update a deal', async () => {
      mockDealsService.update.mockResolvedValue(mockResult);

      const result = await controller.update(dealId, updateDealDto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockDealsService.update).toHaveBeenCalledWith(dealId, updateDealDto, 'user-123');
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.update(dealId, updateDealDto, mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const dealId = 'deal-123';
    const mockResult = { message: 'Deal deleted successfully' };

    it('should successfully delete a deal', async () => {
      mockDealsService.remove.mockResolvedValue(mockResult);

      const result = await controller.remove(dealId, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockDealsService.remove).toHaveBeenCalledWith(dealId, 'user-123');
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.remove(dealId, mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.remove).not.toHaveBeenCalled();
    });
  });

  describe('createSimple', () => {
    const createSimpleDto = {
      title: 'Simple Deal',
      value: 5000,
      stageId: 'stage-123',
    };

    const mockResult = { id: 'deal-123', title: 'Simple Deal', value: 5000 };

    it('should successfully create a simple deal', async () => {
      mockDealsService.createSimple.mockResolvedValue(mockResult);

      const result = await controller.createSimple(createSimpleDto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockDealsService.createSimple).toHaveBeenCalledWith({
        ...createSimpleDto,
        userId: 'user-123',
      });
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.createSimple(createSimpleDto, mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.createSimple).not.toHaveBeenCalled();
    });
  });

  describe('moveStage', () => {
    const dealId = 'deal-123';
    const moveDto = { stageId: 'stage-456', notes: 'Moving to next stage' };
    const mockResult = { id: dealId, stageId: 'stage-456' };

    it('should successfully move deal to another stage', async () => {
      mockDealsService.moveStage.mockResolvedValue(mockResult);

      const result = await controller.moveStage(dealId, moveDto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockDealsService.moveStage).toHaveBeenCalledWith(dealId, moveDto, 'user-123');
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.moveStage(dealId, moveDto, mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.moveStage).not.toHaveBeenCalled();
    });
  });

  describe('bulkMoveStage', () => {
    const bulkMoveDto = {
      dealIds: ['deal-1', 'deal-2'],
      stageId: 'stage-456',
    };
    const mockResults = [
      { id: 'deal-1', stageId: 'stage-456' },
      { id: 'deal-2', stageId: 'stage-456' },
    ];

    it('should successfully move multiple deals to another stage', async () => {
      mockDealsService.moveStage
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await controller.bulkMoveStage(bulkMoveDto, mockRequest as any);

      expect(result).toEqual(mockResults);
      expect(mockDealsService.moveStage).toHaveBeenCalledTimes(2);
      expect(mockDealsService.moveStage).toHaveBeenCalledWith(
        'deal-1',
        { stageId: 'stage-456' },
        'user-123',
      );
      expect(mockDealsService.moveStage).toHaveBeenCalledWith(
        'deal-2',
        { stageId: 'stage-456' },
        'user-123',
      );
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.bulkMoveStage(bulkMoveDto, mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.moveStage).not.toHaveBeenCalled();
    });
  });

  describe('bulkRemove', () => {
    const bulkRemoveDto = {
      dealIds: ['deal-1', 'deal-2'],
    };
    const mockResults = [
      { message: 'Deal deleted successfully' },
      { message: 'Deal deleted successfully' },
    ];

    it('should successfully delete multiple deals', async () => {
      mockDealsService.remove
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await controller.bulkRemove(bulkRemoveDto, mockRequest as any);

      expect(result).toEqual(mockResults);
      expect(mockDealsService.remove).toHaveBeenCalledTimes(2);
      expect(mockDealsService.remove).toHaveBeenCalledWith('deal-1', 'user-123');
      expect(mockDealsService.remove).toHaveBeenCalledWith('deal-2', 'user-123');
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.bulkRemove(bulkRemoveDto, mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockDealsService.remove).not.toHaveBeenCalled();
    });
  });
});

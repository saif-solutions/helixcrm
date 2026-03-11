import { Test, TestingModule } from '@nestjs/testing';
import { LeadsController } from '@api/modules/leads/leads.controller';
import { LeadsService } from '@api/modules/leads/leads.service';
import { PermissionContextService } from '@api/shared/permissions/context/permission-context.service';
import { ForbiddenException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';

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
const mockLeadsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getStats: jest.fn(),
};

const mockRequest = {
  user: { sub: 'user-123', organizationId: 'org-123', org: 'org-123' },
};

describe('LeadsController', () => {
  let controller: LeadsController;
  let leadsService: typeof mockLeadsService;

  const createController = async (isInitialized = true) => {
    const mockPermissionContext = {
      isInitialized: jest.fn().mockReturnValue(isInitialized),
    };

    const module = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        { provide: LeadsService, useValue: mockLeadsService },
        { provide: PermissionContextService, useValue: mockPermissionContext },
      ],
    }).compile();

    return module.get<LeadsController>(LeadsController);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    controller = await createController(true);
  });

  describe('create', () => {
    const createLeadDto = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      company: 'Acme Inc',
      status: LeadStatus.new,
      source: 'website',
    };

    const mockResult = { id: 'lead-123', ...createLeadDto };

    it('should successfully create a lead', async () => {
      mockLeadsService.create.mockResolvedValue(mockResult);

      const result = await controller.create(createLeadDto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockLeadsService.create).toHaveBeenCalledWith(createLeadDto, 'user-123');
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.create(createLeadDto, mockRequest as any);
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }

      expect(mockLeadsService.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const mockResult = {
      data: [{ id: 'lead-1', name: 'Lead 1' }],
      meta: { page: 1, limit: 20, total: 1, pages: 1 },
    };

    it('should return paginated leads with default params', async () => {
      mockLeadsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockRequest as any, 1, 20, undefined, undefined);

      expect(result).toEqual(mockResult);
      expect(mockLeadsService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: undefined,
        search: undefined,
      });
    });

    it('should return paginated leads with all params', async () => {
      mockLeadsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockRequest as any, 2, 50, 'new', 'john');

      expect(result).toEqual(mockResult);
      expect(mockLeadsService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 50,
        status: LeadStatus.new,
        search: 'john',
      });
    });

    it('should cap limit at 100', async () => {
      mockLeadsService.findAll.mockResolvedValue(mockResult);

      await controller.findAll(mockRequest as any, 1, 200, undefined, undefined);

      expect(mockLeadsService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 100,
        status: undefined,
        search: undefined,
      });
    });

    it('should ignore invalid status values', async () => {
      mockLeadsService.findAll.mockResolvedValue(mockResult);

      await controller.findAll(mockRequest as any, 1, 20, 'invalid_status', undefined);

      expect(mockLeadsService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: undefined,
        search: undefined,
      });
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.findAll(mockRequest as any, 1, 20);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }

      expect(mockLeadsService.findAll).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if tenant context missing', async () => {
      const requestWithoutTenant = { user: { sub: 'user-123' } };

      try {
        await controller.findAll(requestWithoutTenant as any, 1, 20);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }

      expect(mockLeadsService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    const mockStats = {
      new: 5,
      contacted: 3,
      qualified: 2,
    };

    it('should return lead statistics', async () => {
      mockLeadsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(mockLeadsService.getStats).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.getStats();
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }

      expect(mockLeadsService.getStats).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const leadId = 'lead-123';
    const mockLead = { id: leadId, name: 'John Doe' };

    it('should return a lead by id', async () => {
      mockLeadsService.findOne.mockResolvedValue(mockLead);

      const result = await controller.findOne(leadId);

      expect(result).toEqual(mockLead);
      expect(mockLeadsService.findOne).toHaveBeenCalledWith(leadId);
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.findOne(leadId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }

      expect(mockLeadsService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const leadId = 'lead-123';
    const updateLeadDto = { name: 'Updated Name', status: LeadStatus.contacted };
    const mockResult = { id: leadId, ...updateLeadDto };

    it('should successfully update a lead', async () => {
      mockLeadsService.update.mockResolvedValue(mockResult);

      const result = await controller.update(leadId, updateLeadDto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockLeadsService.update).toHaveBeenCalledWith(leadId, updateLeadDto, 'user-123');
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.update(leadId, updateLeadDto, mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }

      expect(mockLeadsService.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const leadId = 'lead-123';
    const mockResult = { message: 'Lead deleted successfully' };

    it('should successfully delete a lead', async () => {
      mockLeadsService.remove.mockResolvedValue(mockResult);

      const result = await controller.remove(leadId, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockLeadsService.remove).toHaveBeenCalledWith(leadId, 'user-123');
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.remove(leadId, mockRequest as any);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }

      expect(mockLeadsService.remove).not.toHaveBeenCalled();
    });
  });
});

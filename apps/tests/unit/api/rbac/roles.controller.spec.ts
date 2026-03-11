import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from '../../../src/modules/rbac/roles.controller';
import { RolesService } from '../../../src/modules/rbac/roles.service';
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
const mockRolesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  assignRole: jest.fn(),
  removeRole: jest.fn(),
  getUserRoles: jest.fn(),
};

const mockPermissionContext = {
  isInitialized: jest.fn(),
};

const mockRequest = {
  user: { sub: 'user-123', organizationId: 'org-123', org: 'org-123' },
};

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: typeof mockRolesService;
  let permissionContext: typeof mockPermissionContext;

  const createController = async (isInitialized = true) => {
    mockPermissionContext.isInitialized.mockReturnValue(isInitialized);

    const module = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: RolesService, useValue: mockRolesService },
        { provide: PermissionContextService, useValue: mockPermissionContext },
      ],
    }).compile();

    return module.get<RolesController>(RolesController);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    controller = await createController(true);
  });

  describe('findAll', () => {
    const query = { page: 1, limit: 10, search: 'admin' };
    const mockResult = [
      { id: 'role-1', name: 'Admin', permissions: [] },
      { id: 'role-2', name: 'Manager', permissions: [] },
    ];

    it('should return all roles', async () => {
      mockRolesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockRequest as any, query);

      expect(result).toEqual(mockResult);
      expect(mockRolesService.findAll).toHaveBeenCalledWith(query);
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.findAll(mockRequest as any, query);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockRolesService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const roleId = 'role-123';
    const mockResult = { id: roleId, name: 'Admin', permissions: [] };

    it('should return a role by id', async () => {
      mockRolesService.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne(mockRequest as any, roleId);

      expect(result).toEqual(mockResult);
      expect(mockRolesService.findOne).toHaveBeenCalledWith(roleId);
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.findOne(mockRequest as any, roleId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockRolesService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createRoleDto = {
      name: 'New Role',
      description: 'New role description',
      permissions: ['user:read', 'user:write'],
      isSystem: false,
    };
    const mockResult = { id: 'role-123', ...createRoleDto, permissions: [] };

    it('should successfully create a role', async () => {
      mockRolesService.create.mockResolvedValue(mockResult);

      const result = await controller.create(mockRequest as any, createRoleDto);

      expect(result).toEqual(mockResult);
      expect(mockRolesService.create).toHaveBeenCalledWith(createRoleDto);
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.create(mockRequest as any, createRoleDto);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockRolesService.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const roleId = 'role-123';
    const updateRoleDto = {
      name: 'Updated Role',
      description: 'Updated description',
      permissions: ['user:read', 'contact:read'],
    };
    const mockResult = { id: roleId, ...updateRoleDto, permissions: [] };

    it('should successfully update a role', async () => {
      mockRolesService.update.mockResolvedValue(mockResult);

      const result = await controller.update(mockRequest as any, roleId, updateRoleDto);

      expect(result).toEqual(mockResult);
      expect(mockRolesService.update).toHaveBeenCalledWith(roleId, updateRoleDto);
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.update(mockRequest as any, roleId, updateRoleDto);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockRolesService.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const roleId = 'role-123';
    const mockResult = { message: 'Role deleted successfully' };

    it('should successfully delete a role', async () => {
      mockRolesService.remove.mockResolvedValue(mockResult);

      const result = await controller.remove(mockRequest as any, roleId);

      expect(result).toEqual(mockResult);
      expect(mockRolesService.remove).toHaveBeenCalledWith(roleId);
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.remove(mockRequest as any, roleId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockRolesService.remove).not.toHaveBeenCalled();
    });
  });

  describe('assignRole', () => {
    const assignRoleDto = {
      roleId: 'role-123',
      userId: 'user-456',
    };
    const mockResult = { id: 'assignment-123', ...assignRoleDto };

    it('should successfully assign role to user', async () => {
      mockRolesService.assignRole.mockResolvedValue(mockResult);

      const result = await controller.assignRole(mockRequest as any, assignRoleDto);

      expect(result).toEqual(mockResult);
      expect(mockRolesService.assignRole).toHaveBeenCalledWith(assignRoleDto);
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.assignRole(mockRequest as any, assignRoleDto);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockRolesService.assignRole).not.toHaveBeenCalled();
    });
  });

  describe('removeRole', () => {
    const removeRoleDto = {
      roleId: 'role-123',
      userId: 'user-456',
    };
    const mockResult = { message: 'Role removed successfully' };

    it('should successfully remove role from user', async () => {
      mockRolesService.removeRole.mockResolvedValue(mockResult);

      const result = await controller.removeRole(mockRequest as any, removeRoleDto);

      expect(result).toEqual(mockResult);
      expect(mockRolesService.removeRole).toHaveBeenCalledWith(removeRoleDto);
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.removeRole(mockRequest as any, removeRoleDto);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockRolesService.removeRole).not.toHaveBeenCalled();
    });
  });

  describe('getUserRoles', () => {
    const userId = 'user-456';
    const mockResult = [
      { id: 'role-1', name: 'Admin', assignmentId: 'assign-1' },
      { id: 'role-2', name: 'Manager', assignmentId: 'assign-2' },
    ];

    it('should return roles assigned to a user', async () => {
      mockRolesService.getUserRoles.mockResolvedValue(mockResult);

      const result = await controller.getUserRoles(mockRequest as any, userId);

      expect(result).toEqual(mockResult);
      expect(mockRolesService.getUserRoles).toHaveBeenCalledWith(userId);
    });

    it('should throw ForbiddenException if permission context not initialized', async () => {
      const uninitializedController = await createController(false);

      try {
        await uninitializedController.getUserRoles(mockRequest as any, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Permission context not initialized');
      }
      expect(mockRolesService.getUserRoles).not.toHaveBeenCalled();
    });
  });
});
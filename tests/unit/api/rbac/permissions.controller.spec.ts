import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from '@api/modules/rbac/permissions.controller';
import { PermissionsService } from '@api/modules/rbac/permissions.service';

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
const mockPermissionsService = {
  findAll: jest.fn(),
  findGrouped: jest.fn(),
  getPermissionHierarchy: jest.fn(),
};

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let permissionsService: typeof mockPermissionsService;

  const createController = async () => {
    const module = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [{ provide: PermissionsService, useValue: mockPermissionsService }],
    }).compile();

    return module.get<PermissionsController>(PermissionsController);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    controller = await createController();
  });

  describe('findAll', () => {
    const mockPermissions = [
      { id: 'perm-1', code: 'user:read', name: 'Read Users', module: 'user' },
      { id: 'perm-2', code: 'user:write', name: 'Write Users', module: 'user' },
      { id: 'perm-3', code: 'deal:read', name: 'Read Deals', module: 'deal' },
    ];

    it('should return all permissions', async () => {
      mockPermissionsService.findAll.mockResolvedValue(mockPermissions);

      const result = await controller.findAll();

      expect(result).toEqual(mockPermissions);
      expect(mockPermissionsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findGrouped', () => {
    const mockGroupedPermissions = [
      {
        module: 'user',
        permissions: [
          { id: 'perm-1', code: 'user:read', name: 'Read Users' },
          { id: 'perm-2', code: 'user:write', name: 'Write Users' },
        ],
      },
      {
        module: 'deal',
        permissions: [{ id: 'perm-3', code: 'deal:read', name: 'Read Deals' }],
      },
    ];

    it('should return permissions grouped by module', async () => {
      mockPermissionsService.findGrouped.mockResolvedValue(mockGroupedPermissions);

      const result = await controller.findGrouped();

      expect(result).toEqual(mockGroupedPermissions);
      expect(mockPermissionsService.findGrouped).toHaveBeenCalled();
    });
  });

  describe('getHierarchy', () => {
    const mockHierarchy = {
      user: {
        read: [{ id: 'perm-1', code: 'user:read' }],
        write: [{ id: 'perm-2', code: 'user:write' }],
      },
      deal: {
        read: [{ id: 'perm-3', code: 'deal:read' }],
      },
    };

    it('should return permission hierarchy', async () => {
      mockPermissionsService.getPermissionHierarchy.mockResolvedValue(mockHierarchy);

      const result = await controller.getHierarchy();

      expect(result).toEqual(mockHierarchy);
      expect(mockPermissionsService.getPermissionHierarchy).toHaveBeenCalled();
    });
  });
});

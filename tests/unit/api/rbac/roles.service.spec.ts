import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from '@api/modules/rbac/roles.service';
import { RoleRepository } from '@api/modules/rbac/repositories/role.repository';
import { PermissionRepository } from '@api/modules/rbac/repositories/permission.repository';
import { UserRoleRepository } from '@api/modules/rbac/repositories/user-role.repository';
import { AuditLogService } from '@api/shared/audit-log/audit-log.service';
import { TenantContextService } from '@api/shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '@api/shared/permissions/context/permission-context.service';
import { PrismaService } from '@api/shared/prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

// Mock implementations
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

const mockRoleRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  assignPermissions: jest.fn(),
  checkUserCount: jest.fn(),
  findUserInTenant: jest.fn(),
  getUserEmail: jest.fn(),
};

const mockPermissionRepository = {
  findByCodes: jest.fn(),
  findAll: jest.fn(),
};

const mockUserRoleRepository = {
  findAssignment: jest.fn(),
  assignRole: jest.fn(),
  removeAssignment: jest.fn(),
  getUserRoles: jest.fn(),
  countAdminRoles: jest.fn(),
};

const mockAuditLogService = {
  logEvent: jest.fn(),
};

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue('org-123'),
  getUserId: jest.fn().mockReturnValue('user-123'),
};

const mockPermissionContext = {
  hasPermission: jest.fn().mockReturnValue(true),
};

// Mock data
const createMockRole = (overrides = {}) => ({
  id: 'role-123',
  name: 'Admin',
  description: 'Administrator role',
  isSystem: false,
  organizationId: 'org-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  permissions: [
    {
      permission: {
        id: 'perm-1',
        code: 'user:read',
        name: 'Read Users',
        module: 'user',
      },
    },
    {
      permission: {
        id: 'perm-2',
        code: 'user:write',
        name: 'Write Users',
        module: 'user',
      },
    },
  ],
  ...overrides,
});

const createMockUser = (overrides = {}) => ({
  id: 'target-user-123',
  email: 'target@example.com',
  firstName: 'Target',
  lastName: 'User',
  organizationId: 'org-123',
  ...overrides,
});

describe('RolesService', () => {
  let service: RolesService;
  let roleRepository: typeof mockRoleRepository;
  let permissionRepository: typeof mockPermissionRepository;
  let userRoleRepository: typeof mockUserRoleRepository;
  let auditLog: typeof mockAuditLogService;
  let tenantContext: typeof mockTenantContext;
  let permissionContext: typeof mockPermissionContext;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RoleRepository, useValue: mockRoleRepository },
        { provide: PermissionRepository, useValue: mockPermissionRepository },
        { provide: UserRoleRepository, useValue: mockUserRoleRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: PermissionContextService, useValue: mockPermissionContext },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleRepository = module.get(RoleRepository);
    permissionRepository = module.get(PermissionRepository);
    userRoleRepository = module.get(UserRoleRepository);
    auditLog = module.get(AuditLogService);
    tenantContext = module.get(TenantContextService);
    permissionContext = module.get(PermissionContextService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();

    // Default mock for getUserEmail
    mockRoleRepository.getUserEmail.mockResolvedValue('admin@example.com');
    prisma.user.findUnique.mockResolvedValue({ email: 'admin@example.com' });
  });

  describe('findAll', () => {
    const mockRoles = [
      createMockRole({ id: 'role-1', name: 'Admin' }),
      createMockRole({ id: 'role-2', name: 'Manager' }),
    ];

    it('should return all roles with transformed permissions', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        includeInactive: undefined,
        isSystem: undefined,
      };
      roleRepository.findAll.mockResolvedValue(mockRoles);

      const result = await service.findAll(query);

      expect(result).toEqual(
        mockRoles.map((role) => ({
          ...role,
          permissions: role.permissions.map((rp) => rp.permission),
        })),
      );
      expect(roleRepository.findAll).toHaveBeenCalledWith(query);
    });

    it('should throw BadRequestException on repository error', async () => {
      const query: any = {
        page: 1,
        limit: 10,
      };
      roleRepository.findAll.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll(query)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    const mockRole = createMockRole();

    it('should return role if found', async () => {
      roleRepository.findById.mockResolvedValue(mockRole);

      const result = await service.findOne('role-123');

      expect(result).toEqual({
        ...mockRole,
        permissions: mockRole.permissions.map((rp) => rp.permission),
      });
      expect(roleRepository.findById).toHaveBeenCalledWith('role-123');
    });

    it('should throw NotFoundException if role not found', async () => {
      roleRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('role-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'New Role',
      description: 'New role description',
      permissions: ['user:read', 'user:write'],
      isSystem: false,
    };

    const permissionRecords = [
      { id: 'perm-1', code: 'user:read' },
      { id: 'perm-2', code: 'user:write' },
    ];

    const mockRole = createMockRole({
      name: 'New Role',
      description: 'New role description',
      isSystem: false,
    });

    it('should successfully create a role', async () => {
      roleRepository.findByName.mockResolvedValue(null);
      permissionRepository.findByCodes.mockResolvedValue(permissionRecords);
      roleRepository.create.mockResolvedValue(mockRole);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRole);
      expect(roleRepository.findByName).toHaveBeenCalledWith('New Role');
      expect(permissionRepository.findByCodes).toHaveBeenCalledWith(['user:read', 'user:write']);
      expect(roleRepository.create).toHaveBeenCalledWith(
        {
          name: 'New Role',
          description: 'New role description',
          isSystem: false,
          permissions: ['user:read', 'user:write'],
        },
        'org-123',
      );
      expect(roleRepository.assignPermissions).toHaveBeenCalledWith(mockRole.id, [
        'perm-1',
        'perm-2',
      ]);
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw ConflictException if role name already exists', async () => {
      roleRepository.findByName.mockResolvedValue(createMockRole());

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if permissions not found', async () => {
      roleRepository.findByName.mockResolvedValue(null);
      permissionRepository.findByCodes.mockResolvedValue([{ id: 'perm-1', code: 'user:read' }]);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should create role without permissions if none provided', async () => {
      const dtoWithoutPerms = { ...createDto, permissions: [] };
      roleRepository.findByName.mockResolvedValue(null);
      permissionRepository.findByCodes.mockResolvedValue([]);
      roleRepository.create.mockResolvedValue(mockRole);

      const result = await service.create(dtoWithoutPerms);

      expect(result).toEqual(mockRole);
      expect(roleRepository.assignPermissions).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Role',
      description: 'Updated description',
      permissions: ['user:read', 'contact:read'],
    };

    const existingRole = createMockRole({ name: 'Old Role' });
    const updatedRole = createMockRole({
      name: 'Updated Role',
      description: 'Updated description',
    });
    const permissionRecords = [
      { id: 'perm-1', code: 'user:read' },
      { id: 'perm-3', code: 'contact:read' },
    ];

    beforeEach(() => {
      roleRepository.findById.mockResolvedValue(existingRole);
    });

    it('should successfully update a role', async () => {
      roleRepository.findByName.mockResolvedValue(null);
      permissionRepository.findByCodes.mockResolvedValue(permissionRecords);
      roleRepository.update.mockResolvedValue(updatedRole);

      const result = await service.update('role-123', updateDto);

      expect(result).toEqual(updatedRole);
      expect(roleRepository.update).toHaveBeenCalledWith('role-123', {
        name: 'Updated Role',
        description: 'Updated description',
      });
      expect(roleRepository.assignPermissions).toHaveBeenCalledWith('role-123', [
        'perm-1',
        'perm-3',
      ]);
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if role not found', async () => {
      roleRepository.findById.mockResolvedValue(null);

      await expect(service.update('role-123', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if trying to modify system role', async () => {
      const systemRole = createMockRole({ isSystem: true });
      roleRepository.findById.mockResolvedValue(systemRole);

      await expect(service.update('role-123', { isSystem: false })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if new name already exists', async () => {
      roleRepository.findByName.mockResolvedValue({ id: 'another-role', name: 'Updated Role' });

      await expect(service.update('role-123', { name: 'Updated Role' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { description: 'New description only' };
      roleRepository.update.mockResolvedValue({
        ...existingRole,
        description: 'New description only',
      });
      permissionRepository.findByCodes.mockResolvedValue([]);

      const result = await service.update('role-123', partialUpdate);

      expect(result).toBeDefined();
      expect(roleRepository.update).toHaveBeenCalledWith('role-123', {
        description: 'New description only',
      });
      expect(roleRepository.assignPermissions).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const mockRole = createMockRole({ isSystem: false });

    beforeEach(() => {
      roleRepository.findById.mockResolvedValue(mockRole);
      roleRepository.checkUserCount.mockResolvedValue(0);
    });

    it('should successfully delete a role', async () => {
      await service.remove('role-123');

      expect(roleRepository.delete).toHaveBeenCalledWith('role-123');
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if role not found', async () => {
      roleRepository.findById.mockResolvedValue(null);

      await expect(service.remove('role-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if trying to delete system role', async () => {
      const systemRole = createMockRole({ isSystem: true });
      roleRepository.findById.mockResolvedValue(systemRole);

      await expect(service.remove('role-123')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if role has assigned users', async () => {
      roleRepository.checkUserCount.mockResolvedValue(5);

      await expect(service.remove('role-123')).rejects.toThrow(ConflictException);
    });
  });

  describe('assignRole', () => {
    const assignDto = {
      roleId: 'role-123',
      userId: 'target-user-123',
    };

    const mockRole = createMockRole();
    const mockUser = createMockUser();
    const mockAssignment = { id: 'assignment-123', userId: 'target-user-123', roleId: 'role-123' };

    beforeEach(() => {
      roleRepository.findUserInTenant.mockResolvedValue(mockUser);
      roleRepository.findById.mockResolvedValue(mockRole);
    });

    it('should successfully assign role to user', async () => {
      userRoleRepository.findAssignment.mockResolvedValue(null);
      userRoleRepository.assignRole.mockResolvedValue(mockAssignment);

      const result = await service.assignRole(assignDto);

      expect(result).toEqual(mockAssignment);
      expect(roleRepository.findUserInTenant).toHaveBeenCalledWith('target-user-123', 'org-123');
      expect(roleRepository.findById).toHaveBeenCalledWith('role-123');
      expect(userRoleRepository.findAssignment).toHaveBeenCalledWith('target-user-123', 'role-123');
      expect(userRoleRepository.assignRole).toHaveBeenCalledWith(
        'target-user-123',
        'role-123',
        'org-123',
      );
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found in tenant', async () => {
      roleRepository.findUserInTenant.mockResolvedValue(null);

      await expect(service.assignRole(assignDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if role not found', async () => {
      roleRepository.findById.mockResolvedValue(null);

      await expect(service.assignRole(assignDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if role already assigned', async () => {
      userRoleRepository.findAssignment.mockResolvedValue({ id: 'existing' });

      await expect(service.assignRole(assignDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('removeRole', () => {
    const removeDto = {
      roleId: 'role-123',
      userId: 'target-user-123',
    };

    const mockAssignment = {
      id: 'assignment-123',
      userId: 'target-user-123',
      roleId: 'role-123',
      role: { name: 'Admin' },
    };

    beforeEach(() => {
      userRoleRepository.findAssignment.mockResolvedValue(mockAssignment);
    });

    it('should successfully remove role from user', async () => {
      userRoleRepository.countAdminRoles.mockResolvedValue(2);
      userRoleRepository.removeAssignment.mockResolvedValue({});

      const result = await service.removeRole(removeDto);

      expect(result).toEqual({ message: 'Role removed successfully' });
      expect(userRoleRepository.findAssignment).toHaveBeenCalledWith('target-user-123', 'role-123');
      expect(userRoleRepository.countAdminRoles).toHaveBeenCalledWith('org-123');
      expect(userRoleRepository.removeAssignment).toHaveBeenCalledWith(
        'target-user-123',
        'role-123',
      );
      expect(auditLog.logEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundException if assignment not found', async () => {
      userRoleRepository.findAssignment.mockResolvedValue(null);

      await expect(service.removeRole(removeDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if removing last admin role', async () => {
      userRoleRepository.countAdminRoles.mockResolvedValue(1);

      await expect(service.removeRole(removeDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserRoles', () => {
    const mockUserRoles = [
      {
        id: 'ur-1',
        createdAt: new Date('2024-01-01'),
        role: createMockRole({
          id: 'role-1',
          name: 'Admin',
          permissions: [{ permission: { id: 'p1', code: 'user:read' } }],
        }),
      },
      {
        id: 'ur-2',
        createdAt: new Date('2024-01-02'),
        role: createMockRole({
          id: 'role-2',
          name: 'Manager',
          permissions: [{ permission: { id: 'p2', code: 'contact:read' } }],
        }),
      },
    ];

    it('should return user roles with transformed permissions', async () => {
      userRoleRepository.getUserRoles.mockResolvedValue(mockUserRoles);

      const result = await service.getUserRoles('target-user-123');

      expect(result).toEqual([
        {
          ...mockUserRoles[0].role,
          permissions: [mockUserRoles[0].role.permissions[0].permission],
          assignmentId: 'ur-1',
          assignedAt: mockUserRoles[0].createdAt,
        },
        {
          ...mockUserRoles[1].role,
          permissions: [mockUserRoles[1].role.permissions[0].permission],
          assignmentId: 'ur-2',
          assignedAt: mockUserRoles[1].createdAt,
        },
      ]);
    });

    it('should throw BadRequestException on repository error', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: undefined,
        sortBy: undefined,
        sortOrder: undefined,
        includeInactive: undefined,
        isSystem: undefined,
      };
      roleRepository.findAll.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll(query)).rejects.toThrow(BadRequestException);
    });
  });
});

import { Test } from '@nestjs/testing';
import { UsersService } from '@api/modules/users/users.service';
import { UserRepository } from '@api/modules/users/repositories/user.repository';
import { TenantContextService } from '@api/shared/tenant/context/tenant-context.service';
import * as bcrypt from 'bcrypt';
interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  organizationId: string;
  tokenVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lastPasswordResetAt: Date | null;
  lockedUntil: Date | null;
  refreshTokenHash: string | null;
  refreshTokenIssuedAt: Date | null;
  refreshTokenVersion: string | null;
  lastPasswordChange: Date | null;
  mustChangePassword: boolean;
  // Optional relation fields (can be empty arrays in tests)
  Activity?: any[];
  auditLogs?: any[];
  ChangedStageHistory?: any[];
  OwnedDeals?: any[];
  PasswordResetToken?: any[];
  RefreshTokens?: any[];
  UserRoles?: any[];
  organization?: any;
}

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

// Mock implementations
const mockUserRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
};

const mockTenantContext = {
  getTenantId: jest.fn().mockReturnValue('org-123'),
  getUserId: jest.fn().mockReturnValue('user-123'),
};

// ==================== HELPER FUNCTIONS ====================

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  role: 'user',
  tokenVersion: 1,
  refreshTokenHash: null,
  refreshTokenVersion: null,
  refreshTokenIssuedAt: null,
  lastLoginAt: null,
  lastPasswordChange: null,
  lastPasswordResetAt: null,
  lockedUntil: null,
  emailVerified: false,
  failedLoginAttempts: 0,
  mustChangePassword: false,
  organizationId: 'org-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  Activity: [],
  auditLogs: [],
  ChangedStageHistory: [],
  OwnedDeals: [],
  PasswordResetToken: [],
  RefreshTokens: [],
  UserRoles: [],
  organization: null,
  ...overrides,
});

const expectedUserShape = (user: User) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  isActive: user.isActive,
  organizationId: user.organizationId,
  tokenVersion: user.tokenVersion,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  deletedAt: user.deletedAt,
});

// ==================== TEST SUITE ====================

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: typeof mockUserRepository;
  let tenantContext: typeof mockTenantContext;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(UserRepository);
    tenantContext = module.get(TenantContextService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
      isActive: true,
      role: 'user',
    };

    const mockUser = createMockUser({
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      isActive: true,
      role: 'user',
    });

    it('should successfully create a user', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser);

      const result = await service.create(createDto, 'created-by-123');

      expect(result).toEqual(expectedUserShape(mockUser));
      expect(userRepository.findByEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        passwordHash: 'hashed-password',
        firstName: 'New',
        lastName: 'User',
        isActive: true,
        role: 'user',
        tokenVersion: 1,
        organization: {
          connect: { id: 'org-123' },
        },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(createMockUser());

      await expect(service.create(createDto, 'created-by-123')).rejects.toThrow(
        'User with email newuser@example.com already exists in this organization',
      );
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should use default values for optional fields', async () => {
      const minimalDto = {
        email: 'minimal@example.com',
        password: 'Password123!',
        firstName: 'Minimal',
        lastName: 'User',
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(createMockUser({ email: 'minimal@example.com' }));

      await service.create(minimalDto, 'created-by-123');

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          role: 'user',
          tokenVersion: 1,
        }),
      );
    });
  });

  describe('findAll', () => {
    const mockUsers = [
      createMockUser({ id: 'user-1', email: 'user1@example.com' }),
      createMockUser({ id: 'user-2', email: 'user2@example.com' }),
    ];

    it('should return all users without password hashes', async () => {
      userRepository.findAll.mockResolvedValue(mockUsers);

      const result = await service.findAll({});

      expect(result).toEqual(mockUsers.map(expectedUserShape));
      expect(userRepository.findAll).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by isActive', async () => {
      userRepository.findAll.mockResolvedValue([]);

      await service.findAll({ isActive: true });

      expect(userRepository.findAll).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by role', async () => {
      userRepository.findAll.mockResolvedValue([]);

      await service.findAll({ role: 'admin' });

      expect(userRepository.findAll).toHaveBeenCalledWith({
        where: { role: 'admin' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search by email, firstName, lastName', async () => {
      userRepository.findAll.mockResolvedValue([]);

      await service.findAll({ search: 'john' });

      expect(userRepository.findAll).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    const mockUser = createMockUser();

    it('should return user without password hash', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findOne('user-123');

      expect(result).toEqual(expectedUserShape(mockUser));
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('user-123')).rejects.toThrow(
        'User with ID user-123 not found in this organization',
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      firstName: 'Updated',
      lastName: 'Name',
      isActive: false,
      role: 'admin',
    };

    const existingUser = createMockUser();
    const updatedUser = createMockUser({
      firstName: 'Updated',
      lastName: 'Name',
      isActive: false,
      role: 'admin',
    });

    beforeEach(() => {
      userRepository.findById.mockResolvedValue(existingUser);
    });

    it('should successfully update a user', async () => {
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-123', updateDto, 'updated-by-123');

      expect(result).toEqual(expectedUserShape(updatedUser));
      expect(userRepository.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          firstName: 'Updated',
          lastName: 'Name',
          isActive: false,
          role: 'admin',
        },
      });
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { firstName: 'Only First' };
      const partiallyUpdatedUser = { ...existingUser, firstName: 'Only First' };
      userRepository.update.mockResolvedValue(partiallyUpdatedUser);

      const result = await service.update('user-123', partialUpdate, 'updated-by-123');

      expect(result).toEqual(expectedUserShape(partiallyUpdatedUser));
      expect(userRepository.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { firstName: 'Only First' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.update('user-123', updateDto, 'updated-by-123')).rejects.toThrow(
        'User with ID user-123 not found in this organization',
      );
    });
  });

  describe('remove', () => {
    const mockUser = createMockUser();

    beforeEach(() => {
      userRepository.findById.mockResolvedValue(mockUser);
      tenantContext.getUserId.mockReturnValue('different-user-456');
    });

    it('should successfully delete a user', async () => {
      userRepository.delete.mockResolvedValue(mockUser);

      const result = await service.remove('user-123', 'deleted-by-123');

      expect(result).toEqual(expectedUserShape(mockUser));
      expect(userRepository.delete).toHaveBeenCalledWith({ id: 'user-123' });
    });

    it('should throw ForbiddenException if trying to delete yourself', async () => {
      tenantContext.getUserId.mockReturnValue('user-123'); // Same as target user

      await expect(service.remove('user-123', 'deleted-by-123')).rejects.toThrow(
        'Cannot delete your own account',
      );
      expect(userRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.remove('user-123', 'deleted-by-123')).rejects.toThrow(
        'User with ID user-123 not found in this organization',
      );
    });
  });

  describe('getProfile', () => {
    const mockUser = createMockUser();

    it('should return user profile without password hash', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-123');

      expect(result).toEqual(expectedUserShape(mockUser));
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getProfile('user-123')).rejects.toThrow('User not found');
    });
  });

  describe('archive', () => {
    const mockUser = createMockUser();

    beforeEach(() => {
      jest.clearAllMocks();
      tenantContext.getUserId.mockReturnValue('different-user-456');
    });

    it('should successfully archive a user', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      const archivedUser = { ...mockUser, deletedAt: new Date() };
      userRepository.softDelete.mockResolvedValue(archivedUser);

      const result = await service.archive('user-123', 'archived-by-123');

      expect(result).toEqual(expectedUserShape(archivedUser));
      expect(userRepository.softDelete).toHaveBeenCalledWith('user-123');
    });

    it('should throw ForbiddenException if trying to archive yourself', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      tenantContext.getUserId.mockReturnValue('user-123'); // Same as target user

      await expect(service.archive('user-123', 'archived-by-123')).rejects.toThrow(
        'Cannot archive your own account',
      );
      expect(userRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.archive('user-123', 'archived-by-123')).rejects.toThrow(
        'User not found',
      );
      expect(userRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    const mockUsers = [
      createMockUser({ id: 'user-1', email: 'john@example.com', firstName: 'John' }),
      createMockUser({ id: 'user-2', email: 'jane@example.com', firstName: 'Jane' }),
    ];

    it('should return matching users without password hashes', async () => {
      userRepository.findAll.mockResolvedValue(mockUsers);

      const result = await service.search('john');

      expect(result).toEqual(mockUsers.map(expectedUserShape));
      expect(userRepository.findAll).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        take: 20,
      });
    });

    it('should return empty array for no matches', async () => {
      userRepository.findAll.mockResolvedValue([]);

      const result = await service.search('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
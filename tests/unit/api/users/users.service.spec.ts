import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '@api/modules/users/users.service';
import { UserRepository } from '@api/modules/users/repositories/user.repository';
import { TenantContextService } from '@api/shared/tenant/context/tenant-context.service';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

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

// Mock data with all fields that the actual user object has
const createMockUser = (overrides = {}) => ({
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
  organizationId: 'org-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: typeof mockUserRepository;
  let tenantContext: typeof mockTenantContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

      // Include all fields in the expectation
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        isActive: mockUser.isActive,
        role: mockUser.role,
        organizationId: mockUser.organizationId,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        deletedAt: mockUser.deletedAt,
        lastLoginAt: mockUser.lastLoginAt,
        lastPasswordChange: mockUser.lastPasswordChange,
        refreshTokenHash: mockUser.refreshTokenHash,
        refreshTokenIssuedAt: mockUser.refreshTokenIssuedAt,
        refreshTokenVersion: mockUser.refreshTokenVersion,
        tokenVersion: mockUser.tokenVersion,
      });
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

      await expect(service.create(createDto, 'created-by-123')).rejects.toThrow(ConflictException);
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

      expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        isActive: true,
        role: 'user',
        tokenVersion: 1,
      }));
    });
  });

  describe('findAll', () => {
    const mockUsers = [
      createMockUser({ id: 'user-1', email: 'user1@example.com' }),
      createMockUser({ id: 'user-2', email: 'user2@example.com' }),
    ];

    const expectedUserShape = (user: any) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      role: user.role,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      lastLoginAt: user.lastLoginAt,
      lastPasswordChange: user.lastPasswordChange,
      refreshTokenHash: user.refreshTokenHash,
      refreshTokenIssuedAt: user.refreshTokenIssuedAt,
      refreshTokenVersion: user.refreshTokenVersion,
      tokenVersion: user.tokenVersion,
    });

    it('should return all users without password hashes', async () => {
      userRepository.findAll.mockResolvedValue(mockUsers);

      const result = await service.findAll({});

      expect(result).toEqual([
        expectedUserShape(mockUsers[0]),
        expectedUserShape(mockUsers[1]),
      ]);
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

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        isActive: mockUser.isActive,
        role: mockUser.role,
        organizationId: mockUser.organizationId,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        deletedAt: mockUser.deletedAt,
        lastLoginAt: mockUser.lastLoginAt,
        lastPasswordChange: mockUser.lastPasswordChange,
        refreshTokenHash: mockUser.refreshTokenHash,
        refreshTokenIssuedAt: mockUser.refreshTokenIssuedAt,
        refreshTokenVersion: mockUser.refreshTokenVersion,
        tokenVersion: mockUser.tokenVersion,
      });
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('user-123')).rejects.toThrow(NotFoundException);
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

      expect(result).toEqual({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        isActive: updatedUser.isActive,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        deletedAt: updatedUser.deletedAt,
        lastLoginAt: updatedUser.lastLoginAt,
        lastPasswordChange: updatedUser.lastPasswordChange,
        refreshTokenHash: updatedUser.refreshTokenHash,
        refreshTokenIssuedAt: updatedUser.refreshTokenIssuedAt,
        refreshTokenVersion: updatedUser.refreshTokenVersion,
        tokenVersion: updatedUser.tokenVersion,
      });
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
      userRepository.update.mockResolvedValue({ ...existingUser, firstName: 'Only First' });

      await service.update('user-123', partialUpdate, 'updated-by-123');

      expect(userRepository.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { firstName: 'Only First' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.update('user-123', updateDto, 'updated-by-123')).rejects.toThrow(NotFoundException);
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

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        isActive: mockUser.isActive,
        role: mockUser.role,
        organizationId: mockUser.organizationId,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        deletedAt: mockUser.deletedAt,
        lastLoginAt: mockUser.lastLoginAt,
        lastPasswordChange: mockUser.lastPasswordChange,
        refreshTokenHash: mockUser.refreshTokenHash,
        refreshTokenIssuedAt: mockUser.refreshTokenIssuedAt,
        refreshTokenVersion: mockUser.refreshTokenVersion,
        tokenVersion: mockUser.tokenVersion,
      });
      expect(userRepository.delete).toHaveBeenCalledWith({ id: 'user-123' });
    });

    it('should throw ForbiddenException if trying to delete yourself', async () => {
      tenantContext.getUserId.mockReturnValue('user-123'); // Same as target user

      await expect(service.remove('user-123', 'deleted-by-123')).rejects.toThrow(ForbiddenException);
      expect(userRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.remove('user-123', 'deleted-by-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfile', () => {
    const mockUser = createMockUser();

    it('should return user profile without password hash', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-123');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        isActive: mockUser.isActive,
        role: mockUser.role,
        organizationId: mockUser.organizationId,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        deletedAt: mockUser.deletedAt,
        lastLoginAt: mockUser.lastLoginAt,
        lastPasswordChange: mockUser.lastPasswordChange,
        refreshTokenHash: mockUser.refreshTokenHash,
        refreshTokenIssuedAt: mockUser.refreshTokenIssuedAt,
        refreshTokenVersion: mockUser.refreshTokenVersion,
        tokenVersion: mockUser.tokenVersion,
      });
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getProfile('user-123')).rejects.toThrow(NotFoundException);
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

    expect(result).toEqual({
      id: archivedUser.id,
      email: archivedUser.email,
      firstName: archivedUser.firstName,
      lastName: archivedUser.lastName,
      isActive: archivedUser.isActive,
      role: archivedUser.role,
      organizationId: archivedUser.organizationId,
      createdAt: archivedUser.createdAt,
      updatedAt: archivedUser.updatedAt,
      deletedAt: archivedUser.deletedAt,
      lastLoginAt: archivedUser.lastLoginAt,
      lastPasswordChange: archivedUser.lastPasswordChange,
      refreshTokenHash: archivedUser.refreshTokenHash,
      refreshTokenIssuedAt: archivedUser.refreshTokenIssuedAt,
      refreshTokenVersion: archivedUser.refreshTokenVersion,
      tokenVersion: archivedUser.tokenVersion,
    });
    expect(userRepository.softDelete).toHaveBeenCalledWith('user-123');
  });

  it('should throw ForbiddenException if trying to archive yourself', async () => {
    userRepository.findById.mockResolvedValue(mockUser);
    tenantContext.getUserId.mockReturnValue('user-123'); // Same as target user

    await expect(service.archive('user-123', 'archived-by-123')).rejects.toThrow(ForbiddenException);
    expect(userRepository.softDelete).not.toHaveBeenCalled();
  });

it('should throw NotFoundException if user not found', async () => {
  console.log('1. Starting test');
  
  // First, ensure all previous mocks are cleared
  jest.clearAllMocks();
  console.log('2. Mocks cleared');
  
  // Set the mock to return null
  userRepository.findById.mockResolvedValue(null);
  console.log('3. Mock set to return null');
  
  // Verify the mock is set correctly
  console.log('4. Checking mock - not called yet');
  expect(userRepository.findById).not.toHaveBeenCalled();
  
  // Directly test the mock to confirm it works
  console.log('5. Directly calling mock');
  const mockResult = await userRepository.findById('user-123');
  console.log('6. Mock result:', mockResult);
  expect(mockResult).toBeNull();
  
  // Now test the service
  console.log('7. Testing service');
  await expect(service.archive('user-123', 'archived-by-123')).rejects.toThrow(NotFoundException);
  console.log('8. Service threw expected error');
  
  expect(userRepository.softDelete).not.toHaveBeenCalled();
  console.log('9. Test completed');
});

});

  describe('search', () => {
    const mockUsers = [
      createMockUser({ id: 'user-1', email: 'john@example.com', firstName: 'John' }),
      createMockUser({ id: 'user-2', email: 'jane@example.com', firstName: 'Jane' }),
    ];

    const expectedUserShape = (user: any) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      role: user.role,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      lastLoginAt: user.lastLoginAt,
      lastPasswordChange: user.lastPasswordChange,
      refreshTokenHash: user.refreshTokenHash,
      refreshTokenIssuedAt: user.refreshTokenIssuedAt,
      refreshTokenVersion: user.refreshTokenVersion,
      tokenVersion: user.tokenVersion,
    });

    it('should return matching users without password hashes', async () => {
      userRepository.findAll.mockResolvedValue(mockUsers);

      const result = await service.search('john');

      expect(result).toEqual([
        expectedUserShape(mockUsers[0]),
        expectedUserShape(mockUsers[1]),
      ]);
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
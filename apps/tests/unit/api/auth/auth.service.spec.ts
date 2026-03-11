import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { AccountLockoutService } from '../../../src/modules/auth/services/account-lockout.service';
import { AuditLogService } from '../../../src/shared/audit-log/audit-log.service';
import { AuthCoreAdapter } from '../../../src/modules/auth/adapters/AuthCoreAdapter';
import { UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';

// Mock implementations
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  organization: {
    create: jest.fn(),
  },
  permission: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  role: {
    upsert: jest.fn(),
    findFirst: jest.fn(),
  },
  rolePermission: {
    upsert: jest.fn(),
  },
  userRole: {
    create: jest.fn(),
  },
};

const mockAccountLockoutService = {
  isAccountLocked: jest.fn(),
  recordFailedAttempt: jest.fn(),
  resetFailedAttempts: jest.fn(),
};

const mockAuditLogService = {
  logAuthEvent: jest.fn(),
  logWithRequest: jest.fn(),
};

const mockAuthCoreAdapter = {
  password: {
    verify: jest.fn(),
    hash: jest.fn(),
  },
  authCore: {
    issueAccessToken: jest.fn(),
  },
  tokenManager: {
    issueRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
  },
  withTransaction: jest.fn(),
  tokenRepository: {
    invalidateRefreshToken: jest.fn(),
    saveRefreshToken: jest.fn(),
  },
  userRepository: {
    findById: jest.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: typeof mockPrismaService;
  let lockoutService: typeof mockAccountLockoutService;
  let auditLog: typeof mockAuditLogService;
  let authCore: typeof mockAuthCoreAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AccountLockoutService, useValue: mockAccountLockoutService },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: AuthCoreAdapter, useValue: mockAuthCoreAdapter },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    lockoutService = module.get(AccountLockoutService);
    auditLog = module.get(AuditLogService);
    authCore = module.get(AuthCoreAdapter);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      firstName: 'Test',
      lastName: 'User',
      organizationId: 'org-123',
      organization: { id: 'org-123', name: 'Test Org' },
      tokenVersion: 1,
      refreshTokenHash: null,
      isActive: true,
    };

    it('should throw ForbiddenException if account is locked', async () => {
      lockoutService.isAccountLocked.mockResolvedValue({
        isLocked: true,
        lockedUntil: new Date(),
      });

      await expect(service.validateUser('test@example.com', 'password', {}))
        .rejects.toThrow(ForbiddenException);
      
      expect(lockoutService.isAccountLocked).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null if user not found', async () => {
      lockoutService.isAccountLocked.mockResolvedValue({ isLocked: false });
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password', {});
      expect(result).toBeNull();
      expect(lockoutService.recordFailedAttempt).not.toHaveBeenCalled();
    });

    it('should return null if password is invalid', async () => {
      lockoutService.isAccountLocked.mockResolvedValue({ isLocked: false });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      authCore.password.verify.mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrong-password', {});
      expect(result).toBeNull();
      expect(lockoutService.recordFailedAttempt).toHaveBeenCalledWith(mockUser.id);
      expect(auditLog.logAuthEvent).toHaveBeenCalled();
    });

    it('should return user if validation succeeds', async () => {
      lockoutService.isAccountLocked.mockResolvedValue({ isLocked: false });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      authCore.password.verify.mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'correct-password', {});
      expect(result).toEqual(expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
      }));
      expect(lockoutService.resetFailedAttempts).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      organizationId: 'org-123',
      tokenVersion: 1,
    };

    const mockRes = {
      cookie: jest.fn(),
    };

    beforeEach(() => {
      // Mock getUserPermissions internal call
      jest.spyOn(service as any, 'getUserPermissions').mockResolvedValue({
        permissions: ['lead:read', 'lead:write'],
        roles: ['User'],
      });

      authCore.authCore.issueAccessToken.mockResolvedValue('access-token');
      authCore.tokenManager.issueRefreshToken.mockResolvedValue('refresh-token');
    });

    it('should successfully login user', async () => {
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.login(mockUser, mockRes, {});

      expect(result).toHaveProperty('access_token', 'access-token');
      expect(result.user).toHaveProperty('id', mockUser.id);
      expect(result.user).toHaveProperty('permissions', ['lead:read', 'lead:write']);
      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(auditLog.logAuthEvent).toHaveBeenCalled();
    });

    it('should handle errors during login', async () => {
      authCore.authCore.issueAccessToken.mockRejectedValue(new Error('Token generation failed'));

      await expect(service.login(mockUser, mockRes, {}))
        .rejects.toThrow('Token generation failed');
      
      expect(auditLog.logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILURE',
          actorEmail: mockUser.email,
        })
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      organizationName: 'New Org',
    };

    it('should throw ConflictException if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(registerDto, {}))
        .rejects.toThrow(ConflictException);
    });

    it('should successfully register new user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      authCore.password.hash.mockResolvedValue('hashed-password');
      
      const mockOrg = { id: 'org-123', name: 'New Org' };
      prisma.organization.create.mockResolvedValue(mockOrg);

      const mockNewUser = {
        id: 'user-123',
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        organizationId: mockOrg.id,
      };
      prisma.user.create.mockResolvedValue(mockNewUser);

      // Mock internal methods
      jest.spyOn(service as any, 'createDefaultRolesForOrganization').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'assignSystemAdminRoleToUser').mockResolvedValue(undefined);

      const result = await service.register(registerDto, {});

      expect(result).toHaveProperty('id', mockNewUser.id);
      expect(result).toHaveProperty('email', registerDto.email);
      expect(prisma.organization.create).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
      expect(service['createDefaultRolesForOrganization']).toHaveBeenCalledWith(mockOrg.id);
      expect(service['assignSystemAdminRoleToUser']).toHaveBeenCalledWith(mockNewUser.id, mockOrg.id);
      expect(auditLog.logWithRequest).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const mockUser = {
        email: 'test@example.com',
        organizationId: 'org-123',
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({});

      const mockRes = { clearCookie: jest.fn() };
      const result = await service.logout('user-123', mockRes, {});

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          refreshTokenHash: null,
          tokenVersion: { increment: 1 },
        }),
      });
      expect(auditLog.logAuthEvent).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.logout('user-123', {}, {}))
        .rejects.toThrow('User not found');
    });
  });
});
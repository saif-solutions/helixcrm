import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../../../src/shared/guards/auth.guard';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

// Mock dependencies - keep them simple
const mockJwtService = {
  verifyAsync: jest.fn(),
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret'),
};

// Define a type for request with user property
interface RequestWithUser {
  cookies: Record<string, string>;
  headers: Record<string, string>;
  user?: any;
}

describe('AuthGuard - Isolated Tests', () => {
  let guard: AuthGuard;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: Reflector, useValue: mockReflector },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  describe('no token scenarios', () => {
    it('should throw UnauthorizedException when no token is provided', async () => {
      // Arrange
      const mockRequest: RequestWithUser = { cookies: {}, headers: {} };
      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      };

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(['deal:read']); // requiredPermissions

      // Act & Assert
      await expect(guard.canActivate(mockContext as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('token validation failures', () => {
    it('should throw UnauthorizedException when token verification fails', async () => {
      // Arrange
      const mockRequest: RequestWithUser = {
        cookies: { access_token: 'invalid-token' },
        headers: {},
      };
      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      };

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(['deal:read']); // requiredPermissions

      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(guard.canActivate(mockContext as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token missing required claims', async () => {
      // Arrange
      const mockRequest: RequestWithUser = {
        cookies: { access_token: 'valid-token' },
        headers: {},
      };
      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      };

      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(['deal:read']); // requiredPermissions

      mockJwtService.verifyAsync.mockResolvedValue({
        // missing sub claim
        organizationId: 'org-123',
      });

      // Act & Assert
      await expect(guard.canActivate(mockContext as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('user validation failures', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(['deal:read']); // requiredPermissions

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-123',
        organizationId: 'org-123',
        version: 1,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      const mockRequest: RequestWithUser = {
        cookies: { access_token: 'valid-token' },
        headers: {},
      };
      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(mockContext as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const mockRequest: RequestWithUser = {
        cookies: { access_token: 'valid-token' },
        headers: {},
      };
      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        isActive: false,
        tokenVersion: 1,
      });

      // Act & Assert
      await expect(guard.canActivate(mockContext as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token version mismatches', async () => {
      // Arrange
      const mockRequest: RequestWithUser = {
        cookies: { access_token: 'valid-token' },
        headers: {},
      };
      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        isActive: true,
        tokenVersion: 2, // different from token version 1
      });

      // Act & Assert
      await expect(guard.canActivate(mockContext as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('successful authentication', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(['deal:read']); // requiredPermissions

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-123',
        organizationId: 'org-123',
        version: 1,
      });
    });

    it('should return true when authentication succeeds', async () => {
      // Arrange
      const mockRequest: RequestWithUser = {
        cookies: { access_token: 'valid-token' },
        headers: {},
      };
      const mockContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        isActive: true,
        tokenVersion: 1,
        UserRoles: [],
      });

      // Act
      const result = await guard.canActivate(mockContext as any);

      // Assert
      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });
  });
});

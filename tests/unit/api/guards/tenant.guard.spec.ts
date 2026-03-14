// tests/unit/api/guards/tenant.guard.spec.ts

import { TenantGuard } from '@api/shared/guards/tenant.guard';
import { Reflector } from '@nestjs/core';
import { setTenantId } from '@api/shared/als';
import { ExecutionContext } from '@nestjs/common';

// Mock the ALS module
jest.mock('@api/shared/als', () => ({
  setTenantId: jest.fn(),
}));

// Mock the Logger to avoid console output during tests
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  })),
}));

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockContext: ExecutionContext;
  let mockRequest: any;

  // Save original NODE_ENV
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset NODE_ENV to test default
    process.env.NODE_ENV = 'test';

    reflector = {
      get: jest.fn(),
      getAllAndOverride: jest.fn(),
      getAllAndMerge: jest.fn(),
      getAll: jest.fn(),
    } as any;

    guard = new TenantGuard(reflector);

    mockRequest = {
      path: '/api/leads',
      method: 'GET',
      user: {
        sub: 'user-123',
        organizationId: 'org-123',
        org: 'org-123',
      },
    };

    // Create a proper mock of ExecutionContext
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;

    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('public routes', () => {
    it('should skip tenant check for public routes', () => {
      reflector.get.mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(setTenantId).not.toHaveBeenCalled();
    });

    it('should not log debug in production mode for public routes', () => {
      process.env.NODE_ENV = 'production';
      guard = new TenantGuard(reflector);

      const debugSpy = jest.spyOn((guard as any).logger, 'debug');
      reflector.get.mockReturnValue(true);

      guard.canActivate(mockContext);

      expect(debugSpy).not.toHaveBeenCalled();
    });
  });

  describe('non-public routes', () => {
    beforeEach(() => {
      reflector.get.mockReturnValue(false);
    });

    it('should throw ForbiddenException if no user found', () => {
      mockRequest.user = null;

      expect(() => guard.canActivate(mockContext)).toThrow('Authentication required');
      expect(setTenantId).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user missing organization ID', () => {
      mockRequest.user = { sub: 'user-123' }; // No org or organizationId

      expect(() => guard.canActivate(mockContext)).toThrow('User missing organization context');
      expect(setTenantId).not.toHaveBeenCalled();
    });

    it('should set tenant ID from user.organizationId', () => {
      mockRequest.user = {
        sub: 'user-123',
        organizationId: 'org-456',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(setTenantId).toHaveBeenCalledWith('org-456');
      expect(mockRequest.organizationId).toBe('org-456');
    });

    it('should set tenant ID from user.org if organizationId not present', () => {
      mockRequest.user = {
        sub: 'user-123',
        org: 'org-789',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(setTenantId).toHaveBeenCalledWith('org-789');
      expect(mockRequest.organizationId).toBe('org-789');
    });

    it('should prioritize organizationId over org if both present', () => {
      mockRequest.user = {
        sub: 'user-123',
        organizationId: 'org-456',
        org: 'org-789',
      };

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(setTenantId).toHaveBeenCalledWith('org-456');
      expect(mockRequest.organizationId).toBe('org-456');
    });

    it('should log debug message in non-production mode', () => {
      const debugSpy = jest.spyOn((guard as any).logger, 'log');

      guard.canActivate(mockContext);

      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Tenant context established'));
    });

    it('should mask user ID in logs in production mode', () => {
      process.env.NODE_ENV = 'production';
      guard = new TenantGuard(reflector);

      const logSpy = jest.spyOn((guard as any).logger, 'log');

      guard.canActivate(mockContext);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('user...-123'));
    });

    it('should log error when user missing organization ID', () => {
      mockRequest.user = { sub: 'user-123' };
      const errorSpy = jest.spyOn((guard as any).logger, 'error');

      expect(() => guard.canActivate(mockContext)).toThrow('User missing organization context');
      expect(errorSpy).toHaveBeenCalledWith(
        'User missing organization ID',
        JSON.stringify({
          userId: 'user...-123',
          path: '/api/leads',
        }),
      );
    });

    it('should handle unexpected errors gracefully', () => {
      // Force an unexpected error by making reflector.get throw
      reflector.get.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const errorSpy = jest.spyOn((guard as any).logger, 'error');

      expect(() => guard.canActivate(mockContext)).toThrow('Tenant context validation failed');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error'),
        expect.any(String),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle malformed user object', () => {
      mockRequest.user = {
        sub: 'user-123',
        organizationId: null,
        org: undefined,
      };

      expect(() => guard.canActivate(mockContext)).toThrow('User missing organization context');
    });

    it('should handle undefined request', () => {
      // Create a proper ExecutionContext mock with undefined request
      const emptyContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(undefined),
          getResponse: jest.fn(),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(emptyContext)).toThrow('Tenant context validation failed');
    });
  });
});

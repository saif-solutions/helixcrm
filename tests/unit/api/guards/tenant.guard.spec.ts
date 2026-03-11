import { TenantGuard } from '@api/shared/guards/tenant.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { setTenantId } from '@api/shared/als';
import { IS_PUBLIC_KEY } from '@api/shared/decorators/require-permission.decorator';

// Mock the ALS module
jest.mock('../../../src/shared/als', () => ({
  setTenantId: jest.fn(),
}));

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: Reflector;
  let mockContext: any;
  let mockRequest: any;

  beforeEach(async () => {
    reflector = new Reflector();
    guard = new TenantGuard(reflector);

    mockRequest = {
      path: '/api/leads',
      user: {
        sub: 'user-123',
        organizationId: 'org-123',
        org: 'org-123',
      },
    };

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('public routes', () => {
    it('should skip tenant check for public routes', async () => {
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return true;
        return false;
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(setTenantId).not.toHaveBeenCalled();
    });
  });

  describe('non-public routes', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'get').mockReturnValue(false);
    });

    it('should throw ForbiddenException if no user found', async () => {
      mockRequest.user = null;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      expect(setTenantId).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user missing organization ID', async () => {
      mockRequest.user = { sub: 'user-123' }; // No org or organizationId

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      expect(setTenantId).not.toHaveBeenCalled();
    });

    it('should set tenant ID from user.organizationId', async () => {
      mockRequest.user = {
        sub: 'user-123',
        organizationId: 'org-456',
      };

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(setTenantId).toHaveBeenCalledWith('org-456');
      expect(mockRequest.organizationId).toBe('org-456');
    });

    it('should set tenant ID from user.org if organizationId not present', async () => {
      mockRequest.user = {
        sub: 'user-123',
        org: 'org-789',
      };

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(setTenantId).toHaveBeenCalledWith('org-789');
      expect(mockRequest.organizationId).toBe('org-789');
    });

    it('should log debug message for public routes', async () => {
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === IS_PUBLIC_KEY) return true;
        return false;
      });

      const debugSpy = jest.spyOn((guard as any).logger, 'debug');

      await guard.canActivate(mockContext);

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping TenantGuard for public route')
      );
    });

    it('should log error when user missing organization ID', async () => {
      mockRequest.user = { sub: 'user-123' };
      const errorSpy = jest.spyOn((guard as any).logger, 'error');

      try {
        await guard.canActivate(mockContext);
      } catch (error) {
        expect(errorSpy).toHaveBeenCalledWith(
          'User missing organization ID',
          { userId: 'user-123' }
        );
      }
    });
  });
});
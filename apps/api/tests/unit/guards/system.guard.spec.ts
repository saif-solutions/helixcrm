import { Test, TestingModule } from '@nestjs/testing';
import { SystemGuard } from '../../../src/shared/guards/system.guard';
import { TenantContextService } from '../../../src/shared/tenant/context/tenant-context.service';
import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';

describe('SystemGuard', () => {
  let guard: SystemGuard;
  let tenantContextService: jest.Mocked<TenantContextService>;
  let mockContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(async () => {
    mockRequest = {
      path: '/api/system/health',
      method: 'GET',
    };

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    tenantContextService = {
      resolveContext: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemGuard,
        { provide: TenantContextService, useValue: tenantContextService },
      ],
    }).compile();

    guard = module.get<SystemGuard>(SystemGuard);
  });

  describe('successful system context', () => {
    it('should allow access when system context is resolved', () => {
      // Arrange
      tenantContextService.resolveContext.mockReturnValue({
        isSystemContext: true,
        tenantId: undefined,
        organizationId: undefined,
        resolvedAt: new Date(),
        source: 'system', // Valid source: 'system'
      });

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect(tenantContextService.resolveContext).toHaveBeenCalledWith(
        mockRequest,
        {
          requireTenantContext: false,
          allowSystemContext: true,
        },
      );
    });
  });

  describe('failed system context', () => {
    it('should throw ForbiddenException when context is not system context', () => {
      // Arrange
      tenantContextService.resolveContext.mockReturnValue({
        isSystemContext: false,
        tenantId: 'org-123',
        organizationId: 'org-123',
        resolvedAt: new Date(),
        source: 'token', // Valid source: 'token' (from JWT)
      });

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'System context required',
      );
    });

    it('should throw ForbiddenException when resolveContext throws error', () => {
      // Arrange
      tenantContextService.resolveContext.mockImplementation(() => {
        throw new Error('Tenant context error');
      });

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'System context required: Tenant context error',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle undefined request gracefully', () => {
      // Arrange
      const emptyContext = {
        switchToHttp: () => ({
          getRequest: () => undefined,
        }),
      } as ExecutionContext;

      tenantContextService.resolveContext.mockImplementation(() => {
        throw new Error('Cannot read properties of undefined');
      });

      // Act & Assert
      expect(() => guard.canActivate(emptyContext)).toThrow(ForbiddenException);
    });

    it('should handle null tenant context result', () => {
      // Arrange
      tenantContextService.resolveContext.mockReturnValue(null as any);

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });
});

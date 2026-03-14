// tests/unit/api/guards/system.guard.spec.ts
import { SystemGuard } from '@api/shared/guards/system.guard';
import { TenantContextService } from '@api/shared/tenant/context/tenant-context.service';
import { ExecutionContext } from '@nestjs/common';

// Mock the TenantContextService
jest.mock('@api/shared/tenant/context/tenant-context.service');

// Mock the entire Logger to avoid Date.now issues
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  Logger: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));


// Mock Date.now globally for all tests
describe('SystemGuard', () => {
  let guard: SystemGuard;
  let tenantContextService: jest.Mocked<TenantContextService>;
  let mockContext: ExecutionContext;
  let mockRequest: any;

  // Mock date for consistent testing
  const mockDate = new Date('2024-01-01T00:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  
  // Create mock request
  mockRequest = {
    path: '/api/system/health',
    method: 'GET',
    headers: {},
    url: '/api/system/health',
  };

  // Create mock execution context
  mockContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
    }),
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn().mockReturnValue({}),
  } as unknown as ExecutionContext;

  // Create mocked tenant context service
  tenantContextService = {
    resolveContext: jest.fn(),
  } as any;

  // Create guard instance
  guard = new SystemGuard(tenantContextService);
});

afterEach(() => {
  jest.clearAllMocks();
});

  // ==================== BASIC TESTS ====================
  describe('basic functionality', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should have logger instance', () => {
      expect((guard as any).logger).toBeDefined();
    });
  });

  // ==================== SUCCESSFUL SYSTEM CONTEXT TESTS ====================
  describe('successful system context', () => {
    it('should allow access when system context is resolved', () => {
      // Arrange - System context with isSystemContext = true
const mockSystemContext = {
  tenantId: undefined,
  organizationId: undefined,
  userId: undefined,
  source: 'system' as const, // Add 'as const' to make it a literal type
  resolvedAt: mockDate,
  isSystemContext: true,
};

      tenantContextService.resolveContext.mockReturnValue(mockSystemContext);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect(tenantContextService.resolveContext).toHaveBeenCalledTimes(1);
      expect(tenantContextService.resolveContext).toHaveBeenCalledWith(mockRequest, {
        requireTenantContext: false,
        allowSystemContext: true,
      });
    });

    it('should allow access even with tenantId undefined in system context', () => {
      // Arrange
      const mockSystemContext = {
        tenantId: undefined,
        organizationId: undefined,
        userId: undefined,
        source: 'system' as const,
        resolvedAt: mockDate,
        isSystemContext: true,
      };

      tenantContextService.resolveContext.mockReturnValue(mockSystemContext);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ==================== FAILED SYSTEM CONTEXT TESTS ====================
  describe('failed system context', () => {
    it('should throw ForbiddenException when context is not system context (isSystemContext = false)', () => {
      // Arrange - Regular tenant context (not system)
const mockTenantContext = {
  tenantId: 'org-123',
  organizationId: 'org-123',
  userId: 'user-123',
  source: 'token' as const, // Add 'as const'
  resolvedAt: mockDate,
  isSystemContext: false,
};

      tenantContextService.resolveContext.mockReturnValue(mockTenantContext);

      // Act & Assert
// Act & Assert
expect(() => guard.canActivate(mockContext)).toThrow(
  'System context required: This route requires system context (no tenant)',
);
    });

    it('should throw ForbiddenException when resolveContext throws a generic error', () => {
      // Arrange
      const errorMessage = 'Tenant context error';
      tenantContextService.resolveContext.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // Act & Assert
expect(() => guard.canActivate(mockContext)).toThrow(
  `System context required: ${errorMessage}`,
);
    });

    it('should throw ForbiddenException when resolveContext throws a custom error', () => {
      // Arrange
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      tenantContextService.resolveContext.mockImplementation(() => {
        throw new CustomError('Custom tenant error');
      });

      // Act & Assert
expect(() => guard.canActivate(mockContext)).toThrow(
  'System context required: Custom tenant error',
);
    });

    it('should throw ForbiddenException when resolveContext throws a non-Error object', () => {
      // Arrange - Simulate throwing a string
      tenantContextService.resolveContext.mockImplementation(() => {
        // Use type assertion to bypass TypeScript's throw check
        throw 'String error message';
      });

      // Act & Assert
expect(() => guard.canActivate(mockContext)).toThrow(
  'System context required: Unknown error',
);
    });

    it('should throw ForbiddenException when resolveContext throws null', () => {
      // Arrange
      tenantContextService.resolveContext.mockImplementation(() => {
        throw null;
      });

      // Act & Assert
expect(() => guard.canActivate(mockContext)).toThrow(
  'System context required: Unknown error',
);
    });

it('should throw ForbiddenException when resolveContext returns null', () => {
  // Arrange
  tenantContextService.resolveContext.mockReturnValue(null as any);

// Act & Assert
expect(() => guard.canActivate(mockContext)).toThrow(
  'System context required: Cannot read properties of null (reading \'isSystemContext\')',
);
});

it('should throw ForbiddenException when resolveContext returns undefined', () => {
  // Arrange
  tenantContextService.resolveContext.mockReturnValue(undefined as any);

// Act & Assert
expect(() => guard.canActivate(mockContext)).toThrow(
  'System context required: Cannot read properties of undefined (reading \'isSystemContext\')',
);
});
  });

  // ==================== EDGE CASES ====================
  describe('edge cases', () => {
it('should handle undefined request gracefully', () => {
  // Arrange
  const emptyContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(undefined),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  tenantContextService.resolveContext.mockImplementation(() => {
    throw new TypeError('Cannot read properties of undefined');
  });

  // Act & Assert
  expect(() => guard.canActivate(emptyContext)).toThrow(TypeError); // Expect TypeError, not ForbiddenException
  expect(() => guard.canActivate(emptyContext)).toThrow(
    'Cannot read properties of undefined', // The actual error message
  );
});

    it('should handle different HTTP methods', () => {
      // Arrange - Test with different HTTP methods
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      methods.forEach(method => {
        mockRequest.method = method;
        
        const mockSystemContext = {
          tenantId: undefined,
          organizationId: undefined,
          userId: undefined,
          source: 'system' as const,
          resolvedAt: mockDate,
          isSystemContext: true,
        };

        tenantContextService.resolveContext.mockReturnValue(mockSystemContext);

        // Act & Assert
        expect(guard.canActivate(mockContext)).toBe(true);
      });
    });

    it('should handle different system paths', () => {
      // Arrange - Test with various system paths
      const paths = [
        '/api/system/health',
        '/api/system/metrics',
        '/api/system/info',
        '/api/system/config',
        '/system/admin',
      ];
      
      paths.forEach(path => {
        mockRequest.path = path;
        mockRequest.url = path;
        
        const mockSystemContext = {
          tenantId: undefined,
          organizationId: undefined,
          userId: undefined,
          source: 'system' as const,
          resolvedAt: mockDate,
          isSystemContext: true,
        };

        tenantContextService.resolveContext.mockReturnValue(mockSystemContext);

        // Act & Assert
        expect(guard.canActivate(mockContext)).toBe(true);
      });
    });

    it('should handle resolveContext throwing error with missing message property', () => {
      // Arrange
      const errorWithoutMessage = { code: 'TENANT_ERROR' };
      tenantContextService.resolveContext.mockImplementation(() => {
        throw errorWithoutMessage;
      });

// Act & Assert
expect(() => guard.canActivate(mockContext)).toThrow(
  'System context required: Unknown error',
);
    });

    it('should log error when system guard fails', () => {
      // Arrange
      const loggerSpy = jest.spyOn((guard as any).logger, 'error');
      
      const mockTenantContext = {
        tenantId: 'org-123',
        organizationId: 'org-123',
        userId: 'user-123',
        source: 'token' as const,
        resolvedAt: mockDate,
        isSystemContext: false,
      };

      tenantContextService.resolveContext.mockReturnValue(mockTenantContext);

      // Act
      try {
        guard.canActivate(mockContext);
      } catch {
        // Expected
      }

      // Assert
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should log debug on successful system context', () => {
      // Arrange
      const debugSpy = jest.spyOn((guard as any).logger, 'debug');
      
      const mockSystemContext = {
        tenantId: undefined,
        organizationId: undefined,
        userId: undefined,
        source: 'system' as const,
        resolvedAt: mockDate,
        isSystemContext: true,
      };

      tenantContextService.resolveContext.mockReturnValue(mockSystemContext);

      // Act
      guard.canActivate(mockContext);

      // Assert
      expect(debugSpy).toHaveBeenCalled();
    });
  });

  // ==================== INTEGRATION STYLE TESTS ====================
  describe('integration style', () => {
    it('should handle the complete flow with valid system context', () => {
      // Arrange
      const mockSystemContext = {
        tenantId: undefined,
        organizationId: undefined,
        userId: undefined,
        source: 'system' as const,
        resolvedAt: mockDate,
        isSystemContext: true,
      };

      tenantContextService.resolveContext.mockReturnValue(mockSystemContext);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect(tenantContextService.resolveContext).toHaveBeenCalledWith(
        expect.objectContaining({
          path: mockRequest.path,
          method: mockRequest.method,
        }),
        expect.objectContaining({
          requireTenantContext: false,
          allowSystemContext: true,
        }),
      );
    });

    it('should handle resolveContext returning context with additional properties', () => {
      // Arrange - Context with extra properties
      const mockSystemContext = {
        tenantId: undefined,
        organizationId: undefined,
        userId: undefined,
        source: 'system' as const,
        resolvedAt: mockDate,
        isSystemContext: true,
        extraProperty: 'should be ignored',
        nestedData: { key: 'value' },
      };

      tenantContextService.resolveContext.mockReturnValue(mockSystemContext as any);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });
  });
});
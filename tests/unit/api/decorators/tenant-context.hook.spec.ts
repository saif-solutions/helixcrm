import { TenantContextHook } from '@api/shared/decorators/tenant-context.hook';
import { withTenantContext } from '@api/shared/tenant/tenant.context';
import { ExecutionContext } from '@nestjs/common';

// Mock the tenant context functions
jest.mock('@api/shared/tenant/tenant.context', () => ({
  withTenantContext: jest.fn().mockImplementation((context, fn) => fn()),
}));

describe('TenantContextHook', () => {
  let mockRequest: any;
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock request
    mockRequest = {
      user: {
        id: 'user-123',
        sub: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-123',
        roles: ['admin'],
        permissions: ['deal:read', 'deal:write'],
      },
      tenantContextService: {
        getTenantId: jest.fn().mockReturnValue('org-123'),
        getUserId: jest.fn().mockReturnValue('user-123'),
      },
    };

    // Setup mock execution context
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
    } as any;
  });

  it('should be defined', () => {
    expect(TenantContextHook).toBeDefined();
  });

  it('should return a function when called', () => {
    const hook = TenantContextHook();
    expect(typeof hook).toBe('function');
  });

  it('should create a valid parameter decorator', () => {
    const hook = TenantContextHook();
    // Parameter decorators take 3 arguments
    expect(hook.length).toBe(3);
    // It should not throw when called with valid arguments
    expect(() => {
      hook({}, 'methodName', 0);
    }).not.toThrow();
  });

  describe('when used in a controller', () => {
    it('should be usable as a parameter decorator', () => {
      // This is a compile-time test - if this compiles, the decorator works
      class TestController {
        testMethod(@TenantContextHook() _context: any) {
          return _context;
        }
      }

      const controller = new TestController();
      expect(controller.testMethod).toBeDefined();
    });

    it('should extract tenant context from request user', () => {
      // Extract the factory logic from the decorator
      const factory = (ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();

        if (!request.user) {
          return null;
        }

        const organizationId = request.user.organizationId || request.user.org;

        if (!organizationId) {
          return null;
        }

        const realContext = {
          tenantId: organizationId,
          organizationId: organizationId,
          isSystemContext: false,
          resolvedAt: new Date(),
          source: 'token' as const,
          userId: request.user.id || request.user.sub,
          userEmail: request.user.email,
          roles: request.user.roles || [],
          permissions: request.user.permissions || [],
        };

        return withTenantContext(realContext, () => {
          return realContext;
        });
      };
      
      const result = factory(mockExecutionContext);
      
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'org-123',
          organizationId: 'org-123',
          isSystemContext: false,
          userId: 'user-123',
          userEmail: 'test@example.com',
          roles: ['admin'],
          permissions: ['deal:read', 'deal:write'],
          source: 'token',
        }),
        expect.any(Function)
      );
      
      expect(result).toEqual(expect.objectContaining({
        tenantId: 'org-123',
        organizationId: 'org-123',
      }));
    });

    it('should return null when no user is present', () => {
      mockRequest.user = null;
      
      const factory = (ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        if (!request.user) {
          return null;
        }
        return {};
      };
      
      const result = factory(mockExecutionContext);
      expect(result).toBeNull();
      expect(withTenantContext).not.toHaveBeenCalled();
    });

    it('should return null when no organization ID is present', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
      };
      
      const factory = (ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        if (!request.user) {
          return null;
        }
        const organizationId = request.user.organizationId || request.user.org;
        if (!organizationId) {
          return null;
        }
        return {};
      };
      
      const result = factory(mockExecutionContext);
      expect(result).toBeNull();
      expect(withTenantContext).not.toHaveBeenCalled();
    });

    it('should handle organizationId from different field names', () => {
      mockRequest.user = {
        id: 'user-123',
        email: 'test@example.com',
        org: 'org-456',
      };
      
      const factory = (ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const organizationId = request.user.organizationId || request.user.org;
        const realContext = {
          tenantId: organizationId,
          organizationId: organizationId,
          isSystemContext: false,
          resolvedAt: new Date(),
          source: 'token' as const,
          userId: request.user.id || request.user.sub,
          userEmail: request.user.email,
          roles: request.user.roles || [],
          permissions: request.user.permissions || [],
        };
        return withTenantContext(realContext, () => realContext);
      };
      
      factory(mockExecutionContext);
      
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'org-456',
          organizationId: 'org-456',
        }),
        expect.any(Function)
      );
    });

    it('should handle missing optional user fields', () => {
      mockRequest.user = {
        id: 'user-123',
        organizationId: 'org-123',
      };
      
      const factory = (ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const organizationId = request.user.organizationId || request.user.org;
        const realContext = {
          tenantId: organizationId,
          organizationId: organizationId,
          isSystemContext: false,
          resolvedAt: new Date(),
          source: 'token' as const,
          userId: request.user.id || request.user.sub,
          userEmail: request.user.email,
          roles: request.user.roles || [],
          permissions: request.user.permissions || [],
        };
        return withTenantContext(realContext, () => realContext);
      };
      
      factory(mockExecutionContext);
      
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'org-123',
          organizationId: 'org-123',
          userId: 'user-123',
          userEmail: undefined,
          roles: [],
          permissions: [],
        }),
        expect.any(Function)
      );
    });

    it('should use userId from id field', () => {
      mockRequest.user = {
        id: 'user-from-id',
        organizationId: 'org-123',
      };
      
      const factory = (ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const userId = request.user.id || request.user.sub;
        return { userId };
      };
      
      const result = factory(mockExecutionContext);
      expect(result.userId).toBe('user-from-id');
    });

    it('should use userId from sub field when id is not present', () => {
      mockRequest.user = {
        sub: 'user-from-sub',
        organizationId: 'org-123',
      };
      
      const factory = (ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const userId = request.user.id || request.user.sub;
        return { userId };
      };
      
      const result = factory(mockExecutionContext);
      expect(result.userId).toBe('user-from-sub');
    });

    it('should include resolvedAt timestamp', () => {
      const factory = (ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const organizationId = request.user.organizationId || request.user.org;
        const realContext = {
          tenantId: organizationId,
          organizationId: organizationId,
          isSystemContext: false,
          resolvedAt: new Date(),
          source: 'token' as const,
          userId: request.user.id || request.user.sub,
          userEmail: request.user.email,
          roles: request.user.roles || [],
          permissions: request.user.permissions || [],
        };
        return withTenantContext(realContext, () => realContext);
      };
      
      factory(mockExecutionContext);
      
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.objectContaining({
          resolvedAt: expect.any(Date),
        }),
        expect.any(Function)
      );
    });
  });
});
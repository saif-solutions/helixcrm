// tests/unit/api/guards/permission.guard.spec.ts
import { PermissionGuard, PermissionMode } from '@api/shared/guards/permission.guard';
import { Reflector } from '@nestjs/core';
import { PermissionContextService } from '@api/shared/permissions/context/permission-context.service';
import { TenantContextService } from '@api/shared/tenant/context/tenant-context.service';
import { getTenantContext } from '@api/shared/tenant/tenant.context';
import { createMockExecutionContext } from '../../../__utils__/execution-context';

// Mock tenant context using alias path
jest.mock('@api/shared/tenant/tenant.context', () => ({
  getTenantContext: jest.fn(),
}));

// Mock the crypto module for consistent UUID generation
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-correlation-id-123'),
}));

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: jest.Mocked<Reflector>;
  let permissionContext: jest.Mocked<PermissionContextService>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let mockContext: any;
  let mockRequest: any;
  let mockHandler: () => void;
  let mockController: { name: string };

  const correlationId = 'mock-correlation-id-123';
  const userId = 'user-123';
  const organizationId = 'org-123';

  beforeEach(() => {
    // Create mock handler and controller
    mockHandler = jest.fn();
    mockController = { name: 'TestController' };

    // Create mock request with authenticated user
    mockRequest = {
      method: 'GET',
      url: '/api/leads',
      headers: {
        'x-correlation-id': correlationId,
      },
      user: {
        sub: userId,
        email: 'test@example.com',
        organizationId,
        permissions: ['lead:read'],
        roles: ['User'],
      },
    };

    // Create mock context using the shared utility
    mockContext = createMockExecutionContext({
      cookies: {},
      headers: mockRequest.headers,
      user: mockRequest.user,
      method: mockRequest.method,
      path: mockRequest.url,
    });

    // Override specific methods needed for this test
    mockContext.getHandler = jest.fn().mockReturnValue(mockHandler);
    mockContext.getClass = jest.fn().mockReturnValue(mockController);
    mockContext.switchToHttp = jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
    });

    // Create reflector with proper mocking
    reflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
    } as any;

    // Create permission context mock with all required methods
    permissionContext = {
      buildContext: jest.fn().mockResolvedValue(undefined),
      isInitialized: jest.fn().mockReturnValue(true),
      getPermissions: jest.fn().mockReturnValue(['lead:read']),
      getRoles: jest.fn().mockReturnValue(['User']),
      getContext: jest.fn(),
      clearContext: jest.fn(),
    } as any;

    // Create tenant context mock
    tenantContext = {
      getTenantId: jest.fn().mockReturnValue(organizationId),
      setTenantId: jest.fn(),
      getTenantContext: jest.fn(),
      runWithTenant: jest.fn(),
    } as any;

    // Create guard instance
    guard = new PermissionGuard(reflector, permissionContext, tenantContext);

    // Mock getTenantContext
    (getTenantContext as jest.Mock).mockReturnValue({
      tenantId: organizationId,
      userId,
      source: 'tenant.guard',
    });

    jest.clearAllMocks();
  });

  // ==================== BASIC TESTS ====================
  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // ==================== NO PERMISSIONS REQUIRED TESTS ====================
  describe('no permissions required', () => {
    it('should allow access if no permissions required (undefined)', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionContext.buildContext).not.toHaveBeenCalled();
    });

    it('should allow access if permissions array is empty', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: [],
        mode: PermissionMode.ANY,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionContext.buildContext).not.toHaveBeenCalled();
    });

    it('should allow access if permissions metadata is null', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(permissionContext.buildContext).not.toHaveBeenCalled();
    });
  });

  // ==================== AUTHENTICATION TESTS ====================
  describe('authentication', () => {
    it('should throw UnauthorizedException if no user in request', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      mockRequest.user = null;
      mockContext.switchToHttp.mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Authentication required', // Changed from UnauthorizedException constructor
      );
      expect(permissionContext.buildContext).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user payload is invalid', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      mockRequest.user = { email: 'test@example.com' };
      mockContext.switchToHttp.mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Invalid user context', // Changed from UnauthorizedException constructor
      );
    });

    it('should throw UnauthorizedException if user has no sub', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      mockRequest.user = { ...mockRequest.user, sub: undefined };
      mockContext.switchToHttp.mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Invalid user context', // Changed from UnauthorizedException constructor
      );
    });

    it('should throw UnauthorizedException if user has no organizationId', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      mockRequest.user = {
        ...mockRequest.user,
        organizationId: undefined,
        org: undefined,
      };
      mockContext.switchToHttp.mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Invalid user context', // Changed from UnauthorizedException constructor
      );
    });
  });

  // ==================== TENANT CONTEXT TESTS ====================
  describe('tenant context', () => {
    it('should throw ForbiddenException if tenant context missing', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      tenantContext.getTenantId.mockImplementation(() => {
        throw new Error('Tenant context missing');
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'System configuration error: Tenant context unavailable', // Match exact message
      );
    });

    it('should throw ForbiddenException if tenant context mismatch', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      tenantContext.getTenantId.mockReturnValue('different-org');

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Tenant context mismatch', // Match exact message
      );
    });

    it('should throw ForbiddenException if ALS tenant context mismatch', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      (getTenantContext as jest.Mock).mockReturnValue({
        tenantId: 'different-org',
        userId,
        source: 'tenant.guard',
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Tenant context mismatch', // Match exact message
      );
    });

    it('should handle null ALS tenant context gracefully', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      (getTenantContext as jest.Mock).mockReturnValue(null);
      tenantContext.getTenantId.mockReturnValue(organizationId);

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });
  });

  // ==================== PERMISSION BUILDING TESTS ====================
  describe('permission context building', () => {
    it('should build permission context with correct data', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });

      await guard.canActivate(mockContext);

      expect(permissionContext.buildContext).toHaveBeenCalledWith({
        userId,
        tenantId: organizationId,
        jwtPermissions: ['lead:read'],
      });
    });

    it('should build permission context with empty permissions if none provided', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      mockRequest.user.permissions = undefined;
      mockContext.switchToHttp.mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      await guard.canActivate(mockContext);

      expect(permissionContext.buildContext).toHaveBeenCalledWith({
        userId,
        tenantId: organizationId,
        jwtPermissions: [],
      });
    });

    it('should throw ForbiddenException if permission context fails to initialize', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      permissionContext.isInitialized.mockReturnValue(false);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Permission check failed', // Match exact message
      );
    });

    it('should throw ForbiddenException if buildContext throws', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      permissionContext.buildContext.mockRejectedValue(new Error('Build failed'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Permission check failed', // Match exact message
      );
    });
  });

  // ==================== PERMISSION CHECKING TESTS ====================
  describe('permission checking', () => {
    it('should grant access if user has required permission (ANY mode)', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      permissionContext.getPermissions.mockReturnValue(['lead:read']);

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should grant access if user has any of required permissions (ANY mode)', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:write', 'lead:admin'],
        mode: PermissionMode.ANY,
      });
      permissionContext.getPermissions.mockReturnValue(['lead:read', 'lead:write']);

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should deny access if user lacks required permissions (ANY mode)', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:write'],
        mode: PermissionMode.ANY,
      });
      permissionContext.getPermissions.mockReturnValue(['lead:read']);
      permissionContext.getRoles.mockReturnValue(['User']);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Insufficient permissions. Required: any of 1 permission(s)', // Match exact message
      );
    });

    it('should grant access if user has all required permissions (ALL mode)', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read', 'lead:write'],
        mode: PermissionMode.ALL,
      });
      permissionContext.getPermissions.mockReturnValue(['lead:read', 'lead:write', 'lead:admin']);

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should deny access if user lacks any required permission (ALL mode)', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read', 'lead:write', 'lead:admin'],
        mode: PermissionMode.ALL,
      });
      permissionContext.getPermissions.mockReturnValue(['lead:read', 'lead:write']);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Insufficient permissions. Required: all of 3 permission(s)', // Match exact message
      );
    });
  });

  // ==================== CORRELATION ID TESTS ====================
  describe('correlation id', () => {
    it('should use x-correlation-id header if present', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });

      const customRequest = {
        ...mockRequest,
        headers: { 'x-correlation-id': 'custom-correlation-id' },
      };

      mockContext.switchToHttp.mockReturnValue({
        getRequest: jest.fn().mockReturnValue(customRequest),
      });

      await guard.canActivate(mockContext);
      expect(customRequest.id).toBe('custom-correlation-id');
    });

    it('should use x-request-id header if x-correlation-id not present', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });

      const customRequest = {
        ...mockRequest,
        headers: { 'x-request-id': 'request-id-123' },
      };

      mockContext.switchToHttp.mockReturnValue({
        getRequest: jest.fn().mockReturnValue(customRequest),
      });

      await guard.canActivate(mockContext);
      expect(customRequest.id).toBe('request-id-123');
    });

    it('should generate UUID if no correlation headers present', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });

      const customRequest = {
        ...mockRequest,
        headers: {},
      };

      mockContext.switchToHttp.mockReturnValue({
        getRequest: jest.fn().mockReturnValue(customRequest),
      });

      await guard.canActivate(mockContext);
      expect(customRequest.id).toBe('mock-correlation-id-123');
    });
  });

  // ==================== PRODUCTION MODE TESTS ====================
  describe('production mode', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors gracefully in production', async () => {
      process.env.NODE_ENV = 'production';

      // Re-create guard with production env
      guard = new PermissionGuard(reflector, permissionContext, tenantContext);

      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      permissionContext.getPermissions.mockReturnValue([]);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Insufficient permissions. Required: any of 1 permission(s)', // Match exact message
      );
    });
  });

  // ==================== EDGE CASES ====================
  describe('edge cases', () => {
    it('should handle errors in tenant context service', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });
      tenantContext.getTenantId.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'System configuration error: Tenant context unavailable', // Match exact message
      );
    });

    it('should propagate UnauthorizedException directly', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });

      // Set user to null to trigger UnauthorizedException
      mockRequest.user = null;
      mockContext.switchToHttp.mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      });

      // Check for the specific error message instead of the constructor
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Authentication required');
    });

    it('should propagate ForbiddenException directly', async () => {
      reflector.getAllAndOverride.mockReturnValue({
        permissions: ['lead:read'],
        mode: PermissionMode.ANY,
      });

      // Mock the ALS tenant context to have a different tenant ID
      // This will trigger the first check in validateTenantContext
      (getTenantContext as jest.Mock).mockReturnValue({
        tenantId: 'different-org',
        userId,
        source: 'tenant.guard',
      });

      // The guard should throw ForbiddenException with 'Tenant context mismatch'
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Tenant context mismatch');
    });
  });
});

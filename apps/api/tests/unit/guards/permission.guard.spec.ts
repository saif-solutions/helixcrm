import { PermissionGuard } from '../../../src/shared/guards/permission.guard';
import { Reflector } from '@nestjs/core';
import { PermissionContextService } from '../../../src/shared/permissions/context/permission-context.service';
import { TenantContextService } from '../../../src/shared/tenant/context/tenant-context.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PERMISSION_KEY } from '../../../src/shared/decorators/require-permission.decorator';
import { getTenantContext } from '../../../src/shared/tenant/tenant.context';

// Mock tenant context
jest.mock('../../../src/shared/tenant/tenant.context', () => ({
  getTenantContext: jest.fn(),
}));

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;
  let permissionContext: jest.Mocked<PermissionContextService>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let mockContext: any;
  let mockRequest: any;

  beforeEach(() => {
    reflector = new Reflector();
    permissionContext = {
      buildContext: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true),
      getPermissions: jest.fn().mockReturnValue([]),
      getRoles: jest.fn().mockReturnValue([]),
      hasAnyPermission: jest.fn(),
    } as any;

    tenantContext = {
      getTenantId: jest.fn().mockReturnValue('org-123'),
    } as any;

    guard = new PermissionGuard(reflector, permissionContext, tenantContext);

    mockRequest = {
      method: 'GET',
      url: '/api/leads',
      user: {
        sub: 'user-123',
        id: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-123',
        org: 'org-123',
        permissions: ['lead:read'],
        roles: ['User'],
      },
    };

mockContext = {
  switchToHttp: () => ({
    getRequest: () => mockRequest,
  }),
  getHandler: jest.fn().mockReturnValue({ name: 'testHandler' }),
  getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
};

    (getTenantContext as jest.Mock).mockReturnValue({
      tenantId: 'org-123',
      userId: 'user-123',
      source: 'tenant.guard',
    });

    jest.clearAllMocks();
  });

  it('should allow access if no permissions required', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(permissionContext.buildContext).not.toHaveBeenCalled();
  });

  it('should allow access for public routes (empty permissions)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(permissionContext.buildContext).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if no user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['lead:read']);
    mockRequest.user = null;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if tenant context missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['lead:read']);
    tenantContext.getTenantId.mockImplementation(() => {
      throw new Error('Tenant context missing');
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  it('should build permission context and grant access if user has permission', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['lead:read']);
    permissionContext.hasAnyPermission.mockReturnValue(true);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(permissionContext.buildContext).toHaveBeenCalledWith({
      userId: 'user-123',
      tenantId: 'org-123',
      jwtPermissions: ['lead:read'],
    });
    expect(permissionContext.hasAnyPermission).toHaveBeenCalledWith(['lead:read']);
  });

  it('should deny access if user lacks required permissions', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['lead:write']);
    permissionContext.hasAnyPermission.mockReturnValue(false);
    permissionContext.getPermissions.mockReturnValue(['lead:read']);
    permissionContext.getRoles.mockReturnValue(['User']);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    expect(permissionContext.hasAnyPermission).toHaveBeenCalledWith(['lead:write']);
  });

  it('should handle multiple required permissions (OR logic)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['lead:write', 'lead:admin']);
    permissionContext.hasAnyPermission.mockReturnValue(true);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(permissionContext.hasAnyPermission).toHaveBeenCalledWith(['lead:write', 'lead:admin']);
  });

  it('should throw ForbiddenException if permission context fails to initialize', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['lead:read']);
    permissionContext.isInitialized.mockReturnValue(false);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });
});
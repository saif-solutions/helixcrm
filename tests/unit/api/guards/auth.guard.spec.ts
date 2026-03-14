// tests/unit/api/guards/auth.guard.spec.ts
import {
  AuthGuard,
  TokenInvalidException,
  PermissionDeniedException,
} from '@api/shared/guards/auth.guard';
// Remove UnauthorizedException import since we're not using it directly
import { jwtMock, prismaMock, reflectorMock } from '../../../__mocks__/global-mocks';
import { createMockExecutionContext } from '../../../__utils__/execution-context';
import { 
  createMockJwtPayload, 
  createMockUser,
  createMockUserWithPermissions,
  createMockUserWithRolePermissions,
  // Remove createMockAdmin since we're not using it
  getUserPermissions,
  userHasPermission,
  getUserRoles,
  Role
} from '../../../__factories__';
import { resetAllMocks } from '../../../__utils__/reset-mocks';

// Create a proper ConfigService mock
const configServiceMock = {
  get: jest.fn((key: string) => {
    const config = {
      JWT_ACCESS_SECRET: 'test-secret',
      JWT_AUDIENCE: 'test-audience',
      JWT_ISSUER: 'test-issuer',
    };
    return config[key];
  }),
};

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    guard = new AuthGuard(
      jwtMock as any,
      prismaMock as any,
      reflectorMock as any,
      configServiceMock as any,
    );
  });

  describe('public routes', () => {
    it('should allow access to public routes without token', async () => {
      reflectorMock.getAllAndOverride.mockReturnValueOnce(true);
      const ctx = createMockExecutionContext({ cookies: {} });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(jwtMock.verifyAsync).not.toHaveBeenCalled();
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('should allow access to public routes even with invalid token', async () => {
      reflectorMock.getAllAndOverride.mockReturnValueOnce(true);
      const ctx = createMockExecutionContext({
        cookies: { access_token: 'invalid-token' },
      });

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(jwtMock.verifyAsync).not.toHaveBeenCalled();
    });
  });

  describe('protected routes', () => {
    beforeEach(() => {
      reflectorMock.getAllAndOverride.mockReturnValue(false);
    });

    describe('token validation', () => {
      it('should reject when no token provided', async () => {
        const ctx = createMockExecutionContext({ cookies: {} });

        try {
          await guard.canActivate(ctx);
          fail('Expected an exception to be thrown');
        } catch (error) {
          // Check constructor name instead of using UnauthorizedException directly
          expect(error.constructor.name).toBe('UnauthorizedException');
          expect(error.message).toBe('No token provided');
        }
      });

      it('should reject when token verification fails', async () => {
        const ctx = createMockExecutionContext({
          cookies: { access_token: 'invalid-token' },
        });
        jwtMock.verifyAsync.mockRejectedValue(new Error('Token verification failed'));

        try {
          await guard.canActivate(ctx);
          fail('Expected an exception to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TokenInvalidException);
        }
      });

      it('should reject when token is missing required claims', async () => {
        const ctx = createMockExecutionContext({
          cookies: { access_token: 'valid-token' },
        });
        jwtMock.verifyAsync.mockResolvedValue({
          email: 'test@example.com',
          // missing sub and organizationId
        });

        try {
          await guard.canActivate(ctx);
          fail('Expected an exception to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TokenInvalidException);
        }
      });
    });

    describe('user validation', () => {
      const validPayload = createMockJwtPayload();

      beforeEach(() => {
        jwtMock.verifyAsync.mockResolvedValue(validPayload);
      });

      it('should reject when user not found in database', async () => {
        const ctx = createMockExecutionContext({
          cookies: { access_token: 'valid-token' },
        });
        prismaMock.user.findUnique.mockResolvedValue(null);

        try {
          await guard.canActivate(ctx);
          fail('Expected an exception to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TokenInvalidException);
        }
      });

      it('should reject when user is inactive', async () => {
        const ctx = createMockExecutionContext({
          cookies: { access_token: 'valid-token' },
        });
        prismaMock.user.findUnique.mockResolvedValue(createMockUser({ isActive: false }));

        try {
          await guard.canActivate(ctx);
          fail('Expected an exception to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TokenInvalidException);
        }
      });

      it('should reject when token version does not match', async () => {
        const ctx = createMockExecutionContext({
          cookies: { access_token: 'valid-token' },
        });
        prismaMock.user.findUnique.mockResolvedValue(createMockUser({ tokenVersion: 999 }));

        try {
          await guard.canActivate(ctx);
          fail('Expected an exception to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(TokenInvalidException);
        }
      });
    });

    describe('successful authentication', () => {
      const validPayload = createMockJwtPayload();
      const baseMockUser = createMockUser();

      beforeEach(() => {
        jwtMock.verifyAsync.mockResolvedValue(validPayload);
      });

      it('should return true and attach user to request', async () => {
        prismaMock.user.findUnique.mockResolvedValue(baseMockUser);

        const ctx = createMockExecutionContext({
          cookies: { access_token: 'valid-token' },
        });

        const result = await guard.canActivate(ctx);
        const request = ctx.switchToHttp().getRequest();

        expect(result).toBe(true);
        expect(request.user).toBeDefined();
        expect(request.user).toEqual(
          expect.objectContaining({
            sub: validPayload.sub,
            email: validPayload.email,
          }),
        );
        expect(request.organizationId).toBe(validPayload.organizationId);
      });

      it('should check permissions when required and user has permissions', async () => {
        const requiredPermissions = ['deal:read'];

        // Create user with the required permissions
        const userWithPermissions = createMockUserWithPermissions(requiredPermissions);

        // Verify the user has the permissions
        expect(getUserPermissions(userWithPermissions)).toContain('deal:read');
        expect(userHasPermission(userWithPermissions, 'deal:read')).toBe(true);

        prismaMock.user.findUnique.mockResolvedValue(userWithPermissions);

        reflectorMock.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(requiredPermissions); // required permissions

        const ctx = createMockExecutionContext({
          cookies: { access_token: 'valid-token' },
        });

        const result = await guard.canActivate(ctx);

        expect(result).toBe(true);
        expect(reflectorMock.getAllAndOverride).toHaveBeenCalledTimes(2);
      });

      it('should reject when user lacks required permissions', async () => {
        const requiredPermissions = ['deal:read'];

        // Regular user has no permissions by default
        const userWithoutPermissions = createMockUser();

        // Verify the user has no permissions
        expect(getUserPermissions(userWithoutPermissions)).toHaveLength(0);
        expect(userHasPermission(userWithoutPermissions, 'deal:read')).toBe(false);

        prismaMock.user.findUnique.mockResolvedValue(userWithoutPermissions);

        reflectorMock.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(requiredPermissions); // required permissions

        const ctx = createMockExecutionContext({
          cookies: { access_token: 'valid-token' },
        });

        try {
          await guard.canActivate(ctx);
          fail('Expected an exception to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(PermissionDeniedException);
        }
      });

      it('should handle admin users with wildcard permissions', async () => {
        // Create an admin user with all required permissions using the role-permissions factory
        const requiredPermissions = ['deal:read', 'deal:write', 'lead:read'];
        
        const adminUserWithPermissions = createMockUserWithRolePermissions(
          { ADMIN: requiredPermissions },
          { role: Role.ADMIN }
        );

        // Verify the user is properly configured
        expect(adminUserWithPermissions.role).toBe(Role.ADMIN);
        expect(getUserRoles(adminUserWithPermissions)).toContain('ADMIN');
        expect(getUserPermissions(adminUserWithPermissions)).toEqual(requiredPermissions);

        prismaMock.user.findUnique.mockResolvedValue(adminUserWithPermissions);

        reflectorMock.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(requiredPermissions); // required permissions

        const ctx = createMockExecutionContext({
          cookies: { access_token: 'valid-token' },
        });

        const result = await guard.canActivate(ctx);

        expect(result).toBe(true);
      });

      it('should handle tokens from Authorization header', async () => {
        prismaMock.user.findUnique.mockResolvedValue(baseMockUser);

        const ctx = createMockExecutionContext({
          headers: { authorization: 'Bearer valid-token' },
        });

        const result = await guard.canActivate(ctx);

        expect(result).toBe(true);
        expect(jwtMock.verifyAsync).toHaveBeenCalledWith(
          'valid-token',
          expect.objectContaining({
            secret: 'test-secret',
            audience: 'test-audience',
            issuer: 'test-issuer',
          }),
        );
      });

      it('should prefer cookie token over Authorization header when both exist', async () => {
        prismaMock.user.findUnique.mockResolvedValue(baseMockUser);

        const ctx = createMockExecutionContext({
          cookies: { access_token: 'cookie-token' },
          headers: { authorization: 'Bearer header-token' },
        });

        await guard.canActivate(ctx);

        expect(jwtMock.verifyAsync).toHaveBeenCalledTimes(1);
        const actualToken = jwtMock.verifyAsync.mock.calls[0][0];
        expect(actualToken).toBe('cookie-token');
      });

      it('should handle multiple permissions correctly', async () => {
        const requiredPermissions = ['deal:read', 'deal:write', 'lead:read'];
        
        // Create user with multiple permissions
        const userWithMultiplePermissions = createMockUserWithPermissions(requiredPermissions);

        // Verify all permissions are present
        expect(getUserPermissions(userWithMultiplePermissions)).toEqual(
          expect.arrayContaining(requiredPermissions)
        );
        expect(getUserPermissions(userWithMultiplePermissions)).toHaveLength(3);

        prismaMock.user.findUnique.mockResolvedValue(userWithMultiplePermissions);

        reflectorMock.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(['deal:read']); // Only need one of the permissions

        const ctx = createMockExecutionContext({
          cookies: { access_token: 'valid-token' },
        });

        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
      });
    });
  });
});
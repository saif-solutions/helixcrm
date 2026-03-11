import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { AuditLogService } from '../../../src/shared/audit-log/audit-log.service';
import { UnauthorizedException } from '@nestjs/common';

// Mock the guards - this is the key fix
jest.mock('../../../src/shared/guards/auth.guard', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockReturnValue(true),
  })),
}));

// Mock implementations
const mockAuthService = {
  validateUser: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  register: jest.fn(),
  getUserSessions: jest.fn(),
  invalidateAllTokens: jest.fn(),
  invalidateOtherSessions: jest.fn(),
};

const mockAuditLogService = {
  logWithRequest: jest.fn(),
};

const mockRequest = {
  cookies: {},
  ip: '127.0.0.1',
  get: jest.fn().mockReturnValue('test-user-agent'),
};

const mockResponse = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      organizationId: 'org-123',
    };

    it('should successfully login user', async () => {
      authService.validateUser.mockResolvedValue(mockUser);
      authService.login.mockResolvedValue({ access_token: 'token' });

      const result = await controller.login(loginDto, mockRequest as any, mockResponse as any);

      expect(result).toEqual({ access_token: 'token' });
      expect(authService.validateUser).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(mockAuditLogService.logWithRequest).toHaveBeenCalledTimes(1);
      expect(authService.login).toHaveBeenCalledWith(mockUser, mockResponse, mockRequest);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        controller.login(loginDto, mockRequest as any, mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuditLogService.logWithRequest).toHaveBeenCalledTimes(1);
      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const mockRequestWithUser = {
      ...mockRequest,
      user: { sub: 'user-123', email: 'test@example.com' },
    };

    it('should successfully logout user', async () => {
      authService.logout.mockResolvedValue({ message: 'Logged out successfully' });

      const result = await controller.logout(mockRequestWithUser as any, mockResponse as any);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockAuditLogService.logWithRequest).toHaveBeenCalled();
      expect(authService.logout).toHaveBeenCalledWith(
        'user-123',
        mockResponse,
        mockRequestWithUser,
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      mockRequest.cookies = { refresh_token: refreshToken };
      authService.refreshToken.mockResolvedValue({ access_token: 'new-token' });

      const result = await controller.refreshToken(mockRequest as any, mockResponse as any);

      expect(result).toEqual({ access_token: 'new-token' });
      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshToken,
        mockResponse,
        mockRequest,
      );
    });

    it('should throw UnauthorizedException if no refresh token', async () => {
      mockRequest.cookies = {};

      await expect(
        controller.refreshToken(mockRequest as any, mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getCurrentUser', () => {
    const mockRequestWithUser = {
      user: {
        sub: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-123',
      },
    };

    it('should return current user', async () => {
      const result = await controller.getCurrentUser(mockRequestWithUser as any);

      expect(result).toEqual({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          organizationId: 'org-123',
        },
      });
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

    const mockResult = { user: { id: 'user-123' } };

    it('should successfully register user', async () => {
      authService.register.mockResolvedValue(mockResult);

      const result = await controller.register(registerDto, mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto, mockRequest);
      expect(mockAuditLogService.logWithRequest).toHaveBeenCalled();
    });
  });

  describe('getSessions', () => {
    const mockRequestWithUser = {
      user: { sub: 'user-123' },
    };

    it('should return user sessions', async () => {
      const mockSessions = { activeSessions: [] };
      authService.getUserSessions.mockResolvedValue(mockSessions);

      const result = await controller.getSessions(mockRequestWithUser as any);

      expect(result).toEqual(mockSessions);
      expect(authService.getUserSessions).toHaveBeenCalledWith('user-123');
    });
  });

  describe('logoutAll', () => {
    const mockRequestWithUser = {
      ...mockRequest,
      user: { sub: 'user-123', email: 'test@example.com' },
    };

    it('should logout from all devices', async () => {
      authService.invalidateAllTokens.mockResolvedValue(undefined);

      const result = await controller.logoutAll(mockRequestWithUser as any, mockResponse as any);

      expect(result).toEqual({ message: 'Logged out from all devices' });
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(authService.invalidateAllTokens).toHaveBeenCalledWith('user-123');
      expect(mockAuditLogService.logWithRequest).toHaveBeenCalled();
    });
  });

  describe('invalidateOtherSessions', () => {
    const mockRequestWithUser = {
      user: { sub: 'user-123', email: 'test@example.com' },
    };

    it('should invalidate other sessions (keep current)', async () => {
      const mockResult = { invalidatedCount: 2 };
      authService.invalidateOtherSessions.mockResolvedValue(mockResult);

      const result = await controller.invalidateOtherSessions(mockRequestWithUser as any, 'true');

      expect(result).toEqual(mockResult);
      expect(authService.invalidateOtherSessions).toHaveBeenCalledWith('user-123', true);
      expect(mockAuditLogService.logWithRequest).toHaveBeenCalled();
    });

    it('should invalidate other sessions (do not keep current)', async () => {
      const mockResult = { invalidatedCount: 3 };
      authService.invalidateOtherSessions.mockResolvedValue(mockResult);

      const result = await controller.invalidateOtherSessions(mockRequestWithUser as any, 'false');

      expect(result).toEqual(mockResult);
      expect(authService.invalidateOtherSessions).toHaveBeenCalledWith('user-123', false);
    });
  });

  describe('debugCookie', () => {
    it('should set test cookie and return cookie info', () => {
      const mockReq = {
        cookies: { existing_cookie: 'value' },
      };

      const result = controller.debugCookie(mockReq as any, mockResponse as any);

      expect(result).toHaveProperty('message', 'Test cookie set');
      expect(result).toHaveProperty('cookies');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'test_cookie',
        'hello123',
        expect.any(Object),
      );
    });
  });
});

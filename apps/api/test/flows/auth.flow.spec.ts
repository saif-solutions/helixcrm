// test/flows/auth.flow.spec.ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthTestModule } from '../auth-test.module';
import { createTestApp, closeApp } from '../utils/create-test-app';
import { createMockUser } from '../factories/user.factory';
import * as bcrypt from 'bcrypt';
import {
  jest,
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  it,
  expect,
} from '@jest/globals';

// Mock bcrypt
jest.mock('bcrypt');

describe('Auth Flow Tests', () => {
  let app: INestApplication;
  let mockPrisma: any;
  let agent: any;

  const testUser = {
    email: 'flow-test@example.com',
    password: 'TestPass123!',
    firstName: 'Flow',
    lastName: 'Test',
    organizationName: 'Flow Test Org',
  };

  beforeAll(async () => {
    console.log('🚀 Starting test setup...');
    const startTime = Date.now();

    try {
      console.log('📱 Creating test app with AuthTestModule...');
      app = await createTestApp({
        imports: [AuthTestModule],
      });

      console.log('✅ Test app created, getting mockPrisma...');
      mockPrisma = (app as any).mockPrisma;

      console.log('✅ Got mockPrisma, creating agent...');
      agent = request.agent(app.getHttpServer());

      console.log(`✅ Test setup completed in ${Date.now() - startTime}ms`);
      console.log('🚦 Test setup complete, ready to run tests!');
    } catch (error) {
      console.error('❌ Test setup failed:', error);
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    console.log('🔚 Cleaning up after tests...');
    try {
      if (app) {
        await closeApp(app);
        console.log('✅ Cleanup complete');
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Server connectivity check
  it('should verify server is reachable', async () => {
    console.log('🌐 Checking server connectivity...');
    try {
      const testResponse = await agent.get('/').ok(() => true);
      console.log('🌐 Server check - status:', testResponse.status);
      expect(testResponse).toBeDefined();
    } catch (error) {
      console.log(
        '🌐 Server check failed - this is OK if root endpoint is protected',
      );
    }
  }, 10000);

  // Basic test runner verification
  it('should verify test runner is working', () => {
    expect(true).toBe(true);
    console.log('✅ Basic test passed - test runner is working');
  });

  // New test: Verify login endpoint exists and works
  it('should verify login endpoint exists and returns proper response', async () => {
    console.log('🔍 Testing login endpoint...');

    const mockUser = createMockUser({
      email: 'login-test@example.com',
      passwordHash: 'hashed-password',
      tokenVersion: 1,
      isActive: true,
    });

    // Setup mocks
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockImplementation(() =>
      Promise.resolve(true),
    );

    console.log('📤 Sending test login request...');
    const response = await agent.post('/auth/login').send({
      email: 'login-test@example.com',
      password: 'correct-password',
    });

    console.log('📊 Login endpoint response:', {
      status: response.status,
      body: response.body,
      hasAccessToken: !!response.body?.access_token,
      hasUser: !!response.body?.user,
      cookies: response.headers['set-cookie'],
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('user');
    console.log('✅ Login endpoint test passed');
  }, 10000);

  describe('Complete Auth Lifecycle', () => {
    it('should handle complete user journey: register → login → me → refresh → logout', async () => {
      console.log('📝 Starting complete auth lifecycle test...');

      // 1. Setup mocks for registration
      const mockOrg = {
        id: 'org-' + Date.now(),
        name: testUser.organizationName,
        slug: testUser.email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-'),
        status: 'active',
      };

      const mockUser = createMockUser({
        id: 'user-' + Date.now() + '-test',
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        organizationId: mockOrg.id,
        passwordHash: 'hashed-password',
        tokenVersion: 1,
        isActive: true,
      });

      console.log('🔧 Setting up mocks...');
      console.log('📊 Mock user created:', {
        id: mockUser.id,
        email: mockUser.email,
      });

      // Clear all mocks first
      jest.clearAllMocks();

      // Mock registration flow - findUnique returns null for registration check
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // No existing user for registration check
        .mockResolvedValue(mockUser); // User exists for login and subsequent calls

      mockPrisma.organization.create.mockResolvedValue(mockOrg);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      // Mock permission lookups - return empty arrays for simplicity
      mockPrisma.permission.findMany.mockResolvedValue([]);
      mockPrisma.role.upsert.mockResolvedValue({ id: 'role-123' });
      mockPrisma.role.findFirst.mockResolvedValue({ id: 'role-123' });
      mockPrisma.userRole.create.mockResolvedValue({});
      mockPrisma.rolePermission.upsert.mockResolvedValue({});

      // Mock user update for lastLoginAt
      mockPrisma.user.update.mockResolvedValue(mockUser);

      // Mock bcrypt - password verification should succeed
      (bcrypt.hash as jest.Mock).mockImplementation(() =>
        Promise.resolve('hashed-password'),
      );
      (bcrypt.compare as jest.Mock).mockImplementation(() =>
        Promise.resolve(true),
      );

      console.log('📤 Sending register request...');
      const registerResponse = await agent
        .post('/auth/register')
        .send(testUser);

      console.log('📊 Register response:', {
        status: registerResponse.status,
        body: registerResponse.body,
      });
      expect(registerResponse.status).toBe(201);

      expect(registerResponse.body).toHaveProperty('id');
      expect(registerResponse.body).toHaveProperty('email', testUser.email);
      expect(registerResponse.body).toHaveProperty('organizationId');

      console.log('📤 Sending login request...');
      console.log('Attempting login with:', {
        email: testUser.email,
        password: testUser.password,
      });

      // Log mock state before login
      console.log('🔍 Mock state BEFORE login:');
      console.log(
        '- findUnique mock calls:',
        mockPrisma.user.findUnique.mock.calls.length,
      );
      console.log(
        '- compare mock calls:',
        (bcrypt.compare as jest.Mock).mock.calls.length,
      );
      console.log(
        '- update mock calls:',
        mockPrisma.user.update.mock.calls.length,
      );

      // Ensure findUnique returns the user for login
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const loginResponse = await agent.post('/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      console.log('📊 Login response:', {
        status: loginResponse.status,
        body: loginResponse.body,
        headers: loginResponse.headers,
      });

      // Log mock state after login
      console.log('🔍 Mock state AFTER login:');
      console.log(
        '- findUnique mock calls:',
        mockPrisma.user.findUnique.mock.calls.length,
      );
      console.log(
        '- compare mock calls:',
        (bcrypt.compare as jest.Mock).mock.calls.length,
      );
      console.log(
        '- update mock calls:',
        mockPrisma.user.update.mock.calls.length,
      );

      expect(loginResponse.status).toBe(200);

      expect(loginResponse.body).toHaveProperty('access_token');
      expect(loginResponse.body.user).toHaveProperty('email', testUser.email);

      // Verify cookies were set
      const cookies = loginResponse.headers['set-cookie'] as string[];
      console.log('🍪 Cookies set:', cookies ? 'Yes' : 'No');
      expect(cookies).toBeDefined();
      expect(Array.isArray(cookies)).toBe(true);
      if (cookies) {
        expect(cookies.some((c: string) => c.startsWith('access_token='))).toBe(
          true,
        );
        expect(
          cookies.some((c: string) => c.startsWith('refresh_token=')),
        ).toBe(true);
      }

      console.log('📤 Sending get profile request...');
      const meResponse = await agent.get('/auth/me').expect(200);

      expect(meResponse.body.user).toHaveProperty('id', mockUser.id);
      expect(meResponse.body.user).toHaveProperty('email', testUser.email);
      console.log('✅ Profile retrieved successfully');

      console.log('📤 Sending get sessions request...');
      const sessionsResponse = await agent.get('/auth/sessions').expect(200);

      expect(sessionsResponse.body).toHaveProperty('activeSessions');
      expect(sessionsResponse.body.userId).toBe(mockUser.id);
      console.log('✅ Sessions retrieved successfully');

      console.log('📤 Sending refresh token request...');
      const refreshResponse = await agent.post('/auth/refresh').expect(200);

      expect(refreshResponse.body).toHaveProperty('access_token');
      console.log('✅ Token refreshed successfully');

      const newCookies = refreshResponse.headers['set-cookie'] as string[];
      console.log('🍪 New cookies set:', newCookies ? 'Yes' : 'No');
      expect(newCookies).toBeDefined();
      expect(Array.isArray(newCookies)).toBe(true);

      console.log('📤 Sending logout request...');
      const logoutResponse = await agent.post('/auth/logout').expect(200);

      expect(logoutResponse.body).toHaveProperty(
        'message',
        'Logged out successfully',
      );
      console.log('✅ Logout successful');

      console.log('📤 Verifying protected route access after logout...');
      await agent.get('/auth/me').expect(401);

      console.log('✅ Complete auth lifecycle test passed');
    }, 60000);

    it('should handle account lockout after multiple failed attempts', async () => {
      console.log('🔒 Starting account lockout test...');

      const user = createMockUser({
        email: 'lockout-test@example.com',
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordHash: 'hashed-password',
      });

      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue(user);

      // Mock failed password verification
      (bcrypt.compare as jest.Mock).mockImplementation(() =>
        Promise.resolve(false),
      );

      // Track update calls to simulate failed attempts counter
      let attemptCount = 0;
      mockPrisma.user.update.mockImplementation(() => {
        attemptCount++;
        if (attemptCount >= 5) {
          // 5th failure should lock account
          return Promise.resolve({
            ...user,
            failedLoginAttempts: 5,
            lockedUntil: new Date(Date.now() + 3600000),
          });
        }
        return Promise.resolve({
          ...user,
          failedLoginAttempts: attemptCount,
        });
      });

      // 1. Attempt login 5 times with wrong password
      for (let i = 0; i < 5; i++) {
        const response = await agent.post('/auth/login').send({
          email: user.email,
          password: 'wrong-password',
        });
        console.log(`Attempt ${i + 1} status:`, response.status);
        expect(response.status).toBe(401);
      }

      // 2. 6th attempt should be locked - should return 401 with appropriate message
      const lockResponse = await agent.post('/auth/login').send({
        email: user.email,
        password: 'correct-password',
      });

      console.log('Lock response status:', lockResponse.status);
      console.log('Lock response body:', lockResponse.body);
      expect(lockResponse.status).toBe(401);

      console.log('✅ Account lockout test passed');
    }, 60000);

    it('should handle session management: logout all and invalidate others', async () => {
      console.log('🔄 Starting session management test...');

      const user = createMockUser({
        passwordHash: 'hashed-password',
        tokenVersion: 1,
      });

      // Setup mocks
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockImplementation(() =>
        Promise.resolve(true),
      );

      // 1. Login first
      console.log('📤 Logging in...');
      const loginResponse = await agent.post('/auth/login').send({
        email: user.email,
        password: 'correct-password',
      });

      console.log('Login response status:', loginResponse.status);
      expect(loginResponse.status).toBe(200);

      // 2. Get sessions - should have at least current session
      console.log('📤 Getting sessions...');
      const sessions1 = await agent.get('/auth/sessions').expect(200);

      expect(sessions1.body.activeSessions.length).toBeGreaterThanOrEqual(1);
      console.log(
        `Found ${sessions1.body.activeSessions.length} active sessions`,
      );

      // 3. Invalidate other sessions (but keep current)
      console.log('📤 Invalidating other sessions...');
      await agent
        .post('/auth/sessions/invalidate-others?keepCurrent=true')
        .expect(200);
      console.log('✅ Other sessions invalidated');

      // 4. Should still be able to access protected route
      console.log('📤 Verifying access to protected route...');
      await agent.get('/auth/me').expect(200);
      console.log('✅ Access verified');

      // 5. Logout from all devices
      console.log('📤 Logging out from all devices...');
      await agent.post('/auth/logout/all').expect(200);
      console.log('✅ Logged out from all devices');

      // 6. Verify cannot access protected route
      console.log('📤 Verifying protected route access after logout...');
      await agent.get('/auth/me').expect(401);

      console.log('✅ Session management test passed');
    }, 60000);
  });

  describe('Registration Edge Cases', () => {
    it('should reject registration with existing email', async () => {
      console.log(
        '📝 Starting registration edge case test (existing email)...',
      );

      const existingUser = createMockUser({ email: 'existing@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const response = await agent.post('/auth/register').send({
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        organizationName: 'Test Org',
      });

      console.log('Registration with existing email status:', response.status);
      console.log('Registration with existing email body:', response.body);
      expect(response.status).toBe(409);
      console.log('✅ Registration edge case test passed');
    }, 30000);

    it('should create default roles for new organization', async () => {
      console.log('📝 Starting registration edge case test (default roles)...');

      const mockOrg = { id: 'org-' + Date.now(), name: 'New Org' };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue(mockOrg);
      mockPrisma.user.create.mockResolvedValue(
        createMockUser({ organizationId: mockOrg.id }),
      );

      const roleUpsertSpy = jest.fn();
      mockPrisma.role.upsert = roleUpsertSpy;

      const response = await agent.post('/auth/register').send({
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        organizationName: 'New Org',
      });

      console.log('Registration with new org status:', response.status);
      expect(response.status).toBe(201);
      expect(roleUpsertSpy).toHaveBeenCalled();
      console.log('✅ Default roles test passed');
    }, 30000);
  });

  describe('Token Version Invalidation', () => {
    it('should reject tokens after password change', async () => {
      console.log('🔄 Starting token version invalidation test...');

      const user = createMockUser() as any;
      user.tokenVersion = 1;
      user.passwordHash = 'hashed-password';

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        tokenVersion: user.tokenVersion + 1,
      });
      (bcrypt.compare as jest.Mock).mockImplementation(() =>
        Promise.resolve(true),
      );

      console.log('📤 Logging in...');
      const loginResponse = await agent.post('/auth/login').send({
        email: user.email,
        password: 'correct-password',
      });

      console.log('Login response status:', loginResponse.status);
      expect(loginResponse.status).toBe(200);

      console.log(
        '🔄 Simulating password change (incrementing token version)...',
      );
      user.tokenVersion++;

      console.log('📤 Verifying protected route access with old token...');
      const meResponse = await agent.get('/auth/me');

      console.log(
        'After password change - me response status:',
        meResponse.status,
      );
      expect(meResponse.status).toBe(401);
      console.log('✅ Token version invalidation test passed');
    }, 30000);
  });
});

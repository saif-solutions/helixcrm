// test/scenarios/auth.scenarios.ts
import { INestApplication } from '@nestjs/common';
import { testRequest } from '../utils/create-test-app';
import { createMockUser } from '../factories/user.factory';
import { jest } from '@jest/globals';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

/**
 * Login scenario - reusable login flow
 */
export async function loginScenario(
  app: INestApplication,
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const response = await testRequest(app).post('/auth/login').send(credentials);

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.body.message}`);
  }

  return response.body;
}

/**
 * Register scenario - reusable registration flow
 */
export async function registerScenario(
  app: INestApplication,
  userData: RegisterDto,
): Promise<AuthResponse> {
  const response = await testRequest(app).post('/auth/register').send(userData);

  if (response.status !== 201) {
    throw new Error(`Registration failed: ${response.body.message}`);
  }

  return response.body;
}

/**
 * Get current user profile scenario
 */
export async function getProfileScenario(app: INestApplication, accessToken: string): Promise<any> {
  const response = await testRequest(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${accessToken}`);

  if (response.status !== 200) {
    throw new Error(`Get profile failed: ${response.body.message}`);
  }

  return response.body;
}

/**
 * Refresh token scenario - uses cookie
 */
export async function refreshTokenScenario(
  app: INestApplication,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await testRequest(app).post('/auth/refresh');

  if (response.status !== 200) {
    throw new Error(`Refresh token failed: ${response.body.message}`);
  }

  return response.body;
}

/**
 * Logout scenario
 */
export async function logoutScenario(app: INestApplication): Promise<void> {
  const response = await testRequest(app).post('/auth/logout');

  if (response.status !== 200) {
    throw new Error(`Logout failed: ${response.body.message}`);
  }
}

// Test data constants
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
  },
  user: {
    email: 'user@test.com',
    password: 'User123!',
    firstName: 'Regular',
    lastName: 'User',
  },
  manager: {
    email: 'manager@test.com',
    password: 'Manager123!',
    firstName: 'Manager',
    lastName: 'User',
  },
  inactive: {
    email: 'inactive@test.com',
    password: 'Inactive123!',
    firstName: 'Inactive',
    lastName: 'User',
  },
};

// Helper to setup common auth mocks - simplified to avoid type issues
export const setupAuthMocks = (mockPrisma: any, mockUser?: any) => {
  const user = mockUser || createMockUser();

  // Mock findUnique to return user for specific emails - using simple mockImplementation without type annotation
  mockPrisma.user.findUnique = jest.fn().mockImplementation((args: any) => {
    if (args?.where?.email === testUsers.inactive.email) {
      return Promise.resolve({ ...user, isActive: false });
    }
    return Promise.resolve(user);
  });

  mockPrisma.user.create = jest.fn().mockResolvedValue(user as never);

  return user;
};

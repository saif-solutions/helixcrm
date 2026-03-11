// src/services/auth.service.ts
/**
 * Auth Service - Centralized authentication logic
 */

import { apiClient } from './api';
import { useAuthStore, User } from '../stores/auth.store';
import api from './api';

// Import the default export from ./api which might include csrfManager
// or if csrfManager is a property on the api object
import apiModule from './api';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

export interface AuthError {
  message: string;
  code: string;
  status: number;
}

// Get csrfManager from the api module (it might be a property)
const csrfManager = (apiModule as any).csrfManager || apiModule;

export const AuthService = {
  /**
   * Initialize authentication (CSRF token)
   */
  async initialize(): Promise<void> {
    try {
      // Check if csrfManager exists and has refreshCsrfToken method
      if (csrfManager && typeof csrfManager.refreshCsrfToken === 'function') {
        await csrfManager.refreshCsrfToken(api);
      } else {
        console.warn('csrfManager not available, skipping initialization');
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      throw error;
    }
  },

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
      return response;
    } catch (error: unknown) {
      console.error('Login failed:', error);

      // Check if it's an API error with status
      const apiError = error as { status?: number; message?: string };

      // Specific error mapping
      if (apiError.status === 401) {
        throw {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
          status: 401,
        };
      }

      if (apiError.status === 0) {
        throw {
          message: 'Cannot connect to server. Please check your connection.',
          code: 'NETWORK_ERROR',
          status: 0,
        };
      }

      throw error;
    }
  },

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/register', data);
      return response;
    } catch (error: unknown) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      return response;
    } catch (error: unknown) {
      const apiError = error as { status?: number };
      if (apiError.status === 401) {
        useAuthStore.getState().logout();
      }
      throw error;
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed, clearing local state anyway:', error);
    } finally {
      // Always clear local state
      // Check if csrfManager exists and has clearToken method
      if (csrfManager && typeof csrfManager.clearToken === 'function') {
        csrfManager.clearToken();
      }
      useAuthStore.getState().logout();
    }
  },

  /**
   * Refresh session
   */
  async refreshSession(): Promise<void> {
    try {
      await apiClient.post('/auth/refresh');
    } catch (error) {
      useAuthStore.getState().setSessionExpired(true);
      throw error;
    }
  },

  /**
   * Check if user has specific permission
   * Note: This should sync with backend permissions
   */
  hasPermission(permission: string): boolean {
    const { user } = useAuthStore.getState();

    if (!user) return false;

    // Check roles array for permissions
    const roles = user.roles || ['user'];

    // In a real implementation, this would check against user.permissions array
    // For now, return based on roles
    if (roles.includes('admin')) {
      return true;
    }

    if (roles.includes('manager')) {
      return ['read', 'write'].includes(permission);
    }

    // Default to 'user' role
    return permission === 'read';
  },

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const { user } = useAuthStore.getState();
    return user?.roles?.includes(role) || false;
  },
};

// Export axios instance for services that need it
export { api };

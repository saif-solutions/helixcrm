// src/services/auth.service.ts
/**
 * Auth Service - Centralized authentication logic
 */

import { apiClient, csrfManager } from './api';
import { useAuthStore, User } from '../stores/auth.store';

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

export const AuthService = {
  /**
   * Initialize authentication (CSRF token)
   */
  async initialize(): Promise<void> {
    try {
      await csrfManager.refreshCsrfToken(api as any);
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
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Specific error mapping
      if (error.status === 401) {
        throw { 
          message: 'Invalid email or password', 
          code: 'INVALID_CREDENTIALS',
          status: 401 
        };
      }
      
      if (error.status === 0) {
        throw { 
          message: 'Cannot connect to server. Please check your connection.',
          code: 'NETWORK_ERROR',
          status: 0 
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
    } catch (error: any) {
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
    } catch (error: any) {
      if (error.status === 401) {
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
      csrfManager.clearToken();
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
    
    // In a real implementation, this would check against user.permissions array
    // For now, return based on role
    const role = user.role || 'user';
    
    switch (role) {
      case 'admin':
        return true;
      case 'manager':
        return ['read', 'write'].includes(permission);
      case 'user':
      default:
        return permission === 'read';
    }
  },

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const { user } = useAuthStore.getState();
    return user?.role === role;
  },
};

// Export axios instance for services that need it
import api from './api';
export { api };

// apps/web/src/stores/auth.store.ts

import { create } from 'zustand';
import { apiClient, initializeApi } from '../services/api';
import { LoginFormData, RegisterFormData } from '../lib/schemas/auth.schema';
import { mapBackendErrorToFormErrors } from '../lib/utils/auth-error-mapper';
import { setUserContext, clearUserContext } from '../lib/logging/logger.service';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  role?: 'admin' | 'user' | 'manager';
  permissions?: string[];
}

// Define a type for API errors
interface ApiError {
  response?: {
    status?: number;
    data?: unknown;
  };
  message?: string;
}

export interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  authError: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (credentials: LoginFormData) => Promise<void>;
  register: (credentials: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setSessionExpired: (expired: boolean) => void;
  clearSessionExpired: () => void;
  setAuthError: (error: string | null) => void;
  clearAuthError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  isLoading: true,
  isAuthenticated: false,
  sessionExpired: false,
  authError: null,

  // Initialize auth on app start
  initialize: async () => {
    try {
      await initializeApi();

      // Check if we have a token in cookies before calling /auth/me
      // This prevents unnecessary 401 errors
      const hasToken = document.cookie.includes('access_token');
      
      if (!hasToken) {
        // No token, just mark as not authenticated
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          authError: null,
          sessionExpired: false,
        });
        return;
      }

      // Only try to fetch user if we have a token
      const response = await apiClient.get<{ 
        user: User & { permissions?: string[]; roles?: string[] } 
      }>('/auth/me');
      
      // Restore user context for logging if user is authenticated
      if (response.user) {
        setUserContext(response.user.id, response.user.organizationId);
      }
      
      console.log('User data from initialize:', response);
      
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
        sessionExpired: false,
      });
    } catch {
      // Not authenticated - clear state
      clearUserContext();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        authError: null,
        sessionExpired: false,
      });
    }
  },

  // Login
  login: async (credentials: LoginFormData) => {
    set({
      isLoading: true,
      authError: null,
      sessionExpired: false,
    });

    try {
      const response = await apiClient.post<{ user: User }>('/auth/login', {
        ...credentials,
        rememberMe: credentials.rememberMe || false,
      });

      // Set user context for logging
      if (response.user) {
        setUserContext(response.user.id, response.user.organizationId);
      }

      // Initialize API again to ensure CSRF token is fresh
      await initializeApi();

      // Fetch the full user profile including permissions
      const userResponse = await apiClient.get<{ 
        user: User & { permissions?: string[]; roles?: string[] } 
      }>('/auth/me');

      // Log what we received for debugging
      console.log('User data after login:', userResponse);

      set({
        user: userResponse.user,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
        sessionExpired: false,
      });
    } catch (error: unknown) {
      const formErrors = mapBackendErrorToFormErrors(error);
      
      // Check if it's an API error with response status
      let isSessionExpired = false;
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { status?: number } };
        isSessionExpired = err.response?.status === 401;
      }

      set({
        isLoading: false,
        authError: formErrors.formError || 'Login failed',
        sessionExpired: isSessionExpired,
      });

      throw error;
    }
  },

  // Register
  register: async (credentials: RegisterFormData) => {
    set({
      isLoading: true,
      authError: null,
      sessionExpired: false,
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...apiCredentials } = credentials;

      const response = await apiClient.post<{ user: User }>('/auth/register', apiCredentials);

      await initializeApi();

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
        sessionExpired: false,
      });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const formErrors = mapBackendErrorToFormErrors(error);

      set({
        isLoading: false,
        authError: formErrors.formError || 'Registration failed',
        sessionExpired: apiError.response?.status === 401,
      });

      throw error;
    }
  },

  // Logout
  logout: async () => {
    set({
      isLoading: true,
      authError: null,
    });

    try {
      await apiClient.post('/auth/logout');
    } catch {
      console.warn('Logout API call failed, but clearing local state anyway');
    } finally {
      // Clear user context from logger
      clearUserContext();
      
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        authError: null,
        sessionExpired: false,
      });
    }
  },

  // Manual setters
  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
      sessionExpired: false,
      authError: null,
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setSessionExpired: (expired: boolean) => {
    set({ sessionExpired: expired });
  },

  clearSessionExpired: () => {
    set({ sessionExpired: false });
  },

  setAuthError: (error: string | null) => {
    set({ authError: error });
  },

  clearAuthError: () => {
    set({ authError: null });
  },
}));
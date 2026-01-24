import { create } from 'zustand';
import { apiClient, initializeApi } from '../services/api';
import { LoginFormData, RegisterFormData } from '../lib/schemas/auth.schema';
import { mapBackendErrorToFormErrors } from '../lib/utils/auth-error-mapper';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  role?: 'admin' | 'user';
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

      const response = await apiClient.get<{ user: User }>('/auth/me');
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
        sessionExpired: false,
      });
    } catch (error) {
      // Not authenticated - clear state
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

      await initializeApi();

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
        sessionExpired: false,
      });
    } catch (error: any) {
      const formErrors = mapBackendErrorToFormErrors(error);

      set({
        isLoading: false,
        authError: formErrors.formError || 'Login failed',
        sessionExpired: error.response?.status === 401,
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
      // Exclude confirmPassword from API request
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
    } catch (error: any) {
      const formErrors = mapBackendErrorToFormErrors(error);

      set({
        isLoading: false,
        authError: formErrors.formError || 'Registration failed',
        sessionExpired: error.response?.status === 401,
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
    } catch (error) {
      console.warn('Logout API call failed, but clearing local state anyway');
    } finally {
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

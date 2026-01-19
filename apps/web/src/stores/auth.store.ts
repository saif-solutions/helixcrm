// apps/web/src/stores/auth.store.ts
import { create } from 'zustand';
import { apiClient, initializeApi } from '../services/api';
import { LoginFormData, RegisterFormData } from '../lib/validation/auth.schema';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  role?: 'admin' | 'user';
}

export interface AuthErrorState {
  message: string;
  code?: string;
  field?: string;
}

interface AuthStore {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  error: AuthErrorState | null;
  
  // Actions
  initialize: () => Promise<void>;
  login: (credentials: LoginFormData) => Promise<void>;
  register: (credentials: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setSessionExpired: (expired: boolean) => void;
  clearError: () => void;
  clearSessionExpired: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  user: null,
  isLoading: true,
  isAuthenticated: false,
  sessionExpired: false,
  error: null,
  
  // Initialize auth on app start
  initialize: async () => {
    try {
      // Initialize API (gets CSRF token)
      await initializeApi();
      
      // Try to get current user
      const response = await apiClient.get<{ user: User }>('/auth/me');
      set({ 
        user: response.user, 
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      // Not authenticated - clear state
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  },
  
  // Login
  login: async (credentials: LoginFormData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.post<{ user: User }>('/auth/login', {
        ...credentials,
        rememberMe: credentials.rememberMe || false
      });
      
      // Re-initialize API to get fresh CSRF token after login
      await initializeApi();
      
      set({ 
        user: response.user, 
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionExpired: false
      });
    } catch (error: any) {
      set({ 
        isLoading: false,
        error: {
          message: error.message || 'Login failed',
          code: error.code,
          field: 'general'
        }
      });
      throw error;
    }
  },
  
  // Register
register: async (credentials: RegisterFormData) => {
  set({ isLoading: true, error: null });
  
  try {
    // Exclude confirmPassword from the API request
    const { confirmPassword, ...apiCredentials } = credentials;
    
    const response = await apiClient.post<{ user: User }>('/auth/register', apiCredentials);
    
    // Re-initialize API after registration
    await initializeApi();
    
    set({ 
      user: response.user, 
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
  } catch (error: any) {
    set({ 
      isLoading: false,
      error: {
        message: error.message || 'Registration failed',
        code: error.code,
        field: 'general'
      }
    });
    throw error;
  }
},
  
  // Logout
  logout: async () => {
    set({ isLoading: true, error: null });
    
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed, but clearing local state anyway');
    } finally {
      // Always clear local state
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false,
        sessionExpired: false,
        error: null
      });
    }
  },
  
  // Manual setters
  setUser: (user: User | null) => {
    set({ 
      user, 
      isAuthenticated: !!user,
      sessionExpired: false 
    });
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
  
  setSessionExpired: (expired: boolean) => {
    set({ sessionExpired: expired });
  },
  
  clearError: () => {
    set({ error: null });
  },
  
  clearSessionExpired: () => {
    set({ sessionExpired: false });
  },
}));
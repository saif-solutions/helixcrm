// apps/web/src/stores/auth.store.ts
import { create } from 'zustand';
import { apiClient, initializeApi } from '../services/api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  role?: 'admin' | 'user';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

interface AuthStore {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  user: null,
  isLoading: true,
  isAuthenticated: false,
  
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
        isLoading: false 
      });
    } catch (error) {
      // Not authenticated - clear state
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    }
  },
  
  // Login
  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true });
    
    try {
      const response = await apiClient.post<{ user: User }>('/auth/login', credentials);
      
      // Re-initialize API to get fresh CSRF token after login
      await initializeApi();
      
      set({ 
        user: response.user, 
        isAuthenticated: true,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  // Register
  register: async (credentials: RegisterCredentials) => {
    set({ isLoading: true });
    
    try {
      const response = await apiClient.post<{ user: User }>('/auth/register', credentials);
      
      // Re-initialize API after registration
      await initializeApi();
      
      set({ 
        user: response.user, 
        isAuthenticated: true,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  // Logout
  logout: async () => {
    set({ isLoading: true });
    
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed, but clearing local state anyway');
    } finally {
      // Always clear local state
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    }
  },
  
  // Manual setters
  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));
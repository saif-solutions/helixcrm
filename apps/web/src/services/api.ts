// apps/web/src/services/api.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth.store';
import { mapBackendErrorToMessage } from '../lib/utils/auth-error-mapper';

// Base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Generate UUID for request IDs (PM's recommendation)
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Types
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  timestamp?: string;
  path?: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// CSRF Token Manager
class CsrfTokenManager {
  private token: string | null = null;
  private isRefreshing = false;
  private refreshQueue: Array<() => void> = [];

  setToken(token: string): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken(): void {
    this.token = null;
  }

  async refreshCsrfToken(api: AxiosInstance): Promise<void> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshQueue.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const response = await api.get<{ csrfToken: string }>('/auth/csrf-token');
      this.setToken(response.data.csrfToken);
      
      // Resolve all queued requests
      this.refreshQueue.forEach((resolve) => resolve());
      this.refreshQueue = [];
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }
}

// Create CSRF manager singleton
export const csrfManager = new CsrfTokenManager();

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  withCredentials: true, // CRITICAL for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add Request ID (PM's recommendation)
    const requestId = generateRequestId();
    config.headers['X-Request-Id'] = requestId;
    
    // Add CSRF token for mutating requests
    if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      const csrfToken = csrfManager.getToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      } else {
        console.warn('CSRF token missing for', config.method, 'request');
      }
    }

    // Add AbortController support
    if (!config.signal) {
      const controller = new AbortController();
      config.signal = controller.signal;
      (config as any)._abortController = controller;
    }

    // Store request ID for error handling
    (config as any)._requestId = requestId;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const requestId = (originalRequest as any)?._requestId || 'unknown';
    
    // CSRF token expired (403) - with retry guard (PM's recommendation)
    if (error.response?.status === 403 && error.response?.data?.code === 'INVALID_CSRF_TOKEN') {
      // CSRF retry guard
      (originalRequest as any)._csrfRetryCount = ((originalRequest as any)._csrfRetryCount || 0) + 1;
      if ((originalRequest as any)._csrfRetryCount > 1) {
        console.error('CSRF retry limit exceeded, setting session expired');
        useAuthStore.getState().setSessionExpired(true);
        return Promise.reject(error);
      }
      
      try {
        // Refresh CSRF token
        await csrfManager.refreshCsrfToken(api);
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Can't refresh token - set session expired
        useAuthStore.getState().setSessionExpired(true);
        return Promise.reject(refreshError);
      }
    }

    // Authentication error (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh access token via /auth/refresh
      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - set session expired
        useAuthStore.getState().setSessionExpired(true);
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors with proper mapping
    const mappedError = mapBackendErrorToMessage(error);
    const apiError: ApiError = {
      status: error.response?.status || 0,
      message: mappedError.message,
      code: mappedError.code || error.response?.data?.code,
      timestamp: error.response?.data?.timestamp,
      path: error.response?.data?.path,
      requestId,
    };

    // Log error for debugging
    console.error('API Error:', {
      requestId,
      status: apiError.status,
      message: apiError.message,
      path: apiError.path,
      timestamp: apiError.timestamp,
    });

    return Promise.reject(apiError);
  }
);

// API initialization
export const initializeApi = async (): Promise<void> => {
  try {
    // Get initial CSRF token
    const response = await api.get<{ csrfToken: string }>('/auth/csrf-token');
    csrfManager.setToken(response.data.csrfToken);
    console.log('✅ CSRF token initialized');
  } catch (error) {
    console.warn('⚠️ Could not initialize CSRF token (might be on login page)');
  }
};

// Abort helper
export const createAbortController = (): AbortController => {
  return new AbortController();
};

// Export API methods with types
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    api.get<T>(url, config).then((res) => res.data),
  
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    api.post<T>(url, data, config).then((res) => res.data),
  
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    api.put<T>(url, data, config).then((res) => res.data),
  
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    api.patch<T>(url, data, config).then((res) => res.data),
  
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    api.delete<T>(url, config).then((res) => res.data),
};

// Export for convenience
export default api;
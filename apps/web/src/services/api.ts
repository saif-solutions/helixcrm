// apps/web/src/services/api.ts

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../stores/auth.store'; 
import { mapBackendErrorToAuthError } from '../lib/utils/auth-error-mapper';
import { API_CONFIG } from '../config/api.config';

// Import types
import { Lead, Contact, Deal, CreateDealSimpleDto, DashboardStats } from '../lib/types/crm.types';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _csrfRetryCount?: number;
  _requestId?: string;
  _abortController?: AbortController;
}

// Remove the local AuthState interface - we'll use the imported one

// Define error response types
interface ErrorResponseData {
  code?: string;
  message?: string;
  timestamp?: string;
  path?: string;
  error?: {
    message?: string;
  };
}

// Configuration
const API_BASE_URL = API_CONFIG.baseURL;
const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';
const IS_DEV = import.meta.env.DEV;

console.log(`📡 API Configuration:
  - Base URL: ${API_BASE_URL}
  - Environment: ${APP_ENV}
  - Development Mode: ${IS_DEV}
`);

// Generate UUID for request IDs
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

// Use type aliases instead of empty interfaces
export type LeadResponse = PaginatedResponse<Lead>;
export type ContactResponse = PaginatedResponse<Contact>;
export type DealResponse = PaginatedResponse<Deal>;

// CSRF Token Manager
class CsrfTokenManager {
  private token: string | null = null;
  private isRefreshing = false;
  private refreshQueue: Array<() => void> = [];
  private initialized = false;

  setToken(token: string): void {
    this.token = token;
    this.initialized = true;
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken(): void {
    this.token = null;
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this.initialized;
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
      console.log('✅ CSRF token refreshed');
      
      // Resolve all queued requests
      this.refreshQueue.forEach((resolve) => resolve());
      this.refreshQueue = [];
    } catch (error) {
      console.error('❌ Could not refresh CSRF token', error);
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
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Version': import.meta.env.VITE_APP_VERSION || '0.9.0',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get auth state from store - no type assertion needed
    const authState = useAuthStore.getState();
    const accessToken = authState.user ? 'token-from-user' : null; // You'll need to get actual token
    const organizationId = authState.user?.organizationId;
    
    // Add Request ID
    const requestId = generateRequestId();
    config.headers['X-Request-Id'] = requestId;

    // Add Authorization header if token exists
    // Note: You'll need to store the actual token - this is a placeholder
    // The actual token should come from cookies or a token store
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // 🔥 Add tenant context header for all authenticated requests
    if (organizationId && !config.url?.includes('/auth/')) {
      config.headers['x-tenant-id'] = organizationId;
      
      if (IS_DEV) {
        console.log(`🏢 Tenant context added: ${organizationId.substring(0, 8)}...`);
      }
    }

    // Add CSRF token for mutating requests
    if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      const csrfToken = csrfManager.getToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      } else {
        console.warn('⚠️ CSRF token missing for', config.method, 'request');
      }
    }

    // Add AbortController support
    if (!config.signal) {
      const controller = new AbortController();
      config.signal = controller.signal;
      (config as RetryableRequestConfig)._abortController = controller;
    }

    // Store request ID for error handling
    (config as RetryableRequestConfig)._requestId = requestId;

    // Log in development
    if (IS_DEV) {
      console.log(`📤 [${config.method?.toUpperCase()}] ${config.url}`, {
        requestId,
        hasData: !!config.data,
        hasCsrf: !!config.headers['X-CSRF-Token'],
        hasTenant: !!config.headers['x-tenant-id'],
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log in development
    if (IS_DEV) {
      console.log(`📥 [${response.config.method?.toUpperCase()}] ${response.config.url}`, {
        status: response.status,
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig;
    const requestId = originalRequest?._requestId || 'unknown';
    const url = originalRequest?.url || '';

    // Network error (backend offline)
    if (!error.response) {
      console.error('🌐 Network error - backend might be offline', {
        requestId,
        url: originalRequest?.url,
        method: originalRequest?.method,
      });

      // Show session expired if it's an auth endpoint
      if (originalRequest?.url?.includes('/auth/')) {
        useAuthStore.getState().setSessionExpired(true);
      }

      const apiError: ApiError = {
        status: 0,
        message: 'Network error. Please check your connection and ensure the backend server is running.',
        code: 'NETWORK_ERROR',
        requestId,
      };

      return Promise.reject(apiError);
    }

    // Get response data with proper typing
    const responseData = error.response?.data as ErrorResponseData;

    // 🔥 Handle 403 - Tenant context missing or invalid
    if (error.response?.status === 403) {
      // Check if it's a tenant context issue
      if (responseData.error?.message?.includes('Tenant context')) {
        console.error('🏢 Tenant context error:', {
          requestId,
          url,
          message: responseData.error?.message,
        });
        
        // If this is not an auth endpoint, we might need to redirect
        if (!url.includes('/auth/')) {
          console.warn('🔄 Tenant context missing - redirecting to login');
          useAuthStore.getState().setSessionExpired(true);
        }
      }
    }

    // Prevent refresh loop on refresh endpoint itself
    if (originalRequest.url?.includes('/auth/refresh')) {
      useAuthStore.getState().setSessionExpired(true);
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.warn(`🔐 Authentication required for ${url}`);
      
      if (originalRequest._retry) {
        useAuthStore.getState().setSessionExpired(true);
        return Promise.reject(error);
      }

      const authStore = useAuthStore.getState();
      if (authStore.sessionExpired) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        authStore.setSessionExpired(true);
        return Promise.reject(refreshError);
      }
    }

    // CSRF token expired (403)
    if (error.response?.status === 403 && responseData.code === 'INVALID_CSRF_TOKEN') {
      // CSRF retry guard - prevent infinite loops
      originalRequest._csrfRetryCount = (originalRequest._csrfRetryCount || 0) + 1;
      if (originalRequest._csrfRetryCount > 1) {
        console.error('❌ CSRF retry limit exceeded, setting session expired');
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

    // Map error for consistent handling
    const mappedError = mapBackendErrorToAuthError(error);
    const apiError: ApiError = {
      status: error.response?.status || 0,
      message: mappedError.message,
      code: mappedError.code || responseData.code,
      timestamp: responseData.timestamp,
      path: responseData.path,
      requestId,
    };

    console.error('❌ API Error:', {
      requestId,
      status: apiError.status,
      message: apiError.message,
      path: apiError.path,
    });

    return Promise.reject(apiError);
  }
);

// API initialization with retry logic
export const initializeApi = async (): Promise<void> => {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      // Get initial CSRF token
      const response = await api.get<{ csrfToken: string }>('/auth/csrf-token');
      csrfManager.setToken(response.data.csrfToken);
      console.log('✅ CSRF token initialized');
      return;
    } catch (error) {
      retries++;
      
      if (retries < maxRetries) {
        console.warn(`⚠️ CSRF initialization failed (attempt ${retries}/${maxRetries}), retrying in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('❌ Could not initialize CSRF token - backend might be offline');
        throw error;
      }
    }
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

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then((res) => res.data),
};

// ============================================================================
// CRM API METHODS
// ============================================================================

/**
 * Leads API
 */
export const LeadsAPI = {
  /**
   * List leads with pagination
   * @param skip Number of items to skip
   * @param take Number of items to take (limit)
   * @returns Paginated leads response
   */
  list: (skip: number = 0, take: number = 50) =>
    apiClient.get<LeadResponse>(`/leads?skip=${skip}&take=${take}`),

  /**
   * Get a single lead by ID
   * @param id Lead ID
   * @returns Lead object
   */
  get: (id: string) => apiClient.get<Lead>(`/leads/${id}`),

  /**
   * Create a new lead
   * @param data Lead data
   * @returns Created lead
   */
  create: (data: Record<string, unknown>) => apiClient.post<Lead>('/leads', data),

  /**
   * Update an existing lead
   * @param id Lead ID
   * @param data Updated lead data
   * @returns Updated lead
   */
  update: (id: string, data: Record<string, unknown>) => apiClient.put<Lead>(`/leads/${id}`, data),

  /**
   * Delete a lead
   * @param id Lead ID
   * @returns Deletion result
   */
  delete: (id: string) => apiClient.delete<{ success: boolean; message: string }>(`/leads/${id}`),
};

/**
 * Contacts API
 */
export const ContactsAPI = {
  /**
   * List contacts with pagination
   * @param skip Number of items to skip
   * @param take Number of items to take (limit)
   * @returns Paginated contacts response
   */
  list: (skip: number = 0, take: number = 50) =>
    apiClient.get<ContactResponse>(`/contacts?skip=${skip}&take=${take}`),

  /**
   * Get a single contact by ID
   * @param id Contact ID
   * @returns Contact object
   */
  get: (id: string) => apiClient.get<Contact>(`/contacts/${id}`),

  /**
   * Create a new contact
   * @param data Contact data
   * @returns Created contact
   */
  create: (data: Record<string, unknown>) => apiClient.post<Contact>('/contacts', data),

  /**
   * Update an existing contact
   * @param id Contact ID
   * @param data Updated contact data
   * @returns Updated contact
   */
  update: (id: string, data: Record<string, unknown>) => apiClient.put<Contact>(`/contacts/${id}`, data),

  /**
   * Delete a contact
   * @param id Contact ID
   * @returns Deletion result
   */
  delete: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/contacts/${id}`),
};

/**
 * Deals API
 */
export const DealsAPI = {
  /**
   * List deals with pagination
   * @param skip Number of items to skip
   * @param take Number of items to take (limit)
   * @returns Paginated deals response
   */
  list: (skip: number = 0, take: number = 50) =>
    apiClient.get<DealResponse>(`/deals?skip=${skip}&take=${take}`),

  /**
   * Simplified Deal Creation
   * @param data CreateDealSimpleDto
   * @returns Created deal
   */
  createSimple: (data: CreateDealSimpleDto) => apiClient.post<Deal>('/deals/simple', data),

  /**
   * Get a single deal by ID
   * @param id Deal ID
   * @returns Deal object
   */
  get: (id: string) => apiClient.get<Deal>(`/deals/${id}`),

  /**
   * Update an existing deal
   * @param id Deal ID
   * @param data Updated deal data
   * @returns Updated deal
   */
  update: (id: string, data: Record<string, unknown>) => apiClient.put<Deal>(`/deals/${id}`, data),

  /**
   * Delete a deal
   * @param id Deal ID
   * @returns Deletion result
   */
  delete: (id: string) => apiClient.delete<{ success: boolean; message: string }>(`/deals/${id}`),

  /**
   * Get pipeline performance metrics
   * @param pipelineId Optional pipeline ID
   * @returns Pipeline performance data
   */
  pipelinePerformance: (pipelineId?: string) =>
    apiClient.get<Record<string, unknown>>(
      `/deals/pipeline-performance${pipelineId ? `?pipelineId=${pipelineId}` : ''}`
    ),
};

/**
 * Dashboard API
 */
export const DashboardAPI = {
  /**
   * Get enhanced CRM dashboard statistics
   * @returns Dashboard stats with pipeline/stage data
   */
  stats: () => apiClient.get<DashboardStats>('/dashboard/stats'),

  /**
   * Get pipeline performance for dashboard
   * @param pipelineId Optional pipeline ID
   * @returns Pipeline performance metrics
   */
  pipelinePerformance: (pipelineId?: string) =>
    apiClient.get<Record<string, unknown>>(
      `/dashboard/pipeline-performance${pipelineId ? `?pipelineId=${pipelineId}` : ''}`
    ),
};

// Export for convenience
export default api;
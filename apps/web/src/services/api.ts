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
import { logger, generateCorrelationId } from '../lib/logging/logger.service';
// Import types
import { Lead, Contact, Deal, CreateDealSimpleDto, DashboardStats } from '../lib/types/crm.types';
import type { CreateContactDto, UpdateContactDto } from '../lib/types/crm.types';
import { requestIdInterceptor } from '../lib/middleware/request-id.middleware';


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
  private isRefreshing = false;
  private refreshQueue: Array<() => void> = [];
  private initialized = false;

/**
 * Get CSRF token from cookie (set by backend)
 */
getToken(): string | null {
  // Read from cookie - backend sets this as '_csrf' cookie
  const cookies = document.cookie.split('; ');
  
  // Debug: log all cookies to see what's available
  if (import.meta.env.DEV) {
    console.log('🍪 All cookies:', document.cookie);
  }
  
  // ✅ Look for '_csrf' cookie (what backend actually sets)
  const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('_csrf='));
  
  if (csrfCookie) {
    const token = csrfCookie.split('=')[1];
    if (import.meta.env.DEV) {
      console.log('🍪 Found CSRF cookie _csrf:', token.substring(0, 10) + '...');
    }
    return token;
  }
  
  if (import.meta.env.DEV) {
    console.warn('🍪 No CSRF cookie found. Available cookies:', document.cookie || '(none)');
  }
  
  return null;
}

  /**
   * No need to set token manually - it comes from cookie
   */
  setToken(_token: string): void {
    // This method is kept for backward compatibility but does nothing
    // Token should only come from cookie
    if (import.meta.env.DEV) {
      console.warn('⚠️ Manual CSRF token setting attempted - token should come from cookie only');
    }
    // Mark _token as used to satisfy ESLint
    void _token;
  }

  clearToken(): void {
    // Can't clear HTTP-only cookie from frontend
    // Just log in development
    if (import.meta.env.DEV) {
      console.log('🧹 CSRF token cleared from memory (cookie remains)');
    }
    this.initialized = false;
  }

  isInitialized(): boolean {
    // Check if we have a token in cookie
    return this.getToken() !== null;
  }

  async refreshCsrfToken(api: AxiosInstance): Promise<void> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshQueue.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      // This endpoint sets a new CSRF token in cookie
      await api.get('/auth/csrf-token');
      
      if (import.meta.env.DEV) {
        console.log('✅ CSRF token refreshed (set in cookie)');
      }
      
      // Resolve all queued requests
      this.refreshQueue.forEach((resolve) => resolve());
      this.refreshQueue = [];
      this.initialized = true;
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
// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Generate and set correlation ID
    const correlationId = generateCorrelationId();
    config.headers['X-Request-Id'] = correlationId;
    logger.setCorrelationId(correlationId);

    // Log request in development
    if (IS_DEV) {
      logger.debug(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        method: config.method,
        url: config.url,
        hasData: !!config.data,
        hasCsrf: !!config.headers['X-CSRF-Token'],
      });
    }

    // Add CSRF token for mutating requests
    if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      const csrfToken = csrfManager.getToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    logger.error('Request interceptor error', error);
    return Promise.reject(error);
  }
);

// Response interceptor
// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful response in development
    if (IS_DEV) {
      logger.debug(`📥 API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        statusText: response.statusText,
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig;
    const url = originalRequest?.url || '';

    // Log error
    logger.error(
      `API Error: ${error.response?.status} ${error.config?.method?.toUpperCase()} ${url}`,
      error,
      {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url,
        method: error.config?.method,
        requestId: originalRequest?._requestId,
      }
    );

    // Network error (backend offline)
    if (!error.response) {
      if (originalRequest?.url?.includes('/auth/')) {
        useAuthStore.getState().setSessionExpired(true);
      }

      const apiError: ApiError = {
        status: 0,
        message: 'Network error. Please check your connection and ensure the backend server is running.',
        code: 'NETWORK_ERROR',
        requestId: originalRequest?._requestId,
      };

      return Promise.reject(apiError);
    }

    // Handle 403 - Tenant context missing or invalid
    if (error.response?.status === 403) {
      const responseData = error.response?.data as ErrorResponseData;
      if (responseData.error?.message?.includes('Tenant context')) {
        logger.warn('Tenant context error', { url, requestId: originalRequest?._requestId });
        
        if (!url.includes('/auth/')) {
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
      logger.warn('Authentication required', { url, requestId: originalRequest?._requestId });
      
      // Check if this is a refresh endpoint failure
      if (originalRequest.url?.includes('/auth/refresh')) {
        logger.error('Token refresh failed - redirecting to login');
        useAuthStore.getState().setSessionExpired(true);
        return Promise.reject(error);
      }
      
      // Check if we've already tried refreshing
      if (originalRequest._retry) {
        logger.error('Token refresh already attempted - giving up');
        useAuthStore.getState().setSessionExpired(true);
        return Promise.reject(error);
      }

      const authStore = useAuthStore.getState();
      if (authStore.sessionExpired) {
        return Promise.reject(error);
      }

      // Mark as retry attempt
      originalRequest._retry = true;

      try {
        logger.info('Attempting token refresh');
        await api.post('/auth/refresh');
        logger.info('Token refresh successful');
        return api(originalRequest);
      } catch (refreshError) {
        logger.error('Token refresh failed', refreshError as Error);
        authStore.setSessionExpired(true);
        return Promise.reject(refreshError);
      }
    }

    // CSRF token expired (403)
    if (error.response?.status === 403 && error.response?.data?.code === 'INVALID_CSRF_TOKEN') {
      logger.warn('CSRF token expired, attempting refresh');
      
      originalRequest._csrfRetryCount = (originalRequest._csrfRetryCount || 0) + 1;
      if (originalRequest._csrfRetryCount > 1) {
        logger.error('CSRF retry limit exceeded');
        useAuthStore.getState().setSessionExpired(true);
        return Promise.reject(error);
      }

      try {
        await csrfManager.refreshCsrfToken(api);
        logger.info('CSRF token refreshed');
        return api(originalRequest);
      } catch (refreshError) {
        logger.error('CSRF refresh failed', refreshError as Error);
        useAuthStore.getState().setSessionExpired(true);
        return Promise.reject(refreshError);
      }
    }

    // Extract correlation ID from backend response headers
    const correlationId = error.response?.headers['x-request-id'] || 
                         error.response?.headers['x-correlation-id'] || 
                         originalRequest?._requestId;
    
    // Map error for consistent handling
    const mappedError = mapBackendErrorToAuthError(error);
    const responseData = error.response?.data as ErrorResponseData;
    const apiError: ApiError = {
      status: error.response?.status || 0,
      message: mappedError.message,
      code: mappedError.code || responseData.code || 'UNKNOWN_ERROR',
      timestamp: responseData.timestamp || new Date().toISOString(),
      path: responseData.path || originalRequest?.url,
      requestId: correlationId,
    };

    return Promise.reject(apiError);
  }
);

// API initialization with retry logic
export const initializeApi = async (): Promise<void> => {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      // Just call the endpoint - it sets cookie automatically
      await api.get('/auth/csrf-token');
      
      // Wait longer for cookie to be available (cookie needs time to set)
      await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 100ms to 500ms
      
      // Verify cookie was set
      const token = csrfManager.getToken();
      if (token) {
        console.log('✅ CSRF token initialized from cookie:', token.substring(0, 5) + '...');
        return;
      } else {
        console.warn(`⚠️ CSRF token not found in cookie after initialization (attempt ${retries + 1})`);
        // If no cookie, try one more time
        retries++;
        if (retries < maxRetries) {
          console.warn(`⚠️ Retrying (${retries + 1}/${maxRetries}) in 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw new Error('CSRF token not found in cookie after initialization');
        }
      }
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

// ✅ Apply request ID interceptor to the EXISTING api instance
requestIdInterceptor(api, {
  enabled: true,
  headerName: 'X-Request-ID',
  logToConsole: import.meta.env.DEV
});

// THEN create your wrapped client using the existing api instance
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
  create: (data: CreateContactDto) => 
    apiClient.post<Contact>('/contacts', data as unknown as Record<string, unknown>),

  /**
   * Update an existing contact
   * @param id Contact ID
   * @param data Updated contact data
   * @returns Updated contact
   */
  update: (id: string, data: UpdateContactDto) => 
    apiClient.put<Contact>(`/contacts/${id}`, data as unknown as Record<string, unknown>),

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
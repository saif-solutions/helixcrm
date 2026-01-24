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

// Configuration
const API_BASE_URL = API_CONFIG.baseURL;
const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';
const IS_DEV = import.meta.env.DEV;

// Development mode configuration
const DEV_MOCK_MODE = IS_DEV && (import.meta.env.VITE_MOCK_API === 'true' || false);
const DEV_OFFLINE_MODE = IS_DEV && (import.meta.env.VITE_OFFLINE_MODE === 'true' || false);
const DEV_BYPASS_AUTH = IS_DEV && (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true' || false);

console.log(`🚀 API Configuration:
  - Base URL: ${API_BASE_URL}
  - Environment: ${APP_ENV}
  - Development Mode: ${IS_DEV}
  - Mock Mode: ${DEV_MOCK_MODE}
  - Offline Mode: ${DEV_OFFLINE_MODE}
  - Auth Bypass: ${DEV_BYPASS_AUTH}
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

// CRM specific types for API responses
export interface LeadResponse extends PaginatedResponse<Lead> {}
export interface ContactResponse extends PaginatedResponse<Contact> {}
export interface DealResponse extends PaginatedResponse<Deal> {}

// Enhanced mock data with more realistic CRM data
const MOCK_DATA = {
  user: {
    id: 'mock-user-1',
    email: 'admin@helixcrm.com',
    name: 'Admin User',
    role: 'admin',
    avatar: '',
    organizationId: 'org-helix-001',
    permissions: ['read', 'write', 'delete', 'admin']
  },
  csrfToken: 'mock-csrf-token-dev-' + Date.now(),
  stats: {
    leads: 156,
    contacts: 428,
    deals: 89,
    totalWonValue: 4250000,
    recentActivities: [
      { id: 'act-1', type: 'lead_created', user: 'John Doe', time: '2 hours ago', description: 'New lead: Acme Corp' },
      { id: 'act-2', type: 'deal_won', user: 'Jane Smith', time: '4 hours ago', description: 'Deal closed: $250,000' },
      { id: 'act-3', type: 'contact_added', user: 'Mike Johnson', time: '1 day ago', description: 'New contact added' }
    ],
    pipelineStages: [
      { stage: 'Prospect', count: 42, value: 1250000 },
      { stage: 'Qualified', count: 28, value: 1850000 },
      { stage: 'Proposal', count: 12, value: 850000 },
      { stage: 'Negotiation', count: 5, value: 300000 },
      { stage: 'Closed Won', count: 2, value: 200000 }
    ]
  },
  leads: Array.from({ length: 50 }, (_, i) => ({
    id: `lead-${i + 1}`,
    name: `Lead ${i + 1}`,
    email: `lead${i + 1}@example.com`,
    phone: `+1 (555) ${100 + i}-${1000 + i}`,
    company: `Company ${(i % 10) + 1}`,
    status: ['new', 'contacted', 'qualified'][i % 3] as any,
    source: ['website', 'referral', 'organic', 'campaign'][i % 4],
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    lastContacted: new Date(Date.now() - (i % 7) * 86400000).toISOString()
  })),
  contacts: Array.from({ length: 50 }, (_, i) => ({
    id: `contact-${i + 1}`,
    firstName: `First${i + 1}`,
    lastName: `Last${i + 1}`,
    email: `contact${i + 1}@example.com`,
    phone: `+1 (555) ${200 + i}-${2000 + i}`,
    mobile: `+1 (555) ${300 + i}-${3000 + i}`,
    company: `Company ${(i % 10) + 1}`,
    title: ['CEO', 'CTO', 'CFO', 'Manager', 'Director'][i % 5],
    department: ['Sales', 'Marketing', 'Engineering', 'Finance', 'HR'][i % 5],
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    lastContacted: new Date(Date.now() - (i % 14) * 86400000).toISOString()
  })),
  deals: Array.from({ length: 50 }, (_, i) => ({
    id: `deal-${i + 1}`,
    name: `Deal ${i + 1}: ${['Acme Corp', 'Globex', 'Stark Industries', 'Wayne Enterprises', 'Cyberdyne'][i % 5]}`,
    amount: (i + 1) * 25000,
    stageId: `stage-${(i % 5) + 1}`,
    stageName: ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won'][i % 5],
    probability: [10, 25, 50, 75, 90][i % 5],
    contactId: `contact-${(i % 20) + 1}`,
    contactName: `Contact ${(i % 20) + 1}`,
    expectedCloseDate: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    status: ['active', 'pending', 'won', 'lost'][i % 4] as any,
    priority: ['low', 'medium', 'high'][i % 3] as any
  })),
  pipelineStages: [
    { id: 'stage-1', name: 'Prospect', order: 1, probability: 10, color: 'bg-blue-100 text-blue-800' },
    { id: 'stage-2', name: 'Qualified', order: 2, probability: 25, color: 'bg-purple-100 text-purple-800' },
    { id: 'stage-3', name: 'Proposal', order: 3, probability: 50, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'stage-4', name: 'Negotiation', order: 4, probability: 75, color: 'bg-orange-100 text-orange-800' },
    { id: 'stage-5', name: 'Closed Won', order: 5, probability: 100, color: 'bg-green-100 text-green-800' }
  ]
};

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
      // In mock mode, return mock token
      if (DEV_MOCK_MODE || DEV_OFFLINE_MODE || DEV_BYPASS_AUTH) {
        this.setToken(MOCK_DATA.csrfToken);
        console.log('🔧 Using mock CSRF token for development');
      } else {
        const response = await api.get<{ csrfToken: string }>('/auth/csrf-token');
        this.setToken(response.data.csrfToken);
        console.log('✅ CSRF token refreshed');
      }

      // Resolve all queued requests
      this.refreshQueue.forEach((resolve) => resolve());
      this.refreshQueue = [];
    } catch (error) {
      console.warn('⚠️ Could not refresh CSRF token');
      
      // In development, use mock token as fallback
      if (IS_DEV) {
        console.log('🔧 Falling back to mock CSRF token');
        this.setToken(MOCK_DATA.csrfToken);
      } else {
        throw error;
      }
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
  timeout: DEV_OFFLINE_MODE ? 1000 : 30000, // Shorter timeout in offline mode
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Version': import.meta.env.VITE_APP_VERSION || '0.9.0',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add Request ID
    const requestId = generateRequestId();
    config.headers['X-Request-Id'] = requestId;

    // Add CSRF token for mutating requests
    if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      const csrfToken = csrfManager.getToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      } else if (!DEV_MOCK_MODE && !DEV_OFFLINE_MODE && !DEV_BYPASS_AUTH) {
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
    (config as RetryableRequestConfig)._requestId = requestId;

    // Log in development
    if (IS_DEV) {
      console.log(`📤 [${config.method?.toUpperCase()}] ${config.url}`, {
        requestId,
        hasData: !!config.data,
        hasCsrf: !!config.headers['X-CSRF-Token'],
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced mock/offline support
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log in development
    if (IS_DEV) {
      console.log(`📥 [${response.config.method?.toUpperCase()}] ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig;
    const requestId = originalRequest?._requestId || 'unknown';
    const url = originalRequest?.url || '';

    // DEVELOPMENT MODE: Return mock data for specific endpoints
    if (IS_DEV && (DEV_MOCK_MODE || DEV_OFFLINE_MODE || DEV_BYPASS_AUTH)) {
      console.log(`🔧 Development mode: Mocking response for ${url}`);
      
      // Mock responses for common endpoints
      if (url.includes('/auth/me')) {
        console.log('🔧 Returning mock user data');
        return Promise.resolve({ 
          data: MOCK_DATA.user,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: originalRequest
        });
      }
      
      if (url.includes('/auth/csrf-token')) {
        console.log('🔧 Returning mock CSRF token');
        return Promise.resolve({ 
          data: { csrfToken: MOCK_DATA.csrfToken },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: originalRequest
        });
      }
      
      if (url.includes('/dashboard/stats')) {
        console.log('🔧 Returning mock dashboard stats');
        return Promise.resolve({ 
          data: MOCK_DATA.stats,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: originalRequest
        });
      }
      
      if (url.includes('/leads')) {
        const mockResponse = {
          data: MOCK_DATA.leads.slice(0, 10), // Return first 10 leads
          meta: { page: 1, limit: 10, total: MOCK_DATA.leads.length, totalPages: Math.ceil(MOCK_DATA.leads.length / 10) }
        };
        console.log('🔧 Returning mock leads data');
        return Promise.resolve({ 
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: originalRequest
        });
      }
      
      if (url.includes('/contacts')) {
        const mockResponse = {
          data: MOCK_DATA.contacts.slice(0, 10), // Return first 10 contacts
          meta: { page: 1, limit: 10, total: MOCK_DATA.contacts.length, totalPages: Math.ceil(MOCK_DATA.contacts.length / 10) }
        };
        console.log('🔧 Returning mock contacts data');
        return Promise.resolve({ 
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: originalRequest
        });
      }
      
      if (url.includes('/deals')) {
        const mockResponse = {
          data: MOCK_DATA.deals.slice(0, 10), // Return first 10 deals
          meta: { page: 1, limit: 10, total: MOCK_DATA.deals.length, totalPages: Math.ceil(MOCK_DATA.deals.length / 10) }
        };
        console.log('🔧 Returning mock deals data');
        return Promise.resolve({ 
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: originalRequest
        });
      }
      
      if (url.includes('/pipeline-stages') || url.includes('/stages')) {
        console.log('🔧 Returning mock pipeline stages');
        return Promise.resolve({ 
          data: MOCK_DATA.pipelineStages,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: originalRequest
        });
      }
      
      // Default success response for other development endpoints
      console.log(`🔧 Default mock response for ${url}`);
      return Promise.resolve({ 
        data: { 
          success: true, 
          message: 'Development mock response',
          endpoint: url,
          timestamp: new Date().toISOString()
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: originalRequest
      });
    }

    // Network error (backend offline)
    if (!error.response) {
      console.warn('🌐 Network error - backend might be offline', {
        requestId,
        url: originalRequest?.url,
        method: originalRequest?.method,
      });

      // Only show session expired if it's an auth endpoint
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

    // Prevent refresh loop on refresh endpoint itself
    if (originalRequest.url?.includes('/auth/refresh')) {
      useAuthStore.getState().setSessionExpired(true);
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - DEVELOPMENT MODE: Return mock data
    if (error.response?.status === 401) {
      console.warn(`🔐 Auth required for ${url} - development mode`);
      
      // In development with auth bypass, return mock data
      if (IS_DEV && DEV_BYPASS_AUTH) {
        console.log(`🔧 Development auth bypass for ${url}`);
        
        // Return mock responses for common endpoints
        if (url.includes('/dashboard/stats')) {
          return Promise.resolve({ 
            data: MOCK_DATA.stats,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: originalRequest
          });
        }
        
        if (url.includes('/leads')) {
          const mockResponse = {
            data: MOCK_DATA.leads.slice(0, 10),
            meta: { page: 1, limit: 10, total: MOCK_DATA.leads.length, totalPages: Math.ceil(MOCK_DATA.leads.length / 10) }
          };
          return Promise.resolve({ 
            data: mockResponse,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: originalRequest
          });
        }
        
        if (url.includes('/deals')) {
          const mockResponse = {
            data: MOCK_DATA.deals.slice(0, 10),
            meta: { page: 1, limit: 10, total: MOCK_DATA.deals.length, totalPages: Math.ceil(MOCK_DATA.deals.length / 10) }
          };
          return Promise.resolve({ 
            data: mockResponse,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: originalRequest
          });
        }
        
        if (url.includes('/contacts')) {
          const mockResponse = {
            data: MOCK_DATA.contacts.slice(0, 10),
            meta: { page: 1, limit: 10, total: MOCK_DATA.contacts.length, totalPages: Math.ceil(MOCK_DATA.contacts.length / 10) }
          };
          return Promise.resolve({ 
            data: mockResponse,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: originalRequest
          });
        }
      }
      
      // Original 401 handling (refresh token logic)
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

    // CSRF token expired (403) - with retry guard
    if (error.response?.status === 403 && error.response?.data?.code === 'INVALID_CSRF_TOKEN') {
      // CSRF retry guard - prevent infinite loops
      originalRequest._csrfRetryCount = (originalRequest._csrfRetryCount || 0) + 1;
      if (originalRequest._csrfRetryCount > 1) {
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

    // Map error for consistent handling
    const mappedError = mapBackendErrorToAuthError(error);
    const apiError: ApiError = {
      status: error.response?.status || 0,
      message: mappedError.message,
      code: mappedError.code || error.response?.data?.code,
      timestamp: error.response?.data?.timestamp,
      path: error.response?.data?.path,
      requestId,
    };

    console.error('API Error:', {
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
  // Skip initialization in mock/offline mode
  if (DEV_MOCK_MODE || DEV_OFFLINE_MODE || DEV_BYPASS_AUTH) {
    console.log('🔧 Skipping API initialization in mock/offline/auth bypass mode');
    csrfManager.setToken(MOCK_DATA.csrfToken);
    return;
  }

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
        console.warn('⚠️ Could not initialize CSRF token - backend might be offline');
        // Don't throw, allow app to continue
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

  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then((res) => res.data),
};

// ============================================================================
// PHASE 3.4 CRM API METHODS
// ============================================================================

/**
 * Leads API - Phase 3.4
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
  create: (data: any) => apiClient.post<Lead>('/leads', data),

  /**
   * Update an existing lead
   * @param id Lead ID
   * @param data Updated lead data
   * @returns Updated lead
   */
  update: (id: string, data: any) => apiClient.put<Lead>(`/leads/${id}`, data),

  /**
   * Delete a lead
   * @param id Lead ID
   * @returns Deletion result
   */
  delete: (id: string) => apiClient.delete<{ success: boolean; message: string }>(`/leads/${id}`),
};

/**
 * Contacts API - Phase 3.4
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
  create: (data: any) => apiClient.post<Contact>('/contacts', data),

  /**
   * Update an existing contact
   * @param id Contact ID
   * @param data Updated contact data
   * @returns Updated contact
   */
  update: (id: string, data: any) => apiClient.put<Contact>(`/contacts/${id}`, data),

  /**
   * Delete a contact
   * @param id Contact ID
   * @returns Deletion result
   */
  delete: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/contacts/${id}`),
};

/**
 * Deals API - Phase 3.4
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
   * Phase 3.4 Simplified Deal Creation
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
  update: (id: string, data: any) => apiClient.put<Deal>(`/deals/${id}`, data),

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
    apiClient.get<any>(
      `/deals/pipeline-performance${pipelineId ? `?pipelineId=${pipelineId}` : ''}`
    ),
};

/**
 * Dashboard API - Phase 3.4 Enhanced Stats
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
    apiClient.get<any>(
      `/dashboard/pipeline-performance${pipelineId ? `?pipelineId=${pipelineId}` : ''}`
    ),
};

// Export for convenience
export default api;
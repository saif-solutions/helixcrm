// src/lib/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { paths } from '../types/generated/api';

export type ApiPaths = paths;

export type ApiResponse<T = unknown> = {
  data: T;
  message?: string;
  timestamp: string;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
    timestamp: string;
  };
};

export type ApiError = AxiosError<ApiErrorResponse>;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
      withCredentials: true,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add CSRF token for mutating requests
        if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
          const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('X-CSRF-Token='))
            ?.split('=')[1];
          
          if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken;
          }
        }
        
        // Add correlation ID if available
        const correlationId = localStorage.getItem('correlationId');
        if (correlationId) {
          config.headers['X-Request-ID'] = correlationId;
        }
        
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiErrorResponse>) => {
       const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        const isAuthRequest = originalRequest?.url?.includes('/auth/');
        
        // Handle 401 Unauthorized - try to refresh token (except for auth requests)
        if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRequest) {
          originalRequest._retry = true;
          try {
            await this.refreshToken();
            return this.client(originalRequest);
          } catch (refreshError) {
            // Clear any stored state
            localStorage.removeItem('correlationId');
            // Redirect to login on refresh failure
            window.location.href = '/login?reason=session_expired';
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<void> {
    await this.client.post('/auth/refresh');
  }

  // Helper to extract error message
  getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const apiError = error as ApiError;
      return apiError.response?.data?.error?.message || error.message;
    }
    return error instanceof Error ? error.message : 'Unknown error occurred';
  }

  // Helper to get error code
  getErrorCode(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const apiError = error as ApiError;
      return apiError.response?.data?.error?.code || 'UNKNOWN_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  // Helper to get correlation ID from error
  getCorrelationId(error: unknown): string | undefined {
    if (axios.isAxiosError(error)) {
      const apiError = error as ApiError;
      return apiError.response?.data?.error?.requestId;
    }
    return undefined;
  }

  // Type-safe GET request
  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  // Type-safe POST request
  async post<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  // Type-safe PUT request
  async put<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  // Type-safe PATCH request
  async patch<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  // Type-safe DELETE request
  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();
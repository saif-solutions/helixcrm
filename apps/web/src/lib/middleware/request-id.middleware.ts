// apps/web/src/lib/middleware/request-id.middleware.ts

import { v4 as uuidv4 } from 'uuid';
import { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Store request ID for the current request session
let currentRequestId: string | null = null;

export interface RequestIdConfig {
  enabled?: boolean;
  headerName?: string;
  logToConsole?: boolean;
}

const defaultConfig: Required<RequestIdConfig> = {
  enabled: true,
  headerName: 'X-Request-ID',
  logToConsole: process.env.NODE_ENV === 'development'
};

/**
 * Get the current request ID or generate a new one
 */
export function getRequestId(): string {
  if (!currentRequestId) {
    currentRequestId = uuidv4();
  }
  return currentRequestId;
}

/**
 * Reset the request ID for the next request
 */
export function resetRequestId(): void {
  currentRequestId = null;
}

/**
 * Set a specific request ID (useful for continuing traces from server)
 */
export function setRequestId(id: string): void {
  currentRequestId = id;
}

/**
 * Axios interceptor to add request ID to all outgoing requests
 */
export function requestIdInterceptor(
  axiosInstance: AxiosInstance, 
  config: RequestIdConfig = {}
): AxiosInstance {
  const finalConfig = { ...defaultConfig, ...config };
  
  if (!finalConfig.enabled) {
    return axiosInstance;
  }

  // Request interceptor - add request ID header
  axiosInstance.interceptors.request.use(
    (requestConfig: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      const requestId = getRequestId();
      
      // Add request ID to headers
      requestConfig.headers[finalConfig.headerName] = requestId;
      
      // Log to console in development
      if (finalConfig.logToConsole) {
        const method = requestConfig.method?.toUpperCase() || 'UNKNOWN';
        const url = requestConfig.url || '';
        console.log(`🔷 [Req:${requestId.substring(0,8)}] ${method} ${url}`);
      }
      
      return requestConfig;
    },
    (error: unknown) => {
      resetRequestId();
      return Promise.reject(error);
    }
  );

  // Response interceptor - reset for next request
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => {
      // Check if server returned a request ID (for tracing)
      const serverRequestId = response.headers?.['x-request-id'];
      if (serverRequestId && typeof serverRequestId === 'string') {
        setRequestId(serverRequestId);
      }
      
      // Reset for next request
      resetRequestId();
      return response;
    },
    (error: unknown) => {
      resetRequestId();
      return Promise.reject(error);
    }
  );

  return axiosInstance;
}

/**
 * React hook for accessing request ID in components (for debugging)
 */
export function useRequestId(): { requestId: string | null; generateNew: () => void } {
  return {
    requestId: currentRequestId,
    generateNew: resetRequestId
  };
}
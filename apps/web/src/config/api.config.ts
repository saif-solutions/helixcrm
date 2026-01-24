// src/config/api.config.ts

/**
 * API Configuration
 * 
 * In development with Vite proxy:
 * - Use '/api' as base URL (Vite will proxy to backend)
 * - This avoids CORS issues
 * 
 * In production:
 * - Use full backend URL
 */

export const API_CONFIG = {
  // In development, use Vite proxy path to avoid CORS
  // In production, use actual backend URL
  baseURL: import.meta.env.VITE_API_URL || '/api',
  
  // Development mode settings
  isDevelopment: import.meta.env.DEV,
  
  // Proxy configuration
  useProxy: import.meta.env.DEV && !import.meta.env.VITE_API_URL?.includes('localhost:3001'),
  
  // Timeout settings
  timeout: 30000,
  
  // Headers
  headers: {
    'Content-Type': 'application/json',
    'X-App-Version': import.meta.env.VITE_APP_VERSION || '0.9.0',
  },
  
  // CORS settings
  withCredentials: true,
};

console.log('🔧 API Configuration:', {
  baseURL: API_CONFIG.baseURL,
  isDevelopment: API_CONFIG.isDevelopment,
  useProxy: API_CONFIG.useProxy,
  envAPI: import.meta.env.VITE_API_URL,
});
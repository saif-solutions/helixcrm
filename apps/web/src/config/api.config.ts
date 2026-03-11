// src/config/api.config.ts

/**
 * API Configuration
 *
 * Configuration for real backend integration only.
 * No mock flags or development bypasses.
 */

export const API_CONFIG = {
  // Use VITE_API_URL environment variable
  // Default: http://localhost:3001/api/v1
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',

  // Environment
  isDevelopment: import.meta.env.DEV,

  // Timeout settings (30 seconds)
  timeout: 30000,

  // Headers
  headers: {
    'Content-Type': 'application/json',
    'X-App-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
  },

  // CORS settings - required for cookies/auth
  withCredentials: true,
};

console.log('��� API Configuration (Phase 5 - Real Backend Only):', {
  baseURL: API_CONFIG.baseURL,
  isDevelopment: API_CONFIG.isDevelopment,
});

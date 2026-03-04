// apps/api/src/shared/constants/app.constants.ts

/**
 * Central configuration for API routing
 * Single source of truth for all path-based configuration
 */
export const APP_GLOBAL_PREFIX = 'api';
export const APP_VERSION = 'v1';
export const APP_NAME = 'HelixCRM';
export const APP_DESCRIPTION = 'Enterprise CRM API with multi-tenant isolation';

/**
 * Construct the full API base path
 * @returns string like '/api/v1'
 */
export const getApiBasePath = (): string => {
  return `/${APP_GLOBAL_PREFIX}/${APP_VERSION}`;
};

/**
 * Construct a full API endpoint path
 * @param endpoint - The endpoint path without prefix/version (e.g., 'auth/login')
 * @returns string like '/api/v1/auth/login'
 */
export const getApiPath = (endpoint: string): string => {
  const base = getApiBasePath();
  return `${base}/${endpoint}`.replace(/\/+/g, '/');
};
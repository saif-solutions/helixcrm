import { CookieOptions } from 'express';
import SecurityConfig from '../../config/security.config';

/**
 * @deprecated Use SecurityConfig.cookies instead
 * Keeping for backward compatibility during transition
 */
export const getCookieOptions = (): CookieOptions => {
  return SecurityConfig.cookies.accessToken();
};

/**
 * @deprecated Use SecurityConfig.cookies instead
 * Keeping for backward compatibility during transition
 */
export const getRefreshCookieOptions = (): CookieOptions => {
  return SecurityConfig.cookies.refreshToken();
};

/**
 * Helper to clear cookies with proper options
 */
export const clearAuthCookies = (res: any): void => {
  res.clearCookie('access_token', SecurityConfig.cookies.accessToken());
  res.clearCookie('refresh_token', SecurityConfig.cookies.refreshToken());
  res.clearCookie('_csrf', SecurityConfig.cookies.csrfToken());
};

/**
 * Validate cookie security in production
 */
export const validateCookieSecurity = (): string[] => {
  const warnings: string[] = [];
  
  if (SecurityConfig.isProduction) {
    const accessOpts = SecurityConfig.cookies.accessToken();
    if (!accessOpts.secure) {
      warnings.push('Access token cookie is not secure in production');
    }
    if (accessOpts.sameSite !== 'strict') {
      warnings.push('Access token cookie SameSite is not strict in production');
    }
    
    const refreshOpts = SecurityConfig.cookies.refreshToken();
    if (!refreshOpts.secure) {
      warnings.push('Refresh token cookie is not secure in production');
    }
  }
  
  return warnings;
};
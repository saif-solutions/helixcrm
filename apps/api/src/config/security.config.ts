// apps/api/src/config/security.config.ts

import { CookieOptions } from 'express';

export class SecurityConfig {
  // Environment
  static isProduction = process.env.NODE_ENV === 'production';
  static isDevelopment = !this.isProduction;

  // JWT - NOW USING ENVIRONMENT VARIABLES
  static jwt = {
    accessTokenExpiry: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'helixcrm',
    audience: process.env.JWT_AUDIENCE || 'helixcrm-client',
  };

  // Cookies - LOCALHOST COMPATIBLE with proper cross-origin settings
  static cookies = {
    accessToken: (): CookieOptions => ({
      httpOnly: true,
      secure: false, // false for localhost HTTP
      sameSite: 'lax', // Changed from 'strict' to 'lax'
      path: '/',
      maxAge: 15 * 60 * 1000,
    }),

    refreshToken: (): CookieOptions => ({
      httpOnly: true,
      secure: false,
      sameSite: 'lax', // Changed from 'strict' to 'lax'
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }),

    csrfToken: (): CookieOptions => ({
      httpOnly: false, // Must be false for JS to read
      secure: false,
      sameSite: 'lax', // CRITICAL: 'lax' allows cross-origin
      path: '/',
    }),
  };

  // CSRF
  static csrf = {
    cookieName: '_csrf', // This is used by csurf for the cookie name
    headerName: 'X-CSRF-Token',
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    safeMethods: ['GET', 'HEAD', 'OPTIONS'],
  };

  // Refresh tokens
  static refreshToken = {
    rotationEnabled: true,
    hashTokens: true,
    bcryptRounds: 10,
    maxActiveTokens: 1,
  };

  // Headers
  static headers = {
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false,
    },
  };

  // Log
  static logConfig() {
    console.log('🔒 SecurityConfig: Development mode, cookies=insecure');
  }
}

SecurityConfig.logConfig();
export default SecurityConfig;

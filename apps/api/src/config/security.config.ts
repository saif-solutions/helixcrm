import { CookieOptions } from 'express';

export class SecurityConfig {
  // Environment
  static isProduction = process.env.NODE_ENV === 'production';
  static isDevelopment = !this.isProduction;

  // JWT
  static jwt = {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    issuer: 'helixcrm',
    audience: 'helixcrm-client',
  };

  // Cookies - LOCALHOST COMPATIBLE
  static cookies = {
    accessToken: (): CookieOptions => ({
      httpOnly: true,
      secure: false, // false for localhost
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    }),

    refreshToken: (): CookieOptions => ({
      httpOnly: true,
      secure: false, // false for localhost
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }),

    csrfToken: (): CookieOptions => ({
      httpOnly: true,
      secure: false, // false for localhost
      sameSite: 'lax',
      path: '/',
    }),
  };

  // CSRF
  static csrf = {
    cookieName: '_csrf',
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
// apps/api/src/config/security.config.ts

import { CookieOptions } from 'express';

export interface SecurityConfig {
  environment: {
    isProduction: boolean;
    isDevelopment: boolean;
    isTest: boolean;
  };
  jwt: {
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
    audience: string;
    algorithm: string;
  };
  cookies: {
    accessToken: (options?: Partial<CookieOptions>) => CookieOptions;
    refreshToken: (options?: Partial<CookieOptions>) => CookieOptions;
    csrfToken: (options?: Partial<CookieOptions>) => CookieOptions;
    session: (options?: Partial<CookieOptions>) => CookieOptions;
  };
  csrf: {
    cookieName: string;
    headerName: string;
    ignoreMethods: string[];
    safeMethods: string[];
    cookieOptions: CookieOptions;
  };
  refreshToken: {
    rotationEnabled: boolean;
    hashTokens: boolean;
    bcryptRounds: number;
    maxActiveTokens: number;
  };
  headers: {
    hsts: {
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    csp?: {
      enabled: boolean;
      directives: Record<string, string[]>;
    };
    xFrameOptions: string;
    xContentTypeOptions: string;
    referrerPolicy: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests?: boolean;
  };
}

function getSecureCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  };
}

function getCsrfCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  };
}

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction && process.env.NODE_ENV !== 'test';
const isTest = process.env.NODE_ENV === 'test';

const securityConfig: SecurityConfig = {
  environment: {
    isProduction,
    isDevelopment,
    isTest,
  },
  jwt: {
    accessTokenExpiry: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'helixcrm',
    audience: process.env.JWT_AUDIENCE || 'helixcrm-client',
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
  },
  cookies: {
    accessToken: (options?: Partial<CookieOptions>) => ({
      ...getSecureCookieOptions(isProduction),
      maxAge: 15 * 60 * 1000,
      ...options,
    }),
    refreshToken: (options?: Partial<CookieOptions>) => ({
      ...getSecureCookieOptions(isProduction),
      maxAge: 7 * 24 * 60 * 60 * 1000,
      ...options,
    }),
    csrfToken: (options?: Partial<CookieOptions>) => ({
      ...getCsrfCookieOptions(isProduction),
      ...options,
    }),
    session: (options?: Partial<CookieOptions>) => ({
      ...getSecureCookieOptions(isProduction),
      maxAge: 24 * 60 * 60 * 1000,
      ...options,
    }),
  },
  csrf: {
    cookieName: '_csrf',
    headerName: 'X-CSRF-Token',
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    safeMethods: ['GET', 'HEAD', 'OPTIONS'],
    cookieOptions: getCsrfCookieOptions(isProduction),
  },
  refreshToken: {
    rotationEnabled: process.env.REFRESH_TOKEN_ROTATION !== 'false',
    hashTokens: process.env.HASH_REFRESH_TOKENS !== 'false',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    maxActiveTokens: parseInt(process.env.MAX_ACTIVE_REFRESH_TOKENS || '5', 10),
  },
  headers: {
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false,
    },
    csp: {
      enabled: process.env.CSP_ENABLED === 'true',
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
  },
};

if (isDevelopment) {
  console.log(
    '🔓 SecurityConfig: Development mode - relaxed security settings',
  );
} else if (isProduction) {
  console.log('🔒 SecurityConfig: Production mode - strict security enabled');
}

export default securityConfig;

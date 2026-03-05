// apps/api/src/shared/config/security.config.ts
import { CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

export default {
  csrf: {
    headerName: 'X-XSRF-TOKEN',
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    tokenTTL: 15 * 60 * 1000, // 15 minutes
  },
  cookies: {
    csrfToken: (): CookieOptions => ({
      httpOnly: false, // Accessible to SPA JS
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    }),
    session: (): CookieOptions => ({
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    }),
  },
};
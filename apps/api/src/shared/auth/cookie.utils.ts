import { CookieOptions } from 'express';

export const getCookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true, // Prevent XSS - JavaScript cannot access
    secure: isProduction, // Only send over HTTPS in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds (matches JWT expiry)
    path: '/', // Available on all paths
  };
};

export const getRefreshCookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth/refresh', // Only sent to refresh endpoint
  };
};

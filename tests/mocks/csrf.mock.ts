// test/mocks/csrf.mock.ts
import { jest } from '@jest/globals';

// Mock the entire csurf module
jest.mock('csurf', () => {
  return jest.fn().mockImplementation(() => {
    return (req: any, res: any, next: any) => {
      // Bypass CSRF in tests
      next();
    };
  });
});

// Mock the CSRF middleware in your app
jest.mock('../../src/shared/security/csrf.middleware', () => {
  return {
    CsrfMiddleware: jest.fn().mockImplementation(() => ({
      use: (req: any, res: any, next: any) => {
        // Bypass CSRF in tests
        next();
      },
    })),
  };
});
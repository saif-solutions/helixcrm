// tests/mocks/csrf.mock.ts
import { jest } from '@jest/globals';

// Define interfaces for request/response objects
interface MockRequest {
  csrfToken?: () => string;
  headers?: Record<string, string>;
  [key: string]: unknown;
}

interface MockResponse {
  status?: (code: number) => MockResponse;
  json?: (data: unknown) => void;
  [key: string]: unknown;
}

type NextFunction = (error?: Error) => void;

// Check if csurf module is available
let csurfAvailable = false;
try {
  require.resolve('csurf');
  csurfAvailable = true;
} catch {
  // Module not available, will use dummy mock
  if (process.env.NODE_ENV !== 'test') {
    console.debug('csurf module not found, using dummy mock for tests');
  }
}

// Create a mock CSRF middleware function
const createMockMiddleware = () => {
  return (req: MockRequest, _res: MockResponse, next: NextFunction): void => {
    // Bypass CSRF validation in tests
    // Add a mock CSRF token to the request for tests that expect it
    if (req && !req.csrfToken) {
      req.csrfToken = (): string => 'mock-csrf-token';
    }
    next();
  };
};

// Mock the entire csurf module
jest.mock('csurf', () => {
  // Return a mock implementation
  if (csurfAvailable) {
    // Even if the module exists, we still want to mock it to avoid actual CSRF validation
    if (process.env.NODE_ENV !== 'test') {
      console.debug('csurf module exists, using mock implementation');
    }
  }
  
  return jest.fn().mockImplementation((_options?: unknown) => {
    // The csurf middleware factory returns a middleware function
    return createMockMiddleware();
  });
});

// Mock the CSRF middleware in your app
jest.mock('../../src/shared/security/csrf.middleware', () => {
  // Create a mock CSRF middleware object
  const mockCsrfMiddleware = {
    use: jest.fn().mockImplementation((req: MockRequest, _res: MockResponse, next: NextFunction): void => {
      // Add mock CSRF token to request
      if (req && !req.csrfToken) {
        req.csrfToken = (): string => 'mock-csrf-token';
      }
      next();
    }),
  };

  return {
    CsrfMiddleware: jest.fn().mockImplementation(() => mockCsrfMiddleware),
    CsrfProtection: jest.fn().mockImplementation(() => mockCsrfMiddleware),
    // Export a function that can be used as middleware directly
    default: mockCsrfMiddleware.use,
  };
});

// Also mock the csurf token generation if used directly
jest.mock('csurf', () => {
  const originalModule = jest.requireActual('csurf');
  return {
    __esModule: true,
    default: jest.fn().mockImplementation((_options?: unknown) => {
      return (req: MockRequest, _res: MockResponse, next: NextFunction): void => {
        // Add CSRF token to request
        if (req && !req.csrfToken) {
          req.csrfToken = (): string => 'mock-csrf-token';
        }
        next();
      };
    }),
    ...originalModule,
  };
}, { virtual: false });

// Export a helper to get a mock CSRF token for testing
export const getMockCsrfToken = (): string => 'mock-csrf-token';

// Export a helper to simulate CSRF validation failure
export const mockCsrfFailure = (_req?: MockRequest): void => {
  const error = new Error('CSRF token mismatch');
  error.name = 'EBADCSRFTOKEN';
  // Simulate throwing the error in middleware
  throw error;
};

// Export a helper to add CSRF token to request
export const addMockCsrfToken = (req: MockRequest): MockRequest => {
  if (req && !req.csrfToken) {
    req.csrfToken = (): string => getMockCsrfToken();
  }
  return req;
};
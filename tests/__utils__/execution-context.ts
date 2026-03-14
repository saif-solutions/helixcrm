// tests/__utils__/execution-context.ts
import { ExecutionContext } from '@nestjs/common';
import { MockJwtPayload } from '../__factories__';

// ==================== TYPE DEFINITIONS ====================

/**
 * Mock request interface for testing
 * Provides type safety for all request properties used in tests
 */
export interface MockRequest {
  /** Request cookies */
  cookies: Record<string, string>;
  /** Request headers */
  headers: Record<string, string>;
  /** Authenticated user (if any) */
  user?: MockJwtPayload | null;
  /** Organization ID extracted from token */
  organizationId?: string;
  /** Request correlation ID */
  id?: string;
  /** HTTP method */
  method?: string;
  /** Request URL */
  url?: string;
  /** Request body */
  body?: unknown;
  /** Request query parameters */
  query?: Record<string, string | string[]>;
  /** Request parameters */
  params?: Record<string, string>;
  /** Allow additional properties with specific type */
  [key: string]: unknown;
}

/**
 * Mock response interface for testing
 */
export interface MockResponse {
  status: (code: number) => MockResponse;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
  end: () => void;
  setHeader: (name: string, value: string) => void;
  getHeader: (name: string) => string | undefined;
  [key: string]: unknown;
}

/**
 * Mock HTTP context for testing guards and controllers
 */
export interface MockHttpContext {
  request: MockRequest;
  response: MockResponse;
}

// ==================== REQUEST FACTORIES ====================

/**
 * Creates a mock request object for testing
 * 
 * @param overrides - Partial request properties to override defaults
 * @returns Complete mock request object
 * 
 * @example
 * const request = createMockRequest({
 *   headers: { 'x-api-key': 'test' }
 * });
 */
export function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    cookies: {},
    headers: {
      'user-agent': 'jest-test',
      'x-request-id': `req-${Date.now()}`,
      'content-type': 'application/json',
      ...overrides.headers,
    },
    user: undefined,
    organizationId: undefined,
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    method: 'GET',
    url: '/',
    body: {},
    query: {},
    params: {},
    ...overrides,
  };
}

/**
 * Creates a mock response object for testing with full type safety
 * 
 * @returns Mock response object with jest.fn() methods
 */
export function createMockResponse(): MockResponse {
  // Create an object that explicitly implements MockResponse
  const res: MockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn().mockReturnValue(undefined),
  };
  
  return res;
}

/**
 * Creates a complete mock HTTP context (request + response)
 * 
 * @param requestOverrides - Request overrides
 * @returns Mock HTTP context
 */
export function createMockHttpContext(
  requestOverrides: Partial<MockRequest> = {}
): MockHttpContext {
  return {
    request: createMockRequest(requestOverrides),
    response: createMockResponse(),
  };
}

// ==================== EXECUTION CONTEXT FACTORIES ====================

/**
 * Creates a mock ExecutionContext for testing guards and interceptors
 * 
 * @param request - Mock request object (optional)
 * @returns Mock ExecutionContext
 * 
 * @example
 * const context = createMockExecutionContext({
 *   cookies: { access_token: 'test-token' }
 * });
 */
export function createMockExecutionContext(
  request: Partial<MockRequest> = {}
): ExecutionContext {
  const mockRequest = createMockRequest(request);
  const mockResponse = createMockResponse();
  const mockNext = jest.fn();

  // Create the mock context with ALL required methods
  const mockContext = {
    switchToHttp: () => ({
      getRequest: <T = MockRequest>() => mockRequest as T,
      getResponse: <T = MockResponse>() => mockResponse as T,
      getNext: () => mockNext,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    getType: () => 'http',
    switchToRpc: () => ({
      getData: () => ({}),
      getContext: () => ({}),
    }),
    switchToWs: () => ({
      getClient: () => ({}),
      getData: () => ({}),
    }),
    // Add the missing methods required by ExecutionContext interface
    getArgs: () => [mockRequest, mockResponse, mockNext],
    getArgByIndex: (index: number) => {
      const args = [mockRequest, mockResponse, mockNext];
      return args[index];
    },
  };

  // Use double assertion to satisfy TypeScript
  return mockContext as unknown as ExecutionContext;
}

/**
 * Creates a mock ExecutionContext for a specific controller and handler
 * 
 * @param controller - Controller class (constructor)
 * @param handler - Handler function name
 * @param request - Mock request object
 * @returns Mock ExecutionContext
 */
export function createMockExecutionContextWithHandler(
  controller: new (...args: unknown[]) => unknown,
  handler: string,
  request: Partial<MockRequest> = {}
): ExecutionContext {
  const mockRequest = createMockRequest(request);
  const mockResponse = createMockResponse();
  const mockNext = jest.fn();
  const mockHandler = jest.fn();

  // Assign the handler name for reflector lookups
  Object.defineProperty(mockHandler, 'name', { value: handler });

  const mockContext = {
    switchToHttp: () => ({
      getRequest: <T = MockRequest>() => mockRequest as T,
      getResponse: <T = MockResponse>() => mockResponse as T,
      getNext: () => mockNext,
    }),
    getHandler: () => mockHandler,
    getClass: () => controller,
    getType: () => 'http',
    switchToRpc: () => ({
      getData: () => ({}),
      getContext: () => ({}),
    }),
    switchToWs: () => ({
      getClient: () => ({}),
      getData: () => ({}),
    }),
    // Add the missing methods required by ExecutionContext interface
    getArgs: () => [mockRequest, mockResponse, mockNext],
    getArgByIndex: (index: number) => {
      const args = [mockRequest, mockResponse, mockNext];
      return args[index];
    },
  };

  // Use double assertion to satisfy TypeScript
  return mockContext as unknown as ExecutionContext;
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Extracts the request object from an ExecutionContext
 * 
 * @param ctx - ExecutionContext
 * @returns Mock request object
 */
export function getRequestFromContext(ctx: ExecutionContext): MockRequest {
  // Remove the unnecessary type assertion - TypeScript infers correctly
  return ctx.switchToHttp().getRequest();
}

/**
 * Extracts the response object from an ExecutionContext
 * 
 * @param ctx - ExecutionContext
 * @returns Mock response object
 */
export function getResponseFromContext(ctx: ExecutionContext): MockResponse {
  // Remove the unnecessary type assertion - TypeScript infers correctly
  return ctx.switchToHttp().getResponse();
}

/**
 * Sets an authenticated user on the request
 * 
 * @param ctx - ExecutionContext
 * @param user - Mock JWT payload
 */
export function setAuthenticatedUser(
  ctx: ExecutionContext,
  user: MockJwtPayload
): void {
  const request = getRequestFromContext(ctx);
  request.user = user;
  request.organizationId = user.organizationId;
}

/**
 * Clears authenticated user from the request
 * 
 * @param ctx - ExecutionContext
 */
export function clearAuthenticatedUser(ctx: ExecutionContext): void {
  const request = getRequestFromContext(ctx);
  request.user = undefined;
  request.organizationId = undefined;
}

// ==================== AUTHENTICATED CONTEXT HELPERS ====================

/**
 * Creates a mock ExecutionContext with an authenticated user
 * 
 * @param user - Mock JWT payload (optional, will use default if not provided)
 * @param requestOverrides - Additional request overrides
 * @returns Mock ExecutionContext with authenticated user
 */
export function createMockAuthenticatedContext(
  user?: MockJwtPayload,
  requestOverrides: Partial<MockRequest> = {}
): ExecutionContext {
  const { createMockJwtPayload } = require('../__factories__');
  const mockUser = user || createMockJwtPayload();
  
  const ctx = createMockExecutionContext({
    cookies: { access_token: 'test-token' },
    ...requestOverrides,
  });
  
  setAuthenticatedUser(ctx, mockUser);
  
  return ctx;
}

// ==================== EXPORT ALL UTILITIES ====================

export default {
  createMockRequest,
  createMockResponse,
  createMockHttpContext,
  createMockExecutionContext,
  createMockExecutionContextWithHandler,
  createMockAuthenticatedContext,
  getRequestFromContext,
  getResponseFromContext,
  setAuthenticatedUser,
  clearAuthenticatedUser,
};
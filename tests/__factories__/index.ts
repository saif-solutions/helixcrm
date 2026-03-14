// tests/__factories__/index.ts
/**
 * Test Factories Index
 * 
 * This file provides a centralized, type-safe factory system for creating test data.
 * All test data creation should go through these factories to ensure consistency
 * and maintainability across the test suite.
 */

// ==================== RE-EXPORT EXISTING FACTORIES ====================
// These factories come from your existing helper system
import * as UserFactories from '../helpers/factories/user.factory';

import { createMockLead, LeadStatus } from '../helpers/factories/lead.factory';
import { createMockDeal, DealStatus } from '../helpers/factories/deal.factory';
import { createMockAuditLog, AuditAction, AuditEntityType } from '../helpers/factories/audit-log.factory';

// Re-export everything from user.factory
export * from '../helpers/factories/user.factory';

// Re-export CRM factories
export {
  createMockLead,
  createMockDeal,
  createMockAuditLog,
  // Re-export enums for convenience
  LeadStatus,
  DealStatus,
  AuditAction,
  AuditEntityType,
};

// ==================== TYPE DEFINITIONS ====================

/**
 * JWT Payload interface matching your auth system
 */
export interface MockJwtPayload {
  /** User ID (subject) */
  sub: string;
  /** Organization ID */
  organizationId: string;
  /** Alias for organizationId (backward compatibility) */
  org?: string;
  /** JWT version for token invalidation */
  version?: number;
  /** Alias for version */
  tokenVersion?: number;
  /** User email */
  email?: string;
  /** Token audience */
  aud?: string | string[];
  /** Token issuer */
  iss?: string;
  /** Expiration timestamp */
  exp?: number;
  /** Allow additional properties */
  [key: string]: unknown;
}

/**
 * Permission set interface
 */
export interface MockPermissions {
  /** List of permission codes */
  permissions: string[];
  /** List of role names */
  roles: string[];
}

/**
 * API Response metadata
 */
export interface ApiResponseMetadata {
  /** HTTP status code */
  status: number;
  /** Response message */
  message: string;
  /** ISO timestamp */
  timestamp: string;
  /** Allow additional metadata */
  [key: string]: unknown;
}

/**
 * Typed API response
 */
export interface ApiResponse<T> {
  /** Response payload */
  data: T;
  /** Response metadata */
  status: number;
  message: string;
  timestamp: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Total number of items */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of pages */
  pages: number;
  /** Allow additional metadata */
  [key: string]: unknown;
}

/**
 * Typed paginated response
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  data: T[];
  /** Pagination metadata */
  meta: PaginationMeta;
}

// ==================== JWT FACTORIES ====================

/**
 * Creates a mock JWT payload for testing authentication
 * 
 * @param overrides - Partial payload to override default values
 * @returns Complete mock JWT payload
 * 
 * @example
 * const payload = createMockJwtPayload({ sub: 'custom-user-id' });
 */
export function createMockJwtPayload(overrides: Partial<MockJwtPayload> = {}): MockJwtPayload {
  const now = Math.floor(Date.now() / 1000);
  
  return {
    sub: 'user-123',
    organizationId: 'org-123',
    org: 'org-123',
    version: 1,
    tokenVersion: 1,
    email: 'test@example.com',
    aud: 'helix-crm',
    iss: 'helix-crm',
    exp: now + 3600, // 1 hour from now
    ...overrides,
  };
}

/**
 * Creates an expired JWT payload for testing token expiration
 * 
 * @param overrides - Additional overrides
 * @returns Expired mock JWT payload
 */
export function createMockExpiredJwtPayload(overrides: Partial<MockJwtPayload> = {}): MockJwtPayload {
  const now = Math.floor(Date.now() / 1000);
  
  return createMockJwtPayload({
    exp: now - 3600, // 1 hour ago
    ...overrides,
  });
}

// ==================== PERMISSION FACTORIES ====================

/**
 * Creates a mock permission set
 * 
 * @param permissions - List of permission codes
 * @param roles - List of role names (defaults to ['USER'])
 * @returns Mock permissions object
 * 
 * @example
 * const perms = createMockPermissions(['deal:read', 'deal:write']);
 */
export function createMockPermissions(
  permissions: string[] = [],
  roles: string[] = ['USER']
): MockPermissions {
  return {
    permissions,
    roles,
  };
}

/**
 * Creates admin-level permissions
 */
export function createMockAdminPermissions(): MockPermissions {
  return {
    permissions: ['*'], // Wildcard for all permissions
    roles: ['ADMIN'],
  };
}

/**
 * Creates read-only permissions
 */
export function createMockReadOnlyPermissions(): MockPermissions {
  return {
    permissions: ['deal:read', 'lead:read', 'contact:read'],
    roles: ['USER'],
  };
}

// ==================== API RESPONSE FACTORIES ====================

/**
 * Creates a mock API response
 * 
 * @param data - Response payload
 * @param overrides - Override response metadata
 * @returns Typed API response
 * 
 * @example
 * const response = createMockApiResponse({ id: '123', name: 'Test' });
 */
export function createMockApiResponse<T>(
  data: T, 
  overrides: Partial<ApiResponseMetadata> = {}
): ApiResponse<T> {
  return {
    data,
    status: 200,
    message: 'Success',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock error API response
 * 
 * @param message - Error message
 * @param status - HTTP status code (defaults to 400)
 * @returns Error API response
 */
export function createMockErrorResponse(
  message: string = 'Bad Request',
  status: number = 400
): ApiResponse<null> {
  return {
    data: null,
    status,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a mock paginated API response
 * 
 * @param items - Array of items
 * @param total - Total item count (defaults to items.length)
 * @param overrides - Override pagination metadata
 * @returns Typed paginated response
 * 
 * @example
 * const response = createMockPaginatedResponse(
 *   [{ id: '1' }, { id: '2' }],
 *   50,
 *   { page: 2 }
 * );
 */
export function createMockPaginatedResponse<T>(
  items: T[], 
  total: number = items.length, 
  overrides: Partial<PaginationMeta> = {}
): PaginatedResponse<T> {
  const limit = 20;
  const pages = Math.ceil(total / limit);
  
  const defaultMeta: PaginationMeta = {
    total,
    page: 1,
    limit,
    pages,
  };

  return {
    data: items,
    meta: {
      ...defaultMeta,
      ...overrides,
    },
  };
}

/**
 * Creates an empty paginated response
 * 
 * @returns Empty paginated response with no items
 * 
 * @example
 * const response = createMockEmptyPaginatedResponse();
 * // response.data === []
 * // response.meta.total === 0
 */
export function createMockEmptyPaginatedResponse(): PaginatedResponse<never> {
  return {
    data: [],
    meta: {
      total: 0,
      page: 1,
      limit: 20,
      pages: 0,
    },
  };
}

/**
 * Mock authenticated request interface
 */
export interface MockAuthenticatedRequest {
  /** Authenticated user */
  user: MockJwtPayload;
  /** Organization ID from the user */
  organizationId: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Request cookies */
  cookies: Record<string, string>;
  /** Allow additional properties */
  [key: string]: unknown;
}

// ==================== REQUEST FACTORIES ====================

/**
 * Creates a mock authenticated request
 * 
 * @param overrides - Additional request properties
 * @returns Mock authenticated request
 * 
 * @example
 * const request = createMockAuthenticatedRequest({
 *   headers: { 'x-custom': 'value' }
 * });
 */
export function createMockAuthenticatedRequest(
  overrides: Partial<MockAuthenticatedRequest> = {}
): MockAuthenticatedRequest {
  const defaultUser = createMockJwtPayload();
  
  return {
    user: defaultUser,
    organizationId: defaultUser.organizationId,
    headers: {
      'user-agent': 'jest-test',
      'x-request-id': `req-${Date.now()}`,
      ...overrides.headers,
    },
    cookies: {},
    ...overrides,
  };
}

// ==================== DATE FACTORIES ====================

/**
 * Creates a consistent date for testing
 * 
 * @param daysFromNow - Days from current date (negative for past)
 * @returns ISO date string
 */
export function createMockDate(daysFromNow: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

/**
 * Creates a range of dates for testing time-based features
 * 
 * @param startDays - Start day offset
 * @param endDays - End day offset
 * @returns Object with start and end dates
 */
export function createMockDateRange(
  startDays: number = -30,
  endDays: number = 0
): { startDate: string; endDate: string } {
  return {
    startDate: createMockDate(startDays),
    endDate: createMockDate(endDays),
  };
}

// ==================== EXPORT ALL FACTORIES ====================
// This ensures a clean, consistent API for all test factories
export default {
  // User factories (from re-export)
  ...UserFactories,
  
  // CRM factories
  createMockLead,
  createMockDeal,
  createMockAuditLog,
  
  // JWT factories
  createMockJwtPayload,
  createMockExpiredJwtPayload,
  
  // Permission factories
  createMockPermissions,
  createMockAdminPermissions,
  createMockReadOnlyPermissions,
  
  // API response factories
  createMockApiResponse,
  createMockErrorResponse,
  createMockPaginatedResponse,
  createMockEmptyPaginatedResponse,
  
  // Request factories
  createMockAuthenticatedRequest,
  
  // Date factories
  createMockDate,
  createMockDateRange,
};
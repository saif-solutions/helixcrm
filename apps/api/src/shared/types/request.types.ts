// apps/api/src/shared/types/request.types.ts

import { Request } from 'express';

/**
 * User payload from JWT token
 * This is the authenticated user structure attached to requests
 */
export interface UserPayload {
  /** User ID (subject) */
  sub: string;
  /** User email address */
  email: string;
  /** Organization ID (tenant) */
  organizationId: string;
  /** Alias for organizationId (legacy support) */
  org?: string;
  /** User permissions from roles */
  permissions?: string[];
  /** User roles */
  roles?: string[];
  /** Token version for invalidation */
  tokenVersion?: number;
  /** User's full name (if available) */
  name?: string;
  /** User's avatar URL */
  avatar?: string;
}

/**
 * Authenticated request with user attached
 */
export interface AuthenticatedRequest extends Request {
  user: UserPayload;
  /** Request ID for tracing */
  id?: string;
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** Organization ID for tenant context */
  organizationId?: string;
}

/**
 * Request with optional authentication
 */
export interface OptionalAuthRequest extends Request {
  user?: UserPayload;
  id?: string;
  correlationId?: string;
}

/**
 * Request with pagination parameters
 */
export interface PaginatedRequest extends Request {
  query: {
    page?: string;
    limit?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    [key: string]: string | undefined;
  };
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for authenticated request
 */
export function isAuthenticatedRequest(
  req: unknown,
): req is AuthenticatedRequest {
  return (
    typeof req === 'object' &&
    req !== null &&
    'user' in req &&
    req.user !== null &&
    typeof req.user === 'object' &&
    'sub' in req.user &&
    typeof (req.user as UserPayload).sub === 'string'
  );
}

/**
 * Type guard for user payload
 */
export function isUserPayload(user: unknown): user is UserPayload {
  if (!user || typeof user !== 'object') return false;

  const payload = user as Partial<UserPayload>;

  return (
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    (typeof payload.organizationId === 'string' ||
      typeof payload.org === 'string')
  );
}

/**
 * Type guard for request with user
 * Legacy function for backward compatibility
 */
export function hasUser(req: unknown): req is AuthenticatedRequest {
  return isAuthenticatedRequest(req);
}

/**
 * Safely extract user from request
 */
export function getUserFromRequest(req: unknown): UserPayload | undefined {
  if (isAuthenticatedRequest(req)) {
    return req.user;
  }
  return undefined;
}

/**
 * Safely extract user ID from request
 */
export function getUserIdFromRequest(req: unknown): string | undefined {
  const user = getUserFromRequest(req);
  return user?.sub;
}

/**
 * Safely extract organization ID from request
 */
export function getOrgIdFromRequest(req: unknown): string | undefined {
  const user = getUserFromRequest(req);
  return user?.organizationId || user?.org;
}

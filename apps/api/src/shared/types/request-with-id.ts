// apps/api/src/shared/types/request-with-id.ts

import { Request } from 'express';
import { UserPayload } from './request.types';

/**
 * Extended request with tracking IDs
 * Used for request tracing and debugging
 */
export interface RequestWithId extends Request {
  /** Unique request ID for this specific request */
  requestId?: string;
  /** Correlation ID for distributed tracing across services */
  correlationId?: string;
  /** Authenticated user (if any) */
  user?: UserPayload;
  /** Additional metadata for debugging */
  metadata?: Record<string, unknown>;
}

/**
 * Request with auditing capabilities
 * Used for operations that need to be audited
 */
export interface AuditableRequest extends RequestWithId {
  /** Client IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
  /** Headers with proper typing */
  headers: Record<string, string | string[] | undefined>;
  /** Timestamp of request start */
  startTime?: Date;
}

/**
 * Request with pagination
 */
export interface PaginatedRequestWithId extends RequestWithId {
  query: {
    page?: string;
    limit?: string;
    offset?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    search?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Request with tenant context
 */
export interface TenantRequest extends RequestWithId {
  organizationId?: string;
  tenantContext?: {
    tenantId: string;
    organizationId: string;
    isSystemContext: boolean;
  };
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for RequestWithId
 */
export function isRequestWithId(req: unknown): req is RequestWithId {
  return (
    typeof req === 'object' &&
    req !== null &&
    ('requestId' in req || 'correlationId' in req)
  );
}

/**
 * Type guard for AuditableRequest
 */
export function isAuditableRequest(req: unknown): req is AuditableRequest {
  return (
    isRequestWithId(req) &&
    'ip' in req &&
    'headers' in req &&
    'userAgent' in req
  );
}

/**
 * Type guard for PaginatedRequestWithId
 */
export function isPaginatedRequest(
  req: unknown,
): req is PaginatedRequestWithId {
  return (
    isRequestWithId(req) &&
    'query' in req &&
    req.query !== null &&
    typeof req.query === 'object'
  );
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract request ID safely
 */
export function getRequestId(req: unknown): string | undefined {
  if (isRequestWithId(req)) {
    return req.requestId;
  }
  return undefined;
}

/**
 * Extract correlation ID safely
 */
export function getCorrelationId(req: unknown): string | undefined {
  if (isRequestWithId(req)) {
    return req.correlationId;
  }
  return undefined;
}

/**
 * Get client IP from request
 */
export function getClientIp(req: RequestWithId): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}

/**
 * Create a new request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

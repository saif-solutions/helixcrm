// apps/api/src/modules/auth/types/request.types.ts

import { Request } from 'express';

// ==================== USER PAYLOAD ====================

/**
 * JWT payload structure for authenticated users
 */
export interface UserPayload {
  /** User ID (from JWT sub claim) */
  sub: string;
  /** User email address */
  email: string;
  /** Organization ID for tenant isolation */
  organizationId: string;
  /** User permissions (computed from roles) */
  permissions?: string[];
  /** User roles */
  roles?: string[];
  /** Token version (for invalidation) */
  tokenVersion?: number;
  /** JWT ID (unique token identifier) */
  jti?: string;
  /** Issued at timestamp */
  iat?: number;
  /** Expiration timestamp */
  exp?: number;
}

// ==================== AUTHENTICATED REQUEST ====================

/**
 * Express Request extended with authenticated user data
 */
export interface AuthenticatedRequest extends Request {
  /** Authenticated user payload */
  user: UserPayload;
}

// ==================== REGISTRATION ====================

/**
 * Response structure for user registration
 */
export interface RegisterResult {
  /** New user ID */
  id: string;
  /** User email address */
  email: string;
  /** Organization ID where user was created */
  organizationId: string;
  /** Success message */
  message: string;
  /** User object for backward compatibility */
  user?: {
    id: string;
    email: string;
  };
  /** User ID for backward compatibility */
  userId?: string;
}

// ==================== SESSION MANAGEMENT ====================

/**
 * Session information for a user
 */
export interface UserSession {
  /** Session identifier */
  id: string;
  /** When the session was created */
  issuedAt: Date | null;
  /** When the session was last used */
  lastUsed: Date | null;
  /** Whether this is the current session */
  isCurrent: boolean;
  /** Device information (user agent, IP, etc.) */
  deviceInfo: string;
}

/**
 * Response structure for user sessions
 */
export interface UserSessionResponse {
  /** User ID */
  userId: string;
  /** User email */
  email: string;
  /** Current token version (for invalidation tracking) */
  tokenVersion: number;
  /** Active sessions list */
  activeSessions: UserSession[];
  /** Total number of active sessions */
  totalSessions: number;
}

/**
 * Response structure for session invalidation
 */
export interface InvalidateSessionsResult {
  /** Number of sessions invalidated */
  invalidatedCount?: number;
  /** Number of sessions invalidated (alias) */
  count?: number;
  /** Success message */
  message?: string;
}

// ==================== LOGIN & AUTHENTICATION ====================

/**
 * User information in login response
 */
export interface LoginUserInfo {
  /** User ID */
  id: string;
  /** User email */
  email: string;
  /** User's first name */
  firstName: string | null;
  /** User's last name */
  lastName: string | null;
  /** Organization ID */
  organizationId: string;
  /** User permissions */
  permissions: string[];
  /** User roles */
  roles: string[];
}

/**
 * Response structure for successful login
 */
export interface LoginResponse {
  /** Access token (JWT) */
  access_token: string;
  /** User information */
  user: LoginUserInfo;
}

// ==================== COOKIE DEBUG ====================

/**
 * Cookie information for debug endpoint
 */
export interface CookieInfo {
  /** Cookie name */
  name: string;
  /** Cookie value (truncated for security) */
  value: string;
  /** Whether the cookie is HTTP-only */
  httpOnly?: boolean;
  /** Whether the cookie is secure */
  secure?: boolean;
  /** SameSite policy */
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Response structure for cookie debug endpoint
 */
export interface DebugCookieResponse {
  /** Debug message */
  message: string;
  /** All cookies present (type-safe) */
  cookies: Record<string, string | undefined>;
  /** Whether test cookie was set */
  hasTestCookie: boolean;
  /** Timestamp of the request */
  timestamp: string;
}

// ==================== TOKEN OPERATIONS ====================

/**
 * Response structure for token refresh
 */
export interface TokenRefreshResponse {
  /** New access token */
  access_token: string;
  /** New refresh token (optional, if rotation is used) */
  refresh_token?: string;
  /** User information */
  user: LoginUserInfo;
}

/**
 * Response structure for token validation
 */
export interface TokenValidationResponse {
  /** Whether the token is valid */
  valid: boolean;
  /** User ID if token is valid */
  userId?: string;
  /** Organization ID if token is valid */
  organizationId?: string;
  /** Error message if token is invalid */
  error?: string;
}

// ==================== PASSWORD RESET ====================

/**
 * Response structure for password reset request
 */
export interface PasswordResetResponse {
  /** Success message */
  message: string;
}

/**
 * Response structure for password reset token validation
 */
export interface ValidateResetTokenResponse {
  /** Whether the token is valid */
  valid: boolean;
  /** Email associated with the token (if valid) */
  email?: string;
}

// ==================== HELPER TYPES ====================

/**
 * Type guard to check if a request is authenticated
 * @param req - Express request object
 * @returns True if request has user payload
 */
export function isAuthenticatedRequest(
  req: Request,
): req is AuthenticatedRequest {
  return (
    'user' in req &&
    req.user !== undefined &&
    typeof req.user === 'object' &&
    'sub' in req.user
  );
}

/**
 * Type guard to check if a user payload has permissions
 * @param payload - User payload
 * @returns True if payload has permissions
 */
export function hasPermissions(
  payload: UserPayload,
): payload is UserPayload & Required<Pick<UserPayload, 'permissions'>> {
  return Array.isArray(payload.permissions);
}

/**
 * Type guard to check if a user payload has roles
 * @param payload - User payload
 * @returns True if payload has roles
 */
export function hasRoles(
  payload: UserPayload,
): payload is UserPayload & Required<Pick<UserPayload, 'roles'>> {
  return Array.isArray(payload.roles);
}

/**
 * Extract user ID from request safely
 * @param req - Express request
 * @returns User ID or null if not authenticated
 */
export function extractUserId(req: Request): string | null {
  if (isAuthenticatedRequest(req)) {
    return req.user.sub;
  }
  return null;
}

/**
 * Extract organization ID from request safely
 * @param req - Express request
 * @returns Organization ID or null if not authenticated
 */
export function extractOrganizationId(req: Request): string | null {
  if (isAuthenticatedRequest(req)) {
    return req.user.organizationId;
  }
  return null;
}

/**
 * Extract user email from request safely
 * @param req - Express request
 * @returns User email or null if not authenticated
 */
export function extractUserEmail(req: Request): string | null {
  if (isAuthenticatedRequest(req)) {
    return req.user.email;
  }
  return null;
}

/**
 * Create a safe user payload for logging (removes sensitive data)
 * @param payload - User payload
 * @returns Sanitized payload for logging
 */
export function sanitizeUserPayload(
  payload: UserPayload,
): Record<string, unknown> {
  return {
    userId: payload.sub,
    email: payload.email,
    organizationId: payload.organizationId,
    tokenVersion: payload.tokenVersion,
    permissionsCount: payload.permissions?.length,
    rolesCount: payload.roles?.length,
  };
}

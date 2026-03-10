// apps/api/src/shared/auth/jwt-payload.interface.ts

/**
 * JWT Payload Interface
 *
 * ENTERPRISE NOTE:
 * - The actual JWT token uses 'org' and 'version' for backward compatibility
 * - All code should access these through the mapped properties in guards
 * - This interface documents both the token structure and the mapped properties
 */
export interface JwtPayload {
  // Core claims (standard JWT)
  sub: string; // User ID (subject)
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
  aud?: string; // Audience
  iss?: string; // Issuer

  // Token versioning (CRITICAL for security)
  version: number; // Token version in token (maps to tokenVersion in code)
  tokenVersion?: number; // For forward compatibility

  // Tenant context
  org: string; // Organization ID in token (maps to organizationId in code)
  organizationId?: string; // For forward compatibility

  // User context
  email?: string; // User email (optional, can be fetched from DB)
  role: string; // Primary role (admin/user) for quick checks

  // Permissions and roles (PHASE 3.3 ADDITIONS)
  permissions: string[]; // Flattened permissions array for quick access
  roles: string[]; // Role names for auditing and context

  // Additional metadata
  [key: string]: any; // Allow for future extensions
}

/**
 * Mapped User Object (what gets attached to req.user)
 * This is the shape after JWT validation and mapping
 */
export interface AuthenticatedUser {
  id: string; // User ID
  sub: string; // User ID (alias for backward compatibility)
  email: string; // User email
  organizationId: string; // Organization ID (mapped from token.org)
  tokenVersion: number; // Token version (mapped from token.version)
  permissions: string[]; // User permissions
  roles: string[]; // User roles
}

/**
 * Helper type for controllers that need both naming conventions
 */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  organizationId: string; // For backward compatibility with middleware
  tenantContext?: any; // Tenant context if resolved
}

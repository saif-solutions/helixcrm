// apps/api/src/modules/auth/adapters/auth-core.interfaces.ts

/**
 * Temporary interface definitions for auth-core contracts
 * These will be replaced with actual @helixcrm/auth-core imports once package is built
 */

// ==================== TOKEN RELATED INTERFACES ====================

/**
 * Parameters for creating a new refresh token
 */
export interface CreateRefreshTokenParams {
  /** User ID for token ownership */
  readonly userId: string;
  /** Organization ID for tenant isolation */
  readonly organizationId: string;
  /** Optional IP address for security audit and tracking */
  readonly ipAddress?: string;
  /** Optional user agent for device fingerprinting */
  readonly userAgent?: string;
  /** Optional expiration time in seconds (default: 7 days) */
  readonly expiresIn?: number;
}

/**
 * Parameters for validating an existing refresh token
 */
export interface ValidateRefreshTokenParams {
  /** The refresh token string to validate */
  readonly token: string;
  /** User ID to validate against */
  readonly userId: string;
  /** Organization ID for tenant isolation */
  readonly organizationId: string;
  /** Optional version for replay protection */
  readonly version?: string;
}

/**
 * Parameters for revoking a refresh token
 */
export interface RevokeRefreshTokenParams {
  /** The refresh token to revoke */
  readonly token: string;
  /** User ID of the token owner */
  readonly userId: string;
  /** Organization ID for tenant isolation */
  readonly organizationId: string;
  /** Optional version for version-specific revocation */
  readonly version?: string;
  /** Optional reason for revocation (audit purpose) */
  readonly reason?: string;
}

/**
 * Refresh token entity representing an active session
 */
export interface RefreshToken {
  /** Raw token value (returned to client, never stored) */
  readonly token: string;
  /** User ID associated with this token */
  readonly userId: string;
  /** Organization ID for tenant isolation */
  readonly organizationId: string;
  /** Token version for replay protection and rotation */
  readonly version: string;
  /** When the token was issued */
  readonly issuedAt: Date;
  /** When the token expires */
  readonly expiresAt: Date;
  /** IP address that requested the token */
  readonly ipAddress?: string;
  /** User agent of the requesting device */
  readonly userAgent?: string;
  /** Whether the token has been revoked */
  readonly isRevoked: boolean;
  /** When the token was revoked (if applicable) */
  readonly revokedAt?: Date;
  /** Why the token was revoked (if applicable) */
  readonly revokedReason?: string;
}

// ==================== TOKEN REPOSITORY INTERFACE ====================

/**
 * Repository contract for token storage operations
 * All implementations must satisfy this contract for auth-core compatibility
 */
export interface TokenRepository {
  /**
   * Create and store a new refresh token
   * @param params - Token creation parameters
   * @returns The created refresh token
   * @throws Error if token creation fails
   */
  createRefreshToken(params: CreateRefreshTokenParams): Promise<RefreshToken>;

  /**
   * Validate an existing refresh token
   * @param params - Token validation parameters
   * @returns True if token is valid, false otherwise
   */
  validateRefreshToken(params: ValidateRefreshTokenParams): Promise<boolean>;

  /**
   * Revoke a specific refresh token
   * @param params - Token revocation parameters
   * @throws Error if revocation fails (but should be idempotent)
   */
  revokeRefreshToken(params: RevokeRefreshTokenParams): Promise<void>;

  /**
   * Revoke all refresh tokens for a user
   * @param userId - User ID to revoke tokens for
   * @param reason - Optional reason for revocation
   */
  revokeAllUserTokens(userId: string, reason?: string): Promise<void>;

  /**
   * Get all active tokens for a user
   * @param userId - User ID to get tokens for
   * @returns Array of active refresh tokens
   */
  getUserActiveTokens(userId: string): Promise<RefreshToken[]>;

  /**
   * Update token version (atomic operation for token rotation)
   * Critical for replay protection - ensures old token cannot be reused
   * @param userId - User ID
   * @param oldVersion - Current token version (for atomic check)
   * @param newVersion - New token version
   * @param newTokenHash - Hash of the new token
   * @throws Error if version mismatch (possible replay attack)
   */
  updateTokenVersion(
    userId: string,
    oldVersion: string,
    newVersion: string,
    newTokenHash: string,
  ): Promise<void>;
}

// ==================== USER RELATED INTERFACES ====================

/**
 * User entity representing an authenticated user
 */
export interface User {
  /** Unique identifier */
  readonly id: string;
  /** User email address (unique per tenant) */
  readonly email: string;
  /** Bcrypt hashed password */
  readonly passwordHash: string;
  /** User's first name */
  readonly firstName: string;
  /** User's last name */
  readonly lastName: string;
  /** Organization ID for tenant isolation */
  readonly organizationId: string;
  /** Whether the user account is active */
  readonly isActive: boolean;
  /** Current token version (incremented on password change/logout) */
  readonly tokenVersion: number;
  /** Hashed refresh token (if active session exists) */
  readonly refreshTokenHash?: string | null;
  /** Refresh token version for replay protection */
  readonly refreshTokenVersion?: string | null;
  /** When the current refresh token was issued */
  readonly refreshTokenIssuedAt?: Date | null;
  /** Last login timestamp */
  readonly lastLoginAt?: Date | null;
  /** Last password change timestamp */
  readonly lastPasswordChange?: Date | null;
  /** User's permissions (computed from roles) */
  readonly permissions: string[];
  /** User's roles (computed from role assignments) */
  readonly roles: string[];
  /** Creation timestamp */
  readonly createdAt: Date;
  /** Last update timestamp */
  readonly updatedAt: Date;
}

/**
 * Parameters for creating a new user
 */
export interface CreateUserParams {
  /** User email address */
  readonly email: string;
  /** Bcrypt hashed password */
  readonly passwordHash: string;
  /** User's first name */
  readonly firstName: string;
  /** User's last name */
  readonly lastName: string;
  /** Organization ID for tenant isolation */
  readonly organizationId: string;
  /** Whether the user account is active (default: true) */
  readonly isActive?: boolean;
  /** Initial token version (default: 1) */
  readonly tokenVersion?: number;
  /** Initial refresh token hash (if creating with session) */
  readonly refreshTokenHash?: string | null;
  /** Initial refresh token version */
  readonly refreshTokenVersion?: string | null;
}

/**
 * Parameters for updating an existing user
 */
export interface UpdateUserParams {
  /** User ID to update */
  readonly userId: string;
  /** New password hash (if changing password) */
  readonly passwordHash?: string;
  /** New token version (for session invalidation) */
  readonly tokenVersion?: number;
  /** New refresh token hash (for rotation) */
  readonly refreshTokenHash?: string | null;
  /** New refresh token version */
  readonly refreshTokenVersion?: string | null;
  /** When refresh token was issued */
  readonly refreshTokenIssuedAt?: Date | null;
  /** Last login timestamp */
  readonly lastLoginAt?: Date | null;
  /** Whether the user account is active */
  readonly isActive?: boolean;
}

/**
 * Parameters for finding a user by email
 */
export interface FindUserByEmailParams {
  /** User email address */
  readonly email: string;
  /** Organization ID for tenant isolation */
  readonly organizationId: string;
}

/**
 * Parameters for finding a user by ID
 */
export interface FindUserByIdParams {
  /** User ID */
  readonly userId: string;
  /** Organization ID for tenant isolation */
  readonly organizationId: string;
}

// ==================== USER REPOSITORY INTERFACE ====================

/**
 * Repository contract for user storage operations
 * All implementations must satisfy this contract for auth-core compatibility
 */
export interface UserRepository {
  /**
   * Find a user by email address
   * @param params - Search parameters
   * @returns User if found, null otherwise
   */
  findByEmail(params: FindUserByEmailParams): Promise<User | null>;

  /**
   * Find a user by ID
   * @param params - Search parameters
   * @returns User if found, null otherwise
   */
  findById(params: FindUserByIdParams): Promise<User | null>;

  /**
   * Create a new user
   * @param params - User creation parameters
   * @returns Created user
   * @throws Error if user with same email already exists
   */
  create(params: CreateUserParams): Promise<User>;

  /**
   * Update an existing user
   * @param params - User update parameters
   * @returns Updated user
   * @throws Error if user not found
   */
  update(params: UpdateUserParams): Promise<User>;

  /**
   * Update token version (increments token version for session invalidation)
   * @param userId - User ID to update
   * @param increment - Amount to increment (default: 1)
   */
  updateTokenVersion(userId: string, increment?: number): Promise<void>;

  /**
   * Check if a user exists by email
   * @param email - Email to check
   * @returns True if user exists, false otherwise
   */
  existsByEmail(email: string): Promise<boolean>;
}

// ==================== SERVICE CONTRACTS ====================

/**
 * Password hashing and verification service contract
 */
export interface PasswordService {
  /**
   * Hash a plaintext password
   * @param password - Plaintext password
   * @returns Bcrypt hashed password
   */
  hash(password: string): Promise<string>;

  /**
   * Verify a password against its hash
   * @param password - Plaintext password
   * @param hash - Bcrypt hash to compare against
   * @returns True if password matches hash
   */
  compare(password: string, hash: string): Promise<boolean>;
}

/**
 * JWT token service contract
 */
export interface JwtService {
  /**
   * Sign a payload to create a JWT
   * @param payload - Data to encode in token
   * @param options - JWT signing options
   * @returns Signed JWT token
   */
  sign(
    payload: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): string;

  /**
   * Verify and decode a JWT
   * @param token - JWT token to verify
   * @param options - JWT verification options
   * @returns Decoded payload
   * @throws Error if token is invalid or expired
   */
  verify(
    token: string,
    options?: Record<string, unknown>,
  ): Record<string, unknown>;
}

/**
 * Token manager service contract for high-level token operations
 */
export interface TokenManagerService {
  /**
   * Create an access token for a user
   * @param user - User to create token for
   * @param permissions - User's permissions
   * @param roles - User's roles
   * @returns Signed access token
   */
  createAccessToken(
    user: User,
    permissions: string[],
    roles: string[],
  ): Promise<string>;

  /**
   * Create a refresh token for a user
   * @param userId - User ID
   * @param version - Token version for replay protection
   * @returns Signed refresh token
   */
  createRefreshToken(userId: string, version: string): Promise<string>;

  /**
   * Verify and decode an access token
   * @param token - Access token to verify
   * @returns Decoded token payload
   * @throws Error if token is invalid
   */
  verifyAccessToken(token: string): Record<string, unknown>;

  /**
   * Verify and decode a refresh token
   * @param token - Refresh token to verify
   * @returns Decoded token payload
   * @throws Error if token is invalid
   */
  verifyRefreshToken(token: string): Record<string, unknown>;
}

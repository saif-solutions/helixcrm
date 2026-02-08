/**
 * Canonical Auth-Core Contract
 * Version: @helixcrm/auth-core@0.1.0
 * Date: $(date)
 * Status: FROZEN for MVP-1 - DO NOT MODIFY WITHOUT MIGRATION PLAN
 *
 * This file defines the REAL contract with @helixcrm/auth-core
 * All adapters MUST implement this exact interface.
 */

// Re-export actual auth-core types
export type {
  AuthCoreContract,
  JwtPayload,
  RefreshTokenPayload,
  TokenRepository,
  UserRepository,
  RefreshToken,
  User as AuthCoreUser,
} from '@helixcrm/auth-core';

// Re-export factory types
export type {
  CreateAuthCoreOptions,
  AuthCoreDependencies,
} from '@helixcrm/auth-core';

/**
 * Stable Adapter API - Our application's contract
 * This NEVER changes unless we explicitly version it.
 */
export interface TokenManagerService {
  /**
   * Issue an access token for a user
   * @param input User and authorization context
   * @returns Promise<string> JWT access token
   */
  issueAccessToken(input: AccessTokenInput): Promise<string>;

  /**
   * Issue a refresh token for a user
   * @param input User identity and organization
   * @returns Promise<string> JWT refresh token
   */
  issueRefreshToken(input: RefreshTokenInput): Promise<string>;

  /**
   * Validate and decode an access token
   * @param token JWT access token
   * @returns Decoded payload or throws if invalid
   */
  verifyAccessToken(token: string): VerifiedAccessToken;

  /**
   * Validate and decode a refresh token
   * @param token JWT refresh token
   * @returns Decoded payload or throws if invalid
   */
  verifyRefreshToken(token: string): VerifiedRefreshToken;
}

/**
 * Access Token Input - Stable across auth-core versions
 */
export interface AccessTokenInput {
  userId: string;
  organizationId: string;
  email: string;
  tokenVersion: number;
  permissions: string[];
  roles: string[];
  metadata?: Record<string, any>;
}

/**
 * Refresh Token Input - Stable across auth-core versions
 */
export interface RefreshTokenInput {
  userId: string;
  organizationId: string;
  version?: string; // Custom version binding for replay protection
  metadata?: Record<string, any>;
}

/**
 * Verified Access Token - Our application's normalized format
 */
export interface VerifiedAccessToken {
  sub: string; // user id
  organizationId: string; // org id (mapped from 'org')
  email?: string; // email (from metadata)
  tokenVersion: number; // token version (mapped from 'version')
  permissions: string[]; // user permissions
  roles: string[]; // user roles
  iat: number; // issued at
  exp: number; // expires at
}

/**
 * Verified Refresh Token - Our application's normalized format
 */
export interface VerifiedRefreshToken {
  jti: string; // token id
  sub: string; // user id
  organizationId: string; // org id (mapped from 'org')
  type: 'refresh'; // token type
  version?: string; // custom version (from metadata)
  iat: number; // issued at
  exp: number; // expires at
}

/**
 * Configuration for controlled degradation
 */
export interface AuthAdapterConfig {
  allowFallbacks: boolean; // Whether to allow fallback token issuance
  logAuthCoreFailures: boolean; // Whether to log auth-core failures
  fallbackIssuer: string; // Issuer for fallback tokens
  fallbackAudience: string; // Audience for fallback tokens
}

/**
 * Metrics interface for observability
 */
export interface AuthMetrics {
  increment(metric: string, tags?: Record<string, string>): void;
  timing(metric: string, duration: number, tags?: Record<string, string>): void;
}

/**
 * Auth Core Contract Definition - PRODUCTION GRADE
 * Version: 1.1.0
 * Status: UPDATED with permissions support
 */

// ==================== DOMAIN TYPES ====================
export interface JwtPayload {
  sub: string; // User ID
  org: string; // Organization ID
  role: string; // Primary user role
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
  version: number; // Token version for invalidation
  email?: string; // User email (optional, for context)
  permissions?: string[]; // User permissions array
  roles?: string[]; // All user roles
}

export interface RefreshTokenPayload {
  jti: string; // Unique token identifier
  sub: string; // User ID
  org: string; // Organization ID
  type: 'refresh'; // Token type
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
}

export interface RefreshToken {
  id: string;
  userId: string;
  organizationId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  invalidatedAt?: Date;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  organizationId: string;
}

// ==================== REPOSITORY CONTRACTS ====================
export interface TokenRepository {
  saveRefreshToken(token: RefreshToken): Promise<void>;
  findRefreshToken(tokenId: string): Promise<RefreshToken | null>;
  invalidateRefreshToken(tokenId: string): Promise<void>;
}

export interface UserRepository {
  findById(userId: string): Promise<User | null>;
  updateLoginAttempts(userId: string, attempts: number): Promise<void>;
  lockAccount(userId: string): Promise<void>;
  isAccountLocked(userId: string): Promise<boolean>;
  recordFailedAttempt(userId: string): Promise<void>;
  resetFailedAttempts(userId: string): Promise<void>;
}

// ==================== CORE CONTRACT ====================
export interface AuthCoreContract {
  // JWT Operations
  issueAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string;
  validateAccessToken(token: string): JwtPayload | null;

  // Refresh Token Operations
  issueRefreshToken(userId: string, organizationId: string): Promise<string>;
  validateRefreshToken(token: string): RefreshTokenPayload | null;
  invalidateToken(tokenId: string): Promise<void>;

  // Password Operations
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;

  // Security Operations
  isAccountLocked(userId: string): Promise<boolean>;
  recordFailedAttempt(userId: string): Promise<void>;
  resetFailedAttempts(userId: string): Promise<void>;
}

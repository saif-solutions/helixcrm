// Temporary interface definitions for auth-core contracts
// These will be replaced with actual @helixcrm/auth-core imports once package is built

export interface CreateRefreshTokenParams {
  userId: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
  expiresIn?: number;
}

export interface ValidateRefreshTokenParams {
  token: string;
  userId: string;
  organizationId: string;
  version?: string;
}

export interface RevokeRefreshTokenParams {
  token: string;
  userId: string;
  organizationId: string;
  version?: string;
  reason?: string;
}

export interface RefreshToken {
  token: string;
  userId: string;
  organizationId: string;
  version: string;
  issuedAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isRevoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
}

export interface TokenRepository {
  createRefreshToken(params: CreateRefreshTokenParams): Promise<RefreshToken>;
  validateRefreshToken(params: ValidateRefreshTokenParams): Promise<boolean>;
  revokeRefreshToken(params: RevokeRefreshTokenParams): Promise<void>;
  revokeAllUserTokens(userId: string, reason?: string): Promise<void>;
  getUserActiveTokens(userId: string): Promise<RefreshToken[]>;
  updateTokenVersion(
    userId: string,
    oldVersion: string,
    newVersion: string,
    newTokenHash: string,
  ): Promise<void>;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  isActive: boolean;
  tokenVersion: number;
  refreshTokenHash?: string | null;
  refreshTokenVersion?: string | null;
  refreshTokenIssuedAt?: Date | null;
  lastLoginAt?: Date | null;
  lastPasswordChange?: Date | null;
  permissions: string[];
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserParams {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  isActive?: boolean;
  tokenVersion?: number;
  refreshTokenHash?: string | null;
  refreshTokenVersion?: string | null;
}

export interface UpdateUserParams {
  userId: string;
  passwordHash?: string;
  tokenVersion?: number;
  refreshTokenHash?: string | null;
  refreshTokenVersion?: string | null;
  refreshTokenIssuedAt?: Date | null;
  lastLoginAt?: Date | null;
  isActive?: boolean;
}

export interface FindUserByEmailParams {
  email: string;
  organizationId: string;
}

export interface FindUserByIdParams {
  userId: string;
  organizationId: string;
}

export interface UserRepository {
  findByEmail(params: FindUserByEmailParams): Promise<User | null>;
  findById(params: FindUserByIdParams): Promise<User | null>;
  create(params: CreateUserParams): Promise<User>;
  update(params: UpdateUserParams): Promise<User>;
  updateTokenVersion(userId: string, increment?: number): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
}

export interface PasswordService {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export interface JwtService {
  sign(payload: any, options?: any): string;
  verify(token: string, options?: any): any;
}

export interface TokenManagerService {
  createAccessToken(
    user: User,
    permissions: string[],
    roles: string[],
  ): Promise<string>; // Changed to Promise<string>
  createRefreshToken(userId: string, version: string): Promise<string>; // Changed to Promise<string>
  verifyAccessToken(token: string): any;
  verifyRefreshToken(token: string): any;
}

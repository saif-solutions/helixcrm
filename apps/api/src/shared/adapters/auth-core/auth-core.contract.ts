/**
 * Canonical Auth-Core Contract
 * Version: @helixcrm/auth-core@0.1.0
 * Date: 2024-02-09
 * Status: FROZEN for MVP-1 - DO NOT MODIFY WITHOUT MIGRATION PLAN
 *
 * This file defines the REAL contract with @helixcrm/auth-core
 * All adapters MUST implement this exact interface.
 */

// Re-export actual auth-core types
import type {
  AuthCoreContract,
  JwtPayload,
  RefreshTokenPayload,
  TokenRepository,
  UserRepository,
  RefreshToken,
  User as AuthCoreUser,
} from '@helixcrm/auth-core';

import { createAuthCore } from '@helixcrm/auth-core';

// Re-export the types we need
export type {
  AuthCoreContract,
  JwtPayload,
  RefreshTokenPayload,
  TokenRepository,
  UserRepository,
  RefreshToken,
  AuthCoreUser,
};

export { createAuthCore };

// Local types that extend auth-core
export interface AccessTokenInput {
  userId: string;
  email: string;
  organizationId: string;
}

export interface RefreshTokenInput {
  userId: string;
  tokenVersion: number;
}

export interface VerifiedAccessToken extends JwtPayload {
  userId: string;
  email: string;
  organizationId: string;
}

export interface VerifiedRefreshToken extends RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
}

export interface AuthAdapterConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiration?: string;
  jwtRefreshExpiration?: string;
}

export interface CreateAuthCoreOptions {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiration?: string;
  jwtRefreshExpiration?: string;
}

export interface AuthCoreDependencies {
  userRepository: UserRepository;
  tokenRepository: TokenRepository;
}

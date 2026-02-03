/**
 * Factory for creating auth-core instances
 * PRODUCTION-GRADE IMPLEMENTATION
 */

import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';
import { TokenManager } from './token-manager.service';
import { 
  AuthCoreContract, 
  TokenRepository, 
  UserRepository 
} from '../contracts/auth.contract';

// Configuration types
export interface CreateAuthCoreOptions {
  jwtSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiresIn?: string;
  refreshTokenExpiresIn?: string;
}

export interface AuthCoreDependencies {
  tokenRepository: TokenRepository;
  userRepository: UserRepository;
}

// Factory implementation
export function createAuthCore(
  options: CreateAuthCoreOptions,
  dependencies: AuthCoreDependencies
): AuthCoreContract {
  const {
    jwtSecret,
    refreshTokenSecret,
    accessTokenExpiresIn = '15m',
    refreshTokenExpiresIn = '7d',
  } = options;

  const jwtService = new JwtService({
    secret: jwtSecret,
    expiresIn: accessTokenExpiresIn,
  });

  const passwordService = new PasswordService();

  const tokenManager = new TokenManager({
    refreshTokenSecret,
    refreshTokenExpiresIn,
    tokenRepository: dependencies.tokenRepository,
  });

  // Return implementation that satisfies AuthCoreContract
  const implementation: AuthCoreContract = {
    // JWT Operations
    issueAccessToken: (payload) => jwtService.issueToken(payload),
    validateAccessToken: (token) => jwtService.validateToken(token),

    // Refresh Token Operations
    issueRefreshToken: async (userId, organizationId) => {
      return await tokenManager.issueRefreshToken(userId, organizationId);
    },
    validateRefreshToken: (token) => tokenManager.validateRefreshToken(token),
    invalidateToken: async (tokenId) => {
      await tokenManager.invalidateToken(tokenId);
    },

    // Password Operations
    hashPassword: async (password) => await passwordService.hash(password),
    verifyPassword: async (password, hash) => await passwordService.verify(password, hash),

    // Security Operations
    isAccountLocked: async (userId) => await dependencies.userRepository.isAccountLocked(userId),
    recordFailedAttempt: async (userId) => await dependencies.userRepository.recordFailedAttempt(userId),
    resetFailedAttempts: async (userId) => await dependencies.userRepository.resetFailedAttempts(userId),
  };

  return implementation;
}
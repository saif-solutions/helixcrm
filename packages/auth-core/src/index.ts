/**
 * @helixcrm/auth-core v0.1.0
 * Production-grade authentication core
 * Main entry point - ALL EXPORTS HERE
 */

// Contract types
export { 
  type AuthCoreContract,
  type JwtPayload,
  type RefreshTokenPayload,
  type TokenRepository,
  type UserRepository,
  type RefreshToken,
  type User
} from './contracts/auth.contract';

// Factory and configuration
export { 
  createAuthCore,
  type CreateAuthCoreOptions,
  type AuthCoreDependencies 
} from './core/auth-core.factory';

// Core services
export { JwtService } from './core/jwt.service';
export { PasswordService } from './core/password.service';
export { TokenManager } from './core/token-manager.service';
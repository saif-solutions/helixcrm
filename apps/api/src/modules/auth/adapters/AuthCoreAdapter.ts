import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import * as jwt from 'jsonwebtoken';
import { PrismaTokenRepository } from './PrismaTokenRepository';
import { PrismaUserRepository } from './PrismaUserRepository';
import { PrismaTokenRepositoryBridge } from './PrismaTokenRepositoryBridge';
import { PrismaUserRepositoryBridge } from './PrismaUserRepositoryBridge';

// REAL auth-core imports
import { createAuthCore, AuthCoreContract } from '@helixcrm/auth-core';

// Our canonical contract
import {
  TokenManagerService,
  AccessTokenInput,
  RefreshTokenInput,
  VerifiedAccessToken,
  VerifiedRefreshToken,
  AuthAdapterConfig,
} from '../../../shared/contracts/auth-core.contract';

@Injectable()
export class AuthCoreAdapter implements TokenManagerService {
  private readonly logger = new Logger(AuthCoreAdapter.name);

  // Real auth-core instance
  private authCore: AuthCoreContract;

  // Bridges
  private tokenRepositoryBridge: PrismaTokenRepositoryBridge;
  private userRepositoryBridge: PrismaUserRepositoryBridge;

  // Configuration
  private config: AuthAdapterConfig = {
    allowFallbacks: process.env.NODE_ENV === 'development',
    logAuthCoreFailures: true,
    fallbackIssuer: 'helixcrm-fallback',
    fallbackAudience: 'helixcrm-client',
  };

  constructor(private prisma: PrismaService) {
    // Initialize bridges
    this.tokenRepositoryBridge = new PrismaTokenRepositoryBridge(prisma);
    this.userRepositoryBridge = new PrismaUserRepositoryBridge(prisma);

    // Initialize REAL auth-core
    this.initializeAuthCore();
  }

  private initializeAuthCore() {
    const jwtSecret = this.getJwtSecret();
    const refreshSecret = this.getRefreshSecret();

    this.authCore = createAuthCore(
      {
        jwtSecret: jwtSecret,
        refreshTokenSecret: refreshSecret,
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '7d',
      },
      {
        tokenRepository: this.tokenRepositoryBridge,
        userRepository: this.userRepositoryBridge,
      },
    );

    this.logger.log(
      `Auth-core initialized (v0.1.0) - Fallbacks: ${this.config.allowFallbacks ? 'ENABLED' : 'DISABLED'}`,
    );
  }

  // ==================== TOKEN MANAGER SERVICE IMPLEMENTATION ====================

  // Find these methods and remove the fallback logic:
  async issueAccessToken(input: AccessTokenInput): Promise<string> {
    const startTime = Date.now();

    try {
      // Transform our input to auth-core JwtPayload structure
      const authCorePayload = {
        sub: input.userId,
        org: input.organizationId,
        role: this.determinePrimaryRole(input.roles),
        version: input.tokenVersion,
        // Additional claims will be encoded in the token but not in standard fields
      };

      // Auth-core issueAccessToken is SYNCHRONOUS
      const token = this.authCore.issueAccessToken(authCorePayload);

      this.logger.debug(`Access token issued via auth-core`, {
        userId: input.userId,
        organizationId: input.organizationId,
        duration: Date.now() - startTime,
      });

      return token;
    } catch (error) {
      this.logAuthCoreFailure('issueAccessToken', error, input.userId);

      throw new InternalServerErrorException('Token issuance failed', {
        cause: error,
        description: 'AUTH_CORE_ACCESS_TOKEN_FAILURE',
      });
    }
  }

  async issueRefreshToken(input: RefreshTokenInput): Promise<string> {
    const startTime = Date.now();

    try {
      // Auth-core issueRefreshToken is ASYNCHRONOUS and expects (userId, organizationId)
      const token = await this.authCore.issueRefreshToken(
        input.userId,
        input.organizationId,
      );

      this.logger.debug(`Refresh token issued via auth-core`, {
        userId: input.userId,
        organizationId: input.organizationId,
        duration: Date.now() - startTime,
      });

      return token;
    } catch (error) {
      this.logAuthCoreFailure('issueRefreshToken', error, input.userId);

      throw new InternalServerErrorException('Refresh token issuance failed', {
        cause: error,
        description: 'AUTH_CORE_REFRESH_TOKEN_FAILURE',
      });
    }
  }

  verifyAccessToken(token: string): VerifiedAccessToken {
    try {
      // First try auth-core validation
      const payload = this.authCore.validateAccessToken(token);

      if (payload) {
        return this.transformAuthCoreAccessToken(payload);
      }
    } catch (error) {
      this.logAuthCoreFailure('validateAccessToken', error, 'unknown');
      // Don't fallback - throw directly
      throw new InternalServerErrorException(
        'Access token verification failed',
        { cause: error, description: 'TOKEN_VERIFICATION_FAILURE' },
      );
    }

    // This should never happen if auth-core.validateAccessToken properly throws
    throw new InternalServerErrorException('Access token verification failed', {
      description: 'TOKEN_VERIFICATION_FAILURE',
    });
  }

  verifyRefreshToken(token: string): VerifiedRefreshToken {
    try {
      // First try auth-core validation
      const payload = this.authCore.validateRefreshToken(token);

      if (payload) {
        return this.transformAuthCoreRefreshToken(payload);
      }
    } catch (error) {
      this.logAuthCoreFailure('validateRefreshToken', error, 'unknown');
      // Don't fallback - throw directly
      throw new InternalServerErrorException(
        'Refresh token verification failed',
        { cause: error, description: 'TOKEN_VERIFICATION_FAILURE' },
      );
    }

    // This should never happen if auth-core.validateRefreshToken properly throws
    throw new InternalServerErrorException(
      'Refresh token verification failed',
      { description: 'TOKEN_VERIFICATION_FAILURE' },
    );
  }

  // ==================== FALLBACK IMPLEMENTATIONS ====================

  private issueAccessTokenFallback(input: AccessTokenInput): string {
    this.logger.warn(`Using fallback access token issuance`, {
      userId: input.userId,
      reason: 'auth-core failure',
    });

    const secret = this.getJwtSecret();
    const payload = {
      sub: input.userId,
      org: input.organizationId,
      email: input.email,
      tokenVersion: input.tokenVersion,
      permissions: input.permissions,
      roles: input.roles,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, secret, {
      expiresIn: '15m',
      issuer: this.config.fallbackIssuer,
      audience: this.config.fallbackAudience,
    });
  }

  private issueRefreshTokenFallback(input: RefreshTokenInput): string {
    this.logger.warn(`Using fallback refresh token issuance`, {
      userId: input.userId,
      reason: 'auth-core failure',
    });

    const secret = this.getJwtSecret();
    const payload = {
      sub: input.userId,
      org: input.organizationId,
      type: 'refresh',
      version: input.version || 'fallback',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, secret, {
      expiresIn: '7d',
      issuer: this.config.fallbackIssuer,
      audience: this.config.fallbackAudience,
    });
  }

  // ==================== TRANSFORMATION METHODS ====================

  private transformAuthCoreAccessToken(payload: any): VerifiedAccessToken {
    // Auth-core payload: { sub, org, role, version, iat, exp }
    // Our format: { sub, organizationId, email, tokenVersion, permissions, roles, iat, exp }

    // Note: auth-core doesn't include permissions/roles in payload
    // We need to fetch them separately or accept they're not in token
    return {
      sub: payload.sub,
      organizationId: payload.org,
      email: '', // Not in auth-core payload
      tokenVersion: payload.version || 0,
      permissions: [], // Not in auth-core payload
      roles: [payload.role || 'user'],
      iat: payload.iat,
      exp: payload.exp,
    };
  }

  private transformAuthCoreRefreshToken(payload: any): VerifiedRefreshToken {
    // Auth-core payload: { jti, sub, org, type, iat, exp }
    return {
      jti: payload.jti,
      sub: payload.sub,
      organizationId: payload.org,
      type: payload.type,
      version: undefined, // Not in auth-core payload
      iat: payload.iat,
      exp: payload.exp,
    };
  }

  private transformJwtAccessToken(decoded: any): VerifiedAccessToken {
    // Transform from our fallback JWT format
    return {
      sub: decoded.sub || decoded.userId,
      organizationId: decoded.org || decoded.organizationId,
      email: decoded.email || '',
      tokenVersion: decoded.tokenVersion || decoded.version || 0,
      permissions: decoded.permissions || [],
      roles: decoded.roles || [decoded.role || 'user'],
      iat: decoded.iat,
      exp: decoded.exp,
    };
  }

  private transformJwtRefreshToken(decoded: any): VerifiedRefreshToken {
    return {
      jti: decoded.jti || decoded.id || 'unknown',
      sub: decoded.sub || decoded.userId,
      organizationId: decoded.org || decoded.organizationId,
      type: decoded.type || 'refresh',
      version: decoded.version,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  }

  // ==================== HELPER METHODS ====================

  private determinePrimaryRole(roles: string[]): string {
    // Simple role hierarchy
    if (roles.includes('SystemAdmin')) return 'admin';
    if (roles.includes('Manager')) return 'manager';
    if (roles.includes('User')) return 'user';
    if (roles.includes('Viewer')) return 'viewer';
    return 'user';
  }

  private logAuthCoreFailure(method: string, error: any, userId: string) {
    if (this.config.logAuthCoreFailures) {
      this.logger.error(`Auth-core ${method} failed`, {
        error: error.message,
        errorType: error.name,
        userId,
        stack: error.stack?.split('\n')[0],
        severity: 'HIGH',
      });
    }
  }

  // ==================== SECRET MANAGEMENT ====================

  private getJwtSecret(): string {
    const secret =
      process.env.JWT_SECRET ??
      process.env.JWT_ACCESS_SECRET ??
      process.env.AUTH_JWT_SECRET ??
      process.env.AUTH_CORE_JWT_SECRET;

    if (!secret || secret.includes('changeme')) {
      throw new Error(
        'JWT secret not configured. Set JWT_SECRET or JWT_ACCESS_SECRET in .env',
      );
    }

    return secret;
  }

  private getRefreshSecret(): string {
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ??
      process.env.AUTH_JWT_REFRESH_SECRET ??
      process.env.JWT_REFRESH_KEY ??
      this.getJwtSecret(); // Fallback to same secret

    if (!refreshSecret || refreshSecret.includes('changeme')) {
      throw new Error(
        'JWT refresh secret not configured. Set JWT_REFRESH_SECRET in .env',
      );
    }

    return refreshSecret;
  }

  // ==================== BACKWARD COMPATIBILITY ====================
  // These methods exist for backward compatibility with auth.service.ts
  // TODO: Refactor auth.service.ts to use TokenManagerService directly

  /**
   * @deprecated Use TokenManagerService methods directly
   */
  getPasswordService() {
    return {
      hash: (password: string) => this.authCore.hashPassword(password),
      compare: (password: string, hash: string) =>
        this.authCore.verifyPassword(password, hash),
    };
  }

  /**
   * @deprecated Use TokenManagerService methods directly
   */
  getTokenManagerService(): TokenManagerService {
    return {
      issueAccessToken: (input: AccessTokenInput) =>
        this.issueAccessToken(input),
      issueRefreshToken: (input: RefreshTokenInput) =>
        this.issueRefreshToken(input),
      verifyAccessToken: (token: string) => this.verifyAccessToken(token),
      verifyRefreshToken: (token: string) => this.verifyRefreshToken(token),
    };
  }

  /**
   * @deprecated Use getBridges() instead
   */
  async withTransaction<T>(
    callback: (repositories: {
      tokenRepository: any;
      userRepository: any;
    }) => Promise<T>,
  ): Promise<T> {
    return await this.prisma.$transaction(
      async (tx) => {
        // Create new bridge instances with transaction client
        const txTokenRepositoryBridge = new PrismaTokenRepositoryBridge(
          tx as any,
        );
        const txUserRepositoryBridge = new PrismaUserRepositoryBridge(
          tx as any,
        );

        return callback({
          tokenRepository: txTokenRepositoryBridge,
          userRepository: txUserRepositoryBridge,
        });
      },
      {
        maxWait: 10000,
        timeout: 30000,
        isolationLevel: 'Serializable',
      },
    );
  }

  // Legacy getters for repositories (not used in new pattern)
  getTokenRepository() {
    throw new Error('Use getBridges() instead');
  }

  getUserRepository() {
    throw new Error('Use getBridges() instead');
  }

  getJwtService() {
    throw new Error('Use TokenManagerService methods instead');
  }

  // ==================== PUBLIC API ====================

  /**
   * Get auth-core instance directly (for advanced use cases)
   */
  getAuthCore(): AuthCoreContract {
    return this.authCore;
  }

  /**
   * Get bridges for transaction support
   */
  getBridges() {
    return {
      tokenRepository: this.tokenRepositoryBridge,
      userRepository: this.userRepositoryBridge,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ authCore: boolean; secrets: boolean }> {
    const secretsConfigured = !!(
      this.getJwtSecret() && this.getRefreshSecret()
    );

    let authCoreWorking = false;
    try {
      // Test with a simple hash operation
      const testHash = await this.authCore.hashPassword('health-check');
      authCoreWorking = !!testHash;
    } catch (error) {
      this.logger.error('Auth-core health check failed', error);
    }

    return {
      authCore: authCoreWorking,
      secrets: secretsConfigured,
    };
  }
}

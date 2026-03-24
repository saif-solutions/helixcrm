// apps/api/src/modules/auth/services/refresh-token.service.ts

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import SecurityConfig from '../../../config/security.config';

// Define JWT payload interface for refresh tokens
interface RefreshTokenPayload {
  sub: string;
  organizationId: string;
  version: string;
  type: string;
  jti: string;
  iat?: number;
  exp?: number;
}

// Define session info interface
interface ActiveSessionInfo {
  userId: string;
  email: string;
  issuedAt: Date;
  lastUsed: Date | null;
  isActive: boolean;
}

// Define token validation result
interface TokenValidationResult {
  userId: string;
  organizationId: string;
  version: string;
  jti: string;
}

// Reusable JWT payload type guard
function isJwtPayload<T extends Record<string, unknown>>(
  value: unknown,
  keys: (keyof T)[],
): value is T {
  return (
    typeof value === 'object' &&
    value !== null &&
    keys.every((key) => key in value)
  );
}

// Specific type guard for refresh token payload
function isRefreshTokenPayload(value: unknown): value is RefreshTokenPayload {
  return isJwtPayload<RefreshTokenPayload>(value, [
    'sub',
    'version',
    'type',
    'jti',
    'organizationId',
  ]);
}

// Safe decode function - returns unknown to avoid unsafe any assignment
function safeDecode(jwtService: JwtService, token: string): unknown {
  return jwtService.decode(token);
}

// Constants for token operations
const TOKEN_CONFIG = {
  /** Number of bcrypt rounds for token hashing */
  BCRYPT_ROUNDS: 10,
  /** Cache TTL for rate limiting (milliseconds) */
  REVOCATION_CACHE_TTL_MS: 60000,
} as const;

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  // Simple cache to prevent repeated revocation attempts (DDOS protection)
  private readonly revocationCache = new Map<string, { timestamp: number }>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate a refresh token against User table
   * @param token - The refresh token string
   * @param userId - User ID to validate against
   * @param organizationId - Organization ID for tenant isolation
   * @returns Promise<boolean> - True if token is valid
   */
  async validate(
    token: string,
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
          organizationId: organizationId,
        },
        select: {
          refreshTokenHash: true,
          refreshTokenVersion: true,
          isActive: true,
          tokenVersion: true,
        },
      });

      if (!user || !user.isActive || !user.refreshTokenHash) {
        this.logger.debug(
          `Invalid refresh token validation attempt for user: ${userId}`,
        );
        return false;
      }

      // Extract version from token payload with type-safe validation
      let tokenVersion: string | null = null;
      try {
        // Safe decode: returns unknown to avoid unsafe assignment
        const decoded: unknown = safeDecode(this.jwtService, token);
        if (isRefreshTokenPayload(decoded)) {
          tokenVersion = decoded.version;
        }
      } catch {
        // If decode fails, continue with hash-only validation
      }

      // Validate version if present
      if (tokenVersion && user.refreshTokenVersion !== tokenVersion) {
        this.logger.warn(`Refresh token version mismatch for user: ${userId}`, {
          expectedVersion: user.refreshTokenVersion,
          receivedVersion: tokenVersion,
        });
        return false;
      }

      return bcrypt.compare(token, user.refreshTokenHash);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to validate refresh token: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Revoke a refresh token (optimized - uses JWT payload for direct lookup)
   * @param token - The refresh token to revoke
   * @param reason - Optional reason for revocation (for audit)
   */
  async revoke(token: string, reason?: string): Promise<void> {
    // Check cache to prevent repeated revocation attempts
    const tokenHash = this.getTokenHash(token);
    const cached = this.revocationCache.get(tokenHash);

    if (
      cached &&
      Date.now() - cached.timestamp < TOKEN_CONFIG.REVOCATION_CACHE_TTL_MS
    ) {
      this.logger.debug(
        `Skipping duplicate revocation attempt for token: ${tokenHash.substring(0, 8)}...`,
      );
      return;
    }

    // Cache this attempt
    this.revocationCache.set(tokenHash, { timestamp: Date.now() });

    // Clean cache periodically (simple approach - keep last 1000 entries)
    if (this.revocationCache.size > 1000) {
      const oldest = Array.from(this.revocationCache.keys())[0];
      if (oldest) this.revocationCache.delete(oldest);
    }

    try {
      // Decode token to get user ID with type-safe validation
      let userId: string | null = null;
      try {
        // Safe decode: returns unknown to avoid unsafe assignment
        const decoded: unknown = safeDecode(this.jwtService, token);
        if (isRefreshTokenPayload(decoded)) {
          userId = decoded.sub;
        } else {
          this.logger.warn('Invalid token structure during revocation');
        }
      } catch {
        this.logger.warn('Failed to decode token for revocation');
      }

      if (!userId) {
        this.logger.warn('Cannot revoke token: missing user ID in payload');
        return;
      }

      // Directly update the user by ID - O(1) operation
      const result = await this.prisma.user.update({
        where: { id: userId },
        data: {
          refreshTokenHash: null,
          refreshTokenVersion: null,
          refreshTokenIssuedAt: null,
        },
      });

      this.logger.debug(
        `Refresh token revoked for user ${userId}: ${reason || 'manual_revocation'}`,
        {
          userId: result.id,
          reason: reason || 'manual_revocation',
          tokenHash: tokenHash.substring(0, 8),
        },
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      // Don't throw on revocation errors - operation should be idempotent
      this.logger.warn(`Failed to revoke refresh token: ${errorMessage}`);
    }
  }

  /**
   * Verify and extract user info from refresh token
   * @param token - The refresh token to verify
   * @returns Token validation result or null if invalid
   */
  async verifyAndExtract(token: string): Promise<TokenValidationResult | null> {
    try {
      // Verify JWT signature and expiration
      const payload = this.jwtService.verify<RefreshTokenPayload>(token, {
        issuer: SecurityConfig.jwt.issuer,
        audience: SecurityConfig.jwt.audience,
      });

      // Validate payload structure
      if (!isRefreshTokenPayload(payload)) {
        this.logger.warn('Invalid token payload structure');
        return null;
      }

      if (payload.type !== 'refresh') {
        this.logger.warn('Invalid token type in refresh flow');
        return null;
      }

      if (!payload.sub || !payload.organizationId) {
        this.logger.warn('Invalid token payload missing required fields');
        return null;
      }

      // Find user and verify token hash
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          organizationId: true,
          refreshTokenHash: true,
          refreshTokenVersion: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive || !user.refreshTokenHash) {
        this.logger.debug(`User not found or inactive: ${payload.sub}`);
        return null;
      }

      // Verify token matches stored hash AND version matches
      const isHashValid = await bcrypt.compare(token, user.refreshTokenHash);
      const isVersionValid = user.refreshTokenVersion === payload.version;

      if (!isHashValid || !isVersionValid) {
        this.logger.warn(`Token validation failed for user: ${payload.sub}`, {
          hashValid: isHashValid,
          versionValid: isVersionValid,
        });
        return null;
      }

      return {
        userId: user.id,
        organizationId: user.organizationId,
        version: payload.version,
        jti: payload.jti,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Token verification failed: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Get active session info for a user
   * @param userId - User ID to get session for
   * @param organizationId - Organization ID for tenant isolation
   * @returns Session info or null if no active session
   */
  async getActiveSession(
    userId: string,
    organizationId: string,
  ): Promise<ActiveSessionInfo | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
          organizationId: organizationId,
        },
        select: {
          id: true,
          email: true,
          refreshTokenIssuedAt: true,
          lastLoginAt: true,
        },
      });

      if (!user || !user.refreshTokenIssuedAt) {
        return null;
      }

      return {
        userId: user.id,
        email: user.email,
        issuedAt: user.refreshTokenIssuedAt,
        lastUsed: user.lastLoginAt,
        isActive: true,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get active session: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Revoke all refresh tokens for a user (e.g., on password change)
   * @param userId - User ID to revoke tokens for
   * @param reason - Optional reason for revocation
   */
  async revokeAllForUser(userId: string, reason?: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          refreshTokenHash: null,
          refreshTokenVersion: null,
          refreshTokenIssuedAt: null,
          tokenVersion: { increment: 1 }, // Invalidate all access tokens as well
        },
      });

      this.logger.debug(`All refresh tokens revoked for user: ${userId}`, {
        userId,
        reason: reason || 'revoke_all',
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to revoke all tokens for user ${userId}: ${errorMessage}`,
      );
      throw new UnauthorizedException('Failed to revoke tokens');
    }
  }

  /**
   * Check if a refresh token is still valid (without extracting user info)
   * @param token - The refresh token to check
   * @returns Promise<boolean> - True if token is valid
   */
  async isTokenValid(token: string): Promise<boolean> {
    const result = await this.verifyAndExtract(token);
    return result !== null;
  }

  /**
   * Generate a hash for token (used for cache keys)
   * @param token - The token to hash
   * @returns SHA-256 hash of the token
   */
  private getTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

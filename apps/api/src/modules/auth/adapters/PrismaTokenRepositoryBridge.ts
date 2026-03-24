// apps/api/src/modules/auth/adapters/PrismaTokenRepositoryBridge.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import SecurityConfig from '../../../config/security.config';
import { TokenRepository, RefreshToken } from '@helixcrm/auth-core';

// Helper function to safely get token value
function safeTokenValue(token: unknown): string {
  if (typeof token === 'string') {
    return token.substring(0, 30) + '...';
  }
  // For objects, use JSON.stringify to avoid [object Object]
  if (token && typeof token === 'object') {
    try {
      const jsonString = JSON.stringify(token);
      if (jsonString && jsonString !== '{}') {
        return jsonString.substring(0, 30) + '...';
      }
    } catch {
      // Fall through to default
    }
    return '[COMPLEX_OBJECT]';
  }
  // For other types, use String() but only for primitives
  if (token === null) return 'null';
  if (token === undefined) return 'undefined';
  if (typeof token === 'number') return String(token).substring(0, 30) + '...';
  if (typeof token === 'boolean') return String(token);
  return 'UNKNOWN_TYPE';
}

@Injectable()
export class PrismaTokenRepositoryBridge implements TokenRepository {
  private readonly logger = new Logger(PrismaTokenRepositoryBridge.name);

  constructor(private prisma: PrismaService) {
    this.logger.debug('PrismaTokenRepositoryBridge initialized');
  }

  /**
   * Save a refresh token to the database
   * Maps auth-core RefreshToken to user.refreshTokenHash schema
   *
   * CONTRACT: token.id contains the raw jti (JWT ID) from auth-core
   * This jti MUST be stored as-is in refreshTokenVersion for replay protection
   */
  async saveRefreshToken(token: RefreshToken): Promise<void> {
    // DEBUG: Log token structure to understand what auth-core provides
    this.logger.debug('[BRIDGE-DEBUG] Token structure from auth-core', {
      tokenKeys: Object.keys(token),
      hasTokenField: 'token' in token,
      hasTokenHashField: 'tokenHash' in token,
      hasIdField: 'id' in token,
      hasUserIdField: 'userId' in token,
      tokenValue:
        'token' in token ? safeTokenValue(token.token) : 'NOT_PRESENT',
      tokenHashValue:
        'tokenHash' in token ? safeTokenValue(token.tokenHash) : 'NOT_PRESENT',
      idValue:
        'id' in token && token.id
          ? typeof token.id === 'string'
            ? token.id.substring(0, 20)
            : 'NOT_STRING'
          : 'NOT_PRESENT',
    });

    // Validate required fields
    if (!token.userId) {
      this.logger.error('[SECURITY] RefreshToken missing userId', {
        tokenId: token.id,
      });
      throw new Error('RefreshToken must have userId field');
    }

    if (!token.organizationId) {
      this.logger.error('[SECURITY] RefreshToken missing organizationId', {
        userId: token.userId,
        tokenId: token.id,
      });
      throw new Error('RefreshToken must have organizationId field');
    }

    if (!token.id || token.id.length !== 64) {
      this.logger.warn('[SECURITY] RefreshToken jti may be malformed', {
        userId: token.userId,
        jtiLength: token.id?.length,
        jtiFormat: this.describeJtiFormat(token.id),
      });
    }

    // Hash the token for secure storage
    // Ensure token.tokenHash exists and is a string
    const tokenHash = token.tokenHash;
    if (typeof tokenHash !== 'string') {
      this.logger.error('[SECURITY] token.tokenHash is not a string', {
        userId: token.userId,
        tokenId: token.id,
        tokenHashType: typeof tokenHash,
      });
      throw new Error('Invalid token hash format');
    }

    const hashedToken = await bcrypt.hash(
      tokenHash,
      SecurityConfig.refreshToken.bcryptRounds || 10,
    );

    // Update user with new token (atomic operation)
    await this.prisma.user.update({
      where: { id: token.userId },
      data: {
        refreshTokenHash: hashedToken,
        /**
         * CRITICAL SECURITY CONTRACT:
         * refreshTokenVersion MUST equal the JWT jti issued by auth-core.
         * This value is used for refresh token replay protection.
         * Do NOT transform, prefix, or reformat this value.
         */
        refreshTokenVersion: token.id, // Store raw auth-core jti
        refreshTokenIssuedAt: token.createdAt,
      },
    });

    this.logger.debug('[AUTH-CORE] Refresh token saved', {
      userId: token.userId,
      organizationId: token.organizationId,
    });
  }

  /**
   * Find a refresh token by its jti
   * Note: auth-core provides only jti, we must look up by refreshTokenVersion field
   */
  async findRefreshToken(tokenId: string): Promise<RefreshToken | null> {
    this.logger.debug('[BRIDGE-DEBUG] findRefreshToken called', {
      lookupJti: tokenId,
      jtiLength: tokenId.length,
      jtiPrefix: tokenId.substring(0, 20),
      jtiFormat: this.describeJtiFormat(tokenId),
    });

    this.logger.debug('[AUTH-CORE] Looking up refresh token', {
      jtiPrefix: tokenId.substring(0, 10),
      jtiLength: tokenId.length,
      jtiFormat: this.describeJtiFormat(tokenId),
    });

    // Find user by jti (stored as refreshTokenVersion)
    const user = await this.prisma.user.findFirst({
      where: {
        refreshTokenVersion: tokenId, // jti is stored as refreshTokenVersion
        refreshTokenHash: { not: null }, // Ensure token is active
      },
      select: {
        id: true,
        organizationId: true,
        refreshTokenHash: true,
        refreshTokenVersion: true,
        refreshTokenIssuedAt: true,
      },
    });

    this.logger.debug('[BRIDGE-DEBUG] Database query result', {
      userFound: !!user,
      userId: user?.id,
      dbJti: user?.refreshTokenVersion,
      dbJtiPrefix: user?.refreshTokenVersion?.substring(0, 20),
      hashExists: !!user?.refreshTokenHash,
    });

    if (!user) {
      this.logger.debug('[AUTH-CORE] Token not found or inactive', {
        jtiPrefix: tokenId.substring(0, 10),
        reason: user ? 'token_hash_null' : 'no_user_found',
      });
      return null;
    }

    this.logger.debug('[AUTH-CORE] Token found', {
      userId: user.id,
      organizationId: user.organizationId,
      issuedAt: user.refreshTokenIssuedAt?.toISOString(),
    });

    // Reconstruct auth-core RefreshToken object
    return {
      id: tokenId,
      userId: user.id,
      organizationId: user.organizationId,
      tokenHash: user.refreshTokenHash,
      createdAt: user.refreshTokenIssuedAt,
      expiresAt: new Date(user.refreshTokenIssuedAt.getTime() + 604800000), // 7 days
    };
  }

  /**
   * Invalidate a specific refresh token
   * Note: tokenId is the jti, we need to find user by refreshTokenVersion
   */
  async invalidateRefreshToken(tokenId: string): Promise<void> {
    this.logger.debug('[AUTH-CORE] Invalidating refresh token', {
      jtiPrefix: tokenId.substring(0, 10),
      action: 'single_token_invalidation',
    });

    // Find user with this jti
    const user = await this.prisma.user.findFirst({
      where: { refreshTokenVersion: tokenId },
      select: { id: true },
    });

    if (!user) {
      this.logger.warn('[AUTH-CORE] Token not found for invalidation', {
        jtiPrefix: tokenId.substring(0, 10),
      });
      return;
    }

    // Atomic update with version check for safety
    await this.prisma.user.update({
      where: {
        id: user.id,
        refreshTokenVersion: tokenId, // Ensure we only invalidate specific token
      },
      data: {
        refreshTokenHash: null,
        refreshTokenVersion: null,
        refreshTokenIssuedAt: null,
      },
    });

    this.logger.debug('[AUTH-CORE] Token invalidated', {
      userId: user.id,
      jtiPrefix: tokenId.substring(0, 10),
    });
  }

  /**
   * Revoke all tokens for a user (e.g., on password change, security breach)
   */
  async revokeAllUserTokens(userId: string, reason?: string): Promise<void> {
    this.logger.debug('[AUTH-CORE] Revoking all user tokens', {
      userId,
      reason: reason || 'security_procedure',
      severity: 'HIGH',
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenVersion: null,
        refreshTokenIssuedAt: null,
        tokenVersion: { increment: 1 }, // Invalidate all access tokens
      },
    });

    this.logger.debug('[AUTH-CORE] All tokens revoked', {
      userId,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Update token version (atomic refresh token rotation)
   * Critical for replay protection - ensures old token cannot be reused
   */
  async updateTokenVersion(
    userId: string,
    oldVersion: string, // jti of old token
    newVersion: string, // jti of new token
    newTokenHash: string,
  ): Promise<void> {
    this.logger.debug('[AUTH-CORE] Rotating refresh token', {
      userId,
      oldJtiPrefix: oldVersion.substring(0, 10),
      newJtiPrefix: newVersion.substring(0, 10),
      operation: 'atomic_version_update',
    });

    // Atomic update with version check for replay protection
    const result = await this.prisma.user.update({
      where: {
        id: userId,
        refreshTokenVersion: oldVersion, // Ensure atomic version check
      },
      data: {
        refreshTokenHash: newTokenHash,
        refreshTokenVersion: newVersion,
        refreshTokenIssuedAt: new Date(),
        tokenVersion: { increment: 1 }, // Invalidate old access tokens
      },
    });

    if (!result) {
      this.logger.error('[SECURITY] Token rotation failed - version mismatch', {
        userId,
        oldJtiPrefix: oldVersion.substring(0, 10),
        probableCause: 'replay_attempt_or_stale_token',
        severity: 'CRITICAL',
      });
      throw new Error('Token version mismatch - possible replay attempt');
    }

    this.logger.debug('[AUTH-CORE] Token rotated successfully', {
      userId,
      newJtiPrefix: newVersion.substring(0, 10),
    });
  }

  // ==================== SECURITY UTILITIES ====================

  /**
   * Describe jti format for debugging and security monitoring
   */
  private describeJtiFormat(jti: string): string {
    if (!jti) return 'NULL_OR_UNDEFINED';
    if (/^[a-f0-9]{64}$/i.test(jti)) return '64-CHAR-HEX-HASH';
    if (jti.includes('-') && jti.length > 20) return 'TIMESTAMP-UUID';
    if (jti.includes(':')) return 'USERID:JTI';
    return `UNKNOWN_FORMAT_LEN_${jti.length}`;
  }

  /**
   * Check if string looks like a valid jti (JWT ID)
   * Primary validation: 64-character hex string (SHA256 hash)
   */
  private isValidJti(str: string): boolean {
    return /^[a-f0-9]{64}$/i.test(str);
  }

  // ==================== DEPRECATED METHODS ====================
  // These methods assumed "userId:jti" format which is not used by auth-core
  // Kept for backward compatibility but should not be called

  /**
   * @deprecated Auth-core uses raw jti, not "userId:jti" format
   */
  private parseTokenId(tokenId: string): [string, string] {
    this.logger.warn(
      '[DEPRECATED] parseTokenId called - auth-core uses raw jti',
      {
        tokenIdPrefix: tokenId.substring(0, 10),
        tokenIdLength: tokenId.length,
      },
    );

    // Legacy support: if format is "userId:jti", parse it
    if (tokenId.includes(':')) {
      const parts = tokenId.split(':');
      if (parts.length === 2) {
        return [parts[0], parts[1]];
      }
    }

    // Auth-core provides raw jti, userId must come from other context
    return ['unknown', tokenId];
  }

  /**
   * @deprecated Auth-core uses raw jti format
   */
  createTokenId(userId: string, jti: string): string {
    this.logger.warn(
      '[DEPRECATED] createTokenId called - auth-core uses raw jti',
    );
    return `${userId}:${jti}`;
  }

  /**
   * @deprecated Use findRefreshToken which handles raw jti lookup
   */
  extractJti(tokenId: string): string {
    return this.parseTokenId(tokenId)[1];
  }

  /**
   * @deprecated UserId comes from token.userId field, not parsed from tokenId
   */
  extractUserId(tokenId: string): string {
    return this.parseTokenId(tokenId)[0];
  }

  /**
   * @deprecated Use describeJtiFormat instead
   */
  private isUserIdJtiFormat(str: string): boolean {
    return str.includes(':') && str.split(':').length === 2;
  }

  /**
   * @deprecated Use isValidJti for security validation
   */
  private looksLikeHash(str: string): boolean {
    return this.isValidJti(str);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import SecurityConfig from '../../../config/security.config';
import {
  TokenRepository,
  CreateRefreshTokenParams,
  ValidateRefreshTokenParams,
  RevokeRefreshTokenParams,
  RefreshToken,
} from './auth-core.interfaces';

@Injectable()
export class PrismaTokenRepository implements TokenRepository {
  constructor(private prisma: PrismaService) {}

  async createRefreshToken(
    params: CreateRefreshTokenParams,
  ): Promise<RefreshToken> {
    // Note: In current implementation, refresh tokens are stored in user.refreshTokenHash
    // This method needs to adapt to existing schema
    const crypto = await import('crypto');
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const version = `${Date.now()}-${uniqueId}`;

    // Generate a JWT-like token string (will be signed by JWT service)
    // This matches the existing pattern in auth.service.ts
    const tokenValue = crypto.randomBytes(32).toString('hex');

    // Hash the token for storage (matching existing security practice)
    const hashedToken = await bcrypt.hash(
      tokenValue,
      SecurityConfig.refreshToken.bcryptRounds || 10,
    );

    // Update user with new token hash and version
    await this.prisma.user.update({
      where: { id: params.userId },
      data: {
        refreshTokenHash: hashedToken,
        refreshTokenVersion: version,
        refreshTokenIssuedAt: new Date(),
      },
    });

    return {
      token: tokenValue,
      userId: params.userId,
      organizationId: params.organizationId,
      version,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + (params.expiresIn || 604800) * 1000),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      isRevoked: false,
    };
  }

  async validateRefreshToken(
    params: ValidateRefreshTokenParams,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        refreshTokenHash: true,
        refreshTokenVersion: true,
      },
    });

    if (!user || !user.refreshTokenHash) {
      return false;
    }

    // Check version binding (replay protection)
    if (params.version && user.refreshTokenVersion !== params.version) {
      return false;
    }

    // Compare token hash
    return await bcrypt.compare(params.token, user.refreshTokenHash);
  }

  async revokeRefreshToken(params: RevokeRefreshTokenParams): Promise<void> {
    await this.prisma.user.update({
      where: {
        id: params.userId,
        refreshTokenVersion: params.version, // Ensure we only revoke the specific version
      },
      data: {
        refreshTokenHash: null,
        refreshTokenVersion: null,
        refreshTokenIssuedAt: null,
      },
    });
  }

  async revokeAllUserTokens(userId: string, reason?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenVersion: null,
        refreshTokenIssuedAt: null,
        tokenVersion: { increment: 1 },
      },
    });
  }

  async getUserActiveTokens(userId: string): Promise<RefreshToken[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        refreshTokenIssuedAt: true,
        refreshTokenVersion: true,
        organizationId: true,
      },
    });

    if (!user || !user.refreshTokenIssuedAt) {
      return [];
    }

    // Note: We don't have the actual token value stored (only hash)
    // This adapter returns minimal info matching existing schema
    return [
      {
        token: 'hashed-in-db', // Placeholder - actual token not retrievable
        userId: user.id,
        organizationId: user.organizationId,
        version: user.refreshTokenVersion || 'unknown',
        issuedAt: user.refreshTokenIssuedAt,
        expiresAt: new Date(user.refreshTokenIssuedAt.getTime() + 604800000), // 7 days default
        isRevoked: false,
      },
    ];
  }

  async updateTokenVersion(
    userId: string,
    oldVersion: string,
    newVersion: string,
    newTokenHash: string,
  ): Promise<void> {
    // This implements the critical transaction pattern from auth.service.ts
    // Version binding check for replay protection
    await this.prisma.user.update({
      where: {
        id: userId,
        refreshTokenVersion: oldVersion, // Ensure atomic version check
      },
      data: {
        refreshTokenHash: newTokenHash,
        refreshTokenVersion: newVersion,
        refreshTokenIssuedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });
  }
}

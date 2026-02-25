// File: apps/api/src/modules/auth/services/refresh-token.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import SecurityConfig from '../../../config/security.config';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate a refresh token against User table
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
          isActive: true,
        },
      });

      if (!user || !user.isActive || !user.refreshTokenHash) {
        return false;
      }

      return bcrypt.compare(token, user.refreshTokenHash);
    } catch (error) {
      this.logger.error('Failed to validate refresh token:', error);
      return false;
    }
  }

  /**
   * Revoke refresh token (clear from User table)
   */
  async revoke(token: string, reason?: string): Promise<void> {
    try {
      // Find user by token
      const allUsers = await this.prisma.user.findMany({
        where: {
          refreshTokenHash: { not: null },
        },
        select: {
          id: true,
          refreshTokenHash: true,
        },
      });

      for (const user of allUsers) {
        if (
          user.refreshTokenHash &&
          (await bcrypt.compare(token, user.refreshTokenHash))
        ) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              refreshTokenHash: null,
              refreshTokenVersion: null,
              refreshTokenIssuedAt: null,
            },
          });
          this.logger.debug(
            `Refresh token revoked for user ${user.id}: ${reason || 'manual_revocation'}`,
          );
          return;
        }
      }

      this.logger.warn(
        `Refresh token not found for revocation: ${token.substring(0, 20)}...`,
      );
    } catch (error) {
      this.logger.error('Failed to revoke refresh token:', error);
      throw error;
    }
  }

  /**
   * Verify and extract user info from refresh token
   */
  async verifyAndExtract(
    token: string,
  ): Promise<{ userId: string; organizationId: string } | null> {
    try {
      // Verify JWT
      const payload = this.jwtService.verify(token, {
        issuer: SecurityConfig.jwt.issuer,
        audience: SecurityConfig.jwt.audience,
      });

      if (payload.type !== 'refresh') {
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
        return null;
      }

      // Verify token matches stored hash AND version matches
      const isHashValid = await bcrypt.compare(token, user.refreshTokenHash);
      const isVersionValid = user.refreshTokenVersion === payload.version;

      if (!isHashValid || !isVersionValid) {
        return null;
      }

      return {
        userId: user.id,
        organizationId: user.organizationId,
      };
    } catch (error) {
      this.logger.error('Failed to verify refresh token:', error);
      return null;
    }
  }

  /**
   * Get active session info for a user
   */
  async getActiveSession(userId: string, organizationId: string): Promise<any> {
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
    } catch (error) {
      this.logger.error('Failed to get active session:', error);
      return null;
    }
  }
}

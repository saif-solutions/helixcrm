// File: apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RefreshTokenService } from '../services/refresh-token.service';
import SecurityConfig from '../../../config/security.config';

@Injectable()
export class JwtRefreshStrategy {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Validate refresh token from request
   */
  async validate(req: Request): Promise<any> {
    try {
      // Extract token from cookies (existing pattern from auth.controller.ts)
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        throw new UnauthorizedException('No refresh token provided');
      }

      // Verify the refresh token exists and is valid
      const tokenInfo =
        await this.refreshTokenService.verifyAndExtract(refreshToken);
      if (!tokenInfo) {
        throw new UnauthorizedException('Refresh token not found or revoked');
      }

      // Verify JWT structure and signature
      const payload = this.jwtService.verify(refreshToken, {
        issuer: SecurityConfig.jwt.issuer,
        audience: SecurityConfig.jwt.audience,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Ensure the token belongs to the user
      if (tokenInfo.userId !== payload.sub) {
        throw new UnauthorizedException('Token user mismatch');
      }

      // Use organizationId consistently
      const organizationId = payload.organizationId;
      if (tokenInfo.organizationId !== organizationId) {
        throw new UnauthorizedException('Organization mismatch');
      }

      // Return the validated payload
      return {
        ...payload,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}

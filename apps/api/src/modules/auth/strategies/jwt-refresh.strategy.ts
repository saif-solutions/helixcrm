// File: apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RefreshTokenService } from '../services/refresh-token.service';
import SecurityConfig from '../../../config/security.config';

// Extend the Express Request type to include our cookie structure
interface RequestWithCookies extends Request {
  cookies: {
    refresh_token?: string;
    [key: string]: string | undefined;
  };
}

// Define the JWT payload interface
interface JwtRefreshPayload {
  sub: string;
  email: string;
  organizationId: string;
  type: string;
  jti?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

// Define the token info interface
interface TokenInfo {
  userId: string;
  organizationId: string;
  jti: string;
  version: string;
  expiresAt: Date;
}

// Define the validated user interface
interface ValidatedUser {
  id: string;
  email: string;
  organizationId: string;
  type: string;
  refreshToken: string;
}

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
  async validate(req: Request): Promise<ValidatedUser> {
    try {
      // Cast request to include typed cookies
      const typedReq = req as RequestWithCookies;

      // Extract token from cookies (existing pattern from auth.controller.ts)
      const refreshToken = typedReq.cookies?.refresh_token;

      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new UnauthorizedException('No refresh token provided');
      }

      // Verify the refresh token exists and is valid
      const tokenInfo = (await this.refreshTokenService.verifyAndExtract(
        refreshToken,
      )) as TokenInfo;

      if (!tokenInfo) {
        throw new UnauthorizedException('Refresh token not found or revoked');
      }

      // Verify JWT structure and signature
      const payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken, {
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
        id: payload.sub,
        email: payload.email,
        organizationId: payload.organizationId,
        type: payload.type,
        refreshToken,
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}

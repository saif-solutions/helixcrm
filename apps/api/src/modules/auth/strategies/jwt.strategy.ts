// apps/api/src/modules/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      this.logger.warn('Invalid token payload: missing sub');
      throw new UnauthorizedException('Invalid token payload');
    }

    // ENTERPRISE FIX: Map both possible property names for backward compatibility
    // This ensures tenant context works whether token has 'org' or 'organizationId'
    const organizationId = payload.organizationId || payload.org;

    if (!organizationId) {
      this.logger.error(
        `Token missing organization context for user ${payload.sub}`,
      );
      // Don't throw - let tenant guard handle missing context appropriately
    }

    this.logger.debug(
      `JWT validated for user ${payload.sub} with org: ${organizationId}`,
    );

    return {
      id: payload.sub,
      sub: payload.sub,
      organizationId: organizationId,
      email: payload.email,
      permissions: payload.permissions || [],
      roles: payload.roles || [],
      tokenVersion: payload.version || payload.tokenVersion,
    };
  }
}

// apps/api/src/modules/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// Define the JWT payload interface
interface JwtPayload {
  sub: string;
  email: string;
  organizationId?: string;
  org?: string;
  permissions?: string[];
  roles?: string[];
  version?: number;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

// Define the validated user interface
interface ValidatedUser {
  id: string;
  sub: string;
  organizationId: string;
  email: string;
  permissions: string[];
  roles: string[];
  tokenVersion: number;
}

// JWT configuration constants
const JWT_CONFIG = {
  /** Algorithm used for JWT signing */
  ALGORITHM: 'HS256',
  /** Whether to ignore token expiration (should always be false for security) */
  IGNORE_EXPIRATION: false,
} as const;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      this.logger.error('JWT_ACCESS_SECRET is not configured');
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: JWT_CONFIG.IGNORE_EXPIRATION,
      secretOrKey: secret,
      algorithms: [JWT_CONFIG.ALGORITHM],
    });

    this.logger.debug('JWT Strategy initialized');
  }

  /**
   * Validate JWT payload and extract user information
   * @param payload - Decoded JWT payload
   * @returns Validated user object
   * @throws UnauthorizedException if payload is invalid
   */
  validate(payload: JwtPayload): ValidatedUser {
    // Validate payload structure
    if (!payload || !payload.sub) {
      this.logger.warn('Invalid token payload: missing sub');
      throw new UnauthorizedException('Invalid token payload');
    }

    // Extract user ID from subject claim
    const userId = payload.sub;
    const userEmail = payload.email;

    if (!userEmail) {
      this.logger.warn(`Token missing email for user ${userId}`);
      throw new UnauthorizedException('Invalid token payload: missing email');
    }

    // ENTERPRISE FIX: Map both possible property names for backward compatibility
    // This ensures tenant context works whether token has 'org' or 'organizationId'
    const organizationId = payload.organizationId || payload.org;

    if (!organizationId) {
      this.logger.warn(
        `Token missing organization context for user ${userId}`,
        {
          userId,
          hasOrg: 'org' in payload,
          hasOrgId: 'organizationId' in payload,
        },
      );
      // Don't throw - let tenant guard handle missing context appropriately
    }

    // Extract token version (supports both 'version' and 'tokenVersion' fields)
    const tokenVersion = payload.version ?? payload.tokenVersion ?? 1;

    // Extract permissions and roles with defaults
    const permissions = payload.permissions ?? [];
    const roles = payload.roles ?? [];

    this.logger.debug(
      `JWT validated for user ${userId} with org: ${organizationId || 'none'}`,
      {
        userId,
        organizationId: organizationId || null,
        permissionsCount: permissions.length,
        rolesCount: roles.length,
        tokenVersion,
      },
    );

    return {
      id: userId,
      sub: userId,
      organizationId: organizationId || '',
      email: userEmail,
      permissions,
      roles,
      tokenVersion,
    };
  }
}

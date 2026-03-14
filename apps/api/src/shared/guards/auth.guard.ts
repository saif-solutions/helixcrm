// apps/api/src/shared/guards/auth.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { setUserInfo, clearUserInfo } from '../als';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  PERMISSION_KEY,
  IS_PUBLIC_KEY,
} from '../decorators/require-permission.decorator';
import { getTenantContext } from '../tenant/tenant.context';
import { Request } from 'express';
import type { UserPayload } from '../types/request.types';
import type { AppError } from '../types/error.types';
import type { JwtVerifyOptions } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

// ==================== TYPE DEFINITIONS ====================

interface JwtPayload {
  sub: string;
  organizationId?: string;
  org?: string;
  version?: number;
  tokenVersion?: number;
  email?: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  [key: string]: unknown; // ← ADD THIS LINE (index signature)
}

interface UserWithRoles {
  id: string;
  email: string;
  isActive: boolean;
  tokenVersion: number;
  UserRoles?: Array<{
    role?: {
      name: string;
      permissions?: Array<{
        permission?: {
          code: string;
        };
      }>;
    };
  }>;
}

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  organizationId?: string;
  cookies: {
    access_token?: string;
    [key: string]: string | undefined; // Index signature for other cookies
  };
  id?: string;
}

// ==================== TYPE GUARDS ====================

function isJwtPayload(payload: Record<string, unknown>): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'sub' in payload &&
    typeof payload.sub === 'string'
  );
}

function isUserWithRoles(user: unknown): user is UserWithRoles {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'tokenVersion' in user
  );
}

function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error ||
    (typeof error === 'object' && error !== null && 'message' in error)
  );
}

function hasCookies(req: unknown): req is AuthenticatedRequest {
  return typeof req === 'object' && req !== null && 'cookies' in req;
}

function hasAuthorizationHeader(req: unknown): req is AuthenticatedRequest {
  return typeof req === 'object' && req !== null && 'headers' in req;
}

// ==================== CUSTOM EXCEPTIONS ====================

export class TokenExpiredException extends UnauthorizedException {
  constructor() {
    super('Token has expired');
  }
}

export class TokenInvalidException extends UnauthorizedException {
  constructor() {
    super('Invalid token');
  }
}

export class PermissionDeniedException extends ForbiddenException {
  constructor() {
    super('Insufficient permissions');
  }
}

// ==================== AUTH GUARD ====================

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly secret: string;
  private readonly audience?: string;
  private readonly issuer?: string;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    this.secret = this.configService.get<string>('JWT_ACCESS_SECRET') ?? '';
    this.audience = this.configService.get<string>('JWT_AUDIENCE');
    this.issuer = this.configService.get<string>('JWT_ISSUER');

    if (!this.secret) {
      this.logger.error('JWT_ACCESS_SECRET is not configured');
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Add correlation ID for request tracing
    const correlationId = randomUUID();

    // Structured logging context
    const logContext = {
      correlationId,
      guard: 'AuthGuard',
      timestamp: new Date().toISOString(),
    };

    try {
      // Check if route is public
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (isPublic) {
        this.logger.debug('Public route, allowing access', logContext);
        return true;
      }

      // Get required permissions if any
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
        PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

      // Legacy check for routes with empty permissions
      if (requiredPermissions && requiredPermissions.length === 0) {
        return true;
      }

      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      // Ensure cookies exists
      if (!request.cookies) {
        request.cookies = {};
      }
      request.id = correlationId;

      const token = this.extractToken(request);

      if (!token) {
        this.logger.warn('No token provided for protected route', logContext);
        throw new UnauthorizedException('No token provided');
      }

      try {
        // Build verification options
        const verifyOptions: JwtVerifyOptions = { secret: this.secret };

        // Add audience and issuer if configured
        if (this.audience) {
          verifyOptions.audience = this.audience;
        }
        if (this.issuer) {
          verifyOptions.issuer = this.issuer;
        }

        const verifiedPayload = await this.jwtService.verifyAsync<
          Record<string, unknown>
        >(token, verifyOptions);

        if (!isJwtPayload(verifiedPayload)) {
          this.logger.warn('Invalid token payload structure', logContext);
          throw new TokenInvalidException();
        }

        const payload = verifiedPayload;

        // Single source of truth for extraction
        const sub = payload.sub;
        const organizationId = payload.organizationId ?? payload.org;
        const tokenVersion = payload.version ?? payload.tokenVersion;

        if (!sub || !organizationId) {
          this.logger.warn('Token missing required claims', logContext);
          throw new TokenInvalidException();
        }

        // Fetch user with roles and permissions
        const user = await this.prisma.user.findUnique({
          where: { id: sub },
          include: {
            UserRoles: {
              where: { organizationId },
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!user || !isUserWithRoles(user)) {
          this.logger.warn(`User not found`, {
            ...logContext,
            userId: this.maskUserId(sub),
          });
          throw new TokenInvalidException();
        }

        if (!user.isActive) {
          this.logger.warn(`User is inactive`, {
            ...logContext,
            userId: this.maskUserId(sub),
          });
          throw new TokenInvalidException();
        }

        if (user.tokenVersion !== tokenVersion) {
          this.logger.warn(`Token version mismatch for user`, {
            ...logContext,
            userId: this.maskUserId(sub),
          });
          throw new TokenInvalidException();
        }

        // Extract permissions from roles
        const permissions = new Set<string>();
        const roles: string[] = [];

        if (user.UserRoles) {
          user.UserRoles.forEach((userRole) => {
            if (userRole.role) {
              roles.push(userRole.role.name);
              if (userRole.role.permissions) {
                userRole.role.permissions.forEach((rolePermission) => {
                  if (rolePermission.permission?.code) {
                    permissions.add(rolePermission.permission.code);
                  }
                });
              }
            }
          });
        }

        const userPermissions = Array.from(permissions);

        // Enforce required permissions
        if (requiredPermissions && requiredPermissions.length > 0) {
          const hasAllPermissions = requiredPermissions.every((p) =>
            userPermissions.includes(p),
          );
          if (!hasAllPermissions) {
            this.logger.warn(`User missing required permissions`, {
              ...logContext,
              userId: this.maskUserId(sub),
              required: requiredPermissions,
              actual: userPermissions,
            });
            throw new PermissionDeniedException();
          }
        }

        // Create user object with permissions and roles
        const userObj: UserPayload = {
          sub,
          email: payload.email ?? user.email,
          organizationId,
          org: organizationId,
          tokenVersion,
          permissions: userPermissions,
          roles,
        };

        // Set user info in ALS
        setUserInfo(
          userObj.sub,
          userObj.email,
          userObj.roles,
          userObj.permissions,
        );

        // Set user in request
        request.user = userObj;
        request.organizationId = organizationId;

        // Set tenant context
        const tenantContext = getTenantContext();
        if (tenantContext) {
          tenantContext.userId = userObj.sub;
          tenantContext.userEmail = userObj.email;
          tenantContext.roles = userObj.roles;
          tenantContext.permissions = userObj.permissions;
        }

        this.logger.log(
          `Auth successful for user ${this.maskUserId(sub)} in org ${organizationId}`,
          {
            ...logContext,
            permissionsCount: userObj.permissions.length,
            rolesCount: userObj.roles.length,
          },
        );

        return true;
      } catch (error) {
        // Differentiate between token errors
        if (
          error instanceof TokenInvalidException ||
          error instanceof PermissionDeniedException
        ) {
          throw error;
        }

        if (isAppError(error)) {
          // Check for JWT expiration
          if (
            error.message?.includes('expired') ||
            error.message?.includes('Expired')
          ) {
            throw new TokenExpiredException();
          }
          this.logger.error(`Auth failed: ${error.message}`, logContext);
        } else {
          this.logger.error('Auth failed with unknown error', logContext);
        }
        throw new TokenInvalidException();
      }
    } finally {
      // Clean up ALS context to prevent cross-request leaks
      clearUserInfo();
    }
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    // Priority 1: Cookies (more secure for browser apps)
    if (hasCookies(request) && request.cookies) {
      try {
        const accessToken = request.cookies.access_token;
        if (accessToken != null) {
          const tokenStr = String(accessToken).trim();
          if (tokenStr.length > 0) {
            return tokenStr;
          }
        }
      } catch {
        return null;
      }
    }

    // Priority 2: Authorization header
    if (hasAuthorizationHeader(request)) {
      const authHeader = request.headers.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        return token || null;
      }
    }

    return null;
  }

  private maskUserId(userId: string): string {
    // Mask user ID for logging (show first 4 and last 4 chars)
    if (userId.length <= 8) return '****';
    return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
  }
}

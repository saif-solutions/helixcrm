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

/**
 * Extended JWT payload interface with index signature for flexibility
 */
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
  iat?: number;
  [key: string]: unknown;
}

/**
 * User with roles from database
 */
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

/**
 * Extended request with authentication data
 */
interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  organizationId?: string;
  cookies: {
    access_token?: string;
    [key: string]: string | undefined;
  };
  id?: string;
  headers: {
    authorization?: string;
    'x-correlation-id'?: string;
    'x-request-id'?: string;
    [key: string]: string | string[] | undefined;
  };
}

/**
 * Permission metadata from decorator
 */
interface PermissionMetadata {
  permissions: string[];
  mode?: 'any' | 'all';
  message?: string;
  skip?: boolean;
}

/**
 * Structured log context
 */
interface LogContext {
  correlationId: string;
  guard: string;
  timestamp: string;
  userId?: string;
  organizationId?: string;
  [key: string]: unknown;
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for JWT payload
 */
function isJwtPayload(payload: Record<string, unknown>): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'sub' in payload &&
    typeof payload.sub === 'string'
  );
}

/**
 * Type guard for user with roles
 */
function isUserWithRoles(user: unknown): user is UserWithRoles {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    typeof (user as UserWithRoles).id === 'string' &&
    'tokenVersion' in user &&
    typeof (user as UserWithRoles).tokenVersion === 'number'
  );
}

/**
 * Type guard for app error
 */
function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error ||
    (typeof error === 'object' && error !== null && 'message' in error)
  );
}

/**
 * Type guard for request with cookies
 */
function hasCookies(req: unknown): req is AuthenticatedRequest {
  return typeof req === 'object' && req !== null && 'cookies' in req;
}

/**
 * Type guard for request with authorization header
 */
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
  constructor(requiredPermissions?: string[]) {
    const message = requiredPermissions?.length
      ? `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
      : 'Insufficient permissions';
    super(message);
  }
}

// ==================== AUTH GUARD ====================

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly secret: string;
  private readonly audience?: string;
  private readonly issuer?: string;
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    this.secret = this.configService.get<string>('JWT_ACCESS_SECRET', '');
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
    const logContext: LogContext = {
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
        if (!this.isProduction) {
          this.logger.debug('Public route, allowing access', logContext);
        }
        return true;
      }

      // Get required permissions if any
      const permissionMetadata =
        this.reflector.getAllAndOverride<PermissionMetadata>(PERMISSION_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);

      // Skip permission check if explicitly skipped or no permissions
      if (permissionMetadata?.skip) {
        if (!this.isProduction) {
          this.logger.debug('Permission check skipped', logContext);
        }
        return true;
      }

      const requiredPermissions = permissionMetadata?.permissions;

      // Legacy check for routes with empty permissions
      if (requiredPermissions && requiredPermissions.length === 0) {
        return true;
      }

      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

      // Initialize cookies if not present
      if (!request.cookies) {
        request.cookies = {};
      }

      // Set correlation ID on request
      request.id = correlationId;

      // Extract and validate token
      const token = this.extractToken(request);
      if (!token) {
        this.logger.warn('No token provided for protected route', logContext);
        throw new UnauthorizedException('No token provided');
      }

      // Verify token
      const payload = await this.verifyToken(token, logContext);

      // Fetch and validate user
      const user = await this.fetchAndValidateUser(payload, logContext);

      // Extract permissions from user roles
      const { permissions, roles } = this.extractPermissionsAndRoles(user);

      // Enforce required permissions if any
      if (requiredPermissions && requiredPermissions.length > 0) {
        this.enforcePermissions(requiredPermissions, permissions, logContext);
      }

      // Create user object for request
      const userObj: UserPayload = {
        sub: user.id,
        email: payload.email ?? user.email,
        organizationId: payload.organizationId ?? payload.org,
        org: payload.organizationId ?? payload.org,
        tokenVersion:
          payload.version ?? payload.tokenVersion ?? user.tokenVersion,
        permissions,
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
      request.organizationId = userObj.organizationId;

      // Update tenant context if available
      this.updateTenantContext(userObj);

      // Log success
      this.logAuthSuccess(userObj, logContext);

      return true;
    } catch (error) {
      // Handle and rethrow errors
      this.handleAuthError(error, logContext);
    } finally {
      // Clean up ALS context to prevent cross-request leaks
      clearUserInfo();
    }
  }

  /**
   * Verify JWT token with configured options
   */
  private async verifyToken(
    token: string,
    logContext: LogContext,
  ): Promise<JwtPayload> {
    try {
      const verifyOptions: JwtVerifyOptions = { secret: this.secret };

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

      // Validate required claims
      if (
        !verifiedPayload.sub ||
        !(verifiedPayload.organizationId || verifiedPayload.org)
      ) {
        this.logger.warn(
          'Token missing required claims (sub or organizationId)',
          logContext,
        );
        throw new TokenInvalidException();
      }

      return verifiedPayload;
    } catch (error) {
      if (
        isAppError(error) &&
        (error.message?.includes('expired') ||
          error.message?.includes('Expired'))
      ) {
        throw new TokenExpiredException();
      }
      throw new TokenInvalidException();
    }
  }

  /**
   * Fetch and validate user from database
   */
  private async fetchAndValidateUser(
    payload: JwtPayload,
    logContext: LogContext,
  ): Promise<UserWithRoles> {
    const sub = payload.sub;
    const organizationId = payload.organizationId ?? payload.org;

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
        userId: this.maskId(sub),
      });
      throw new TokenInvalidException();
    }

    if (!user.isActive) {
      this.logger.warn(`User is inactive`, {
        ...logContext,
        userId: this.maskId(sub),
      });
      throw new TokenInvalidException();
    }

    const tokenVersion = payload.version ?? payload.tokenVersion;
    if (user.tokenVersion !== tokenVersion) {
      this.logger.warn(`Token version mismatch`, {
        ...logContext,
        userId: this.maskId(sub),
        expectedVersion: user.tokenVersion,
        receivedVersion: tokenVersion,
      });
      throw new TokenInvalidException();
    }

    return user;
  }

  /**
   * Extract permissions and roles from user object
   */
  private extractPermissionsAndRoles(user: UserWithRoles): {
    permissions: string[];
    roles: string[];
  } {
    const permissions = new Set<string>();
    const roles: string[] = [];

    if (user.UserRoles) {
      for (const userRole of user.UserRoles) {
        if (userRole.role) {
          roles.push(userRole.role.name);

          if (userRole.role.permissions) {
            for (const rolePermission of userRole.role.permissions) {
              if (rolePermission.permission?.code) {
                permissions.add(rolePermission.permission.code);
              }
            }
          }
        }
      }
    }

    return {
      permissions: Array.from(permissions),
      roles,
    };
  }

  /**
   * Enforce required permissions
   */
  private enforcePermissions(
    requiredPermissions: string[],
    userPermissions: string[],
    logContext: LogContext,
  ): void {
    const hasAllPermissions = requiredPermissions.every((p) =>
      userPermissions.includes(p),
    );

    if (!hasAllPermissions) {
      this.logger.warn(`User missing required permissions`, {
        ...logContext,
        required: requiredPermissions,
        actual: userPermissions,
      });
      throw new PermissionDeniedException(requiredPermissions);
    }
  }

  /**
   * Update tenant context with user information
   */
  private updateTenantContext(userObj: UserPayload): void {
    const tenantContext = getTenantContext();
    if (tenantContext) {
      tenantContext.userId = userObj.sub;
      tenantContext.userEmail = userObj.email;
      tenantContext.roles = userObj.roles;
      tenantContext.permissions = userObj.permissions;
    }
  }

  /**
   * Log successful authentication
   */
  private logAuthSuccess(userObj: UserPayload, logContext: LogContext): void {
    if (!this.isProduction) {
      this.logger.log(
        `Auth successful for user ${this.maskId(userObj.sub)} in org ${userObj.organizationId}`,
        {
          ...logContext,
          permissionsCount: userObj.permissions.length,
          rolesCount: userObj.roles.length,
        },
      );
    } else {
      this.logger.log(
        `Auth successful for user ${this.maskId(userObj.sub)}`,
        logContext,
      );
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: unknown, logContext: LogContext): never {
    // Re-throw known exceptions
    if (
      error instanceof UnauthorizedException ||
      error instanceof ForbiddenException ||
      error instanceof TokenExpiredException ||
      error instanceof TokenInvalidException ||
      error instanceof PermissionDeniedException
    ) {
      throw error;
    }

    // Log unknown errors
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Auth failed: ${errorMessage}`, {
      ...logContext,
      error,
    });

    throw new TokenInvalidException();
  }

  /**
   * Extract token from request (cookie or header)
   */
  private extractToken(request: AuthenticatedRequest): string | null {
    // Priority 1: Cookies (more secure for browser apps)
    if (hasCookies(request) && request.cookies) {
      const accessToken = request.cookies.access_token;
      if (
        accessToken &&
        typeof accessToken === 'string' &&
        accessToken.trim()
      ) {
        return accessToken.trim();
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

  /**
   * Mask sensitive ID for logging
   */
  private maskId(id: string): string {
    if (!id || id.length < 8) return '****';
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  }
}

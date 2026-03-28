// apps/api/src/modules/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { AuditAction, AuditEntityType, AuditSeverity } from '@prisma/client';

import { PrismaService } from '../../shared/prisma/prisma.service';
import SecurityConfig from '../../config/security.config';
import { AccountLockoutService } from './services/account-lockout.service';
import { AuthCoreAdapter } from './adapters/AuthCoreAdapter';
import * as crypto from 'crypto';
import { toError } from '../../shared/utils/error.utils';

// ==================== TYPE DEFINITIONS ====================

interface ValidatedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  organizationId: string;
  organization: {
    id: string;
    name: string;
  } | null;
  tokenVersion: number;
  refreshTokenHash: string | null;
  isActive: boolean;
}

interface UserPermissions {
  permissions: string[];
  roles: string[];
}

interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    organizationId: string;
    permissions: string[];
    roles: string[];
  };
}

interface RefreshTokenPayload {
  sub: string;
  jti?: string;
  type?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

interface UserSession {
  id: string;
  issuedAt: Date | null;
  lastUsed: Date | null;
  isCurrent: boolean;
  deviceInfo: string;
}

// ==================== TYPE GUARDS ====================

function isRefreshTokenPayload(obj: unknown): obj is RefreshTokenPayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'sub' in obj &&
    typeof (obj as Record<string, unknown>).sub === 'string'
  );
}

// ==================== DOMAIN-SPECIFIC ERROR TYPES ====================

export class AppError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AppError';
  }
}

class PasswordHashError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PasswordHashError';
  }
}

class PermissionFetchError extends AppError {
  constructor(
    message: string,
    public readonly userId: string,
    public readonly organizationId: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'PermissionFetchError';
  }
}

class TokenGenerationError extends AppError {
  constructor(
    message: string,
    public readonly tokenType: 'access' | 'refresh',
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'TokenGenerationError';
  }
}

// ==================== HELPER FUNCTIONS ====================

async function hashPassword(
  adapter: AuthCoreAdapter,
  password: string,
): Promise<string> {
  try {
    const hashed = await adapter.password.hash(password);
    if (typeof hashed !== 'string') {
      throw new PasswordHashError('Password hash returned non-string value');
    }
    return hashed;
  } catch (error: unknown) {
    const err = toError(error);
    throw new PasswordHashError(`Failed to hash password: ${err.message}`, {
      cause: error,
    });
  }
}

async function verifyPassword(
  adapter: AuthCoreAdapter,
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    const isValid = await adapter.password.verify(password, hash);
    if (typeof isValid !== 'boolean') {
      throw new Error('Password verification returned non-boolean value');
    }
    return isValid;
  } catch (error: unknown) {
    const err = toError(error);
    throw new Error(`Failed to verify password: ${err.message}`, {
      cause: error,
    });
  }
}

// ==================== SERVICE IMPLEMENTATION ====================

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private accountLockoutService: AccountLockoutService,
    private auditLogService: AuditLogService,
    private authCoreAdapter: AuthCoreAdapter,
  ) {}

  async validateUser(
    email: string,
    password: string,
    request?: Request,
  ): Promise<ValidatedUser | null> {
    const normalizedEmail = email.toLowerCase().trim();

    const lockStatus = await this.accountLockoutService.isAccountLocked(email);

    if (lockStatus.isLocked) {
      this.logger.warn(`Login attempt for locked account: ${email}`, {
        lockedUntil: lockStatus.lockedUntil,
        event: 'account_locked_login_attempt',
      });

      if (request) {
        await this.auditLogService.logAuthEvent({
          request,
          action: AuditAction.LOGIN_FAILURE,
          actorEmail: normalizedEmail,
          metadata: {
            reason: 'Account locked',
            lockedUntil: lockStatus.lockedUntil?.toISOString(),
          },
          severity: AuditSeverity.HIGH,
        });
      }

      throw new ForbiddenException(
        `Account is locked until ${lockStatus.lockedUntil?.toISOString()}`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      if (user) {
        await this.accountLockoutService.recordFailedAttempt(user.id);
      }

      if (request) {
        await this.auditLogService.logAuthEvent({
          request,
          action: AuditAction.LOGIN_FAILURE,
          actorEmail: normalizedEmail,
          metadata: { reason: 'Invalid credentials or inactive account' },
          severity: AuditSeverity.MEDIUM,
        });
      }

      return null;
    }

    try {
      const isValid = await verifyPassword(
        this.authCoreAdapter,
        password,
        user.passwordHash,
      );

      if (!isValid) {
        await this.accountLockoutService.recordFailedAttempt(user.id);

        if (request) {
          await this.auditLogService.logAuthEvent({
            request,
            action: AuditAction.LOGIN_FAILURE,
            actorEmail: normalizedEmail,
            actorUserId: user.id,
            metadata: { reason: 'Invalid password' },
            organizationId: user.organizationId,
            severity: AuditSeverity.MEDIUM,
          });
        }

        return null;
      }
    } catch (error: unknown) {
      const err = toError(error);
      this.logger.error(
        `Password verification error: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException('Authentication service error', {
        cause: error,
      });
    }

    await this.accountLockoutService.resetFailedAttempts(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      organization: user.organization,
      tokenVersion: user.tokenVersion,
      refreshTokenHash: user.refreshTokenHash,
      isActive: user.isActive,
    };
  }

  private async getUserPermissions(
    userId: string,
    organizationId: string,
  ): Promise<UserPermissions> {
    try {
      const userWithRoles = await this.prisma.user.findUnique({
        where: { id: userId },
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

      if (!userWithRoles?.UserRoles) {
        return { permissions: [], roles: [] };
      }

      const permissions = new Set<string>();
      const roles = new Set<string>();

      for (const userRole of userWithRoles.UserRoles) {
        if (userRole.role) {
          roles.add(userRole.role.name);
          if (userRole.role.permissions) {
            for (const rolePermission of userRole.role.permissions) {
              if (rolePermission.permission?.code) {
                permissions.add(rolePermission.permission.code);
              }
            }
          }
        }
      }

      return {
        permissions: Array.from(permissions),
        roles: Array.from(roles),
      };
    } catch (error: unknown) {
      const err = toError(error);
      this.logger.error(
        `Failed to fetch user permissions: ${err.message}`,
        err.stack,
      );
      throw new PermissionFetchError(
        'Failed to fetch user permissions',
        userId,
        organizationId,
        { cause: error },
      );
    }
  }

  async login(
    user: ValidatedUser,
    res: Response,
    request?: Request,
  ): Promise<LoginResponse> {
    try {
      const { permissions, roles } = await this.getUserPermissions(
        user.id,
        user.organizationId,
      );

      let accessToken: string;
      try {
        accessToken = this.authCoreAdapter.authCore.issueAccessToken({
          sub: user.id,
          org: user.organizationId,
          role: roles.includes('SystemAdmin') ? 'admin' : 'user',
          version: user.tokenVersion,
          email: user.email,
          permissions,
          roles,
        });
        if (typeof accessToken !== 'string') {
          throw new TokenGenerationError(
            'Access token generation returned non-string',
            'access',
          );
        }
      } catch (error: unknown) {
        const err = toError(error);
        throw new TokenGenerationError(
          `Failed to generate access token: ${err.message}`,
          'access',
          { cause: error },
        );
      }

      let refreshToken: string;
      try {
        refreshToken =
          await this.authCoreAdapter.tokenManager.issueRefreshToken(
            user.id,
            user.organizationId,
          );
        if (typeof refreshToken !== 'string') {
          throw new TokenGenerationError(
            'Refresh token generation returned non-string',
            'refresh',
          );
        }
      } catch (error: unknown) {
        const err = toError(error);
        throw new TokenGenerationError(
          `Failed to generate refresh token: ${err.message}`,
          'refresh',
          { cause: error },
        );
      }

      let refreshTokenHash: string;
      try {
        refreshTokenHash = await hashPassword(
          this.authCoreAdapter,
          refreshToken,
        );
      } catch (error: unknown) {
        const err = toError(error);
        throw new InternalServerErrorException(
          `Failed to hash refresh token: ${err.message}`,
          { cause: error },
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          refreshTokenHash,
          refreshTokenVersion: crypto.randomUUID(),
          refreshTokenIssuedAt: new Date(),
          tokenVersion: user.tokenVersion,
        },
      });

      res.cookie(
        'access_token',
        accessToken,
        SecurityConfig.cookies.accessToken(),
      );
      res.cookie(
        'refresh_token',
        refreshToken,
        SecurityConfig.cookies.refreshToken(),
      );

      this.logger.log(`User ${user.email} logged in`, {
        userId: user.id,
        organizationId: user.organizationId,
        permissionsCount: permissions.length,
        rolesCount: roles.length,
        event: 'user_login',
      });

      if (request) {
        await this.auditLogService.logAuthEvent({
          request,
          action: AuditAction.LOGIN_SUCCESS,
          actorEmail: user.email ?? 'unknown',
          actorUserId: user.id,
          metadata: {
            permissionsCount: permissions.length,
            roles,
            tokenVersion: user.tokenVersion,
          },
          organizationId: user.organizationId,
          severity: AuditSeverity.MEDIUM,
        });
      }

      return {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
          permissions,
          roles,
        },
      };
    } catch (error: unknown) {
      const err = toError(error);
      this.logger.error(`Login failed: ${err.message}`, err.stack);

      if (request && user?.email) {
        await this.auditLogService.logAuthEvent({
          request,
          action: AuditAction.LOGIN_FAILURE,
          actorEmail: user.email ?? 'unknown',
          actorUserId: user.id,
          metadata: {
            error: err.message,
            errorType: err.name,
          },
          organizationId: user.organizationId,
          severity: AuditSeverity.HIGH,
        });
      }

      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(`Login failed: ${err.message}`, {
        cause: error,
      });
    }
  }

  async logout(
    userId: string,
    res: Response,
    request?: Request,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, organizationId: true },
    });

    if (!user) {
      this.logger.warn(`Logout attempted for non-existent user: ${userId}`);
      throw new BadRequestException('User not found');
    }

    res.clearCookie('access_token', SecurityConfig.cookies.accessToken());
    res.clearCookie('refresh_token', SecurityConfig.cookies.refreshToken());

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenVersion: null,
        refreshTokenIssuedAt: null,
        tokenVersion: { increment: 1 },
      },
    });

    this.logger.log(`User ${userId} logged out`, {
      userId,
      email: user.email,
      event: 'user_logout',
    });

    if (request) {
      await this.auditLogService.logAuthEvent({
        request,
        action: AuditAction.LOGOUT,
        actorEmail: user.email ?? 'unknown',
        actorUserId: userId,
        metadata: {},
        organizationId: user.organizationId,
        severity: AuditSeverity.MEDIUM,
      });
    }

    return { message: 'Logged out successfully' };
  }

  async refreshToken(
    oldRefreshToken: string,
    res: Response,
    request?: Request,
  ): Promise<LoginResponse> {
    this.logger.debug('Refresh token process started');

    try {
      const rawPayload =
        this.authCoreAdapter.tokenManager.validateRefreshToken(oldRefreshToken);

      if (!isRefreshTokenPayload(rawPayload)) {
        this.logger.warn('Invalid refresh token payload structure');
        throw new UnauthorizedException('Invalid token payload');
      }

      const payload = rawPayload;

      if (payload.type !== 'refresh') {
        this.logger.warn(
          `Invalid token type in refresh flow: ${payload.type ? String(payload.type) : 'unknown'}`,
        );
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      if (!user.refreshTokenHash) {
        throw new UnauthorizedException('No active refresh token');
      }

      const isTokenValid = await verifyPassword(
        this.authCoreAdapter,
        oldRefreshToken,
        user.refreshTokenHash,
      );

      if (!isTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const { permissions, roles } = await this.getUserPermissions(
        user.id,
        user.organizationId,
      );

      let newRefreshToken: string;
      try {
        newRefreshToken =
          await this.authCoreAdapter.tokenManager.issueRefreshToken(
            user.id,
            user.organizationId,
          );
        if (typeof newRefreshToken !== 'string') {
          throw new TokenGenerationError(
            'New refresh token generation returned non-string',
            'refresh',
          );
        }
      } catch (error: unknown) {
        const err = toError(error);
        throw new TokenGenerationError(
          `Failed to generate new refresh token: ${err.message}`,
          'refresh',
          { cause: error },
        );
      }

      let newAccessToken: string;
      try {
        newAccessToken = this.authCoreAdapter.authCore.issueAccessToken({
          sub: user.id,
          org: user.organizationId,
          role: roles.includes('SystemAdmin') ? 'admin' : 'user',
          version: user.tokenVersion + 1,
          permissions,
          roles,
        });
        if (typeof newAccessToken !== 'string') {
          throw new TokenGenerationError(
            'New access token generation returned non-string',
            'access',
          );
        }
      } catch (error: unknown) {
        const err = toError(error);
        throw new TokenGenerationError(
          `Failed to generate new access token: ${err.message}`,
          'access',
          { cause: error },
        );
      }

      let newRefreshTokenHash: string;
      try {
        newRefreshTokenHash = await hashPassword(
          this.authCoreAdapter,
          newRefreshToken,
        );
      } catch (error: unknown) {
        const err = toError(error);
        throw new InternalServerErrorException(
          `Failed to hash refresh token: ${err.message}`,
          { cause: error },
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          refreshTokenHash: newRefreshTokenHash,
          refreshTokenVersion: crypto.randomUUID(),
          refreshTokenIssuedAt: new Date(),
          tokenVersion: { increment: 1 },
        },
      });

      res.cookie(
        'access_token',
        newAccessToken,
        SecurityConfig.cookies.accessToken(),
      );
      res.cookie(
        'refresh_token',
        newRefreshToken,
        SecurityConfig.cookies.refreshToken(),
      );

      if (request) {
        await this.auditLogService.logAuthEvent({
          request,
          action: AuditAction.TOKEN_REFRESH,
          actorEmail: user.email ?? 'unknown',
          actorUserId: user.id,
          metadata: {
            oldTokenVersion: user.tokenVersion,
            newTokenVersion: user.tokenVersion + 1,
          },
          organizationId: user.organizationId,
          severity: AuditSeverity.MEDIUM,
        });
      }

      return {
        access_token: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
          permissions,
          roles,
        },
      };
    } catch (error: unknown) {
      const err = toError(error);
      this.logger.error('Refresh token error', {
        error: err.message,
        errorType: err.name,
        stack: err.stack,
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new UnauthorizedException(
        `Invalid or expired refresh token: ${err.message}`,
        { cause: error },
      );
    }
  }

  async register(
    registerDto: RegisterDto,
    request?: Request,
  ): Promise<{
    id: string;
    email: string;
    organizationId: string;
    message: string;
    user?: { id: string; email: string };
    userId?: string;
  }> {
    if (!registerDto.email || !registerDto.password) {
      throw new BadRequestException('Email and password are required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    let passwordHash: string;
    try {
      passwordHash = await hashPassword(
        this.authCoreAdapter,
        registerDto.password,
      );
    } catch (error: unknown) {
      const err = toError(error);
      this.logger.error(
        `Password hashing failed during registration: ${err.message}`,
      );
      throw new InternalServerErrorException('Failed to process password', {
        cause: error,
      });
    }

    const organization = await this.prisma.organization.create({
      data: {
        name:
          registerDto.organizationName ||
          `${registerDto.firstName}'s Organization`,
        slug: registerDto.email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-'),
        status: 'active',
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email.toLowerCase(),
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        organizationId: organization.id,
        isActive: true,
        role: 'admin',
        tokenVersion: 1,
        refreshTokenHash: null,
        refreshTokenVersion: null,
      },
    });

    await this.createDefaultRolesForOrganization(organization.id);
    await this.assignSystemAdminRoleToUser(user.id, organization.id);

    this.logger.log(`New user registered: ${user.email}`, {
      userId: user.id,
      organizationId: organization.id,
      event: 'user_registered',
    });

    if (request) {
      await this.auditLogService.logWithRequest(
        request,
        AuditAction.USER_CREATED,
        AuditEntityType.USER,
        user.email,
        user.id,
        user.id,
        {
          firstName: user.firstName,
          lastName: user.lastName,
          organizationName: organization.name,
          roles: ['SystemAdmin'],
        },
        AuditSeverity.LOW,
        user.organizationId,
      );
    }

    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      message:
        'Organization created successfully. Default roles and permissions have been set up.',
      user: { id: user.id, email: user.email },
      userId: user.id,
    };
  }

  async invalidateAllTokens(userId: string, request?: Request): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, organizationId: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
        refreshTokenHash: null,
        refreshTokenVersion: null,
        refreshTokenIssuedAt: null,
      },
    });

    this.logger.log(`All tokens invalidated for user ${userId}`, {
      userId,
      email: user.email,
      event: 'all_tokens_invalidated',
    });

    if (request) {
      await this.auditLogService.logAuthEvent({
        request,
        action: AuditAction.TOKEN_REFRESH,
        actorEmail: user.email ?? 'unknown',
        actorUserId: userId,
        metadata: { action: 'invalidate_all_tokens' },
        organizationId: user.organizationId,
        severity: AuditSeverity.MEDIUM,
      });
    }
  }

  async getUserSessions(userId: string): Promise<{
    userId: string;
    email: string;
    tokenVersion: number;
    activeSessions: UserSession[];
    totalSessions: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        refreshTokenIssuedAt: true,
        lastLoginAt: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const sessions: UserSession[] = [];

    if (user.refreshTokenIssuedAt) {
      sessions.push({
        id: 'current',
        issuedAt: user.refreshTokenIssuedAt,
        lastUsed: user.lastLoginAt,
        isCurrent: true,
        deviceInfo: 'Current Device',
      });
    }

    return {
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
      activeSessions: sessions,
      totalSessions: sessions.length,
    };
  }

  async invalidateOtherSessions(
    userId: string,
    keepCurrent: boolean = true,
    request?: Request,
  ): Promise<{
    message: string;
    invalidatedCount?: number;
    count?: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, organizationId: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const invalidatedCount = 1;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
        ...(keepCurrent
          ? {}
          : {
              refreshTokenHash: null,
              refreshTokenVersion: null,
              refreshTokenIssuedAt: null,
            }),
      },
    });

    this.logger.log(`Other sessions invalidated for user ${userId}`, {
      userId,
      keepCurrent,
      event: 'other_sessions_invalidated',
    });

    if (request) {
      await this.auditLogService.logAuthEvent({
        request,
        action: AuditAction.TOKEN_REFRESH,
        actorEmail: user.email ?? 'unknown',
        actorUserId: userId,
        metadata: { action: 'invalidate_other_sessions', keepCurrent },
        organizationId: user.organizationId,
        severity: AuditSeverity.MEDIUM,
      });
    }

    return {
      message: keepCurrent
        ? 'All other sessions have been invalidated'
        : 'All sessions have been invalidated',
      invalidatedCount,
      count: invalidatedCount,
    };
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refreshTokenHash: true },
    });

    if (!user?.refreshTokenHash) {
      this.logger.debug(`No refresh token hash found for user ${userId}`);
      return false;
    }

    try {
      return await verifyPassword(
        this.authCoreAdapter,
        token,
        user.refreshTokenHash,
      );
    } catch (error: unknown) {
      const err = toError(error);
      this.logger.error(`Refresh token validation error: ${err.message}`);
      return false;
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    request?: Request,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    try {
      const isValid = await verifyPassword(
        this.authCoreAdapter,
        oldPassword,
        user.passwordHash,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid current password');
      }
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const err = toError(error);
      throw new InternalServerErrorException(
        `Password verification failed: ${err.message}`,
        { cause: error },
      );
    }

    let newPasswordHash: string;
    try {
      newPasswordHash = await hashPassword(this.authCoreAdapter, newPassword);
    } catch (error: unknown) {
      const err = toError(error);
      throw new InternalServerErrorException(
        `Failed to hash new password: ${err.message}`,
        { cause: error },
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        lastPasswordChange: new Date(),
        tokenVersion: { increment: 1 },
        refreshTokenHash: null,
        refreshTokenVersion: null,
        refreshTokenIssuedAt: null,
      },
    });

    if (request) {
      await this.auditLogService.logAuthEvent({
        request,
        action: AuditAction.PASSWORD_CHANGE,
        actorEmail: user.email ?? 'unknown',
        actorUserId: userId,
        metadata: {},
        organizationId: user.organizationId,
        severity: AuditSeverity.MEDIUM,
      });
    }

    return { message: 'Password changed successfully' };
  }

  // ==================== HELPER METHODS ====================

  private async createDefaultRolesForOrganization(
    organizationId: string,
  ): Promise<void> {
    this.logger.log(
      `Creating default roles for organization: ${organizationId.substring(0, 8)}...`,
    );

    const corePermissions = [
      {
        code: 'user:read',
        module: 'user',
        description: 'View users in organization',
      },
      {
        code: 'user:write',
        module: 'user',
        description: 'Create and update users',
      },
      { code: 'user:delete', module: 'user', description: 'Delete users' },
      { code: 'contact:read', module: 'contact', description: 'View contacts' },
      {
        code: 'contact:write',
        module: 'contact',
        description: 'Create and update contacts',
      },
      {
        code: 'contact:delete',
        module: 'contact',
        description: 'Delete contacts',
      },
      { code: 'deal:read', module: 'deal', description: 'View deals' },
      {
        code: 'deal:write',
        module: 'deal',
        description: 'Create and update deals',
      },
      { code: 'deal:delete', module: 'deal', description: 'Delete deals' },
      { code: 'lead:read', module: 'lead', description: 'View leads' },
      {
        code: 'lead:write',
        module: 'lead',
        description: 'Create and update leads',
      },
      { code: 'lead:delete', module: 'lead', description: 'Delete leads' },
      {
        code: 'pipeline:read',
        module: 'pipeline',
        description: 'View pipelines',
      },
      {
        code: 'pipeline:write',
        module: 'pipeline',
        description: 'Create and update pipelines',
      },
      {
        code: 'pipeline:manage',
        module: 'pipeline',
        description: 'Manage pipeline stages and settings',
      },
      {
        code: 'report:read',
        module: 'report',
        description: 'View reports and analytics',
      },
      {
        code: 'report:export',
        module: 'report',
        description: 'Export reports and analytics',
      },
      {
        code: 'rbac:read',
        module: 'rbac',
        description: 'View roles and permissions',
      },
      {
        code: 'rbac:manage',
        module: 'rbac',
        description: 'Manage roles and permissions',
      },
      {
        code: 'dashboard:read',
        module: 'dashboard',
        description: 'View dashboard',
      },
      { code: 'audit:read', module: 'audit', description: 'View audit logs' },
    ];

    for (const perm of corePermissions) {
      await this.prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: {
          code: perm.code,
          name: this.formatPermissionName(perm.code),
          description: perm.description,
          module: perm.module,
        },
      });
    }

    const adminRole = await this.prisma.role.upsert({
      where: { organizationId_name: { organizationId, name: 'SystemAdmin' } },
      update: {
        description: 'Full system administrator with all permissions',
        isSystem: true,
      },
      create: {
        name: 'SystemAdmin',
        description: 'Full system administrator with all permissions',
        isSystem: true,
        organizationId,
      },
    });

    const allPermissions = await this.prisma.permission.findMany();
    for (const permission of allPermissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
      });
    }

    await this.createRoleWithPermissions(
      organizationId,
      'Manager',
      'Manager with read/write access to most resources',
      [
        'contact:read',
        'contact:write',
        'deal:read',
        'deal:write',
        'lead:read',
        'lead:write',
        'pipeline:read',
        'pipeline:write',
        'report:read',
        'dashboard:read',
      ],
    );

    await this.createRoleWithPermissions(
      organizationId,
      'User',
      'Regular user with basic access',
      [
        'contact:read',
        'contact:write',
        'deal:read',
        'deal:write',
        'lead:read',
        'lead:write',
        'dashboard:read',
      ],
    );

    await this.createRoleWithPermissions(
      organizationId,
      'Viewer',
      'Viewer with read-only access',
      [
        'contact:read',
        'deal:read',
        'lead:read',
        'pipeline:read',
        'report:read',
        'dashboard:read',
      ],
    );

    this.logger.log('Default roles created successfully');
  }

  private async createRoleWithPermissions(
    organizationId: string,
    roleName: string,
    description: string,
    permissionCodes: string[],
  ): Promise<{ id: string }> {
    const role = await this.prisma.role.upsert({
      where: { organizationId_name: { organizationId, name: roleName } },
      update: { description, isSystem: true },
      create: { name: roleName, description, isSystem: true, organizationId },
    });

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    for (const permission of permissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }

    return role;
  }

  private async assignSystemAdminRoleToUser(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const adminRole = await this.prisma.role.findFirst({
      where: { organizationId, name: 'SystemAdmin' },
    });

    if (!adminRole) {
      throw new Error(
        `SystemAdmin role not found for organization ${organizationId}`,
      );
    }

    await this.prisma.userRole.create({
      data: { userId, roleId: adminRole.id, organizationId },
    });

    this.logger.log(`Assigned SystemAdmin role to user ${userId}`, {
      userId,
      organizationId,
      event: 'systemadmin_assigned',
    });
  }

  private formatPermissionName(code: string): string {
    const [module, action] = code.split(':');
    const formattedModule = module.charAt(0).toUpperCase() + module.slice(1);
    const formattedAction = action.charAt(0).toUpperCase() + action.slice(1);
    return `${formattedModule} ${formattedAction}`;
  }
}

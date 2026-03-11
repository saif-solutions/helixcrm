import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  AuditLogService,
  AuditAction,
  AuditEntityType,
  AuditSeverity,
} from '../../shared/audit-log/audit-log.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import SecurityConfig from '../../config/security.config';
import { AccountLockoutService } from './services/account-lockout.service';
import { AuthCoreAdapter } from './adapters/AuthCoreAdapter';

// ==================== TYPE DEFINITIONS ====================

interface UserWithOrganization {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  passwordHash: string;
  organizationId: string;
  organization: {
    id: string;
    name: string;
  } | null;
  tokenVersion: number;
  refreshTokenHash: string | null;
  refreshTokenVersion: string | null;
  refreshTokenIssuedAt: Date | null;
  isActive: boolean;
  lastLoginAt: Date | null;
}

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
  [key: string]: unknown;
}

interface UserSession {
  id: string;
  issuedAt: Date | null;
  lastUsed: Date | null;
  isCurrent: boolean;
  deviceInfo: string;
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

  // ==================== USER VALIDATION ====================

  async validateUser(
    email: string,
    password: string,
    request?: Request,
  ): Promise<ValidatedUser | null> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if account is locked
    const lockStatus = await this.accountLockoutService.isAccountLocked(email);

    if (lockStatus.isLocked) {
      this.logger.warn(`Login attempt for locked account: ${email}`, {
        lockedUntil: lockStatus.lockedUntil,
        event: 'account_locked_login_attempt',
      });

      // Log failed login attempt due to locked account
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
      // Record failed attempt even if user doesn't exist (security through obscurity)
      if (user) {
        await this.accountLockoutService.recordFailedAttempt(user.id);
      }

      // Log failed login attempt
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

    // FIX 1: Remove await if password.verify is synchronous
    // Check the actual implementation - if it's async, keep await
    const isValid = await this.authCoreAdapter.password.verify(
      password,
      user.passwordHash,
    );

    if (!isValid) {
      // Record failed attempt
      await this.accountLockoutService.recordFailedAttempt(user.id);

      // Log failed login attempt
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

    // Reset failed attempts on successful validation
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

  // ==================== PERMISSIONS & ROLES ====================

  private async getUserPermissions(
    userId: string,
    organizationId: string,
  ): Promise<UserPermissions> {
    try {
      const userWithRoles = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          UserRoles: {
            where: {
              organizationId,
            },
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch user permissions: ${errorMessage}`);
      return { permissions: [], roles: [] };
    }
  }

  // ==================== LOGIN FLOW ====================

  async login(
    user: ValidatedUser,
    res: Response,
    request?: Request,
  ): Promise<LoginResponse> {
    try {
      // Get user permissions
      const { permissions, roles } = await this.getUserPermissions(
        user.id,
        user.organizationId,
      );

      // Generate access token
      const accessToken = this.authCoreAdapter.authCore.issueAccessToken({
        sub: user.id,
        org: user.organizationId,
        role: roles.includes('SystemAdmin') ? 'admin' : 'user',
        version: user.tokenVersion,
        email: user.email,
        permissions,
        roles,
      });

      // Generate refresh token
      const refreshToken =
        await this.authCoreAdapter.tokenManager.issueRefreshToken(
          user.id,
          user.organizationId,
        );

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      });

      // Set cookies
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

      // Log successful login to audit log
      if (request) {
        await this.auditLogService.logAuthEvent({
          request,
          action: AuditAction.LOGIN_SUCCESS,
          actorEmail: user.email,
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'UnknownError';

      this.logger.error(`Login failed: ${errorMessage}`, {
        error: errorName,
        event: 'login_error',
      });

      // Log login failure to audit log
      if (request && user?.email) {
        await this.auditLogService.logAuthEvent({
          request,
          action: AuditAction.LOGIN_FAILURE,
          actorEmail: user.email,
          actorUserId: user.id,
          metadata: {
            error: errorMessage,
            errorType: errorName,
          },
          organizationId: user.organizationId,
          severity: AuditSeverity.HIGH,
        });
      }

      throw error;
    }
  }

  // ==================== LOGOUT FLOW ====================

  async logout(
    userId: string,
    res: Response,
    request?: Request,
  ): Promise<{ message: string }> {
    // Get user with organization for audit log
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        organizationId: true,
      },
    });

    if (!user) {
      this.logger.warn(`Logout attempted for non-existent user: ${userId}`);
      throw new BadRequestException('User not found');
    }

    // Clear cookies
    res.clearCookie('access_token', SecurityConfig.cookies.accessToken());
    res.clearCookie('refresh_token', SecurityConfig.cookies.refreshToken());

    // Invalidate refresh token in database
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

    // Log logout to audit log
    if (request) {
      await this.auditLogService.logAuthEvent({
        request,
        action: AuditAction.LOGOUT,
        actorEmail: user.email,
        actorUserId: userId,
        metadata: {},
        organizationId: user.organizationId,
        severity: AuditSeverity.MEDIUM,
      });
    }

    return { message: 'Logged out successfully' };
  }

  // ==================== REFRESH TOKEN FLOW ====================

  async refreshToken(
    oldRefreshToken: string,
    res: Response,
    request?: Request,
  ): Promise<LoginResponse> {
    this.logger.debug('Refresh token process started');

    try {
      // Verify JWT using auth-core
      const payload = this.authCoreAdapter.tokenManager.validateRefreshToken(
        oldRefreshToken,
      ) as RefreshTokenPayload;

      // Security validation
      if (payload.type !== 'refresh') {
        this.logger.warn(`Invalid token type in refresh flow: ${payload.type}`);
        throw new UnauthorizedException('Invalid token type');
      }

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Use transaction for atomic operation
      return await this.authCoreAdapter.withTransaction(async () => {
        const tokenRepository = this.authCoreAdapter.tokenRepository;
        const userRepository = this.authCoreAdapter.userRepository;

        // Find user using auth-core repository - FIX 2: Remove unnecessary type assertion
        const authCoreUser = await userRepository.findById(payload.sub);
        if (!authCoreUser) {
          throw new UnauthorizedException('User not found');
        }

        // Fetch full user from database - FIX 3: Remove unnecessary type assertion
        const fullUser = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!fullUser || !fullUser.isActive) {
          throw new UnauthorizedException('User not found or inactive');
        }

        const userWithOrg: UserWithOrganization = {
          ...fullUser,
          organization: fullUser.organization,
        };

        // Validate refresh token hash
        if (!userWithOrg.refreshTokenHash) {
          throw new UnauthorizedException('No active refresh token');
        }

        const tokenJti = payload.jti;
        if (!tokenJti) {
          this.logger.error('Refresh token missing jti', {
            userId: payload.sub,
          });
          throw new UnauthorizedException('Invalid refresh token');
        }

        // Hash the token for comparison
        const crypto = await import('crypto');
        const jwtHash = crypto
          .createHash('sha256')
          .update(oldRefreshToken)
          .digest('hex');

        // FIX 4: Remove await if password.verify is synchronous
        const isTokenValid = await this.authCoreAdapter.password.verify(
          jwtHash,
          userWithOrg.refreshTokenHash,
        );

        if (!isTokenValid) {
          throw new UnauthorizedException('Invalid refresh token');
        }

        // Get user permissions for the new token
        const { permissions, roles } = await this.getUserPermissions(
          userWithOrg.id,
          userWithOrg.organizationId,
        );

        // Generate new refresh token
        const newRefreshToken =
          await this.authCoreAdapter.tokenManager.issueRefreshToken(
            userWithOrg.id,
            userWithOrg.organizationId,
          );

        // Generate new access token
        const newAccessToken = this.authCoreAdapter.authCore.issueAccessToken({
          sub: userWithOrg.id,
          org: userWithOrg.organizationId,
          role: roles.includes('SystemAdmin') ? 'admin' : 'user',
          version: userWithOrg.tokenVersion + 1,
          permissions,
          roles,
        });

        // Hash the new token - FIX 5: Remove await if hash is synchronous
        const newRefreshTokenHash =
          this.authCoreAdapter.password.hash(newRefreshToken);

        // Invalidate old token and save new one
        await tokenRepository.invalidateRefreshToken(tokenJti);
        await tokenRepository.saveRefreshToken({
          id: crypto.randomUUID(),
          userId: userWithOrg.id,
          organizationId: userWithOrg.organizationId,
          tokenHash: newRefreshTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdAt: new Date(),
        });

        // Set cookies
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

        // Log token refresh to audit log
        if (request) {
          await this.auditLogService.logAuthEvent({
            request,
            action: AuditAction.TOKEN_REFRESH,
            actorEmail: userWithOrg.email,
            actorUserId: userWithOrg.id,
            metadata: {
              oldTokenVersion: userWithOrg.tokenVersion,
              newTokenVersion: userWithOrg.tokenVersion + 1,
            },
            organizationId: userWithOrg.organizationId,
            severity: AuditSeverity.MEDIUM,
          });
        }

        return {
          access_token: newAccessToken,
          user: {
            id: userWithOrg.id,
            email: userWithOrg.email,
            firstName: userWithOrg.firstName,
            lastName: userWithOrg.lastName,
            organizationId: userWithOrg.organizationId,
            permissions,
            roles,
          },
        };
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorType = error instanceof Error ? error.name : 'UnknownError';

      this.logger.error('Refresh token error', {
        error: errorMessage,
        errorType,
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ==================== REGISTRATION FLOW ====================

  async register(
    registerDto: RegisterDto,
    request?: Request,
  ): Promise<{
    id: string;
    email: string;
    organizationId: string;
    message: string;
  }> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password using auth-core
    const passwordHash = this.authCoreAdapter.password.hash(
      registerDto.password,
    );

    // Create organization
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

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
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

    // Create default RBAC roles for organization
    await this.createDefaultRolesForOrganization(organization.id);

    // Assign SystemAdmin role to new user
    await this.assignSystemAdminRoleToUser(user.id, organization.id);

    this.logger.log(`New user registered: ${user.email}`, {
      userId: user.id,
      organizationId: organization.id,
      event: 'user_registered',
    });

    // Log user creation to audit log
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
    };
  }

  // ==================== TOKEN MANAGEMENT ====================

  async invalidateAllTokens(userId: string, request?: Request): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        organizationId: true,
      },
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

    // Log token invalidation to audit log
    if (request) {
      await this.auditLogService.logAuthEvent({
        request,
        action: AuditAction.TOKEN_REFRESH,
        actorEmail: user.email,
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

    // Current session (if exists)
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
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        organizationId: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

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

    // Log session invalidation to audit log
    if (request) {
      await this.auditLogService.logAuthEvent({
        request,
        action: AuditAction.TOKEN_REFRESH,
        actorEmail: user.email,
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

    return this.authCoreAdapter.password.verify(token, user.refreshTokenHash);
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

    // Verify old password
    const isValid = await this.authCoreAdapter.password.verify(
      oldPassword,
      user.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    // Hash new password
    const newPasswordHash = this.authCoreAdapter.password.hash(newPassword);

    // Update password and invalidate all tokens
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

    // Log password change to audit log
    if (request) {
      await this.auditLogService.logAuthEvent({
        request,
        action: AuditAction.PASSWORD_CHANGE,
        actorEmail: user.email,
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

    // Core permissions using colon format
    const corePermissions: Array<{
      code: string;
      module: string;
      description: string;
    }> = [
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
      {
        code: 'user:delete',
        module: 'user',
        description: 'Delete users',
      },
      {
        code: 'contact:read',
        module: 'contact',
        description: 'View contacts',
      },
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
      {
        code: 'deal:read',
        module: 'deal',
        description: 'View deals',
      },
      {
        code: 'deal:write',
        module: 'deal',
        description: 'Create and update deals',
      },
      {
        code: 'deal:delete',
        module: 'deal',
        description: 'Delete deals',
      },
      {
        code: 'lead:read',
        module: 'lead',
        description: 'View leads',
      },
      {
        code: 'lead:write',
        module: 'lead',
        description: 'Create and update leads',
      },
      {
        code: 'lead:delete',
        module: 'lead',
        description: 'Delete leads',
      },
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
      {
        code: 'audit:read',
        module: 'audit',
        description: 'View audit logs',
      },
    ];

    // Create permissions
    for (const perm of corePermissions) {
      const name = this.formatPermissionName(perm.code);
      await this.prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: {
          code: perm.code,
          name,
          description: perm.description,
          module: perm.module,
        },
      });
    }

    // Create SystemAdmin Role
    const adminRole = await this.prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: 'SystemAdmin',
        },
      },
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

    // Assign all permissions to SystemAdmin
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
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });
    }

    // Create Manager Role
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

    // Create User Role
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

    // Create Viewer Role
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
      where: {
        organizationId_name: {
          organizationId,
          name: roleName,
        },
      },
      update: { description, isSystem: true },
      create: {
        name: roleName,
        description,
        isSystem: true,
        organizationId,
      },
    });

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    for (const permission of permissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }

    return role;
  }

  private async assignSystemAdminRoleToUser(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const adminRole = await this.prisma.role.findFirst({
      where: {
        organizationId,
        name: 'SystemAdmin',
      },
    });

    if (!adminRole) {
      throw new Error(
        `SystemAdmin role not found for organization ${organizationId}`,
      );
    }

    await this.prisma.userRole.create({
      data: {
        userId,
        roleId: adminRole.id,
        organizationId,
      },
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

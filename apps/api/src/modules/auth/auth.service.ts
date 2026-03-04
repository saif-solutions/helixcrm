// File: apps/api/src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
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

  async validateUser(email: string, password: string, request?: any) {
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
            lockedUntil: lockStatus.lockedUntil,
          },
          severity: AuditSeverity.HIGH,
        });
      }

      throw new ForbiddenException(
        `Account is locked until ${lockStatus.lockedUntil}`,
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

    // Token version validation
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
  ): Promise<{ permissions: string[]; roles: string[] }> {
    try {
      const userWithRoles = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          UserRoles: {
            where: {
              organizationId: organizationId,
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

      if (!userWithRoles || !userWithRoles.UserRoles) {
        return { permissions: [], roles: [] };
      }

      const permissions = new Set<string>();
      const roles = new Set<string>();

      userWithRoles.UserRoles.forEach((userRole) => {
        if (userRole.role) {
          roles.add(userRole.role.name);

          if (userRole.role.permissions) {
            userRole.role.permissions.forEach((rolePermission) => {
              if (rolePermission.permission) {
                permissions.add(rolePermission.permission.code);
              }
            });
          }
        }
      });

      return {
        permissions: Array.from(permissions),
        roles: Array.from(roles),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch user permissions: ${error.message}`);
      return { permissions: [], roles: [] };
    }
  }

  // ==================== LOGIN FLOW ====================

  async login(user: any, res: any, request?: any) {
    try {
// Get user permissions
const { permissions, roles } = await this.getUserPermissions(
  user.id,
  user.organizationId,
);

// Use auth-core token manager service for access token
const accessToken = await this.authCoreAdapter.authCore.issueAccessToken({
  sub: user.id,
  org: user.organizationId,        // Note: uses 'org' not 'organizationId'
  role: roles.includes('SystemAdmin') ? 'admin' : 'user',
  version: user.tokenVersion,       // Note: uses 'version' not 'tokenVersion'
  email: user.email,
  permissions: permissions,
  roles: roles,
});
      // IMPORTANT: Let auth-core generate refresh token with its own jti
      // DO NOT pass version parameter - auth-core will create jti automatically
      const refreshToken =
        await this.authCoreAdapter.tokenManager.issueRefreshToken(
          user.id,
          user.organizationId,
          // version: undefined, // Let auth-core handle jti generation
        );

      // CRITICAL: DO NOT update refreshTokenVersion or refreshTokenHash here!
      // The PrismaTokenRepositoryBridge.saveRefreshToken() handles this via auth-core
      // Only update lastLoginAt - bridge handles token storage
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      });

      // Set cookies (plain token in cookie, hash in database via bridge)
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
        permissions: permissions.length,
        roles: roles.length,
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
            roles: roles,
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
    } catch (error: any) {
      this.logger.error(`Login failed: ${error.message}`, {
        error: error.name,
        stack: error.stack?.split('\n')[0],
        event: 'login_error',
      });

      // Log login failure to audit log
      if (request && user?.email) {
        await this.auditLogService.logAuthEvent({
          request,
          action: AuditAction.LOGIN_FAILURE,
          actorEmail: user.email,
          actorUserId: user?.id,
          metadata: {
            error: error.message,
            errorType: error.name,
          },
          organizationId: user?.organizationId,
          severity: AuditSeverity.HIGH,
        });
      }

      throw error;
    }
  }

  // ==================== LOGOUT FLOW ====================

  async logout(userId: string, res: any, request?: any) {
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

  async refreshToken(oldRefreshToken: string, res: any, request?: any) {
    this.logger.debug('Refresh token process started', {
      tokenPrefix: oldRefreshToken.substring(0, 10) + '...',
    });

    try {
      this.logger.log('[CRITICAL-DEBUG] refreshToken method called', {
        oldRefreshTokenLength: oldRefreshToken?.length,
        oldRefreshTokenFirst100: oldRefreshToken?.substring(0, 100) + '...',
        oldRefreshTokenIsJWT:
          oldRefreshToken?.includes('.') &&
          oldRefreshToken.split('.').length === 3,
        caller: 'auth/refresh endpoint',
      });
      this.logger.debug('[DEBUG] Refresh token flow started', {
        tokenPrefix: oldRefreshToken.substring(0, 30) + '...',
        tokenLength: oldRefreshToken.length,
      });
      // Verify JWT using auth-core
      const payload =
        this.authCoreAdapter.tokenManager.validateRefreshToken(oldRefreshToken);

      // Security validation
      if (payload.type !== 'refresh') {
        this.logger.warn(`Invalid token type in refresh flow: ${payload.type}`);
        throw new UnauthorizedException('Invalid token type');
      }

      this.logger.debug('Refresh JWT verified', {
        userId: payload.sub,
        jtiPrefix: payload.jti?.substring(0, 10),
        jtiLength: payload.jti?.length,
      });

      // CRITICAL: TRANSACTION WITH VERSION BINDING
      return await this.authCoreAdapter.withTransaction(async () => {
        const tokenRepository = this.authCoreAdapter.tokenRepository;
        const userRepository = this.authCoreAdapter.userRepository;
        // Find user using auth-core repository
        const authCoreUser = await userRepository.findById(payload.sub);
        if (!authCoreUser) {
          throw new UnauthorizedException('User not found');
        }

        // Fetch full user from database for business logic
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

        const userWithOrg = {
          ...fullUser,
          organization: fullUser.organization,
        };

        this.logger.debug('User found for refresh', {
          email: userWithOrg.email,
          tokenVersion: userWithOrg.tokenVersion,
          refreshTokenVersionLength: userWithOrg.refreshTokenVersion?.length,
          refreshTokenVersionPrefix: userWithOrg.refreshTokenVersion?.substring(
            0,
            10,
          ),
        });

        // ==================== CRITICAL: VERSION BINDING CHECK ====================
        // Auth-core uses jti (JWT ID) for version binding
        const tokenJti = payload.jti;

        if (!tokenJti) {
          this.logger.error('Refresh token missing jti', {
            userId: payload.sub,
          });
          throw new UnauthorizedException('Invalid refresh token');
        }

        // Validate current refresh token hash
        if (!userWithOrg.refreshTokenHash) {
          throw new UnauthorizedException('No active refresh token');
        }

        // FIX: Auth-core provides SHA256 hash, not raw JWT
        // We need to SHA256 hash the JWT before bcrypt comparison
        const crypto = await import('crypto');
        const jwtHash = crypto
          .createHash('sha256')
          .update(oldRefreshToken)
          .digest('hex');

        const isTokenValid = await this.authCoreAdapter.password.verify(
          jwtHash, // Compare SHA256 hash of JWT
          userWithOrg.refreshTokenHash,
        );

        // Debug logging
        this.logger.debug('[FIX] SHA256 Hash Comparison', {
          jwtHashLength: jwtHash.length,
          jwtHashPrefix: jwtHash.substring(0, 20),
          storedHashPrefix: userWithOrg.refreshTokenHash?.substring(0, 30),
          comparisonType: 'bcrypt.verify(SHA256(JWT), storedHash)',
        });

        if (!isTokenValid) {
          this.logger.log(
            '[DEBUG] Token validation FAILED - entering error block',
          );
          this.logger.log('[DEBUG] Hash comparison result', {
            isValid: isTokenValid,
            comparisonType: 'bcrypt.verify(rawToken, hash)',
          });
          throw new UnauthorizedException('Invalid refresh token');
        }
        // ==================== GENERATE NEW TOKENS ====================

        // Get user permissions for the new token
        const { permissions, roles } = await this.getUserPermissions(
          userWithOrg.id,
          userWithOrg.organizationId,
        );

        // Generate new refresh token (auth-core will create new jti)
        const newRefreshToken =
          await this.authCoreAdapter.tokenManager.issueRefreshToken(
            userWithOrg.id,
            userWithOrg.organizationId,
            // version: undefined, // Let auth-core handle jti generation
          );

        // Generate new access token
        const newAccessToken =
          await this.authCoreAdapter.authCore.issueAccessToken({
            sub: userWithOrg.id,
            org: userWithOrg.organizationId,
            role: roles.includes('SystemAdmin') ? 'admin' : 'user',
            version: userWithOrg.tokenVersion + 1,
          });

        // Hash the NEW token (bridge will handle this via auth-core)
        const newRefreshTokenHash =
          await this.authCoreAdapter.password.hash(newRefreshToken);

        // ATOMIC UPDATE WITH VERSION BINDING
        // Bridge will handle storing new jti and hash
        // TokenRepository doesn't have updateTokenVersion method
        // Instead, we need to invalidate old token and save new one
        await tokenRepository.invalidateRefreshToken(tokenJti);
        await tokenRepository.saveRefreshToken({
          id: 'new-jti-generated-by-auth-core', // This should come from auth-core
          userId: userWithOrg.id,
          organizationId: userWithOrg.organizationId,
          tokenHash: newRefreshTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdAt: new Date(),
        });

        this.logger.debug('Token rotation completed', {
          userId: userWithOrg.id,
          oldTokenVersion: userWithOrg.tokenVersion,
          newTokenVersion: userWithOrg.tokenVersion + 1,
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
    } catch (error: any) {
      this.logger.error('Refresh token error', {
        error: error.message,
        errorType: error.name,
        stack: error.stack?.split('\n')[0],
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ==================== REGISTRATION FLOW ====================

  async register(
    registerDto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationName: string;
    },
    request?: any,
  ) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password using auth-core
    const passwordHash = await this.authCoreAdapter.password.hash(
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

  async invalidateAllTokens(userId: string, request?: any) {
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

  async getUserSessions(userId: string) {
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

    const sessions = [];

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
    request?: any,
  ) {
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

    if (!user || !user.refreshTokenHash) {
      this.logger.debug(`No refresh token hash found for user ${userId}`);
      return false;
    }

    return await this.authCoreAdapter.password.verify(
      token,
      user.refreshTokenHash,
    );
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    request?: any,
  ) {
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
    const newPasswordHash =
      await this.authCoreAdapter.password.hash(newPassword);

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

  /**
   * Create default system roles for a new organization
   */
  private async createDefaultRolesForOrganization(
    organizationId: string,
  ): Promise<void> {
    this.logger.log(
      `Creating default roles for organization: ${organizationId.substring(0, 8)}...`,
    );

    // Ensure core permissions exist - ALL USING COLON FORMAT
    const corePermissions = [
      'user:read',
      'user:write',
      'user:delete',
      'contact:read',
      'contact:write',
      'contact:delete',
      'deal:read',
      'deal:write',
      'deal:delete',
      'lead:read',
      'lead:write',
      'lead:delete',
      'pipeline:read',
      'pipeline:write',
      'pipeline:manage',
      'report:read',
      'report:export',
      'rbac:read',
      'rbac:manage',
      'dashboard:read',
      'audit:read',
    ];

    // Create any missing permissions
    for (const code of corePermissions) {
      const name = this.formatPermissionName(code);
      const description = this.getPermissionDescription(code);
      const module = code.split(':')[0];

      await this.prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code, name, description, module },
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
    this.logger.debug(
      `SystemAdmin role created with ${allPermissions.length} permissions`,
    );

    // Create Manager Role
    const managerRole = await this.prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: 'Manager',
        },
      },
      update: {
        description: 'Manager with read/write access to most resources',
        isSystem: true,
      },
      create: {
        name: 'Manager',
        description: 'Manager with read/write access to most resources',
        isSystem: true,
        organizationId,
      },
    });

    // Assign manager permissions - USING COLON FORMAT
    const managerPermissions = await this.prisma.permission.findMany({
      where: {
        code: {
          in: [
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
        },
      },
    });

    for (const permission of managerPermissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: managerRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: managerRole.id,
          permissionId: permission.id,
        },
      });
    }
    this.logger.debug(
      `Manager role created with ${managerPermissions.length} permissions`,
    );

    // Create User Role
    const userRole = await this.prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: 'User',
        },
      },
      update: {
        description: 'Regular user with basic access',
        isSystem: true,
      },
      create: {
        name: 'User',
        description: 'Regular user with basic access',
        isSystem: true,
        organizationId,
      },
    });

    const userPermissions = await this.prisma.permission.findMany({
      where: {
        code: {
          in: [
            'contact:read',
            'contact:write',
            'deal:read',
            'deal:write',
            'lead:read',
            'lead:write',
            'dashboard:read',
          ],
        },
      },
    });

    for (const permission of userPermissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: userRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: userRole.id,
          permissionId: permission.id,
        },
      });
    }
    this.logger.debug(
      `User role created with ${userPermissions.length} permissions`,
    );

    // Create Viewer Role
    const viewerRole = await this.prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: 'Viewer',
        },
      },
      update: {
        description: 'Viewer with read-only access',
        isSystem: true,
      },
      create: {
        name: 'Viewer',
        description: 'Viewer with read-only access',
        isSystem: true,
        organizationId,
      },
    });

    const viewerPermissions = await this.prisma.permission.findMany({
      where: {
        code: {
          in: [
            'contact:read',
            'deal:read',
            'lead:read',
            'pipeline:read',
            'report:read',
            'dashboard:read',
          ],
        },
      },
    });

    for (const permission of viewerPermissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: viewerRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: viewerRole.id,
          permissionId: permission.id,
        },
      });
    }
    this.logger.debug(
      `Viewer role created with ${viewerPermissions.length} permissions`,
    );
  }

  /**
   * Assign SystemAdmin role to a user
   */
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

  /**
   * Helper: Format permission code into readable name
   */
  private formatPermissionName(code: string): string {
    const [module, action] = code.split(':');
    return `${module.charAt(0).toUpperCase() + module.slice(1)} ${action.charAt(0).toUpperCase() + action.slice(1)}`;
  }

  /**
   * Helper: Get permission description
   */
  private getPermissionDescription(code: string): string {
    const descriptions: Record<string, string> = {
      'user:read': 'View users in organization',
      'user:write': 'Create and update users',
      'user:delete': 'Delete users',
      'contact:read': 'View contacts',
      'contact:write': 'Create and update contacts',
      'contact:delete': 'Delete contacts',
      'deal:read': 'View deals',
      'deal:write': 'Create and update deals',
      'deal:delete': 'Delete deals',
      'lead:read': 'View leads',
      'lead:write': 'Create and update leads',
      'lead:delete': 'Delete leads',
      'pipeline:read': 'View pipelines',
      'pipeline:write': 'Create and update pipelines',
      'pipeline:manage': 'Manage pipeline stages and settings',
      'report:read': 'View reports and analytics',
      'report:export': 'Export reports and analytics',
      'rbac:read': 'View roles and permissions',
      'rbac:manage': 'Manage roles and permissions',
      'dashboard:read': 'View dashboard',
      'audit:read': 'View audit logs',
    };

    return descriptions[code] || `${code} permission`;
  }

  /**
   * Helper: Analyze jti mismatch for security logging
   */
  private analyzeJtiMismatch(dbJti: string | null, tokenJti: string): string {
    if (!dbJti && !tokenJti) return 'BOTH_NULL';
    if (!dbJti) return 'DB_JTI_NULL';
    if (!tokenJti) return 'TOKEN_JTI_NULL';
    if (dbJti === tokenJti) return 'ACTUALLY_MATCHES';

    const dbFormat = this.describeJtiFormat(dbJti);
    const tokenFormat = this.describeJtiFormat(tokenJti);

    return `JTI_FORMAT_MISMATCH: DB=${dbFormat}(${dbJti.length}), TOKEN=${tokenFormat}(${tokenJti.length})`;
  }

  /**
   * Helper: Describe jti format for debugging
   */
  private describeJtiFormat(jti: string | null): string {
    if (!jti) return 'NULL';
    if (/^[a-f0-9]{64}$/i.test(jti)) return '64-CHAR-HEX-HASH';
    if (jti.includes('-') && jti.length > 20) return 'TIMESTAMP-UUID';
    if (jti.includes(':')) return 'USERID:JTI';
    return `UNKNOWN_FORMAT_LEN_${jti.length}`;
  }
}
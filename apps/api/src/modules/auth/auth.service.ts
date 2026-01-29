// File: apps/api/src/modules/auth/auth.service.ts
import { 
  Injectable, 
  UnauthorizedException, 
  ConflictException, 
  BadRequestException, 
  Logger, 
  ForbiddenException 
} from "@nestjs/common";
import { AuditLogService, AuditAction, AuditEntityType } from "../../shared/audit-log/audit-log.service";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../shared/prisma/prisma.service";
import * as bcrypt from "bcrypt";
import SecurityConfig from "../../config/security.config";
import { AccountLockoutService } from "./services/account-lockout.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private accountLockoutService: AccountLockoutService,
    private auditLogService: AuditLogService, // ADD AUDIT LOG SERVICE
  ) {}

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
        await this.auditLogService.logAuthEvent(
          request,
          AuditAction.LOGIN_FAILURE,
          normalizedEmail,
          undefined,
          { reason: 'Account locked', lockedUntil: lockStatus.lockedUntil }
        );
      }
      
      throw new ForbiddenException(`Account is locked until ${lockStatus.lockedUntil}`);
    }

    const user = await this.prisma.user.findUnique({ 
      where: { email: normalizedEmail } 
    });
    
    if (!user || !user.isActive) {
      // Record failed attempt even if user doesn't exist (security through obscurity)
      if (user) {
        await this.accountLockoutService.recordFailedAttempt(user.id);
      }
      
      // Log failed login attempt
      if (request) {
        await this.auditLogService.logAuthEvent(
          request,
          AuditAction.LOGIN_FAILURE,
          normalizedEmail,
          undefined,
          { reason: 'Invalid credentials or inactive account' }
        );
      }
      
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      // Record failed attempt
      await this.accountLockoutService.recordFailedAttempt(user.id);
      
      // Log failed login attempt
      if (request) {
        await this.auditLogService.logAuthEvent(
          request,
          AuditAction.LOGIN_FAILURE,
          normalizedEmail,
          user.id,
          { reason: 'Invalid password' }
        );
      }
      
      return null;
    }

    // Reset failed attempts on successful validation
    await this.accountLockoutService.resetFailedAttempts(user.id);

    // Token version validation
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion,
      refreshTokenHash: user.refreshTokenHash,
    };
  }

  private async getUserPermissions(userId: string, organizationId: string): Promise<{ permissions: string[], roles: string[] }> {
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

  async login(user: any, res: any, request?: any) {
    try {
      // Get user permissions
      const { permissions, roles } = await this.getUserPermissions(user.id, user.organizationId);
      
      const payload = {
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        tokenVersion: user.tokenVersion,
        type: 'access',
        permissions,
        roles,
      };

      // Generate access token
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: SecurityConfig.jwt.accessTokenExpiry,
        issuer: SecurityConfig.jwt.issuer,
        audience: SecurityConfig.jwt.audience,
      });
      
      // Generate refresh token with proper payload
      const crypto = await import('crypto');
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const initialVersion = `${Date.now()}-${uniqueId}`;
      
      const refreshToken = this.jwtService.sign(
        { 
          sub: user.id, 
          type: 'refresh',
          version: initialVersion,
        },
        { 
          expiresIn: SecurityConfig.jwt.refreshTokenExpiry,
          issuer: SecurityConfig.jwt.issuer,
          audience: SecurityConfig.jwt.audience,
        }
      );

      // CRITICAL: ALWAYS hash refresh tokens
      const refreshTokenHash = await bcrypt.hash(
        refreshToken, 
        SecurityConfig.refreshToken.bcryptRounds
      );

      // Update user with hashed refresh token AND version binding
      await this.prisma.user.update({
        where: { id: user.id },
        data: { 
          refreshTokenHash,
          refreshTokenVersion: initialVersion,
          refreshTokenIssuedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });

      // Set cookies (plain token in cookie, hash in database)
      res.cookie('access_token', accessToken, SecurityConfig.cookies.accessToken());
      res.cookie('refresh_token', refreshToken, SecurityConfig.cookies.refreshToken());

      this.logger.log(`User ${user.email} logged in`, {
        userId: user.id,
        organizationId: user.organizationId,
        permissions: permissions.length,
        roles: roles.length,
        event: 'user_login',
      });

      // Log successful login to audit log
      if (request) {
        await this.auditLogService.logAuthEvent(
          request,
          AuditAction.LOGIN_SUCCESS,
          user.email,
          user.id,
          {
            permissionsCount: permissions.length,
            roles: roles,
            tokenVersion: user.tokenVersion,
          }
        );
      }

      return {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
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
        await this.auditLogService.logAuthEvent(
          request,
          AuditAction.LOGIN_FAILURE,
          user.email,
          user?.id,
          { error: error.message }
        );
      }
      
      throw error;
    }
  }

  async logout(userId: string, res: any, request?: any) {
    // Get user email before logging out for audit log
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

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
      event: 'user_logout',
    });

    // Log logout to audit log
    if (request && user) {
      await this.auditLogService.logAuthEvent(
        request,
        AuditAction.LOGOUT,
        user.email,
        userId,
        {}
      );
    }

    return { message: 'Logged out successfully' };
  }

  async refreshToken(oldRefreshToken: string, res: any, request?: any) {
    console.log('🔄 REFRESH START - Old token:', oldRefreshToken.substring(0, 30) + '...');
    
    try {
      // Verify JWT
      const payload = this.jwtService.verify(oldRefreshToken, {
        issuer: SecurityConfig.jwt.issuer,
        audience: SecurityConfig.jwt.audience,
      });
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      console.log('  JWT verified for user:', payload.sub);
      console.log('  Token version in JWT:', payload.version);

      // ============================================
      // CRITICAL: TRANSACTION WITH VERSION BINDING
      // ============================================
      
      return await this.prisma.$transaction(async (tx) => {
        // Find user WITHIN transaction
        const user = await tx.user.findUnique({
          where: { id: payload.sub },
        });

        if (!user || !user.isActive) {
          throw new UnauthorizedException('User not found or inactive');
        }

        console.log('  User found:', user.email);
        console.log('  Current tokenVersion:', user.tokenVersion);
        console.log('  Current refreshTokenVersion in DB:', user.refreshTokenVersion);

        // ============================================
        // CRITICAL: VERSION BINDING CHECK (REPLAY DETECTION)
        // ============================================
        
        // Check if token has already been used (REPLAY DETECTION)
        if (user.refreshTokenVersion && user.refreshTokenVersion !== payload.version) {
          console.log('  ❌ TOKEN REUSE ATTACK DETECTED!');
          console.log('     DB version:', user.refreshTokenVersion);
          console.log('     JWT version:', payload.version);
          
          // Log security breach to audit log
          if (request) {
            await this.auditLogService.logAuthEvent(
              request,
              AuditAction.SYSTEM_ERROR,
              user.email,
              user.id,
              { 
                securityEvent: 'refresh_token_reuse_detected',
                dbVersion: user.refreshTokenVersion,
                jwtVersion: payload.version 
              }
            );
          }
          
          // Security response: Invalidate all tokens
          await tx.user.update({
            where: { id: user.id },
            data: { 
              refreshTokenHash: null,
              refreshTokenVersion: null,
              refreshTokenIssuedAt: null,
              tokenVersion: user.tokenVersion + 1,
            },
          });
          
          throw new UnauthorizedException('Refresh token reuse detected - security breach');
        }

        // Validate current refresh token hash
        if (!user.refreshTokenHash) {
          console.log('  ❌ No active refresh token');
          throw new UnauthorizedException('No active refresh token');
        }

        // Verify hash matches
        console.log('  Comparing hash...');
        const isTokenValid = await bcrypt.compare(oldRefreshToken, user.refreshTokenHash);
        console.log('  Hash comparison result:', isTokenValid);
        
        if (!isTokenValid) {
          console.log('  ❌ Invalid hash');
          throw new UnauthorizedException('Invalid refresh token');
        }

        // ============================================
        // GENERATE NEW TOKENS
        // ============================================
        
        const crypto = await import('crypto');
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const newVersion = `${Date.now()}-${uniqueId}`;
        
        console.log('  Generating new version:', newVersion);

        // Get user permissions for the new token
        const { permissions, roles } = await this.getUserPermissions(user.id, user.organizationId);

        // New refresh token
        const newRefreshToken = this.jwtService.sign(
          { 
            sub: user.id, 
            type: 'refresh',
            version: newVersion,
          },
          { 
            expiresIn: SecurityConfig.jwt.refreshTokenExpiry,
            issuer: SecurityConfig.jwt.issuer,
            audience: SecurityConfig.jwt.audience,
          }
        );

        // New access token WITH PERMISSIONS
        const newAccessToken = this.jwtService.sign({
          sub: user.id,
          email: user.email,
          organizationId: user.organizationId,
          tokenVersion: user.tokenVersion + 1,
          type: 'access',
          permissions,
          roles,
        }, {
          expiresIn: SecurityConfig.jwt.accessTokenExpiry,
          issuer: SecurityConfig.jwt.issuer,
          audience: SecurityConfig.jwt.audience,
        });

        // Hash the NEW token
        const newRefreshTokenHash = await bcrypt.hash(
          newRefreshToken, 
          SecurityConfig.refreshToken.bcryptRounds
        );

        console.log('  New hash prefix:', newRefreshTokenHash.substring(0, 30));

        // ============================================
        // ATOMIC UPDATE WITH VERSION BINDING
        // ============================================
        
        await tx.user.update({
          where: { id: user.id },
          data: { 
            refreshTokenHash: newRefreshTokenHash,
            refreshTokenVersion: newVersion,
            refreshTokenIssuedAt: new Date(),
            tokenVersion: user.tokenVersion + 1,
          },
        });

        console.log('  ✅ Database updated with new version');
        console.log('  Old version:', payload.version);
        console.log('  New version:', newVersion);

        // Set cookies
        res.cookie('access_token', newAccessToken, SecurityConfig.cookies.accessToken());
        res.cookie('refresh_token', newRefreshToken, SecurityConfig.cookies.refreshToken());

        // Log token refresh to audit log
        if (request) {
          await this.auditLogService.logAuthEvent(
            request,
            AuditAction.TOKEN_REFRESH,
            user.email,
            user.id,
            { 
              oldTokenVersion: user.tokenVersion,
              newTokenVersion: user.tokenVersion + 1 
            }
          );
        }

        return { 
          access_token: newAccessToken,
          user: {
            id: user.id,
            email: user.email,
            organizationId: user.organizationId,
            permissions,
            roles,
          }
        };
        
      }, {
        maxWait: 10000,
        timeout: 30000,
        isolationLevel: 'Serializable',
      });
      
    } catch (error: any) {
      console.log('  ❌ Error:', error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async register(registerDto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }, request?: any) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // Create organization first
    const organization = await this.prisma.organization.create({
      data: {
        name: registerDto.organizationName || `${registerDto.firstName}'s Organization`,
        slug: registerDto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'),
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

    // ============================================
    // NEW: CREATE DEFAULT RBAC ROLES FOR ORGANIZATION
    // ============================================
    await this.createDefaultRolesForOrganization(organization.id);
    
    // ============================================
    // NEW: ASSIGN SYSTEMADMIN ROLE TO NEW USER
    // ============================================
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
          roles: ['SystemAdmin']
        }
      );
    }

    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      message: 'Organization created successfully. Default roles and permissions have been set up.',
    };
  }

  /**
   * Create default system roles for a new organization
   * Extracted from the RBAC initialization script
   */
  private async createDefaultRolesForOrganization(organizationId: string): Promise<void> {
    this.logger.log(`Creating default roles for organization: ${organizationId.substring(0, 8)}...`);

    // 1. Ensure core permissions exist (they should from global initialization)
    const corePermissions = [
      // Users module
      'users.read', 'users.create', 'users.update', 'users.delete',
      // Contacts module
      'contacts.read', 'contacts.write', 'contacts.delete',
      // Deals module  
      'deals.read', 'deals.write', 'deals.delete',
      // Leads module
      'leads.read', 'leads.write', 'leads.delete',
      // Pipelines module
      'pipelines.read', 'pipelines.write', 'pipelines.manage',
      // Analytics module
      'analytics.read', 'analytics.export',
      // RBAC module
      'rbac.read', 'rbac.manage',
      // Dashboard module
      'dashboard.read',
      // Audit module - ADDED FOR PHASE 6
      'audit.read',
    ];

    // Create any missing permissions
    for (const code of corePermissions) {
      const name = this.formatPermissionName(code);
      const description = this.getPermissionDescription(code);
      const module = code.split('.')[0];

      await this.prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code, name, description, module },
      });
    }

    // 2. Create SystemAdmin Role
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
    this.logger.log(`  ✓ SystemAdmin role with ${allPermissions.length} permissions`);

    // 3. Create Manager Role
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

    // Assign manager permissions
    const managerPermissions = await this.prisma.permission.findMany({
      where: {
        code: {
          in: [
            'contacts.read', 'contacts.write',
            'deals.read', 'deals.write',
            'leads.read', 'leads.write',
            'pipelines.read', 'pipelines.write',
            'analytics.read',
            'dashboard.read',
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
    this.logger.log(`    ✓ Manager role with ${managerPermissions.length} permissions`);

    // 4. Create User Role
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
            'contacts.read', 'contacts.write',
            'deals.read', 'deals.write',
            'leads.read', 'leads.write',
            'dashboard.read',
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
    this.logger.log(`    ✓ User role with ${userPermissions.length} permissions`);

    // 5. Create Viewer Role
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
            'contacts.read',
            'deals.read',
            'leads.read',
            'pipelines.read',
            'analytics.read',
            'dashboard.read',
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
    this.logger.log(`    ✓ Viewer role with ${viewerPermissions.length} permissions`);
  }

  /**
   * Assign SystemAdmin role to a user
   */
  private async assignSystemAdminRoleToUser(userId: string, organizationId: string): Promise<void> {
    const adminRole = await this.prisma.role.findFirst({
      where: {
        organizationId,
        name: 'SystemAdmin',
      },
    });

    if (!adminRole) {
      throw new Error(`SystemAdmin role not found for organization ${organizationId}`);
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
    const [module, action] = code.split('.');
    return `${module.charAt(0).toUpperCase() + module.slice(1)} ${action.charAt(0).toUpperCase() + action.slice(1)}`;
  }

  /**
   * Helper: Get permission description
   */
  private getPermissionDescription(code: string): string {
    const descriptions: Record<string, string> = {
      // Users module
      'users.read': 'View users in organization',
      'users.create': 'Create new users',
      'users.update': 'Update user information',
      'users.delete': 'Delete users',
      // Contacts module
      'contacts.read': 'View contacts',
      'contacts.write': 'Create and update contacts',
      'contacts.delete': 'Delete contacts',
      // Deals module
      'deals.read': 'View deals',
      'deals.write': 'Create and update deals',
      'deals.delete': 'Delete deals',
      // Leads module
      'leads.read': 'View leads',
      'leads.write': 'Create and update leads',
      'leads.delete': 'Delete leads',
      // Pipelines module
      'pipelines.read': 'View pipelines',
      'pipelines.write': 'Create and update pipelines',
      'pipelines.manage': 'Manage pipeline stages and settings',
      // Analytics module
      'analytics.read': 'View analytics data',
      'analytics.export': 'Export analytics data',
      // RBAC module
      'rbac.read': 'View roles and permissions',
      'rbac.manage': 'Manage roles and permissions',
      // Dashboard module
      'dashboard.read': 'View dashboard',
      // Audit module - ADDED FOR PHASE 6
      'audit.read': 'View audit logs',
    };
    
    return descriptions[code] || `${code} permission`;
  }

  async invalidateAllTokens(userId: string, request?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

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
      event: 'all_tokens_invalidated',
    });

    // Log token invalidation to audit log
    if (request && user) {
      await this.auditLogService.logAuthEvent(
        request,
        AuditAction.TOKEN_REFRESH,
        user.email,
        userId,
        { action: 'invalidate_all_tokens' }
      );
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

  async invalidateOtherSessions(userId: string, keepCurrent: boolean = true, request?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
        ...(keepCurrent ? {} : {
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
    if (request && user) {
      await this.auditLogService.logAuthEvent(
        request,
        AuditAction.TOKEN_REFRESH,
        user.email,
        userId,
        { action: 'invalidate_other_sessions', keepCurrent }
      );
    }

    return { 
      message: keepCurrent 
        ? 'All other sessions have been invalidated' 
        : 'All sessions have been invalidated' 
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

    if (SecurityConfig.refreshToken.hashTokens) {
      return await bcrypt.compare(token, user.refreshTokenHash);
    }

    // Fallback for non-hashed tokens
    return user.refreshTokenHash === token;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string, request?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        lastPasswordChange: new Date(),
        tokenVersion: { increment: 1 }, // Invalidate existing tokens
      },
    });

    // Log password change to audit log
    if (request) {
      await this.auditLogService.logAuthEvent(
        request,
        AuditAction.PASSWORD_CHANGE,
        user.email,
        userId,
        {}
      );
    }

    return { message: 'Password changed successfully' };
  }
}
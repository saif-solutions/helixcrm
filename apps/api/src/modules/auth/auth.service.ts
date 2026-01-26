// File: apps/api/src/modules/auth/auth.service.ts
import { 
  Injectable, 
  UnauthorizedException, 
  ConflictException, 
  BadRequestException, 
  Logger, 
  ForbiddenException 
} from "@nestjs/common";
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
  ) {}

  async validateUser(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if account is locked
    const lockStatus = await this.accountLockoutService.isAccountLocked(email);
    
    if (lockStatus.isLocked) {
      this.logger.warn(`Login attempt for locked account: ${email}`, {
        lockedUntil: lockStatus.lockedUntil,
        event: 'account_locked_login_attempt',
      });
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
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      // Record failed attempt
      await this.accountLockoutService.recordFailedAttempt(user.id);
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

async login(user: any, res: any) {
  try {
    // Get user permissions - ADD THIS
    const { permissions, roles } = await this.getUserPermissions(user.id, user.organizationId);
    
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion,
      type: 'access',
      // ADD PERMISSIONS AND ROLES TO PAYLOAD
      permissions, // permissions array
      roles, // roles array
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
      permissions: permissions.length, // Log permission count
      roles: roles.length, // Log role count
      event: 'user_login',
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        // Optionally include permissions in response (for frontend)
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
    throw error;
  }
}

  async logout(userId: string, res: any) {
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

    return { message: 'Logged out successfully' };
  }

async refreshToken(oldRefreshToken: string, res: any) {
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

      // Get user permissions for the new token - ADD THIS
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

      // New access token WITH PERMISSIONS - UPDATE THIS
      const newAccessToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        tokenVersion: user.tokenVersion + 1,
        type: 'access',
        // ADD PERMISSIONS AND ROLES
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

      return { 
        access_token: newAccessToken,
        user: {
          id: user.id,
          email: user.email,
          organizationId: user.organizationId,
          // Optionally include permissions in response
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
  }) {
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

    this.logger.log(`New user registered: ${user.email}`, {
      userId: user.id,
      organizationId: organization.id,
      event: 'user_registered',
    });

    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
    };
  }

  async invalidateAllTokens(userId: string) {
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

  async invalidateOtherSessions(userId: string, keepCurrent: boolean = true) {
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
}
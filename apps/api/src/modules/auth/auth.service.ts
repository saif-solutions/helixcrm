import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../shared/prisma/prisma.service";
import * as bcrypt from "bcrypt";
import SecurityConfig from "../../config/security.config";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    // Token version validation
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion,
      refreshTokenHash: user.refreshTokenHash,
    };
  }

  async login(user: any, res: any) {
    try {
      const payload = {
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        tokenVersion: user.tokenVersion,
        type: 'access',
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
          refreshTokenVersion: initialVersion, // ← CRITICAL: Store version for replay protection
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
        event: 'user_login',
      });

      return {
        access_token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          organizationId: user.organizationId,
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
        tokenVersion: { increment: 1 }, // Increment to invalidate all tokens
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

        // New refresh token
        const newRefreshToken = this.jwtService.sign(
          { 
            sub: user.id, 
            type: 'refresh',
            version: newVersion, // NEW version
          },
          { 
            expiresIn: SecurityConfig.jwt.refreshTokenExpiry,
            issuer: SecurityConfig.jwt.issuer,
            audience: SecurityConfig.jwt.audience,
          }
        );

        // New access token
        const newAccessToken = this.jwtService.sign({
          sub: user.id,
          email: user.email,
          organizationId: user.organizationId,
          tokenVersion: user.tokenVersion + 1, // Increment
          type: 'access',
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
            refreshTokenVersion: newVersion, // ← CRITICAL: Store new version
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
    // Increment token version to invalidate all existing tokens
    // AND clear refresh token
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
        refreshTokenHash: null,
      },
    });

    this.logger.log(`All tokens invalidated for user ${userId}`, {
      userId,
      event: 'all_tokens_invalidated',
    });
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
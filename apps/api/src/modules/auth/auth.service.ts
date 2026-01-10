import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../shared/prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { getCookieOptions, getRefreshCookieOptions } from "../../shared/auth/cookie.utils";

@Injectable()
export class AuthService {
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
    };
  }

  async login(user: any, res: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = this.jwtService.sign(payload);
    
    // Set httpOnly cookie
    res.cookie('access_token', accessToken, getCookieOptions());
    
    // Also set a refresh token for longer sessions
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );
    
    // Store refresh token in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.cookie('refresh_token', refreshToken, getRefreshCookieOptions());

    // For backward compatibility, ALSO return token in response body
    return {
      access_token: accessToken, // Keep for backward compatibility
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
      },
    };
  }

  async logout(userId: string, res: any) {
    // Clear cookies
    res.clearCookie('access_token', getCookieOptions());
    res.clearCookie('refresh_token', getRefreshCookieOptions());
    
    // Invalidate refresh token in database
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Logged out successfully' };
  }

  async refreshToken(oldRefreshToken: string, res: any) {
    try {
      const payload = this.jwtService.verify(oldRefreshToken);
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { 
          id: payload.sub,
          refreshToken: oldRefreshToken,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const newAccessToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        organizationId: user.organizationId,
        tokenVersion: user.tokenVersion,
      });

      const newRefreshToken = this.jwtService.sign(
        { sub: user.id, type: 'refresh' },
        { expiresIn: '7d' }
      );

      // Update refresh token in database
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
      });

      // Set new cookies
      res.cookie('access_token', newAccessToken, getCookieOptions());
      res.cookie('refresh_token', newRefreshToken, getRefreshCookieOptions());

      return { 
        access_token: newAccessToken, // For backward compatibility
        user: {
          id: user.id,
          email: user.email,
          organizationId: user.organizationId,
        }
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
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
        slug: registerDto.email.split('@')[0].toLowerCase(),
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
      },
    });

    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
    };
  }

  async invalidateToken(userId: string) {
    // Increment token version to invalidate all existing tokens
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
        refreshToken: null,
      },
    });
  }
}

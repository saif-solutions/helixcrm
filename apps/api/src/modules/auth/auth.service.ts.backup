import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../shared/prisma/prisma.service";
import * as bcrypt from "bcrypt";

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

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion, // CRITICAL: Include token version
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
      },
    };
  }

  async register(registerDto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // Validate password strength (basic for MVP)
    if (registerDto.password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters");
    }

    // Create organization first
    const organization = await this.prisma.organization.create({
      data: {
        name: registerDto.organizationName,
        slug: registerDto.organizationName.toLowerCase().replace(/\s+/g, "-"),
      },
    });

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        organizationId: organization.id,
        isActive: true,
        tokenVersion: 1, // Start with version 1
      },
    });

    // Log in the new user
    return this.login({
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion,
    });
  }
}

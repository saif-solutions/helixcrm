import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user in the organization
   */
  async create(
    organizationId: string,
    createUserDto: CreateUserDto,
    createdById: string,
  ) {
    const {
      email,
      password,
      firstName,
      lastName,
      isActive = true,
      role = 'user',
    } = createUserDto;

    // Check if user already exists in this organization
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        organizationId,
      },
    });

    if (existingUser) {
      throw new ConflictException(
        `User with email ${email} already exists in this organization`,
      );
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName,
        lastName,
        isActive,
        role,
        organizationId,
        tokenVersion: 1,
      },
    });

    this.logger.log(
      `User created: ${user.email} in organization ${organizationId}`,
      {
        userId: user.id,
        organizationId,
        createdBy: createdById,
        event: 'user_created',
      },
    );

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find all users in organization with optional filters
   */
  async findAll(organizationId: string, query: UserQueryDto) {
    const { isActive, search, role } = query;

    const where: any = { organizationId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        // Do not include password hash or token versions
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  /**
   * Find a user by ID within organization
   */
  async findOne(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${id} not found in this organization`,
      );
    }

    return user;
  }

  /**
   * Update a user
   */
  async update(
    organizationId: string,
    id: string,
    updateUserDto: UpdateUserDto,
    updatedById: string,
  ) {
    // Verify user exists in organization
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingUser) {
      throw new NotFoundException(
        `User with ID ${id} not found in this organization`,
      );
    }

    // Check if email is being changed and if new email already exists
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailUser = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email.toLowerCase().trim(),
          organizationId,
          NOT: { id },
        },
      });

      if (emailUser) {
        throw new ConflictException(
          `User with email ${updateUserDto.email} already exists`,
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...updateUserDto };

    // Hash new password if provided (should normally go through password reset flow)
    if (updateUserDto.password) {
      const saltRounds = 10;
      updateData.passwordHash = await bcrypt.hash(
        updateUserDto.password,
        saltRounds,
      );
      // Increment token version to invalidate existing tokens
      updateData.tokenVersion = { increment: 1 };
      delete updateData.password; // Remove plain password
    }

    // Normalize email if provided
    if (updateUserDto.email) {
      updateData.email = updateUserDto.email.toLowerCase().trim();
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`User updated: ${updatedUser.email}`, {
      userId: updatedUser.id,
      organizationId,
      updatedBy: updatedById,
      event: 'user_updated',
    });

    // Return without password hash
    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Soft delete a user
   */
  async remove(organizationId: string, id: string, deletedById: string) {
    // Verify user exists in organization
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${id} not found in this organization`,
      );
    }

    // Check if trying to delete yourself
    if (id === deletedById) {
      throw new BadRequestException('Cannot delete your own user account');
    }

    // Soft delete: set deletedAt timestamp
    const deletedUser = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        // Also invalidate all tokens
        tokenVersion: { increment: 1 },
        refreshTokenHash: null,
        refreshTokenVersion: null,
      },
    });

    this.logger.log(`User soft deleted: ${deletedUser.email}`, {
      userId: deletedUser.id,
      organizationId,
      deletedBy: deletedById,
      event: 'user_deleted',
    });

    return {
      message: 'User deleted successfully',
      userId: deletedUser.id,
    };
  }

  /**
   * Get user profile (for /me endpoint)
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import type { User, Prisma } from '@prisma/client';

// ==================== TYPE DEFINITIONS ====================

interface UserWithoutPassword {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  organizationId: string;
  tokenVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ==================== SERVICE IMPLEMENTATION ====================

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private userRepository: UserRepository,
    private tenantContext: TenantContextService,
  ) {}

  /**
   * Remove password hash from user object
   */
  private removePasswordHash(user: User): UserWithoutPassword {
    // Create a plain object copy without the passwordHash property
    const result: UserWithoutPassword = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
    return result;
  }

  /**
   * Remove password hash from array of user objects
   */
  private removePasswordHashFromUsers(users: User[]): UserWithoutPassword[] {
    return users.map((user) => this.removePasswordHash(user));
  }

  /**
   * Create a new user in the current tenant
   */
  async create(
    createUserDto: CreateUserDto,
    createdById?: string,
  ): Promise<UserWithoutPassword> {
    const {
      email,
      password,
      firstName,
      lastName,
      isActive = true,
      role = 'user',
    } = createUserDto;

    // Check if user already exists in current tenant
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException(
        `User with email ${email} already exists in this organization`,
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Get current tenant ID for organization connection
    const organizationId = this.tenantContext.getTenantId();

    // Create user with proper organization connection
    const user = await this.userRepository.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName,
      lastName,
      isActive,
      role,
      tokenVersion: 1,
      organization: {
        connect: {
          id: organizationId,
        },
      },
    });

    // Audit logging
    this.logger.log(`User created successfully`, {
      event: 'user_created',
      newUserId: user.id,
      newUserEmail: user.email,
      createdByUserId: createdById || this.tenantContext.getUserId(),
      organizationId,
    });

    // Return without password hash
    return this.removePasswordHash(user);
  }

  /**
   * Find all users in current tenant
   */
  async findAll(query: UserQueryDto): Promise<UserWithoutPassword[]> {
    const { isActive, search, role } = query;

    // Build where clause with proper typing
    const where: Prisma.UserWhereInput = {};

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

    const users = await this.userRepository.findAll({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Debug logging
    this.logger.debug(`User list fetched`, {
      userCount: users.length,
      requesterId: this.tenantContext.getUserId(),
      organizationId: this.tenantContext.getTenantId(),
    });

    // Remove password hash from all users
    return this.removePasswordHashFromUsers(users);
  }

  /**
   * Find a user by ID within current tenant
   */
  async findOne(id: string): Promise<UserWithoutPassword> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(
        `User with ID ${id} not found in this organization`,
      );
    }

    return this.removePasswordHash(user);
  }

  /**
   * Update user in current tenant
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    updatedById?: string,
  ): Promise<UserWithoutPassword> {
    // Check if user exists in current tenant
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(
        `User with ID ${id} not found in this organization`,
      );
    }

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = {};

    if (updateUserDto.firstName !== undefined) {
      updateData.firstName = updateUserDto.firstName;
    }

    if (updateUserDto.lastName !== undefined) {
      updateData.lastName = updateUserDto.lastName;
    }

    if (updateUserDto.isActive !== undefined) {
      updateData.isActive = updateUserDto.isActive;
    }

    if (updateUserDto.role !== undefined) {
      updateData.role = updateUserDto.role;
    }

    // Update user using repository
    const updatedUser = await this.userRepository.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`User updated`, {
      event: 'user_updated',
      userId: id,
      updatedBy: updatedById || this.tenantContext.getUserId(),
      organizationId: this.tenantContext.getTenantId(),
    });

    return this.removePasswordHash(updatedUser);
  }

  /**
   * Remove user from current tenant
   */
  async remove(id: string, deletedById?: string): Promise<UserWithoutPassword> {
    // Cannot delete yourself
    const currentUserId = this.tenantContext.getUserId();
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    // Check if user exists in current tenant
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(
        `User with ID ${id} not found in this organization`,
      );
    }

    // Delete user using repository
    const deletedUser = await this.userRepository.delete({ id });

    this.logger.log(`User deleted`, {
      event: 'user_deleted',
      userId: id,
      deletedBy: deletedById || currentUserId,
      organizationId: this.tenantContext.getTenantId(),
    });

    return this.removePasswordHash(deletedUser);
  }

  /**
   * Get current user's profile
   */
  async getProfile(userId: string): Promise<UserWithoutPassword> {
    // User can always view their own profile
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.removePasswordHash(user);
  }

  /**
   * Soft delete user (archive)
   */
  async archive(
    id: string,
    archivedById?: string,
  ): Promise<UserWithoutPassword> {
    const currentUserId = this.tenantContext.getUserId();

    if (id === currentUserId) {
      throw new ForbiddenException('Cannot archive your own account');
    }

    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const archivedUser = await this.userRepository.softDelete(id);

    this.logger.log(`User archived`, {
      event: 'user_archived',
      userId: id,
      archivedBy: archivedById || currentUserId,
      organizationId: this.tenantContext.getTenantId(),
    });

    return this.removePasswordHash(archivedUser);
  }

  /**
   * Search users in current tenant
   */
  async search(searchTerm: string): Promise<UserWithoutPassword[]> {
    const users = await this.userRepository.findAll({
      where: {
        OR: [
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });

    return this.removePasswordHashFromUsers(users);
  }
}

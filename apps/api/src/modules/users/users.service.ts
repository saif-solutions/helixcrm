import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private userRepository: UserRepository,
    private tenantContext: TenantContextService, // ✅ Keep only tenant context
  ) {}

  /**
   * Create a new user in the current tenant
   */
  async create(createUserDto: CreateUserDto, createdById?: string) {
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
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

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

    // AUDIT LOGGING - use tenantContext.getUserId() instead
    this.logger.log(`User created successfully`, {
      event: 'user_created',
      newUserId: user.id,
      newUserEmail: user.email,
      createdByUserId: createdById || this.tenantContext.getUserId(), // ✅ FIXED
      organizationId,
    });

    // Return without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find all users in current tenant
   */
  async findAll(query: UserQueryDto) {
    const { isActive, search, role } = query;
    const where: any = {};

    if (isActive !== undefined) where.isActive = isActive;
    if (role) where.role = role;
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

    // Remove password hash from all users
    const usersWithoutPasswords = users.map(
      ({ passwordHash: _, ...user }) => user,
    );

    // DEBUG LOGGING - use tenantContext.getUserId() instead
    this.logger.debug(`User list fetched`, {
      userCount: users.length,
      requesterId: this.tenantContext.getUserId(), // ✅ FIXED
      organizationId: this.tenantContext.getTenantId(),
    });

    return usersWithoutPasswords;
  }

  /**
   * Find a user by ID within current tenant
   */
  async findOne(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(
        `User with ID ${id} not found in this organization`,
      );
    }

    // Remove password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user in current tenant
   */
  async update(id: string, updateUserDto: UpdateUserDto, updatedById?: string) {
    // Check if user exists in current tenant
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(
        `User with ID ${id} not found in this organization`,
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (updateUserDto.firstName !== undefined)
      updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined)
      updateData.lastName = updateUserDto.lastName;
    if (updateUserDto.isActive !== undefined)
      updateData.isActive = updateUserDto.isActive;
    if (updateUserDto.role !== undefined) updateData.role = updateUserDto.role;

    // Update user using repository
    const updatedUser = await this.userRepository.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`User updated`, {
      event: 'user_updated',
      userId: id,
      updatedBy: updatedById || this.tenantContext.getUserId(), // ✅ FIXED
      organizationId: this.tenantContext.getTenantId(),
    });

    // Remove password hash
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Remove user from current tenant
   */
  async remove(id: string, deletedById?: string) {
    // Cannot delete yourself
    const currentUserId = this.tenantContext.getUserId(); // ✅ FIXED
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

    // Remove password hash
    const { passwordHash: _, ...userWithoutPassword } = deletedUser;
    return userWithoutPassword;
  }

  /**
   * Get current user's profile
   */
  async getProfile(userId: string) {
    // User can always view their own profile
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Soft delete user (archive)
   */
  async archive(id: string, archivedById?: string) {
    const currentUserId = this.tenantContext.getUserId(); // ✅ FIXED
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot archive your own account');
    }

    const archivedUser = await this.userRepository.softDelete(id);

    this.logger.log(`User archived`, {
      event: 'user_archived',
      userId: id,
      archivedBy: archivedById || currentUserId,
      organizationId: this.tenantContext.getTenantId(),
    });

    // Remove password hash
    const { passwordHash: _, ...userWithoutPassword } = archivedUser;
    return userWithoutPassword;
  }

  /**
   * Search users in current tenant
   */
  async search(searchTerm: string) {
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

    // Remove password hash from all users
    return users.map(({ passwordHash: _, ...user }) => user);
  }
}
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
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { UserRepository } from './repositories/user.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private userRepository: UserRepository,
    private permissionContext: PermissionContextService,
    private tenantContext: TenantContextService,
  ) {}

  /**
   * Create a new user in the current tenant
   * DEMONSTRATES: Using repository pattern with automatic tenant filtering
   */
  /**
   * Create a new user in the current tenant
   */
  async create(createUserDto: CreateUserDto, createdById?: string) {
    // PERMISSION CHECK: Using the pre-computed permission context
    if (!this.permissionContext.hasPermission('user:create')) {
      this.logger.warn(
        `Permission denied: User ${this.permissionContext.getUserId()} lacks user:create permission`,
      );
      throw new ForbiddenException('Insufficient permissions to create users');
    }

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

    // ROLE ASSIGNMENT CHECK: Using permission context
    if (
      role === 'admin' &&
      !this.permissionContext.hasPermission('user:assign_admin')
    ) {
      this.logger.warn(`Permission denied: Cannot assign admin role`);
      throw new ForbiddenException('Cannot assign admin role');
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

    // AUDIT LOGGING
    this.logger.log(`User created successfully`, {
      event: 'user_created',
      newUserId: user.id,
      newUserEmail: user.email,
      createdByUserId: createdById || this.permissionContext.getUserId(),
      organizationId,
    });

    // Return without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find all users in current tenant
   * DEMONSTRATES: Simple permission check with context
   */
  async findAll(query: UserQueryDto) {
    // SINGLE PERMISSION CHECK: No DB recomputation needed
    if (!this.permissionContext.hasPermission('user:read')) {
      throw new ForbiddenException('Insufficient permissions to view users');
    }

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

    // DEBUG LOGGING: Show permission context in action
    this.logger.debug(`User list fetched`, {
      userCount: users.length,
      requesterId: this.permissionContext.getUserId(),
      organizationId: this.tenantContext.getTenantId(),
    });

    return usersWithoutPasswords;
  }

  /**
   * Find a user by ID within current tenant
   * DEMONSTRATES: Multiple permission checks with context
   */
  async findOne(id: string) {
    // MULTIPLE PERMISSION OPTIONS: Check different permission combinations
    const canViewAll = this.permissionContext.hasPermission('user:read_all');
    const canViewOwn = this.permissionContext.hasPermission('user:read_own');

    if (!canViewAll && !canViewOwn) {
      throw new ForbiddenException(
        'Insufficient permissions to view user details',
      );
    }

    // If can only view own, check if this is their own ID
    const currentUserId = this.permissionContext.getUserId();
    if (!canViewAll && canViewOwn && id !== currentUserId) {
      throw new ForbiddenException('Can only view your own user details');
    }

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
  /**
   * Update user in current tenant
   */
  async update(id: string, updateUserDto: UpdateUserDto, updatedById?: string) {
    // PERMISSION CHECK
    const canUpdateAll =
      this.permissionContext.hasPermission('user:update_all');
    const canUpdateOwn =
      this.permissionContext.hasPermission('user:update_own');

    if (!canUpdateAll && !canUpdateOwn) {
      throw new ForbiddenException('Insufficient permissions to update users');
    }

    // If can only update own, check if this is their own ID
    const currentUserId = this.permissionContext.getUserId();
    if (!canUpdateAll && canUpdateOwn && id !== currentUserId) {
      throw new ForbiddenException('Can only update your own user details');
    }

    // Check if user exists in current tenant
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(
        `User with ID ${id} not found in this organization`,
      );
    }

    // ROLE ASSIGNMENT CHECK
    if (
      updateUserDto.role === 'admin' &&
      !this.permissionContext.hasPermission('user:assign_admin')
    ) {
      throw new ForbiddenException('Cannot assign admin role');
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
    // Note: emailVerified was removed since it's not in UpdateUserDto

    // Update user using repository
    const updatedUser = await this.userRepository.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`User updated`, {
      event: 'user_updated',
      userId: id,
      updatedBy: updatedById || currentUserId,
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
    // PERMISSION CHECK
    if (!this.permissionContext.hasPermission('user:delete')) {
      throw new ForbiddenException('Insufficient permissions to delete users');
    }

    // Cannot delete yourself
    const currentUserId = this.permissionContext.getUserId();
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
    if (!this.permissionContext.hasPermission('user:delete')) {
      throw new ForbiddenException('Insufficient permissions to archive users');
    }

    const currentUserId = this.permissionContext.getUserId();
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
    if (!this.permissionContext.hasPermission('user:read')) {
      throw new ForbiddenException('Insufficient permissions to search users');
    }

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

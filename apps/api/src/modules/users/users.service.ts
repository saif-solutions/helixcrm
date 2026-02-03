import { 
  Injectable, 
  NotFoundException, 
  ConflictException, 
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import * as bcrypt from 'bcrypt';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private permissionContext: PermissionContextService,
  ) {}

  /**
   * Create a new user in the organization
   * DEMONSTRATES: Using permission context instead of recomputing permissions
   */
  async create(organizationId: string, createUserDto: CreateUserDto, createdById: string) {
    // PERMISSION CHECK: Using the pre-computed permission context
    if (!this.permissionContext.hasPermission('user:create')) {
      this.logger.warn(`Permission denied: User ${this.permissionContext.getUserId()} lacks user:create permission`);
      throw new ForbiddenException('Insufficient permissions to create users');
    }

    // SECURITY CHECK: Verify organization matches
    if (organizationId !== this.permissionContext.getTenantId()) {
      this.logger.warn(`Security violation: User attempted cross-tenant operation`);
      throw new ForbiddenException('Cannot create user in different organization');
    }

    const { email, password, firstName, lastName, isActive = true, role = 'user' } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        organizationId,
      },
    });

    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists in this organization`);
    }

    // ROLE ASSIGNMENT CHECK: Using permission context
    if (role === 'admin' && !this.permissionContext.hasPermission('user:assign_admin')) {
      this.logger.warn(`Permission denied: Cannot assign admin role`);
      throw new ForbiddenException('Cannot assign admin role');
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

    // AUDIT LOGGING: With permission context info
    this.logger.log(`User created successfully`, {
      event: 'user_created',
      newUserId: user.id,
      newUserEmail: user.email,
      createdByUserId: this.permissionContext.getUserId(),
      createdByPermissions: this.permissionContext.getPermissions(),
      permissionSource: this.permissionContext.getSource(),
      organizationId,
    });

    // Return without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find all users in organization
   * DEMONSTRATES: Simple permission check with context
   */
  async findAll(organizationId: string, query: UserQueryDto) {
    // SINGLE PERMISSION CHECK: No DB recomputation needed
    if (!this.permissionContext.hasPermission('user:read')) {
      throw new ForbiddenException('Insufficient permissions to view users');
    }

    // TENANT ISOLATION: Using context
    if (organizationId !== this.permissionContext.getTenantId()) {
      throw new ForbiddenException('Cannot access users in different organization');
    }

    const { isActive, search, role } = query;
    const where: any = { organizationId };

    if (isActive !== undefined) where.isActive = isActive;
    if (role) where.role = role;
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
      },
      orderBy: { createdAt: 'desc' },
    });

    // DEBUG LOGGING: Show permission context in action
    this.logger.debug(`User list fetched`, {
      userCount: users.length,
      requesterId: this.permissionContext.getUserId(),
      permissionCheckType: 'context_snapshot',
      permissionSource: this.permissionContext.getSource(),
    });

    return users;
  }

  /**
   * Find a user by ID within organization
   * DEMONSTRATES: Multiple permission checks with context
   */
  async findOne(organizationId: string, id: string) {
    // MULTIPLE PERMISSION OPTIONS: Check different permission combinations
    const canViewAll = this.permissionContext.hasPermission('user:read_all');
    const canViewOwn = this.permissionContext.hasPermission('user:read_own');
    
    if (!canViewAll && !canViewOwn) {
      throw new ForbiddenException('Insufficient permissions to view user details');
    }

    // If can only view own, check if this is their own ID
    if (!canViewAll && canViewOwn && id !== this.permissionContext.getUserId()) {
      throw new ForbiddenException('Can only view your own user details');
    }

    // TENANT CHECK
    if (organizationId !== this.permissionContext.getTenantId()) {
      throw new ForbiddenException('Cannot access user in different organization');
    }

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
      throw new NotFoundException(`User with ID ${id} not found in this organization`);
    }

    return user;
  }

  // KEEP ORIGINAL IMPLEMENTATION FOR OTHER METHODS (for now)
  async update(organizationId: string, id: string, updateUserDto: UpdateUserDto, updatedById: string) {
    // TODO: Update to use permission context
    return this.updateWithOldLogic(organizationId, id, updateUserDto, updatedById);
  }

  async remove(organizationId: string, id: string, deletedById: string) {
    // TODO: Update to use permission context
    return this.removeWithOldLogic(organizationId, id, deletedById);
  }

  async getProfile(userId: string) {
    // TODO: Update to use permission context
    return this.getProfileWithOldLogic(userId);
  }

  // Private methods that maintain old logic for now
  private async updateWithOldLogic(organizationId: string, id: string, updateUserDto: UpdateUserDto, updatedById: string) {
    // Keep original implementation from backup
    const originalService = await import('./users.service.old');
    // This is temporary - we'll replace it
    throw new Error('Not yet implemented with permission context');
  }

  private async removeWithOldLogic(organizationId: string, id: string, deletedById: string) {
    throw new Error('Not yet implemented with permission context');
  }

  private async getProfileWithOldLogic(userId: string) {
    throw new Error('Not yet implemented with permission context');
  }
}

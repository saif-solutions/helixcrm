// apps/api/src/modules/users/repositories/user.repository.ts
import { Injectable, Logger } from '@nestjs/common'; // ✅ ADD Logger
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { User, Prisma } from '@prisma/client';
import { PermissionContextService } from '../../../shared/permissions/context/permission-context.service'; // ✅ ADD THIS

@Injectable()
export class UserRepository extends TenantAwareRepository {
  private readonly logger = new Logger(UserRepository.name); // ✅ ADD Logger

  constructor(
    prisma: PrismaService,
    private readonly permissionContext: PermissionContextService, // ✅ ADD THIS
  ) {
    super(prisma);
  }

  /**
   * Find user by ID within current tenant
   */
  async findById(id: string): Promise<User | null> {
    // ✅ Force PermissionGuard to initialize
    if (!this.permissionContext.isInitialized()) {
      this.logger.debug('Permission context not initialized in findById - this should trigger PermissionGuard');
    }
    
    return this.prisma.user.findFirst({
      where: this.withTenantFilter({ id }),
    });
  }

  /**
   * Find user by email within current tenant
   */
  async findByEmail(email: string): Promise<User | null> {
    // ✅ Force PermissionGuard to initialize
    if (!this.permissionContext.isInitialized()) {
      this.logger.debug('Permission context not initialized in findByEmail - this should trigger PermissionGuard');
    }
    
    return this.prisma.user.findFirst({
      where: this.withTenantFilter({ email }),
    });
  }

  /**
   * Find all users in current tenant with pagination
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, where, orderBy } = params;

    // ✅ Force PermissionGuard to initialize
    if (!this.permissionContext.isInitialized()) {
      this.logger.debug('Permission context not initialized in findAll - this should trigger PermissionGuard');
    }

    return this.prisma.user.findMany({
      skip,
      take,
      where: this.withTenantFilter(where),
      orderBy,
    });
  }

  /**
   * Count users in current tenant
   */
  async count(where?: Prisma.UserWhereInput): Promise<number> {
    // ✅ Force PermissionGuard to initialize
    if (!this.permissionContext.isInitialized()) {
      this.logger.debug('Permission context not initialized in count - this should trigger PermissionGuard');
    }
    
    return this.prisma.user.count({
      where: this.withTenantFilter(where),
    });
  }

  /**
   * Create user in current tenant
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    // ✅ Force PermissionGuard to initialize
    if (!this.permissionContext.isInitialized()) {
      this.logger.debug('Permission context not initialized in create - this should trigger PermissionGuard');
    }
    
    // Manually add tenant ID to the data for Prisma's complex types
    const tenantId = this.tenantId;
    const tenantData = {
      ...data,
      organization: {
        connect: {
          id: tenantId,
        },
      },
    };

    return this.prisma.user.create({
      data: tenantData,
    });
  }

  /**
   * Update user in current tenant
   */
  async update(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    // ✅ Force PermissionGuard to initialize
    if (!this.permissionContext.isInitialized()) {
      this.logger.debug('Permission context not initialized in update - this should trigger PermissionGuard');
    }
    
    const { where, data } = params;

    // First verify the user belongs to current tenant
    const existingUser = await this.findById(where.id as string);
    if (!existingUser) {
      throw new Error('User not found or does not belong to current tenant');
    }

    // Manually add tenant filter to where clause for Prisma's complex types
    const tenantWhere = {
      ...where,
      organizationId: this.tenantId,
    };

    return this.prisma.user.update({
      where: tenantWhere,
      data,
    });
  }

  /**
   * Delete user in current tenant
   */
  async delete(where: Prisma.UserWhereUniqueInput): Promise<User> {
    // ✅ Force PermissionGuard to initialize
    if (!this.permissionContext.isInitialized()) {
      this.logger.debug('Permission context not initialized in delete - this should trigger PermissionGuard');
    }
    
    // First verify the user belongs to current tenant
    const existingUser = await this.findById(where.id as string);
    if (!existingUser) {
      throw new Error('User not found or does not belong to current tenant');
    }

    // Manually add tenant filter for Prisma's complex types
    const tenantWhere = {
      ...where,
      organizationId: this.tenantId,
    };

    return this.prisma.user.delete({
      where: tenantWhere,
    });
  }

  /**
   * Soft delete user in current tenant
   */
  async softDelete(id: string): Promise<User> {
    // ✅ Force PermissionGuard to initialize
    if (!this.permissionContext.isInitialized()) {
      this.logger.debug('Permission context not initialized in softDelete - this should trigger PermissionGuard');
    }
    
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new Error('User not found or does not belong to current tenant');
    }

    // Manually add tenant filter for Prisma's complex types
    const tenantWhere = {
      id,
      organizationId: this.tenantId,
    };

    return this.prisma.user.update({
      where: tenantWhere,
      data: { deletedAt: new Date() },
    });
  }
}
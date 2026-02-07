// apps/api/src/modules/users/repositories/user.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UserRepository extends TenantAwareRepository {
  // Remove "private" from constructor parameter
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Find user by ID within current tenant
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: this.withTenantFilter({ id }),
    });
  }

  /**
   * Find user by email within current tenant
   */
  async findByEmail(email: string): Promise<User | null> {
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
    return this.prisma.user.count({
      where: this.withTenantFilter(where),
    });
  }

  /**
   * Create user in current tenant
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
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
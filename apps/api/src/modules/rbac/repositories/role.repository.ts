// src/modules/rbac/repositories/role.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleQueryDto } from '../dto/role-query.dto';

@Injectable()
export class RoleRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: RoleQueryDto) {
    const { isSystem, search, includeUserCount } = query;
    const where: any = { organizationId: this.tenantId };

    if (isSystem !== undefined) where.isSystem = isSystem;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    return this.prisma.role.findMany({
      where,
      include: {
        _count: includeUserCount ? { select: { userRoles: true } } : false,
        permissions: { include: { permission: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.role.findFirst({
      where: { id, organizationId: this.tenantId },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });
  }

  async findSystemRole(id: string) {
    return this.prisma.role.findFirst({
      where: { id, isSystem: true },
    });
  }

  async create(data: CreateRoleDto, organizationId: string) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: data.isSystem || false,
        organizationId,
      },
    });
  }

  async update(id: string, data: UpdateRoleDto) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.isSystem !== undefined) updateData.isSystem = data.isSystem;

    return this.prisma.role.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    return this.prisma.role.delete({
      where: { id },
    });
  }

  async findByName(name: string, excludeId?: string) {
    const where: any = {
      name: { equals: name, mode: 'insensitive' },
      organizationId: this.tenantId,
    };
    if (excludeId) where.id = { not: excludeId };

    return this.prisma.role.findFirst({ where });
  }

  async checkUserCount(roleId: string) {
    return this.prisma.userRole.count({
      where: { roleId },
    });
  }

  async assignPermissions(roleId: string, permissionIds: string[]) {
    // Remove existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Add new permissions if any
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }
  }

  async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || `user-${userId}@unknown.example.com`;
    } catch (error) {
      console.warn(
        `Failed to fetch email for user ${userId}: ${error.message}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }

  async findUserInTenant(userId: string, tenantId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, organizationId: tenantId },
    });
  }
}

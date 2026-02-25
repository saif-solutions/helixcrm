// src/modules/rbac/repositories/user-role.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';

@Injectable()
export class UserRoleRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async assignRole(userId: string, roleId: string, organizationId: string) {
    return this.prisma.userRole.create({
      data: {
        userId,
        roleId,
        organizationId,
      },
    });
  }

  async removeAssignment(userId: string, roleId: string) {
    const assignment = await this.prisma.userRole.findFirst({
      where: { userId, roleId },
    });

    if (!assignment) return null;

    return this.prisma.userRole.delete({
      where: { id: assignment.id },
    });
  }

  async findAssignment(userId: string, roleId: string) {
    return this.prisma.userRole.findFirst({
      where: { userId, roleId },
      include: { role: true },
    });
  }

  async getUserRoles(userId: string) {
    return this.prisma.userRole.findMany({
      where: {
        userId,
        role: { organizationId: this.tenantId },
      },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
  }

  async countAdminRoles(organizationId: string) {
    return this.prisma.userRole.count({
      where: {
        role: {
          name: 'Admin',
          organizationId,
        },
      },
    });
  }
}

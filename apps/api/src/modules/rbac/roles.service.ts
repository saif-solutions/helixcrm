import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RemoveRoleDto } from './dto/remove-role.dto';
import { RoleQueryDto } from './dto/role-query.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(organizationId: string, query: RoleQueryDto) {
    const { isSystem, search, includeUserCount } = query;

    const where: any = { organizationId };

    if (isSystem !== undefined) {
      where.isSystem = isSystem;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const roles = await this.prisma.role.findMany({
      where,
      include: {
        _count: includeUserCount ? {
          select: { userRoles: true },
        } : false,
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return roles.map((role) => ({
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    }));
  }

  async findOne(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  async create(organizationId: string, createRoleDto: CreateRoleDto, userId: string) {
    const { name, description, permissions = [], isSystem = false } = createRoleDto;

    // Check if role name already exists in organization
    const existingRole = await this.prisma.role.findFirst({
      where: {
        organizationId,
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existingRole) {
      throw new ConflictException(`Role with name "${name}" already exists in this organization`);
    }

    // Get permission IDs
    const permissionRecords = await this.prisma.permission.findMany({
      where: { code: { in: permissions } },
    });

    if (permissionRecords.length !== permissions.length) {
      const foundCodes = permissionRecords.map((p) => p.code);
      const missingCodes = permissions.filter((code) => !foundCodes.includes(code));
      throw new NotFoundException(`Permissions not found: ${missingCodes.join(', ')}`);
    }

    const role = await this.prisma.$transaction(async (tx) => {
      // Create role
      const newRole = await tx.role.create({
        data: {
          name,
          description,
          isSystem,
          organizationId,
        },
      });

      // Create role-permission associations
      if (permissionRecords.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionRecords.map((permission) => ({
            roleId: newRole.id,
            permissionId: permission.id,
          })),
        });
      }

      return newRole;
    });

    // Audit logging
await this.auditLogService.logEvent({
  action: 'ROLE_CREATED',
  entity: 'Role',
  entityId: role.id,
  organizationId,
  userId,
  metadata: {  // Changed from details to metadata
    name: role.name,
    isSystem: role.isSystem,
    permissions,
  },
});

    return role;
  }

  async update(
    organizationId: string,
    id: string,
    updateRoleDto: UpdateRoleDto,
    userId: string,
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Check if trying to update system role
    if (role.isSystem && updateRoleDto.isSystem === false) {
      throw new ForbiddenException('Cannot modify system role properties');
    }

    const { name, description, permissions, ...rest } = updateRoleDto;

    // Check if new name already exists (if provided)
    if (name && name !== role.name) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          organizationId,
          name: { equals: name, mode: 'insensitive' },
          NOT: { id },
        },
      });

      if (existingRole) {
        throw new ConflictException(`Role with name "${name}" already exists`);
      }
    }

    const updateData: any = { ...rest };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const updatedRole = await this.prisma.$transaction(async (tx) => {
      // Update role
      const roleUpdate = await tx.role.update({
        where: { id: role.id },
        data: updateData,
      });

      // Update permissions if provided
      if (permissions !== undefined) {
        // Remove existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: role.id },
        });

        // Add new permissions
        const permissionRecords = await tx.permission.findMany({
          where: { code: { in: permissions } },
        });

        if (permissionRecords.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionRecords.map((permission) => ({
              roleId: role.id,
              permissionId: permission.id,
            })),
          });
        }
      }

      return roleUpdate;
    });

    // Audit logging
await this.auditLogService.logEvent({
  action: 'ROLE_UPDATED',
  entity: 'Role',
  entityId: updatedRole.id,
  organizationId,
  userId,
  metadata: {  // Changed from details to metadata
    oldName: role.name,
    newName: updatedRole.name,
    updatedFields: Object.keys(updateData),
    permissions,
  },
});

    return updatedRole;
  }

  async remove(organizationId: string, id: string, userId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Check if system role
    if (role.isSystem) {
      throw new ForbiddenException('Cannot delete system role');
    }

    // Check if role has assigned users
    if (role._count.userRoles > 0) {
      throw new ConflictException(
        `Cannot delete role with ${role._count.userRoles} assigned users. Remove users first.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Remove role permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      // Delete role
      await tx.role.delete({
        where: { id: role.id },
      });
    });

    // Audit logging
await this.auditLogService.logEvent({
  action: 'ROLE_DELETED',
  entity: 'Role',
  entityId: role.id,
  organizationId,
  userId,
  metadata: {  // Changed from details to metadata
    name: role.name,
  },
});

    return { message: 'Role deleted successfully' };
  }

  async assignRole(organizationId: string, assignRoleDto: AssignRoleDto, userId: string) {
    const { roleId, userId: targetUserId } = assignRoleDto;

    // Verify user exists in organization
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, organizationId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${targetUserId} not found in organization`);
    }

    // Verify role exists in organization
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Check if already assigned
    const existingAssignment = await this.prisma.userRole.findFirst({
      where: {
        userId: targetUserId,
        roleId,
      },
    });

    if (existingAssignment) {
      throw new ConflictException('Role already assigned to user');
    }

    const userRole = await this.prisma.userRole.create({
      data: {
        userId: targetUserId,
        roleId,
        organizationId,
      },
    });

    // Audit logging
await this.auditLogService.logEvent({
  action: 'ROLE_ASSIGNED',
  entity: 'UserRole',
  entityId: userRole.id,
  organizationId,
  userId,
  metadata: {  // Changed from details to metadata
    targetUserId,
    roleId,
    roleName: role.name,
  },
});

    return userRole;
  }

  async removeRole(organizationId: string, removeRoleDto: RemoveRoleDto, userId: string) {
    const { roleId, userId: targetUserId } = removeRoleDto;

    // Verify assignment exists
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId: targetUserId,
        roleId,
      },
      include: {
        role: true,
      },
    });

    if (!userRole) {
      throw new NotFoundException('Role assignment not found');
    }

    // Check if this is the last admin role
    if (userRole.role.name === 'Admin') {
      const adminCount = await this.prisma.userRole.count({
        where: {
          role: {
            name: 'Admin',
            organizationId,
          },
        },
      });

      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot remove last admin role from organization');
      }
    }

    await this.prisma.userRole.delete({
      where: { id: userRole.id },
    });

    // Audit logging
await this.auditLogService.logEvent({
  action: 'ROLE_REMOVED',
  entity: 'UserRole',
  entityId: userRole.id,
  organizationId,
  userId,
  metadata: {  // Changed from details to metadata
    targetUserId,
    roleId,
    roleName: userRole.role.name,
  },
});


    return { message: 'Role removed successfully' };
  }

  async getUserRoles(organizationId: string, userId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        role: {
          organizationId,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return userRoles.map((ur) => ({
      ...ur.role,
      permissions: ur.role.permissions.map((rp) => rp.permission),
      assignmentId: ur.id,
      assignedAt: ur.createdAt,
    }));
  }
}
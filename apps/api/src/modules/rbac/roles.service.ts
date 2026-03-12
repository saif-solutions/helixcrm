// src/modules/rbac/roles.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  AuditLogService,
  AuditAction,
  AuditEntityType,
} from '../../shared/audit-log/audit-log.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RemoveRoleDto } from './dto/remove-role.dto';
import { RoleQueryDto } from './dto/role-query.dto';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import type {
  Role,
  Permission,
  UserRole as UserRoleType,
} from '@prisma/client';

// ==================== TYPE DEFINITIONS ====================

interface RoleWithPermissions extends Role {
  permissions: Array<{
    permission: Permission;
  }>;
}

interface UserRoleWithRole extends UserRoleType {
  role: RoleWithPermissions;
}

interface UpdateRoleData {
  name?: string;
  description?: string | null;
  isSystem?: boolean;
}

// ==================== SERVICE IMPLEMENTATION ====================

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly auditLogService: AuditLogService,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
  ) {}

  private async getUserEmail(userId: string): Promise<string> {
    try {
      return await this.roleRepository.getUserEmail(userId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to fetch email for user ${userId}: ${errorMessage}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }

  private handleError(
    error: unknown,
    context: string,
    metadata: Record<string, any>,
  ): never {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      `${context} failed: ${errorMessage}`,
      errorStack,
      metadata,
    );

    if (
      error instanceof NotFoundException ||
      error instanceof ConflictException ||
      error instanceof ForbiddenException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    throw new BadRequestException(`Failed to ${context}`);
  }

  async findAll(query: RoleQueryDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const roles = await this.roleRepository.findAll(query);

      return roles.map((role: RoleWithPermissions) => ({
        ...role,
        permissions: role.permissions.map((rp) => rp.permission),
      }));
    } catch (error) {
      this.handleError(error, 'fetch roles', {
        tenantId,
        userId,
        query,
      });
    }
  }

  async findOne(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const role = (await this.roleRepository.findById(
        id,
      )) as RoleWithPermissions | null;

      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      return {
        ...role,
        permissions: role.permissions.map((rp) => rp.permission),
      };
    } catch (error) {
      this.handleError(error, 'fetch role', {
        tenantId,
        userId,
        roleId: id,
      });
    }
  }

  async create(createRoleDto: CreateRoleDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const actorEmail = await this.getUserEmail(userId);

    try {
      const {
        name,
        description,
        permissions = [],
        isSystem = false,
      } = createRoleDto;

      const existingRole = await this.roleRepository.findByName(name);
      if (existingRole) {
        throw new ConflictException(
          `Role with name "${name}" already exists in this organization`,
        );
      }

      const permissionRecords =
        await this.permissionRepository.findByCodes(permissions);
      if (permissionRecords.length !== permissions.length) {
        const foundCodes = permissionRecords.map((p) => p.code);
        const missingCodes = permissions.filter(
          (code) => !foundCodes.includes(code),
        );
        throw new NotFoundException(
          `Permissions not found: ${missingCodes.join(', ')}`,
        );
      }

      const role = await this.roleRepository.create(
        { name, description, isSystem, permissions },
        tenantId,
      );

      if (permissionRecords.length > 0) {
        const permissionIds = permissionRecords.map((p) => p.id);
        await this.roleRepository.assignPermissions(role.id, permissionIds);
      }

      await this.auditLogService.logEvent({
        action: AuditAction.ROLE_CREATED,
        entityId: role.id,
        entityType: AuditEntityType.SYSTEM,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          name: role.name,
          isSystem: role.isSystem,
          permissions,
        },
      });

      return role;
    } catch (error) {
      this.handleError(error, 'create role', {
        tenantId,
        userId,
        data: createRoleDto,
      });
    }
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const actorEmail = await this.getUserEmail(userId);

    try {
      const role = (await this.roleRepository.findById(
        id,
      )) as RoleWithPermissions | null;
      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      if (role.isSystem && updateRoleDto.isSystem === false) {
        throw new ForbiddenException('Cannot modify system role properties');
      }

      const { name, description, permissions } = updateRoleDto;

      if (name && name !== role.name) {
        const existingRole = await this.roleRepository.findByName(name, id);
        if (existingRole) {
          throw new ConflictException(
            `Role with name "${name}" already exists`,
          );
        }
      }

      const updateData: UpdateRoleData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      const updatedRole = await this.roleRepository.update(id, updateData);

      if (permissions !== undefined) {
        const permissionRecords =
          await this.permissionRepository.findByCodes(permissions);
        const permissionIds = permissionRecords.map((p) => p.id);
        await this.roleRepository.assignPermissions(id, permissionIds);
      }

      await this.auditLogService.logEvent({
        action: AuditAction.ROLE_UPDATED,
        entityId: updatedRole.id,
        entityType: AuditEntityType.SYSTEM,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          oldName: role.name,
          newName: updatedRole.name,
          updatedFields: Object.keys(updateData),
          permissions,
        },
      });

      return updatedRole;
    } catch (error) {
      this.handleError(error, 'update role', {
        tenantId,
        userId,
        roleId: id,
        data: updateRoleDto,
      });
    }
  }

  async remove(id: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const actorEmail = await this.getUserEmail(userId);

    try {
      const role = (await this.roleRepository.findById(
        id,
      )) as RoleWithPermissions | null;
      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      if (role.isSystem) {
        throw new ForbiddenException('Cannot delete system role');
      }

      const userCount = await this.roleRepository.checkUserCount(id);
      if (userCount > 0) {
        throw new ConflictException(
          `Cannot delete role with ${userCount} assigned users. Remove users first.`,
        );
      }

      await this.roleRepository.delete(id);

      await this.auditLogService.logEvent({
        action: AuditAction.ROLE_DELETED,
        entityId: role.id,
        entityType: AuditEntityType.SYSTEM,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          name: role.name,
        },
      });

      return { message: 'Role deleted successfully' };
    } catch (error) {
      this.handleError(error, 'delete role', {
        tenantId,
        userId,
        roleId: id,
      });
    }
  }

  async assignRole(assignRoleDto: AssignRoleDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const actorEmail = await this.getUserEmail(userId);

    try {
      const { roleId, userId: targetUserId } = assignRoleDto;

      const user = await this.roleRepository.findUserInTenant(
        targetUserId,
        tenantId,
      );
      if (!user) {
        throw new NotFoundException(
          `User with ID ${targetUserId} not found in organization`,
        );
      }

      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        throw new NotFoundException(`Role with ID ${roleId} not found`);
      }

      const existingAssignment = await this.userRoleRepository.findAssignment(
        targetUserId,
        roleId,
      );
      if (existingAssignment) {
        throw new ConflictException('Role already assigned to user');
      }

      const userRole = await this.userRoleRepository.assignRole(
        targetUserId,
        roleId,
        tenantId,
      );

      await this.auditLogService.logEvent({
        action: AuditAction.ROLE_ASSIGNED,
        entityId: userRole.id,
        entityType: AuditEntityType.USER,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          targetUserId,
          roleId,
          roleName: role.name,
        },
      });

      return userRole;
    } catch (error) {
      this.handleError(error, 'assign role', {
        tenantId,
        userId,
        data: assignRoleDto,
      });
    }
  }

  async removeRole(removeRoleDto: RemoveRoleDto) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const actorEmail = await this.getUserEmail(userId);

    try {
      const { roleId, userId: targetUserId } = removeRoleDto;

      const assignment = (await this.userRoleRepository.findAssignment(
        targetUserId,
        roleId,
      )) as UserRoleWithRole | null;

      if (!assignment) {
        throw new NotFoundException('Role assignment not found');
      }

      if (assignment.role.name === 'Admin') {
        const adminCount =
          await this.userRoleRepository.countAdminRoles(tenantId);
        if (adminCount <= 1) {
          throw new ForbiddenException(
            'Cannot remove last admin role from organization',
          );
        }
      }

      await this.userRoleRepository.removeAssignment(targetUserId, roleId);

      await this.auditLogService.logEvent({
        action: AuditAction.ROLE_REMOVED,
        entityId: assignment.id,
        entityType: AuditEntityType.USER,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          targetUserId,
          roleId,
          roleName: assignment.role.name,
        },
      });

      return { message: 'Role removed successfully' };
    } catch (error) {
      this.handleError(error, 'remove role', {
        tenantId,
        userId,
        data: removeRoleDto,
      });
    }
  }

  async getUserRoles(targetUserId: string) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const userRoles = (await this.userRoleRepository.getUserRoles(
        targetUserId,
      )) as UserRoleWithRole[];

      return userRoles.map((ur) => ({
        ...ur.role,
        permissions: ur.role.permissions.map((rp) => rp.permission),
        assignmentId: ur.id,
        assignedAt: ur.createdAt,
      }));
    } catch (error) {
      this.handleError(error, 'fetch user roles', {
        tenantId,
        userId,
        targetUserId,
      });
    }
  }
}

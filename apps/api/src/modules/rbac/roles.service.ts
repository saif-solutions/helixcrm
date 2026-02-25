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
      // Use the repository method you added
      return await this.roleRepository.getUserEmail(userId);
    } catch (error) {
      this.logger.warn(
        `Failed to fetch email for user ${userId}: ${error.message}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }

  async findAll(query: RoleQueryDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('rbac.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac.read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. BUSINESS LOGIC USING REPOSITORY
      const roles = await this.roleRepository.findAll(query);

      // 3. TRANSFORM RESPONSE (PRESERVE ORIGINAL FORMAT)
      return roles.map((role) => ({
        ...role,
        permissions: role.permissions.map((rp) => rp.permission),
      }));
    } catch (error: any) {
      this.logger.error(
        `RolesService.findAll failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          query,
        },
      );
      throw new BadRequestException('Failed to fetch roles');
    }
  }

  async findOne(id: string) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('rbac.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac.read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. BUSINESS LOGIC USING REPOSITORY
      const role = await this.roleRepository.findById(id);

      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      // 3. TRANSFORM RESPONSE (PRESERVE ORIGINAL FORMAT)
      return {
        ...role,
        permissions: role.permissions.map((rp) => rp.permission),
      };
    } catch (error: any) {
      this.logger.error(
        `RolesService.findOne failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          roleId: id,
        },
      );

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch role');
    }
  }

  async create(createRoleDto: CreateRoleDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('rbac.manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac.manage required',
      );
    }

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

      // 2. CHECK IF ROLE NAME ALREADY EXISTS
      const existingRole = await this.roleRepository.findByName(name);
      if (existingRole) {
        throw new ConflictException(
          `Role with name "${name}" already exists in this organization`,
        );
      }

      // 3. VALIDATE PERMISSIONS
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

      // 4. CREATE ROLE USING REPOSITORY
      const role = await this.roleRepository.create(
        { name, description, isSystem, permissions },
        tenantId,
      );

      // 5. ASSIGN PERMISSIONS IF PROVIDED
      if (permissionRecords.length > 0) {
        const permissionIds = permissionRecords.map((p) => p.id);
        await this.roleRepository.assignPermissions(role.id, permissionIds);
      }

      // 6. AUDIT LOGGING
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
    } catch (error: any) {
      this.logger.error(
        `RolesService.create failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          data: createRoleDto,
        },
      );

      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create role');
    }
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('rbac.manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac.manage required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const actorEmail = await this.getUserEmail(userId);

    try {
      // 2. GET EXISTING ROLE
      const role = await this.roleRepository.findById(id);
      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      // 3. CHECK IF TRYING TO UPDATE SYSTEM ROLE
      if (role.isSystem && updateRoleDto.isSystem === false) {
        throw new ForbiddenException('Cannot modify system role properties');
      }

      const { name, description, permissions, ...rest } = updateRoleDto;

      // 4. CHECK IF NEW NAME ALREADY EXISTS
      if (name && name !== role.name) {
        const existingRole = await this.roleRepository.findByName(name, id);
        if (existingRole) {
          throw new ConflictException(
            `Role with name "${name}" already exists`,
          );
        }
      }

      // 5. UPDATE ROLE USING REPOSITORY
      const updateData: any = { ...rest };
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;

      const updatedRole = await this.roleRepository.update(id, updateData);

      // 6. UPDATE PERMISSIONS IF PROVIDED
      if (permissions !== undefined) {
        const permissionRecords =
          await this.permissionRepository.findByCodes(permissions);
        const permissionIds = permissionRecords.map((p) => p.id);
        await this.roleRepository.assignPermissions(id, permissionIds);
      }

      // 7. AUDIT LOGGING
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
    } catch (error: any) {
      this.logger.error(
        `RolesService.update failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          roleId: id,
          data: updateRoleDto,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to update role');
    }
  }

  async remove(id: string) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('rbac.manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac.manage required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const actorEmail = await this.getUserEmail(userId);

    try {
      // 2. GET ROLE WITH USER COUNT
      const role = await this.roleRepository.findById(id);
      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      // 3. CHECK IF SYSTEM ROLE
      if (role.isSystem) {
        throw new ForbiddenException('Cannot delete system role');
      }

      // 4. CHECK IF ROLE HAS ASSIGNED USERS
      const userCount = await this.roleRepository.checkUserCount(id);
      if (userCount > 0) {
        throw new ConflictException(
          `Cannot delete role with ${userCount} assigned users. Remove users first.`,
        );
      }

      // 5. DELETE ROLE USING REPOSITORY
      await this.roleRepository.delete(id);

      // 6. AUDIT LOGGING
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
    } catch (error: any) {
      this.logger.error(
        `RolesService.remove failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          roleId: id,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to delete role');
    }
  }

  async assignRole(assignRoleDto: AssignRoleDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('rbac.manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac.manage required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const actorEmail = await this.getUserEmail(userId);

    try {
      const { roleId, userId: targetUserId } = assignRoleDto;

      // 2. VERIFY USER EXISTS IN ORGANIZATION
      const user = await this.roleRepository.findUserInTenant(
        targetUserId,
        tenantId,
      );
      if (!user) {
        throw new NotFoundException(
          `User with ID ${targetUserId} not found in organization`,
        );
      }
      if (!user) {
        throw new NotFoundException(
          `User with ID ${targetUserId} not found in organization`,
        );
      }

      // 3. VERIFY ROLE EXISTS
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        throw new NotFoundException(`Role with ID ${roleId} not found`);
      }

      // 4. CHECK IF ALREADY ASSIGNED
      const existingAssignment = await this.userRoleRepository.findAssignment(
        targetUserId,
        roleId,
      );
      if (existingAssignment) {
        throw new ConflictException('Role already assigned to user');
      }

      // 5. ASSIGN ROLE USING REPOSITORY
      const userRole = await this.userRoleRepository.assignRole(
        targetUserId,
        roleId,
        tenantId,
      );

      // 6. AUDIT LOGGING
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
    } catch (error: any) {
      this.logger.error(
        `RolesService.assignRole failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          data: assignRoleDto,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to assign role');
    }
  }

  async removeRole(removeRoleDto: RemoveRoleDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('rbac.manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac.manage required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const actorEmail = await this.getUserEmail(userId);

    try {
      const { roleId, userId: targetUserId } = removeRoleDto;

      // 2. VERIFY ASSIGNMENT EXISTS
      const assignment = await this.userRoleRepository.findAssignment(
        targetUserId,
        roleId,
      );
      if (!assignment) {
        throw new NotFoundException('Role assignment not found');
      }

      // 3. CHECK IF THIS IS THE LAST ADMIN ROLE
      if (assignment.role.name === 'Admin') {
        const adminCount =
          await this.userRoleRepository.countAdminRoles(tenantId);
        if (adminCount <= 1) {
          throw new ForbiddenException(
            'Cannot remove last admin role from organization',
          );
        }
      }

      // 4. REMOVE ASSIGNMENT USING REPOSITORY
      await this.userRoleRepository.removeAssignment(targetUserId, roleId);

      // 5. AUDIT LOGGING
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
    } catch (error: any) {
      this.logger.error(
        `RolesService.removeRole failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          data: removeRoleDto,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to remove role');
    }
  }

  async getUserRoles(targetUserId: string) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('rbac.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac.read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET USER ROLES USING REPOSITORY
      const userRoles =
        await this.userRoleRepository.getUserRoles(targetUserId);

      // 3. TRANSFORM RESPONSE (PRESERVE ORIGINAL FORMAT)
      return userRoles.map((ur) => ({
        ...ur.role,
        permissions: ur.role.permissions.map((rp) => rp.permission),
        assignmentId: ur.id,
        assignedAt: ur.createdAt,
      }));
    } catch (error: any) {
      this.logger.error(
        `RolesService.getUserRoles failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          targetUserId,
        },
      );
      throw new BadRequestException('Failed to fetch user roles');
    }
  }
}

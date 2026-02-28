// apps/api/src/shared/guards/permission.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionContextService } from '../permissions/context/permission-context.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionContext: PermissionContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;

    this.logger.debug(
      `Checking permissions for route: ${controllerName}.${handlerName}`,
    );
    this.logger.debug(
      `Required permissions: ${JSON.stringify(requiredPermissions)}`,
    );

    // If no permissions metadata is set, allow access
    if (requiredPermissions === undefined) {
      this.logger.debug('No permission metadata found, allowing access');
      return true;
    }

    // If empty array (Public decorator), allow access
    if (requiredPermissions.length === 0) {
      this.logger.debug('Public route (@Public()), allowing access');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request for protected route');
      throw new UnauthorizedException('Authentication required');
    }

    // ENTERPRISE FIX: Handle both property naming conventions for user ID and org ID
    const userId = user.id || user.sub;
    const organizationId = user.organizationId || user.org;

    this.logger.debug(
      `Checking permissions for user: ${userId} (org: ${organizationId})`,
      {
        userPermissions: user.permissions?.length || 0,
        userRoles: user.roles?.length || 0,
      }
    );

    try {
      // Build permission context ONCE per request
      // This will be cached in PermissionContextService for downstream use
      await this.permissionContext.buildContext({
        userId: userId,
        tenantId: organizationId,
        jwtPermissions: user.permissions,
      });

      // Check if user has any of the required permissions
      const hasPermission = this.permissionContext.hasAnyPermission(requiredPermissions);

      if (!hasPermission) {
        const userPermissions = this.permissionContext.getPermissions();
        const userRoles = this.permissionContext.getRoles();
        
        this.logger.warn(
          `Permission denied for user ${userId}. Required: ${requiredPermissions.join(' OR ')}, Has: ${userPermissions.join(', ')}`,
          {
            userId,
            organizationId,
            requiredPermissions,
            userPermissions,
            userRoles,
          }
        );
        
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions.join(' OR ')}`,
        );
      }

      this.logger.debug(`Permission granted for user ${userId}`);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Permission check failed: ${error.message}`, error.stack);
      throw new ForbiddenException('Permission check failed');
    }
  }
}
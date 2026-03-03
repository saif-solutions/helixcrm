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
import { TenantContextService } from '../tenant/context/tenant-context.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { getTenantContext } from '../tenant/tenant.context';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionContext: PermissionContextService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    
    this.logger.debug(`=== PERMISSION GUARD DEBUG ===`);
    this.logger.debug(`Route: ${controllerName}.${handlerName}`);
    this.logger.debug(`Method: ${request.method} ${request.url}`);
    
    // Log user from request
    this.logger.debug(`User from request:`, {
      id: request.user?.sub,
      email: request.user?.email,
      org: request.user?.organizationId || request.user?.org,
      permissionsCount: request.user?.permissions?.length,
      roles: request.user?.roles,
    });

    // Log tenant context from AsyncLocalStorage
    const tenantContext = getTenantContext();
    this.logger.debug(`TenantContext from ALS:`, {
      tenantId: tenantContext?.tenantId,
      userId: tenantContext?.userId,
      source: tenantContext?.source,
    });

    // Log tenant context from service
    try {
      const serviceTenantId = this.tenantContext.getTenantId();
      this.logger.debug(`TenantContext from service: ${serviceTenantId}`);
    } catch (error) {
      this.logger.debug(`TenantContext from service: ERROR - ${error.message}`);
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    this.logger.debug(`Required permissions:`, requiredPermissions);

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

    const user = request.user;
    if (!user) {
      this.logger.warn('No user found in request for protected route');
      throw new UnauthorizedException('Authentication required');
    }

    const userId = user.id || user.sub;
    const organizationId = user.organizationId || user.org;

    // Verify tenant context exists before building permissions
    try {
      const currentTenantId = this.tenantContext.getTenantId();
      this.logger.debug(`Tenant context verified: ${currentTenantId}`);
    } catch (error) {
      this.logger.error('Tenant context missing before permission check', {
        userId,
        organizationId,
        error: error.message,
      });
      throw new ForbiddenException('System configuration error: Tenant context unavailable');
    }

    try {
      this.logger.debug(`Building permission context for user ${userId}...`);
      
      // Build permission context ONCE per request
      await this.permissionContext.buildContext({
        userId: userId,
        tenantId: organizationId,
        jwtPermissions: user.permissions,
      });

      // Verify context was built successfully
      if (!this.permissionContext.isInitialized()) {
        throw new Error('Failed to initialize permission context');
      }

      this.logger.debug(`Permission context built successfully. Permissions:`, 
        this.permissionContext.getPermissions());

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
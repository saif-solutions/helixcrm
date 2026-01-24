import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    this.logger.debug(`Checking permissions for route: ${context.getClass().name}.${context.getHandler().name}`);
    this.logger.debug(`Required permissions: ${JSON.stringify(requiredPermissions)}`);

    // If no permissions metadata is set, allow access (might be handled by other guards)
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

    this.logger.debug(`Checking permissions for user: ${user.sub} (org: ${user.organizationId})`);

    // Get user's permissions
    const userPermissions = await this.getUserPermissions(user.id, user.organizationId);
    this.logger.debug(`User permissions: ${JSON.stringify(userPermissions)}`);

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some((perm) => 
      userPermissions.includes(perm)
    );

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied for user ${user.sub}. Required: ${requiredPermissions.join(', ')}, Has: ${userPermissions.join(', ')}`,
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    this.logger.debug(`Permission granted for user ${user.sub}`);
    return true;
  }

  private async getUserPermissions(userId: string, organizationId: string): Promise<string[]> {
    try {
      // Fetch permissions from database using correct relation names
      const userWithRoles = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          // According to schema: User has UserRoles (PascalCase)
          UserRoles: {
            where: {
              role: {
                organizationId: organizationId,
              },
            },
            include: {
              role: {
                include: {
                  // According to schema: Role has permissions (lowercase)
                  permissions: {
                    include: {
                      // According to schema: RolePermission has permission (lowercase)
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!userWithRoles || !userWithRoles.UserRoles) {
        return [];
      }

      // Extract unique permission codes
      const permissions = new Set<string>();
      
      userWithRoles.UserRoles.forEach((userRole) => {
        if (userRole.role && userRole.role.permissions) {
          userRole.role.permissions.forEach((rolePermission) => {
            if (rolePermission.permission) {
              permissions.add(rolePermission.permission.code);
            }
          });
        }
      });

      return Array.from(permissions);
    } catch (error) {
      this.logger.error(`Failed to fetch user permissions: ${error.message}`, error.stack);
      return [];
    }
  }
}
// apps/api/src/shared/guards/auth.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { setUserInfo } from '../als';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  PERMISSION_KEY,
  IS_PUBLIC_KEY,
} from '../decorators/require-permission.decorator';
import { getTenantContext } from '../tenant/tenant.context';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly secret: string;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    this.secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!this.secret) {
      this.logger.error('JWT_ACCESS_SECRET is not configured');
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('Public route, allowing access');
      return true;
    }

    // Legacy check for routes with empty permissions (for backward compatibility)
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermissions && requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn('No token provided for protected route');
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.secret,
      });

      const organizationId = payload.organizationId || payload.org;
      const tokenVersion = payload.version || payload.tokenVersion;

      if (!payload.sub || !organizationId) {
        this.logger.warn('Token missing required claims');
        throw new UnauthorizedException('Invalid token');
      }

      // ✅ Fetch user with roles and permissions from related tables
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          UserRoles: {
            where: { organizationId },
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
          },
        },
      });

      if (!user || !user.isActive) {
        this.logger.warn(`User ${payload.sub} not found or inactive`);
        throw new UnauthorizedException('Invalid token');
      }

      if (user.tokenVersion !== tokenVersion) {
        this.logger.warn(`Token version mismatch for user ${payload.sub}`);
        throw new UnauthorizedException('Invalid token');
      }

      // ✅ Extract permissions from roles
      const permissions = new Set<string>();
      const roles: string[] = [];

      if (user.UserRoles) {
        user.UserRoles.forEach((userRole) => {
          if (userRole.role) {
            roles.push(userRole.role.name);
            if (userRole.role.permissions) {
              userRole.role.permissions.forEach((rolePermission) => {
                if (rolePermission.permission) {
                  permissions.add(rolePermission.permission.code);
                }
              });
            }
          }
        });
      }

      // ✅ Create user object with permissions and roles
      const userObj = {
        id: payload.sub,
        sub: payload.sub,
        email: payload.email || user.email,
        organizationId: organizationId,
        org: organizationId,
        tokenVersion: tokenVersion,
        permissions: Array.from(permissions),
        roles: roles,
      };

      setUserInfo(
        userObj.sub,
        userObj.email,
        userObj.roles,
        userObj.permissions,
      );

      // ✅ Set user in request
      request.user = userObj;
      request.organizationId = organizationId;

      // ✅ Also set it in the tenant context for AsyncLocalStorage
      const tenantContext = getTenantContext();
      if (tenantContext) {
        tenantContext.userId = userObj.sub;
        tenantContext.userEmail = userObj.email;
        tenantContext.roles = userObj.roles;
        tenantContext.permissions = userObj.permissions;
      }

      this.logger.log(
        `Auth successful for user ${payload.sub} in org ${organizationId}`,
        {
          permissionsCount: userObj.permissions.length,
          rolesCount: userObj.roles.length,
        },
      );

      return true;
    } catch (error) {
      this.logger.error(`Auth failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(request: any): string | null {
    if (request.cookies?.access_token) {
      return request.cookies.access_token;
    }

    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      return type === 'Bearer' ? token : null;
    }

    return null;
  }
}

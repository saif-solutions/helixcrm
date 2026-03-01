// apps/api/src/shared/guards/auth.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { TenantContextService } from '../tenant/context/tenant-context.service';
import { withTenantContext } from '../tenant/tenant.context';

interface JwtPayload {
  sub: string;
  email: string;
  org?: string;
  organizationId?: string;
  version?: number;
  tokenVersion?: number;
  permissions?: string[];
  roles?: string[];
  [key: string]: any;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly secret: string;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private reflector: Reflector,
    private configService: ConfigService,
    private tenantContextService: TenantContextService,
  ) {
    this.secret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!this.secret) {
      this.logger.error('JWT_ACCESS_SECRET is not configured');
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
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
      // Verify token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.secret,
      });

      // Handle both property naming conventions
      const organizationId = payload.organizationId || payload.org;
      const tokenVersion = payload.version || payload.tokenVersion;

      if (!payload.sub) {
        this.logger.warn('Token missing sub claim');
        throw new UnauthorizedException('Invalid token');
      }

      if (!organizationId) {
        this.logger.warn('Token missing organization context');
        throw new UnauthorizedException('Invalid token: missing organization context');
      }

      // Verify user exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          tokenVersion: true,
          isActive: true,
          email: true,
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

      // Create user object with permissions and roles
      const userObj = {
        id: payload.sub,
        sub: payload.sub,
        email: payload.email || user.email,
        organizationId: organizationId,
        org: organizationId,
        tokenVersion: tokenVersion,
        permissions: payload.permissions || [],
        roles: payload.roles || [],
      };

      // Attach user to request
      request.user = userObj;
      request.organizationId = organizationId;

      this.logger.log(`Auth successful for user ${payload.sub} in org ${organizationId}`);

      // The tenant context will be properly set by the TenantGuard
      // which runs after AuthGuard and calls tenantContextService.resolveContext()
      
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

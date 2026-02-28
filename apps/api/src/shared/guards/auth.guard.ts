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
import { TenantContextService } from '../tenant/context/tenant-context.service'; // Add this import

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
    private tenantContextService: TenantContextService, // Add this
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

      // Create user object
      const userObj = {
        id: payload.sub,
        sub: payload.sub,
        email: payload.email || user.email,
        organizationId: organizationId,
        tokenVersion: tokenVersion,
        permissions: payload.permissions || [],
        roles: payload.roles || [],
      };

      // Attach user to request
      request.user = userObj;
      request.organizationId = organizationId;

      // CRITICAL FIX: Set tenant context for this request
      // This ensures all subsequent database queries use the correct organization ID
      if (organizationId) {
        this.logger.debug(`Setting tenant context to ${organizationId} for user ${payload.sub}`);
        
        // Create tenant context
        const tenantContext = {
          tenantId: organizationId,
          organizationId: organizationId,
          isSystemContext: false,
          resolvedAt: new Date(),
          source: 'token' as const,
          userId: payload.sub,
          userEmail: payload.email || user.email,
          roles: payload.roles || [],
          permissions: payload.permissions || [],
        };

        // Store in request for backward compatibility
        (request as any).tenantContext = tenantContext;
        
        // Use the TenantContextService to set the context
        // This will make it available via requireTenantContext() in repositories
        const { withTenantContext } = require('../tenant/tenant.context');
        withTenantContext(tenantContext, () => {
          // The context is now set for the rest of this request
          this.logger.debug(`Tenant context successfully set`);
        });
      }

      this.logger.debug(`Auth successful for user ${payload.sub} in org ${organizationId}`);
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
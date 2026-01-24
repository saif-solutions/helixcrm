import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core"; // ADD THIS IMPORT
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { PERMISSION_KEY } from "../decorators/require-permission.decorator"; // ADD THIS IMPORT

interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  tokenVersion: number;
  [key: string]: any;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private reflector: Reflector, // ADD THIS
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public (has @Public() decorator)
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    
    // If route is public (empty permissions array), allow access
    if (requiredPermissions && requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException("No token provided");

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      // ✅ CRITICAL: Verify token version matches user's current version
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { tokenVersion: true, isActive: true },
      });

      if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException("Invalid token");
      }

      // Attach user to request with proper typing
      request.user = {
        sub: payload.sub,
        email: payload.email,
        organizationId: payload.organizationId,
        tokenVersion: payload.tokenVersion,
      };
      request.organizationId = payload.organizationId; // For tenant context

      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }

  private extractToken(request: any): string | null {
    // 1. First check cookies (new secure method)
    if (request.cookies?.access_token) {
      return request.cookies.access_token;
    }

    // 2. Fall back to Authorization header (backward compatibility)
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(" ");
      return type === "Bearer" ? token : null;
    }

    return null;
  }
}
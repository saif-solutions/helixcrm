import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";

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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(" ");
    return type === "Bearer" ? token : null;
  }
}

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.organizationId;

    if (!organizationId) {
      throw new ForbiddenException("Organization context required");
    }

    // Application-level tenant enforcement
    // Every query MUST include organizationId
    return true;
  }
}

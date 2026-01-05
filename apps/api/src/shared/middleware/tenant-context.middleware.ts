import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

// Extend Express Request type
declare module "express" {
  interface Request {
    user?: {
      sub: string;
      organizationId: string;
      [key: string]: any;
    };
  }
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract organization from authenticated user
    if (req.user?.organizationId) {
      // Set tenant context for logging and queries
      (req as any).tenantContext = {
        organizationId: req.user.organizationId,
        userId: req.user.sub,
      };
    }
    next();
  }
}

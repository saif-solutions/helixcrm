// apps/api/src/modules/debug/debug.controller.ts
// IMPORTANT: This is a temporary debug controller - remove in production!

import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import type { Request } from 'express';

// Define the user structure from the JWT
interface AuthenticatedUser {
  id: string;
  sub: string;
  email: string;
  organizationId: string;
  tokenVersion: number;
  permissions?: string[];
  roles?: string[];
}

// Extend Express Request with our authenticated user and tenant context
interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  organizationId?: string;
  tenantContext?: {
    tenantId: string;
    organizationId: string;
    isSystemContext: boolean;
    source: string;
    [key: string]: unknown;
  };
}

@Controller('debug')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class DebugController {
  @Get('context')
  getContext(@Req() req: AuthenticatedRequest) {
    return {
      user: {
        id: req.user.id,
        sub: req.user.sub,
        email: req.user.email,
        organizationId: req.user.organizationId,
        tokenVersion: req.user.tokenVersion,
        permissionsCount: req.user.permissions?.length,
        roles: req.user.roles,
      },
      requestOrgId: req.organizationId,
      tenantContext: req.tenantContext,
      headers: {
        hasAuth: !!req.headers.authorization,
        hasOrgHeader: !!req.headers['x-organization-id'],
      },
    };
  }
}

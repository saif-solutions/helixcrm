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
import {
  PERMISSION_KEY,
  PermissionMode,
} from '../decorators/require-permission.decorator';
import { getTenantContext } from '../tenant/tenant.context';
import type { Request } from 'express';
import type { UserPayload } from '../types/request.types';
import { randomUUID } from 'crypto';

// ==================== INTERFACES ====================

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  id?: string;
  headers: {
    'x-correlation-id'?: string;
    'x-request-id'?: string;
    [key: string]: string | string[] | undefined;
  };
}

interface PermissionMetadata {
  permissions: string[];
  mode: PermissionMode;
  message?: string;
  skip?: boolean;
  resource?: string;
  level?: number;
}

interface PermissionContextData {
  userId: string;
  tenantId: string;
  jwtPermissions?: string[];
}

interface TenantContext {
  tenantId?: string;
  userId?: string;
  source?: string;
  organizationId?: string;
  [key: string]: unknown;
}

interface LogContext {
  correlationId: string;
  controller: string;
  handler: string;
  userId?: string;
  organizationId?: string;
  [key: string]: unknown;
}

// ==================== TYPE GUARDS ====================

function isValidUserPayload(user: unknown): user is UserPayload {
  if (!user || typeof user !== 'object') return false;
  const payload = user as Partial<UserPayload>;
  if (typeof payload.sub !== 'string' || !payload.sub) return false;
  const hasOrgId =
    (typeof payload.organizationId === 'string' &&
      payload.organizationId.length > 0) ||
    (typeof payload.org === 'string' && payload.org.length > 0);
  return hasOrgId;
}

function isValidTenantContext(context: unknown): context is TenantContext {
  if (typeof context !== 'object' || context === null) return false;
  const maybe = context as Record<string, unknown>;
  if ('tenantId' in maybe && typeof maybe.tenantId !== 'string') return false;
  if ('userId' in maybe && typeof maybe.userId !== 'string') return false;
  if ('source' in maybe && typeof maybe.source !== 'string') return false;
  return true;
}

function isPermissionMetadata(
  metadata: unknown,
): metadata is PermissionMetadata {
  if (!metadata || typeof metadata !== 'object') return false;
  const meta = metadata as Partial<PermissionMetadata>;
  return (
    Array.isArray(meta.permissions) &&
    (meta.mode === PermissionMode.ANY || meta.mode === PermissionMode.ALL)
  );
}

function hasErrorMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

// ==================== HELPER FUNCTIONS ====================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (hasErrorMessage(error)) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

function maskUserId(userId: string | undefined): string {
  if (!userId) return 'unknown';
  if (userId.length <= 8) return '****';
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
}

function getCorrelationId(request: AuthenticatedRequest): string {
  return (
    request.headers['x-correlation-id']?.toString() ??
    request.headers['x-request-id']?.toString() ??
    randomUUID()
  );
}

function getOrganizationId(user: UserPayload): string {
  return user.organizationId || user.org;
}

// ==================== PERMISSION GUARD ====================

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionContext: PermissionContextService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const startTime = this.isProduction ? undefined : performance.now();

    const correlationId = getCorrelationId(request);
    request.id = correlationId;

    const logContext: LogContext = {
      correlationId,
      controller: context.getClass().name,
      handler: context.getHandler().name,
    };

    if (!this.isProduction) {
      this.logDebug('Permission guard started', logContext);
      this.logDebug(
        `Route: ${logContext.controller}.${logContext.handler}`,
        logContext,
      );
      this.logDebug(`Method: ${request.method} ${request.url}`, logContext);
    }

    try {
      const permissionMetadata = this.getPermissionMetadata(context);

      if (!permissionMetadata) {
        if (!this.isProduction) {
          this.logDebug('No permissions required, allowing access', logContext);
        }
        return true;
      }

      const {
        permissions: requiredPermissions,
        mode,
        skip,
      } = permissionMetadata;

      if (skip) {
        if (!this.isProduction) {
          this.logDebug('Permission check skipped via metadata', logContext);
        }
        return true;
      }

      // Validate and get user
      const user = this.validateAndGetUser(request, logContext);

      const userId = user.sub;
      const organizationId = getOrganizationId(user);

      logContext.userId = userId;
      logContext.organizationId = organizationId;

      if (!this.isProduction) {
        this.logDebug('User info', {
          ...logContext,
          userId: maskUserId(userId),
          organizationId,
          permissionsCount: user.permissions?.length ?? 0,
          rolesCount: user.roles?.length ?? 0,
        });
      }

      this.validateTenantContext(organizationId, logContext);
      await this.buildPermissionContext(
        userId,
        organizationId,
        user.permissions,
        logContext,
      );

      const hasRequiredPermissions = this.checkPermissions(
        requiredPermissions,
        mode,
        logContext,
      );

      if (!hasRequiredPermissions) {
        this.handlePermissionDenied(requiredPermissions, mode, logContext);
      }

      if (!this.isProduction) {
        const executionTime = performance.now() - (startTime ?? 0);
        this.logDebug(
          `Permission granted in ${executionTime.toFixed(2)}ms`,
          logContext,
        );
      }

      return true;
    } catch (error) {
      this.handleError(error, logContext);
    }
  }

  private getPermissionMetadata(
    context: ExecutionContext,
  ): PermissionMetadata | null {
    const metadata = this.reflector.getAllAndOverride<unknown>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPermissionMetadata(metadata) ? metadata : null;
  }

  private validateAndGetUser(
    request: AuthenticatedRequest,
    logContext: LogContext,
  ): UserPayload {
    if (!request.user) {
      this.logger.warn('No user found in request', { ...logContext });
      throw new UnauthorizedException('Authentication required');
    }

    if (!isValidUserPayload(request.user)) {
      this.logger.warn(
        'Invalid user payload structure',
        JSON.stringify({
          ...logContext,
          hasSub: !!request.user.sub,
          hasOrgId: !!(request.user.organizationId || request.user.org),
        }),
      );
      throw new UnauthorizedException('Invalid user context');
    }

    return request.user;
  }

  private validateTenantContext(
    organizationId: string,
    logContext: LogContext,
  ): void {
    const rawTenantContext = getTenantContext();
    const tenantContext = isValidTenantContext(rawTenantContext)
      ? rawTenantContext
      : null;

    if (tenantContext?.tenantId && tenantContext.tenantId !== organizationId) {
      this.logger.error(
        'Tenant mismatch detected',
        JSON.stringify({
          ...logContext,
          alsTenantId: tenantContext.tenantId,
          userOrgId: organizationId,
        }),
      );
      throw new ForbiddenException('Tenant context mismatch');
    }

    try {
      const serviceTenantId = this.tenantContext.getTenantId();
      if (serviceTenantId !== organizationId) {
        this.logger.error(
          'Service tenant mismatch',
          JSON.stringify({
            ...logContext,
            serviceTenantId,
            userOrgId: organizationId,
          }),
        );
        throw new ForbiddenException('Tenant context mismatch');
      }

      if (!this.isProduction) {
        this.logDebug(
          `Tenant context verified: ${serviceTenantId}`,
          logContext,
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Tenant context unavailable',
        JSON.stringify({ ...logContext, error: errorMessage }),
      );
      throw new ForbiddenException(
        'System configuration error: Tenant context unavailable',
      );
    }
  }

  private async buildPermissionContext(
    userId: string,
    organizationId: string,
    userPermissions: string[] | undefined,
    logContext: LogContext,
  ): Promise<void> {
    if (!this.isProduction) {
      this.logDebug('Building permission context...', logContext);
    }

    const contextData: PermissionContextData = {
      userId,
      tenantId: organizationId,
      jwtPermissions: userPermissions ? [...userPermissions] : [],
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.permissionContext.buildContext(contextData);
    } catch (error) {
      this.logger.error(
        'Failed to build permission context',
        JSON.stringify({ ...logContext, error: getErrorMessage(error) }),
      );
      throw new ForbiddenException('Permission check failed');
    }

    // Check if context is initialized and throw if not
    const isContextInitialized = this.isPermissionContextInitialized();
    if (!isContextInitialized) {
      this.logger.error(
        'Permission context initialization failed',
        JSON.stringify(logContext),
      );
      throw new ForbiddenException('Permission check failed');
    }

    if (!this.isProduction) {
      const permissions = this.getPermissionsSafely();
      const roles = this.getRolesSafely();
      this.logDebug('Permission context built', {
        ...logContext,
        permissionsCount: permissions.length,
        rolesCount: roles.length,
      });
    }
  }

  private isPermissionContextInitialized(): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const initialized = this.permissionContext.isInitialized();
      return typeof initialized === 'boolean' ? initialized : false;
    } catch {
      return false;
    }
  }

  private getPermissionsSafely(): string[] {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const result = this.permissionContext.getPermissions();
      if (Array.isArray(result)) {
        return result.filter(
          (item): item is string => typeof item === 'string',
        );
      }
      return [];
    } catch {
      return [];
    }
  }

  private getRolesSafely(): string[] {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const result = this.permissionContext.getRoles();
      if (Array.isArray(result)) {
        return result.filter(
          (item): item is string => typeof item === 'string',
        );
      }
      return [];
    } catch {
      return [];
    }
  }

  private checkPermissions(
    requiredPermissions: string[],
    mode: PermissionMode,
    logContext: LogContext,
  ): boolean {
    const userPermissions = this.getPermissionsSafely();
    const userRoles = this.getRolesSafely();
    const permissionSet = new Set<string>(userPermissions);

    let hasRequiredPermissions: boolean;
    if (mode === PermissionMode.ALL) {
      hasRequiredPermissions = requiredPermissions.every((p) =>
        permissionSet.has(p),
      );
    } else {
      hasRequiredPermissions = requiredPermissions.some((p) =>
        permissionSet.has(p),
      );
    }

    if (!hasRequiredPermissions && !this.isProduction) {
      this.logger.warn(
        'Permission check failed',
        JSON.stringify({
          ...logContext,
          userId: maskUserId(logContext.userId),
          mode,
          requiredPermissions,
          userPermissions,
          userRoles,
        }),
      );
    }

    return hasRequiredPermissions;
  }

  private handlePermissionDenied(
    requiredPermissions: string[],
    mode: PermissionMode,
    logContext: LogContext,
  ): never {
    if (this.isProduction) {
      this.logger.warn(
        'Permission denied',
        JSON.stringify({
          ...logContext,
          userId: maskUserId(logContext.userId),
          mode,
          requiredCount: requiredPermissions.length,
        }),
      );
    }

    const modeText = mode === PermissionMode.ALL ? 'all of' : 'any of';
    throw new ForbiddenException(
      `Insufficient permissions. Required: ${modeText} ${requiredPermissions.length} permission(s)`,
    );
  }

  private handleError(error: unknown, logContext: LogContext): never {
    if (
      error instanceof UnauthorizedException ||
      error instanceof ForbiddenException
    ) {
      throw error;
    }

    const errorMessage = getErrorMessage(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      `Permission guard error: ${errorMessage}`,
      errorStack,
      JSON.stringify(logContext),
    );

    throw new ForbiddenException('Permission check failed');
  }

  private logDebug(message: string, context: Record<string, unknown>): void {
    if (!this.isProduction) {
      this.logger.debug(`${message} - ${JSON.stringify(context)}`);
    }
  }
}

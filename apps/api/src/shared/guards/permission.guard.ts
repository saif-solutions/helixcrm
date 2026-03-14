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
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { getTenantContext } from '../tenant/tenant.context';
import type { Request } from 'express';
import type { UserPayload } from '../types/request.types';
import { randomUUID } from 'crypto';

// ==================== ENUMS ====================

export enum PermissionMode {
  ALL = 'all',
  ANY = 'any',
}

// ==================== INTERFACES ====================

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  id?: string;
}

interface PermissionContextData {
  userId: string;
  tenantId: string;
  jwtPermissions?: string[];
}

interface PermissionMetadata {
  permissions: string[];
  mode: PermissionMode;
}

interface TenantContext {
  tenantId?: string;
  userId?: string;
  source?: string;
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

function hasUser(req: unknown): req is AuthenticatedRequest {
  return (
    typeof req === 'object' &&
    req !== null &&
    'user' in req &&
    req.user !== null &&
    typeof req.user === 'object'
  );
}

function isValidUserPayload(user: unknown): user is UserPayload {
  if (!user || typeof user !== 'object') return false;

  const payload = user as Partial<UserPayload>;

  // Check for required fields
  if (typeof payload.sub !== 'string' || !payload.sub) {
    return false;
  }

  // Check for organization ID in either field
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

// ==================== SAFE STRING CONVERSION ====================

function safeStringify(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  if (value instanceof Error) return value.message;

  if (typeof value === 'object') {
    try {
      const seen = new WeakSet();
      return JSON.stringify(value, (key: string, val: unknown) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);
        }
        return val;
      });
    } catch {
      return '[Unserializable Object]';
    }
  }

  return `[${typeof value}]`;
}

// ==================== ERROR HANDLING UTILITIES ====================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error === null) return 'null';
  if (error === undefined) return 'undefined';
  if (typeof error === 'string') return error;
  if (typeof error === 'number') return String(error);
  if (typeof error === 'boolean') return String(error);
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (obj && 'message' in obj && typeof obj.message === 'string') {
      return obj.message;
    }
    return safeStringify(error);
  }
  return `Unknown error type: ${typeof error}`;
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
    const startTime = performance.now();

    // Set correlation ID on request
    const correlationId = this.getCorrelationId(request);
    request.id = correlationId;

    const logContext: LogContext = {
      correlationId,
      controller: context.getClass().name,
      handler: context.getHandler().name,
    };

    if (!this.isProduction) {
      this.logDebug('PERMISSION GUARD START', logContext);
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

      const { permissions: requiredPermissions, mode } = permissionMetadata;

      // Validate request and user
      this.validateRequest(request, logContext);

      // Safe to access user now after validation
      const user = request.user;
      const userId = user.sub;
      const organizationId = this.getOrganizationId(user);

      logContext.userId = userId;
      logContext.organizationId = organizationId;

      if (!this.isProduction) {
        this.logDebug('User info', {
          ...logContext,
          userId: this.maskUserId(userId),
          organizationId,
          permissionsCount: user?.permissions?.length ?? 0,
          rolesCount: user?.roles?.length ?? 0,
        });
      }

      // Validate tenant context
      this.validateTenantContext(organizationId, logContext);

      // Build permission context
      await this.buildPermissionContext(
        userId,
        organizationId,
        user?.permissions,
        logContext,
      );

      // Check permissions
      const hasRequiredPermissions = this.checkPermissions(
        requiredPermissions,
        mode,
        logContext,
      );

      if (!hasRequiredPermissions) {
        this.handlePermissionDenied(requiredPermissions, mode, logContext);
      }

      // Log success
      if (!this.isProduction) {
        this.logDebug('Permission granted', {
          ...logContext,
          userId: this.maskUserId(logContext.userId ?? ''),
          organizationId: logContext.organizationId,
        });

        const executionTime = performance.now() - startTime;
        this.logDebug(
          `Permission guard executed in ${executionTime.toFixed(2)}ms`,
          logContext,
        );
      }

      return true;
    } catch (error) {
      // Handle and rethrow errors appropriately
      this.handleError(error, logContext);
    }
  }

  private getCorrelationId(request: AuthenticatedRequest): string {
    return (
      request.headers['x-correlation-id']?.toString() ??
      request.headers['x-request-id']?.toString() ??
      randomUUID()
    );
  }

  private getPermissionMetadata(
    context: ExecutionContext,
  ): PermissionMetadata | null {
    const metadata = this.reflector.getAllAndOverride<PermissionMetadata>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      !metadata ||
      !metadata.permissions ||
      metadata.permissions.length === 0
    ) {
      return null;
    }

    return metadata;
  }

  private validateRequest(
    request: AuthenticatedRequest,
    logContext: LogContext,
  ): void {
    // Check if request has user
    if (!hasUser(request) || !request.user) {
      this.logger.warn('No user found in request', JSON.stringify(logContext));
      throw new UnauthorizedException('Authentication required');
    }

    // Validate user payload structure
    if (!isValidUserPayload(request.user)) {
      // Create a safe object for logging without unsafe member access
      const userForLogging = request.user as Record<string, unknown>;

      this.logger.warn(
        'Invalid user payload structure',
        JSON.stringify({
          ...logContext,
          hasSub: typeof userForLogging.sub === 'string',
          hasId: typeof userForLogging.id === 'string',
          hasOrgId: typeof userForLogging.organizationId === 'string',
          hasOrg: typeof userForLogging.org === 'string',
        }),
      );
      throw new UnauthorizedException('Invalid user context');
    }
  }

  private getOrganizationId(user: UserPayload): string {
    // Either organizationId or org is guaranteed to exist after validation
    return user.organizationId || user.org;
  }

  private validateTenantContext(
    organizationId: string,
    logContext: LogContext,
  ): void {
    // Check ALS tenant context
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

    // Check service tenant context
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
      // If error is already a ForbiddenException, rethrow it
      if (error instanceof ForbiddenException) {
        throw error;
      }

      const errorMessage = getErrorMessage(error);
      this.logger.error(
        'Tenant context unavailable',
        JSON.stringify({
          ...logContext,
          error: errorMessage,
        }),
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
      jwtPermissions: Array.isArray(userPermissions)
        ? [...userPermissions] // Make a mutable copy
        : [],
    };

    try {
      await this.permissionContext.buildContext(contextData);
    } catch (error) {
      this.logger.error(
        'Failed to build permission context',
        JSON.stringify({
          ...logContext,
          error: getErrorMessage(error),
        }),
      );
      throw new ForbiddenException('Permission check failed');
    }

    if (!this.permissionContext.isInitialized()) {
      this.logger.error(
        'Permission context initialization failed',
        JSON.stringify(logContext),
      );
      throw new ForbiddenException('Permission check failed');
    }

    if (!this.isProduction) {
      const permissions = this.permissionContext.getPermissions();
      const roles = this.permissionContext.getRoles();

      this.logDebug('Permission context built', {
        ...logContext,
        permissionsCount: permissions.length,
        rolesCount: roles.length,
      });
    }
  }

  private checkPermissions(
    requiredPermissions: string[],
    mode: PermissionMode,
    logContext: LogContext,
  ): boolean {
    const userPermissions = this.permissionContext.getPermissions();
    const userRoles = this.permissionContext.getRoles();

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
          userId: this.maskUserId(logContext.userId ?? ''),
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
          userId: this.maskUserId(logContext.userId ?? ''),
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
    // Re-throw NestJS HTTP exceptions directly
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
    this.logger.debug(`${message} - ${JSON.stringify(context)}`);
  }

  private maskUserId(userId: string): string {
    if (!userId || userId.length < 8) return '****';
    return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
  }
}

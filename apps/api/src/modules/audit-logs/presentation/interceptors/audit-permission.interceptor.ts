// apps/api/src/modules/audit-logs/presentation/interceptors/audit-permission.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditLogService } from '../../../../shared/audit-log/audit-log.service';
import { AuditAction, AuditEntityType, AuditSeverity } from '../../domain';

// Define user interface for better type safety
interface RequestUser {
  organizationId?: string;
  email?: string;
  id?: string;
}

// Define request interface
interface RequestWithUser {
  user?: RequestUser;
  path: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

@Injectable()
export class AuditPermissionInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const organizationId = user?.organizationId;
    const actorEmail = user?.email;
    const actorUserId = user?.id;

    return next.handle().pipe(
      catchError((error: unknown) => {
        // Check if it's a ForbiddenException (permission denied)
        if (error instanceof ForbiddenException) {
          // Build metadata object safely
          const metadata: Record<string, unknown> = {
            path: request.path,
            method: request.method,
            userAgent: request.headers['user-agent'],
            ipAddress: request.ip,
          };

          // Add error details if available
          if (error.message) {
            metadata.error = error.message;
          }

          // Add stack trace in development
          if (process.env.NODE_ENV === 'development' && error.stack) {
            metadata.stack = error.stack;
          }

          // Log the permission denied event (fire and forget)
          this.auditLogService
            .logEvent({
              organizationId: organizationId ?? '',
              actorUserId: actorUserId ?? '',
              actorEmail: actorEmail ?? 'unknown@helixcrm',
              action: AuditAction.PERMISSION_DENIED,
              entityType: AuditEntityType.AUTH,
              metadata,
              severity: AuditSeverity.HIGH,
            })
            .catch((logError: Error) => {
              // Don't let audit logging failure break the request
              console.error('Failed to log audit event:', logError.message);
            });
        }

        // Re-throw the original error
        return throwError(() => error);
      }),
      tap((response: unknown) => {
        // Only log in development environment
        if (process.env.NODE_ENV === 'development') {
          // Build metadata object safely
          const metadata: Record<string, unknown> = {
            path: request.path,
            method: request.method,
            userAgent: request.headers['user-agent'],
            ipAddress: request.ip,
          };

          // Add response status if available
          if (
            response &&
            typeof response === 'object' &&
            'status' in response
          ) {
            const statusValue = (response as { status?: unknown }).status;
            if (statusValue !== undefined) {
              metadata.responseStatus = statusValue;
            }
          }

          // Log successful permission check (fire and forget)
          this.auditLogService
            .logEvent({
              organizationId: organizationId ?? '',
              actorUserId: actorUserId ?? '',
              actorEmail: actorEmail ?? 'unknown@helixcrm',
              action: AuditAction.PERMISSION_DENIED,
              entityType: AuditEntityType.AUTH,
              metadata,
              severity: AuditSeverity.LOW,
            })
            .catch((logError: Error) => {
              console.error('Failed to log audit event:', logError.message);
            });
        }
      }),
    );
  }
}

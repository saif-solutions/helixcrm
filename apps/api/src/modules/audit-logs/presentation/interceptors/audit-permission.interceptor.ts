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

@Injectable()
export class AuditPermissionInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationId = user?.organizationId;
    const actorEmail = user?.email;
    const actorUserId = user?.id;

    return next.handle().pipe(
      catchError((error) => {
        // Check if it's a ForbiddenException (permission denied)
        if (error instanceof ForbiddenException) {
          // Log the permission denied event
          this.auditLogService
            .logEvent({
              organizationId,
              actorUserId,
              actorEmail: actorEmail || 'unknown@helixcrm',
              action: AuditAction.PERMISSION_DENIED,
              entityType: AuditEntityType.AUTH,
              metadata: {
                path: request.path,
                method: request.method,
                userAgent: request.headers['user-agent'],
                ipAddress: request.ip,
                error: error.message,
                stack:
                  process.env.NODE_ENV === 'development'
                    ? error.stack
                    : undefined,
              },
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
              severity: AuditSeverity.HIGH,
            })
            .catch((logError) => {
              // Don't let audit logging failure break the request
              console.error('Failed to log audit event:', logError);
            });
        }

        // Re-throw the original error
        return throwError(() => error);
      }),
      tap((response) => {
        // Optional: Log successful permission checks if needed
        if (process.env.NODE_ENV === 'development') {
          this.auditLogService
            .logEvent({
              organizationId,
              actorUserId,
              actorEmail: actorEmail || 'unknown@helixcrm',
              action: AuditAction.PERMISSION_DENIED, // Or create a SUCCESS action
              entityType: AuditEntityType.AUTH,
              metadata: {
                path: request.path,
                method: request.method,
                userAgent: request.headers['user-agent'],
                ipAddress: request.ip,
                responseStatus: response?.status || 'unknown',
              },
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
              severity: AuditSeverity.LOW,
            })
            .catch((logError) => {
              console.error('Failed to log audit event:', logError);
            });
        }
      }),
    );
  }
}

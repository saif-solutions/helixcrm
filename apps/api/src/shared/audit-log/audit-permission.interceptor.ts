import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuditLogService, AuditAction, AuditSeverity } from './audit-log.service';

@Injectable()
export class AuditPermissionInterceptor implements NestInterceptor {
  constructor(private auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      catchError((error) => {
        // Log permission denied errors
        if (error instanceof ForbiddenException) {
          // FIXED: Use the correct number of parameters
          this.auditLogService.logWithRequest(
            request,
            AuditAction.PERMISSION_DENIED,
            AuditAction.PERMISSION_DENIED as any, // This needs a proper entity type
            request.user?.email || 'unknown',
            request.user?.sub,
            undefined,
            {
              error: error.message,
              path: request.path,
              method: request.method,
            },
            AuditSeverity.HIGH,
          ).catch(err => {
            // Don't throw if audit logging fails
            console.error('Failed to log permission denial:', err);
          });
        }
        return throwError(() => error);
      }),
    );
  }
}
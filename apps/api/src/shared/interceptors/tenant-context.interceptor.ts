// apps/api/src/shared/interceptors/tenant-context.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getTenantContext, setTenantContext } from '../tenant/tenant.context';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    this.logger.log(`🚀 Interceptor executing for ${request.method} ${request.path}`);
    
    // Get the current context (should be set by TenantGuard)
    const currentContext = getTenantContext();
    
    if (currentContext) {
      this.logger.log(`📋 Interceptor found context: ${currentContext.tenantId} (${currentContext.source})`);
      
      // CRITICAL: Ensure the context is set again before proceeding
      if (currentContext.tenantId !== 'PENDING' || currentContext.source === 'token') {
        setTenantContext(currentContext);
        this.logger.log(`✅ Interceptor preserved context: ${currentContext.tenantId}`);
      } else {
        this.logger.log(`⚠️ Interceptor skipping PENDING context preservation`);
      }
    } else {
      this.logger.log('❌ No context found in interceptor');
    }

    // Log after the request is processed
    return next.handle().pipe(
      tap({
        next: () => {
          const afterContext = getTenantContext();
          this.logger.log(`🏁 Request completed, context: ${afterContext?.tenantId || 'none'}`);
        },
        error: (err) => {
          this.logger.error(`💥 Request failed: ${err.message}`);
        },
      }),
    );
  }
}
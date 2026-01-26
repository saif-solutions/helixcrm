import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { DatabaseModule } from './shared/database/database.module';

import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { HealthController } from "./health.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { PipelinesModule } from "./modules/pipelines/pipelines.module";
import { DealsModule } from "./modules/deals/deals.module";
import { LoggingModule } from "./shared/logging/logging.module";
import { AuditLogModule } from './shared/audit-log/audit-log.module';
import { RequestLoggerInterceptor } from "./shared/logging/request-logger.interceptor";
import { RequestContextMiddleware } from "./shared/middleware/request-context.middleware";
import { CsrfMiddleware } from "./shared/security/csrf.middleware";
import { AuthGuard } from "./shared/guards/auth.guard";
import { PermissionGuard } from "./shared/guards/permission.guard";
import { RbacModule } from "./modules/rbac/rbac.module";
import { SecurityModule } from "./shared/security/security.module";
import { Reflector } from "@nestjs/core";
import { DateRangeConstraint } from './shared/validators/date-range.validator';
import { CurrencyCodeConstraint } from './shared/validators/currency-code.validator';
import { AnalyticsModule, getAnalyticsModule } from './modules/analytics/analytics.module';
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { PermissionsModule } from './shared/permissions/permissions.module';


@Module({
  imports: [
    PermissionsModule,  // ADD THIS
    DatabaseModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '.env.development'],
      expandVariables: true,
    }),
    SecurityModule,
    
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'medium',
        ttl: 300000, // 5 minutes
        limit: 300, // 300 requests per 5 minutes
      },
      {
        name: 'auth',
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute for auth endpoints
      },
      {
        name: 'password-reset',
        ttl: 3600000, // 1 hour
        limit: 5, // 5 reset attempts per hour
      },
    ]),

    // Feature modules
    AuthModule,
    ContactsModule,
    LeadsModule,
    PipelinesModule,
    DealsModule,
    RbacModule,
    DashboardModule,
    
    // ✅ FIXED: Analytics Module with conditional registration
    // Check if Redis is available and exports are enabled
    getAnalyticsModule(),

    // Infrastructure modules
    LoggingModule,
    AuditLogModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    Reflector,
    DateRangeConstraint,
    CurrencyCodeConstraint,
    AuthGuard,
    PermissionGuard, // ✅ ADD PermissionGuard here
    
    // Global request logging
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
    
    // Global Auth Guard (runs first - authentication)
    {
      provide: APP_GUARD,
      useExisting: AuthGuard,
    },
    
    // Global Permission Guard (runs second - authorization)
    {
      provide: APP_GUARD,
      useExisting: PermissionGuard,
    },
  ],
  exports: [
    // ✅ Export PermissionGuard so other modules can use it
    AuthGuard,
    PermissionGuard,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply RequestContextMiddleware to ALL routes first
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });

    // Apply CSRF middleware to ALL routes
    // The CsrfMiddleware itself handles which paths/methods to skip
    consumer
      .apply(CsrfMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
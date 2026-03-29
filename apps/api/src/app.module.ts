// apps/api/src/app.module.ts

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER } from '@nestjs/core';

import { SentryModule } from '@sentry/nestjs/setup';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { ThrottlerModule } from '@nestjs/throttler';

// Core
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

// Config imports
import {
  appConfig,
  databaseConfig,
  authConfig,
  securityConfig,
  demoConfig,
} from './config';

// Feature modules
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { LeadsModule } from './modules/leads/leads.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DealsModule } from './modules/deals/deals.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { ImportModule } from './modules/import/import.module';
import { EmailTemplatesModule } from './modules/email-templates/email-templates.module';
import { ExportQueueModule } from './modules/export-queue/export-queue.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DemoModule } from './modules/demo/demo.module';

// Shared infrastructure
import { SharedModule } from './shared/shared.module';
import { TenantModule } from './shared/tenant/module/tenant.module';

// Compliance modules
import { AuditIntegrityModule } from './shared/audit-integrity/audit-integrity.module';
import { ComplianceModule } from './shared/compliance/compliance.module';
import { PerformanceMetricsModule } from './shared/performance/performance-metrics.module';

// Middleware
import { CorrelationIdMiddleware } from './shared/middleware/correlation-id.middleware';
import { RequestContextMiddleware } from './shared/middleware/request-context.middleware';
import { CsrfMiddleware } from './shared/security/csrf.middleware';

// Config validation
import { ConfigValidationService } from './config/validation/config-validation.service';

import { DebugController } from './modules/debug/debug.controller';

// Create config array with proper typing
const configModules = [
  appConfig,
  databaseConfig,
  authConfig,
  securityConfig,
  demoConfig,
];

@Module({
  imports: [
    // ================= CONFIG =================
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: configModules as Parameters<typeof ConfigModule.forRoot>[0]['load'],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),

    // ================= SENTRY =================
    SentryModule.forRoot(),

    // ================= RATE LIMITING =================
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60,
        limit: 100,
      },
    ]),

    // ================= CORE =================
    ScheduleModule.forRoot(),

    // ================= SHARED =================
    SharedModule,
    TenantModule,

    // ================= COMPLIANCE =================
    AuditIntegrityModule,
    ComplianceModule,
    PerformanceMetricsModule,

    // ================= FEATURES =================
    DemoModule,
    AuthModule,
    UsersModule,
    RbacModule,
    ContactsModule,
    LeadsModule,
    DealsModule,
    PipelinesModule,
    DashboardModule,
    AnalyticsModule,
    ImportModule,
    EmailTemplatesModule,
    ExportQueueModule,
    FileStorageModule,
    WebhooksModule,
    AuditLogsModule,
  ] as const, // ✅ Fixes ESLint unsafe assignment error

  controllers: [AppController, HealthController, DebugController],

  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    AppService,
    ConfigValidationService,
  ],

  exports: [ConfigModule, ScheduleModule],
})
export class AppModule implements NestModule {
  constructor() {
    console.log('AppModule initialized with Phase 2A compliance features:');
    console.log('✅ Audit Integrity (Weeks 1-2)');
    console.log('✅ Performance Monitoring (Weeks 3-4)');
    console.log('✅ SOC 2 Compliance (Weeks 5-6)');
    console.log('✅ Tenant Module (Active)');
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, RequestContextMiddleware, CsrfMiddleware)
      .forRoutes('*');
  }
}

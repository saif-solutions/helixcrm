// apps/api/src/app.module.ts

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DemoModule } from './modules/demo/demo.module';

// Core application modules
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

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

// Shared infrastructure modules
import { SharedModule } from './shared/shared.module';

// Phase 2A Compliance Modules (Weeks 1-6)
import { AuditIntegrityModule } from './shared/audit-integrity/audit-integrity.module';
import { ComplianceModule } from './shared/compliance/compliance.module';

// Performance monitoring (Week 3-4)
import { PerformanceMetricsModule } from './shared/performance/performance-metrics.module';

// Configuration validation
import { ConfigValidationService } from './config/config-validation.service';

// ============ MIDDLEWARE IMPORTS ============
import { CorrelationIdMiddleware } from './shared/middleware/correlation-id.middleware';
import { RequestContextMiddleware } from './shared/middleware/request-context.middleware';

// ============ TENANT MODULE ============
import { TenantModule } from './shared/tenant/module/tenant.module';

@Module({
  imports: [
    // ============ CORE INFRASTRUCTURE ============
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      expandVariables: true,
    }),
    DemoModule,

    ScheduleModule.forRoot(),

    // ============ SHARED INFRASTRUCTURE ============
    SharedModule,
    TenantModule, // Add TenantModule here

    // ============ PHASE 2A: COMPLIANCE & SECURITY ============
    AuditIntegrityModule,
    ComplianceModule,
    PerformanceMetricsModule,

    // ============ BUSINESS FEATURES ============
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
  ],

  controllers: [AppController, HealthController],

  providers: [
    AppService,
    ConfigValidationService,
  ],

  exports: [
    ConfigModule,
    ScheduleModule,
  ],
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
      .apply(
        CorrelationIdMiddleware,
        RequestContextMiddleware,
      )
      .forRoutes('*');
  }
}

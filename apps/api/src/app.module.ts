import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

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
import { ImportModule } from "./modules/import/import.module";
import { EmailTemplatesModule } from "./modules/email-templates/email-templates.module";
import { ExportQueueModule } from "./modules/export-queue/export-queue.module";
import { FileStorageModule } from "./modules/file-storage/file-storage.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";

// Shared infrastructure modules
import { SharedModule } from './shared/shared.module';

// Phase 2A Compliance Modules (Weeks 1-6)
import { AuditIntegrityModule } from './shared/audit-integrity/audit-integrity.module';
import { ComplianceModule } from './shared/compliance/compliance.module';

// Performance monitoring (Week 3-4)
import { PerformanceMetricsModule } from './shared/performance/performance-metrics.module';

@Module({
  imports: [
    // ============ CORE INFRASTRUCTURE ============
    // Configuration - must be first and global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      expandVariables: true,
    }),

    // Task scheduling for background jobs
    ScheduleModule.forRoot(),

    // ============ SHARED INFRASTRUCTURE ============
    // Core shared services (logging, middleware, guards, etc.)
    SharedModule,

    // ============ PHASE 2A: COMPLIANCE & SECURITY ============
    // Week 1-2: Audit Integrity (Tamper-evident audit chain)
    AuditIntegrityModule,

    // Week 5-6: SOC 2 Compliance (Evidence collection & verification)
    ComplianceModule,

    // Week 3-4: Performance Monitoring (SLO validation)
    PerformanceMetricsModule,

    // ============ BUSINESS FEATURES ============
    // Authentication & Authorization
    AuthModule,
    UsersModule,
    RbacModule,

    // CRM Core Features
    ContactsModule,
    LeadsModule,
    DealsModule,
    PipelinesModule,

    // Reporting & Analytics
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

  providers: [AppService],

  exports: [
    // Export modules that might be used in tests or other contexts
    ConfigModule,
    ScheduleModule,
  ],
})
export class AppModule {
  constructor() {
    console.log('AppModule initialized with Phase 2A compliance features:');
    console.log('✅ Audit Integrity (Weeks 1-2)');
    console.log('✅ Performance Monitoring (Weeks 3-4)');
    console.log('✅ SOC 2 Compliance (Weeks 5-6)');
  }
}

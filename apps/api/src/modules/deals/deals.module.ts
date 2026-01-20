import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DealsService } from "./deals.service";
import { DealsController } from "./deals.controller";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { LoggingModule } from "../../shared/logging/logging.module";
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';
import { AuthGuard } from "../../shared/guards/auth.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";

@Module({
  imports: [
    PrismaModule,
    LoggingModule,
    AuditLogModule,
    AuditLogModule,
    AuditLogModule,
    AuditLogModule, // NEW: Import AuditLogModule for AuditLogService
    // Add JWT import for AuthGuard dependency
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [DealsController],
  providers: [
    DealsService,
    AuthGuard,
    TenantGuard,
  ],
  exports: [DealsService],
})
export class DealsModule {}

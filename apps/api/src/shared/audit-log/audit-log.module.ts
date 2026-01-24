import { Module } from "@nestjs/common";
import { LoggingModule } from "../logging/logging.module";
import { AuditLogService } from "./audit-log.service";

@Module({
  imports: [LoggingModule], // REMOVE PrismaModule
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
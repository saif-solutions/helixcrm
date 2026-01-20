import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { LoggingModule } from "../logging/logging.module";
import { AuditLogService } from "./audit-log.service";

@Module({
  imports: [PrismaModule, LoggingModule],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}

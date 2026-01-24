import { Module } from "@nestjs/common";
import { DealsService } from "./deals.service";
import { DealsController } from "./deals.controller";
import { LoggingModule } from "../../shared/logging/logging.module";
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

@Module({
  imports: [
    LoggingModule,
    AuditLogModule,
  ],
  controllers: [DealsController],
  providers: [
    DealsService,
  ],
  exports: [DealsService],
})
export class DealsModule {}
import { Module } from "@nestjs/common";
import { LeadsService } from "./leads.service";
import { LeadsController } from "./leads.controller";
import { LoggingModule } from "../../shared/logging/logging.module";

@Module({
  imports: [
    LoggingModule,
  ],
  controllers: [LeadsController],
  providers: [
    LeadsService,
  ],
  exports: [LeadsService],
})
export class LeadsModule {}
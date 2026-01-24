import { Module } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { LoggingModule } from "../../shared/logging/logging.module";

@Module({
  imports: [
    LoggingModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService], // Ensure this is exported
})
export class DashboardModule {}
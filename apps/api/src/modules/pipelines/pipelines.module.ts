import { Module } from "@nestjs/common";
import { PipelinesService } from "./pipelines.service";
import { PipelinesController } from "./pipelines.controller";
import { LoggingModule } from "../../shared/logging/logging.module";

@Module({
  imports: [
    LoggingModule,
  ],
  controllers: [PipelinesController],
  providers: [
    PipelinesService,
  ],
  exports: [PipelinesService],
})
export class PipelinesModule {}
import { Global, Module } from "@nestjs/common";
import { AppLogger } from "./logger.service";

@Global() // Makes AppLogger available globally
@Module({
  providers: [AppLogger],
  exports: [AppLogger],
})
export class LoggingModule {}

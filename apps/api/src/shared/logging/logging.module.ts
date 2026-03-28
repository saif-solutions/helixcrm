// apps/api/src/shared/logging/logging.module.ts

import { Global, Module } from '@nestjs/common';
import { AppLogger } from './logger.service';

/**
 * Logging Module
 *
 * Provides global logging service for the entire application.
 * Marked as @Global() so AppLogger is available everywhere without importing.
 *
 * @example
 * ```typescript
 * constructor(private logger: AppLogger) {
 *   this.logger.log('Service initialized');
 * }
 * ```
 */
@Global()
@Module({
  providers: [AppLogger],
  exports: [AppLogger],
})
export class LoggingModule {}

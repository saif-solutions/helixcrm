// apps/api/src/shared/prisma/prisma.module.ts

import { Global, Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';

/**
 * Prisma Module
 *
 * Provides database access through Prisma ORM with:
 * - Connection pooling and retry logic
 * - Health checking
 * - Query logging in development
 * - Graceful shutdown handling
 * - Database statistics monitoring
 *
 * @example
 * ```typescript
 * // In app.module.ts
 * @Module({
 *   imports: [PrismaModule],
 * })
 * export class AppModule {}
 *
 * // In any service
 * constructor(private prisma: PrismaService) {}
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {
  private readonly logger = new Logger(PrismaModule.name);

  constructor() {
    this.logger.log('PrismaModule initialized');
  }
}

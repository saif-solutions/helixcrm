import { Module, Global } from '@nestjs/common';
import { AuditIntegrityService } from './audit-integrity.service';
import { DailyVerificationJob } from './jobs/daily-verification.job';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditIntegrityController } from './audit-integrity.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuditIntegrityController],
  providers: [AuditIntegrityService, DailyVerificationJob],
  exports: [AuditIntegrityService]
})
export class AuditIntegrityModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { Soc2EvidenceService } from './soc2/soc2-evidence.service';
import { Soc2ControlsService } from './soc2/soc2-controls.service';
import { EvidenceStorageService } from './evidence-storage/evidence-storage.service';
import { ComplianceSchedulerService } from './compliance-scheduler.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [
    Soc2EvidenceService,
    EvidenceStorageService,
    Soc2ControlsService,
    ComplianceSchedulerService,
  ],
  exports: [Soc2EvidenceService, EvidenceStorageService, Soc2ControlsService],
})
export class ComplianceModule {}

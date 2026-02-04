// apps/api/src/shared/compliance/compliance.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config'; // Add this import
import { Soc2EvidenceService } from './soc2/soc2-evidence.service';
import { Soc2ControlsService } from './soc2/soc2-controls.service';
import { EvidenceStorageService } from './evidence-storage/evidence-storage.service';
import { ComplianceSchedulerService } from './compliance-scheduler.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot(), // Add this to provide ConfigService
  ],
  providers: [
    // Order matters: services without dependencies first
    Soc2EvidenceService,      // Only depends on PrismaService
    EvidenceStorageService,   // Only depends on PrismaService
    Soc2ControlsService,      // Only depends on PrismaService
    ComplianceSchedulerService, // Depends on Soc2EvidenceService, so must be last
  ],
  exports: [
    Soc2EvidenceService,
    EvidenceStorageService,
    Soc2ControlsService,
  ],
})
export class ComplianceModule {}

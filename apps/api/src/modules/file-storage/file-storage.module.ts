import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FileStorageController } from './file-storage.controller';
import { FileStorageService } from './file-storage.service';
import { FileRepository } from './repositories/file.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionsModule } from '../../shared/permissions/permissions.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'file-cleanup-queue',
    }),
    TenantModule,
    PermissionsModule,
    AuditLogModule,
  ],
  controllers: [FileStorageController],
  providers: [
    FileStorageService,
    FileRepository,
  ],
  exports: [FileStorageService],
})
export class FileStorageModule {}

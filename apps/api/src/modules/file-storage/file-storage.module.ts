// apps/api/src/modules/file-storage/file-storage.module.ts
import { Module, DynamicModule, Type } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FileStorageController } from './file-storage.controller';
import { FileStorageService } from './file-storage.service';
import { FileRepository } from './repositories/file.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionsModule } from '../../shared/permissions/permissions.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

// Pre-define Bull module registration to avoid type inference issues
const bullQueue = BullModule.registerQueue({
  name: 'file-cleanup-queue',
});

@Module({
  imports: [
    bullQueue,
    TenantModule,
    PermissionsModule,
    AuditLogModule,
  ] as Array<DynamicModule | Type<any>>,
  controllers: [FileStorageController],
  providers: [FileStorageService, FileRepository],
  exports: [FileStorageService],
})
export class FileStorageModule {}

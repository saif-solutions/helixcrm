import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { LoggingModule } from '../../shared/logging/logging.module';
import { ContactRepository } from './repositories/contact.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionContextModule } from '../../shared/permissions/context/permission-context.module';

@Module({
  imports: [
    LoggingModule,
    TenantModule,                 // Provides TenantContextService
    PermissionContextModule,       // Provides PermissionContextService
  ],
  controllers: [ContactsController],
  providers: [
    ContactsService,
    ContactRepository,
  ],
  exports: [ContactsService],
})
export class ContactsModule {}
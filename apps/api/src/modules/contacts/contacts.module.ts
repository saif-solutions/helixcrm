import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // ADD THIS IMPORT
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { LoggingModule } from '../../shared/logging/logging.module';
import { ContactRepository } from './repositories/contact.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { PermissionContextModule } from '../../shared/permissions/context/permission-context.module';

@Module({
  imports: [
    PrismaModule,
    LoggingModule,
    TenantModule,
    PermissionContextModule,
    JwtModule, // ADD THIS TO IMPORTS ARRAY
  ],
  controllers: [ContactsController],
  providers: [ContactsService, ContactRepository],
  exports: [ContactsService],
})
export class ContactsModule {}

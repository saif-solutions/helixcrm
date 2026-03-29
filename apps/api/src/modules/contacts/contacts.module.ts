// apps/api/src/modules/contacts/contacts.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { LoggingModule } from '../../shared/logging/logging.module';
import { ContactRepository } from './repositories/contact.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { PermissionContextModule } from '../../shared/permissions/context/permission-context.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

@Module({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  imports: [
    PrismaModule,
    LoggingModule,
    TenantModule,
    PermissionContextModule,
    JwtModule,
    AuditLogModule,
    CacheModule.register(),
  ],
  controllers: [ContactsController],
  providers: [ContactsService, ContactRepository],
  exports: [ContactsService],
})
export class ContactsModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionsModule } from './permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  exports: [PrismaModule, PermissionsModule],
})
export class SharedModule {}

// apps/api/src/shared/shared.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionsModule } from './permissions/permissions.module';
import { TenantModule } from './tenant/tenant.module'; // Add this import

@Module({
  imports: [PrismaModule, PermissionsModule, TenantModule], // Add TenantModule
  exports: [PrismaModule, PermissionsModule, TenantModule], // Add TenantModule
})
export class SharedModule {}
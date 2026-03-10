// apps/api/src/shared/shared.module.ts

import { Module, Global } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionsModule } from './permissions/permissions.module';
import { TenantModule } from './tenant/tenant.module';
import { GuardsModule } from './guards/guards.module';

@Global()
@Module({
  imports: [PrismaModule, PermissionsModule, TenantModule, GuardsModule],
  exports: [PrismaModule, PermissionsModule, TenantModule, GuardsModule],
})
export class SharedModule {}

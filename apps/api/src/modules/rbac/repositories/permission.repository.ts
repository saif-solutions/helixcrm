// src/modules/rbac/repositories/permission.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';

@Injectable()
export class PermissionRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async findByCodes(codes: string[]) {
    return this.prisma.permission.findMany({
      where: { code: { in: codes } },
    });
  }

  async findById(id: string) {
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }
}

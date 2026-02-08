import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';

@Injectable()
export class DashboardRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async getLeadCount(): Promise<number> {
    return this.prisma.lead.count({
      where: { organizationId: this.tenantId },
    });
  }

  async getContactCount(): Promise<number> {
    return this.prisma.contact.count({
      where: { organizationId: this.tenantId },
    });
  }

  async getDealCount(): Promise<number> {
    return this.prisma.deal.count({
      where: {
        organizationId: this.tenantId,
        deletedAt: null,
      },
    });
  }

  async getDealValueSum(): Promise<{ _sum: { amount: any | null } }> {
    return this.prisma.deal.aggregate({
      where: {
        organizationId: this.tenantId,
        deletedAt: null,
        status: 'won',
      },
      _sum: { amount: true },
    });
  }

  async getDefaultPipelineWithStats() {
    return this.prisma.pipeline.findFirst({
      where: {
        organizationId: this.tenantId,
        isDefault: true,
      },
      include: {
        stages: {
          include: {
            _count: {
              select: {
                deals: {
                  where: {
                    organizationId: this.tenantId,
                    deletedAt: null,
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            deals: {
              where: {
                organizationId: this.tenantId,
                deletedAt: null,
              },
            },
          },
        },
      },
    });
  }

  async getDealStatusDistribution(): Promise<
    Array<{
      status: string;
      _count: { id: number };
    }>
  > {
    const result = await this.prisma.deal.groupBy({
      by: ['status'],
      where: {
        organizationId: this.tenantId,
        deletedAt: null,
      },
      _count: { id: true },
    });

    return result as Array<{ status: string; _count: { id: number } }>;
  }
}

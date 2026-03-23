// apps/api/src/modules/deals/repositories/deal.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { Deal, Prisma } from '@prisma/client';

// Define types for better type safety
interface DealWhereInput extends Prisma.DealWhereInput {
  organizationId?: string;
  deletedAt?: Date | null;
}

interface StageStats {
  id: string;
  name: string;
  order: number;
  probability: number;
  dealCount: number;
  totalValue: number;
}

// Helper function for safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

@Injectable()
export class DealRepository extends TenantAwareRepository {
  private readonly logger = new Logger(DealRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, includeDeleted = false): Promise<Deal | null> {
    try {
      const where: DealWhereInput = this.withTenantFilter({ id });

      if (!includeDeleted) {
        where.deletedAt = null;
      }

      const deal = await this.prisma.deal.findFirst({
        where,
        include: {
          contact: true,
          account: true,
          owner: true,
          stage: true,
          pipeline: {
            include: {
              stages: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });

      if (!deal) {
        this.logger.warn(`Deal not found: ${id} in tenant: ${this.tenantId}`);
      }

      return deal;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to find deal ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findByIdOrThrow(id: string, includeDeleted = false): Promise<Deal> {
    const deal = await this.findById(id, includeDeleted);
    if (!deal) {
      throw new Error(`Deal with ID ${id} not found in current tenant`);
    }
    return deal;
  }

  async create(
    data: Omit<Prisma.DealCreateInput, 'organization'>,
  ): Promise<Deal> {
    try {
      const tenantId = this.tenantId;

      const tenantData: Prisma.DealCreateInput = {
        ...data,
        organization: {
          connect: { id: tenantId },
        },
      };

      const deal = await this.prisma.deal.create({
        data: tenantData,
        include: {
          contact: true,
          account: true,
          owner: true,
          stage: true,
          pipeline: true,
        },
      });

      this.logger.log(`Deal created: ${deal.id} in tenant: ${tenantId}`);
      return deal;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to create deal: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async update(params: {
    id: string;
    data: Prisma.DealUpdateInput;
  }): Promise<Deal> {
    try {
      await this.findByIdOrThrow(params.id);

      const where: DealWhereInput = {
        id: params.id,
        organizationId: this.tenantId,
      };

      const deal = await this.prisma.deal.update({
        where,
        data: params.data,
        include: {
          contact: true,
          account: true,
          owner: true,
          stage: true,
          pipeline: true,
        },
      });

      this.logger.log(`Deal updated: ${deal.id}`);
      return deal;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to update deal ${params.id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async softDelete(id: string): Promise<Deal> {
    try {
      await this.findByIdOrThrow(id);

      const where: DealWhereInput = {
        id,
        organizationId: this.tenantId,
      };

      const deal = await this.prisma.deal.update({
        where,
        data: { deletedAt: new Date() },
        include: {
          contact: true,
          account: true,
          owner: true,
          stage: true,
          pipeline: true,
        },
      });

      this.logger.log(`Deal soft deleted: ${id}`);
      return deal;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to soft delete deal ${id}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.DealWhereInput;
    orderBy?: Prisma.DealOrderByWithRelationInput;
    includeDeleted?: boolean;
  }): Promise<Deal[]> {
    const { skip, take, where = {}, orderBy, includeDeleted } = params;

    const whereWithTenant: DealWhereInput = this.withTenantFilter({
      ...where,
      ...(includeDeleted ? {} : { deletedAt: null }),
    });

    return this.prisma.deal.findMany({
      skip,
      take,
      where: whereWithTenant,
      orderBy,
      include: {
        stage: true,
        pipeline: true,
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async count(
    where?: Prisma.DealWhereInput,
    includeDeleted = false,
  ): Promise<number> {
    try {
      const tenantWhere: DealWhereInput = this.withTenantFilter(where || {});

      if (!includeDeleted) {
        tenantWhere.deletedAt = null;
      }

      return this.prisma.deal.count({ where: tenantWhere });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to count deals: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async moveStage(
    dealId: string,
    stageId: string,
    changedByUserId: string,
  ): Promise<Deal> {
    try {
      const existingDeal = await this.findByIdOrThrow(dealId);

      await this.prisma.dealStageHistory.create({
        data: {
          deal: { connect: { id: dealId } },
          fromStage: existingDeal.stageId
            ? { connect: { id: existingDeal.stageId } }
            : undefined,
          toStage: { connect: { id: stageId } },
          changedBy: { connect: { id: changedByUserId } },
        },
      });

      const where: DealWhereInput = {
        id: dealId,
        organizationId: this.tenantId,
      };

      const deal = await this.prisma.deal.update({
        where,
        data: {
          stage: { connect: { id: stageId } },
        },
        include: {
          contact: true,
          account: true,
          owner: true,
          stage: true,
          pipeline: true,
        },
      });

      this.logger.log(`Deal stage moved: ${dealId} to ${stageId}`);
      return deal;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to move deal stage ${dealId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getDealStats(pipelineId?: string): Promise<{
    totalCount: number;
    totalValue: number;
    wonCount: number;
    wonValue: number;
    lostCount: number;
    openCount: number;
    averageDealValue: number;
    winRate: number;
  }> {
    try {
      const where: DealWhereInput = this.withTenantFilter({ deletedAt: null });

      if (pipelineId) {
        where.pipelineId = pipelineId;
      }

      const [
        totalCount,
        totalValueAgg,
        wonCount,
        wonValueAgg,
        lostCount,
        openCount,
      ] = await Promise.all([
        this.prisma.deal.count({ where }),
        this.prisma.deal.aggregate({ where, _sum: { amount: true } }),
        this.prisma.deal.count({ where: { ...where, status: 'won' } }),
        this.prisma.deal.aggregate({
          where: { ...where, status: 'won' },
          _sum: { amount: true },
        }),
        this.prisma.deal.count({ where: { ...where, status: 'lost' } }),
        this.prisma.deal.count({ where: { ...where, status: 'open' } }),
      ]);

      const totalAmount = totalValueAgg._sum.amount
        ? Number(totalValueAgg._sum.amount)
        : 0;
      const wonAmount = wonValueAgg._sum.amount
        ? Number(wonValueAgg._sum.amount)
        : 0;
      const averageDealValue = totalCount > 0 ? totalAmount / totalCount : 0;
      const winRate = totalCount > 0 ? (wonCount / totalCount) * 100 : 0;

      return {
        totalCount,
        totalValue: totalAmount,
        wonCount,
        wonValue: wonAmount,
        lostCount,
        openCount,
        averageDealValue,
        winRate,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to get deal stats: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getPipelinePerformance(pipelineId?: string): Promise<StageStats[]> {
    try {
      const where: DealWhereInput = this.withTenantFilter({ deletedAt: null });

      if (pipelineId) {
        where.pipelineId = pipelineId;
      }

      const stageStats = await this.prisma.deal.groupBy({
        by: ['stageId'],
        where,
        _count: { id: true },
        _sum: { amount: true },
      });

      const stageWhere: {
        pipelineId?: string;
        pipeline?: { organizationId: string };
      } = {
        pipeline: this.withTenantFilter({}),
      };
      if (pipelineId) {
        stageWhere.pipelineId = pipelineId;
      }

      const stageDetails = await this.prisma.pipelineStage.findMany({
        where: stageWhere,
        select: {
          id: true,
          name: true,
          order: true,
          probability: true,
        },
        orderBy: { order: 'asc' },
      });

      return stageDetails.map((stage) => {
        const stat = stageStats.find((s) => s.stageId === stage.id);
        const totalValue = stat?._sum.amount ? Number(stat._sum.amount) : 0;

        return {
          id: stage.id,
          name: stage.name,
          order: stage.order,
          probability: stage.probability,
          dealCount: stat?._count.id ?? 0,
          totalValue,
        };
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to get pipeline performance: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getStageHistory(dealId: string): Promise<any[]> {
    try {
      await this.findByIdOrThrow(dealId);

      return this.prisma.dealStageHistory.findMany({
        where: { dealId },
        include: {
          fromStage: {
            select: { id: true, name: true, order: true },
          },
          toStage: {
            select: { id: true, name: true, order: true, probability: true },
          },
          changedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { changedAt: 'desc' },
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to get stage history ${dealId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async search(searchTerm: string, limit = 20): Promise<Deal[]> {
    try {
      const where: DealWhereInput = this.withTenantFilter({
        deletedAt: null,
        OR: [{ name: { contains: searchTerm, mode: 'insensitive' } }],
      });

      return this.prisma.deal.findMany({
        where,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          account: { select: { id: true, name: true } },
          owner: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          stage: {
            select: { id: true, name: true, order: true, probability: true },
          },
          pipeline: { select: { id: true, name: true } },
        },
        take: Math.min(limit, 100),
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to search deals: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}

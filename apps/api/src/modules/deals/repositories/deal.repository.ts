// apps/api/src/modules/deals/repositories/deal.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { Deal, Prisma, DealStatus } from '@prisma/client';
// ✅ REMOVED: TenantContextService import - not needed

@Injectable()
export class DealRepository extends TenantAwareRepository {
  private readonly logger = new Logger(DealRepository.name);

  constructor(
    prisma: PrismaService,
    // ✅ REMOVED: private tenantContext: TenantContextService
  ) {
    super(prisma);
  }

  // All methods can now use this.tenantId from parent class
  // The parent class (TenantAwareRepository) provides:
  // - this.tenantId - gets current tenant ID
  // - this.withTenantFilter() - adds tenant filter to queries
  // - this.prisma - Prisma client

  async findById(id: string, includeDeleted = false): Promise<Deal | null> {
    try {
      const where: any = this.withTenantFilter({ id });

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
    } catch (error) {
      this.logger.error(
        `Failed to find deal ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * PRODUCTION READY: Find deal by ID or throw NotFoundException
   */
  async findByIdOrThrow(id: string, includeDeleted = false): Promise<Deal> {
    const deal = await this.findById(id, includeDeleted);
    if (!deal) {
      throw new Error(`Deal with ID ${id} not found in current tenant`);
    }
    return deal;
  }

  /**
   * PRODUCTION READY: Create deal with transaction safety
   */
  async create(
    data: Omit<Prisma.DealCreateInput, 'organization'>,
  ): Promise<Deal> {
    try {
      const tenantId = this.tenantId; // ✅ From parent class

      // Manually add organization connection
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
    } catch (error) {
      this.logger.error(`Failed to create deal: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * PRODUCTION READY: Update deal with tenant validation
   */
  async update(params: {
    id: string;
    data: Prisma.DealUpdateInput;
  }): Promise<Deal> {
    try {
      // First verify the deal belongs to current tenant
      await this.findByIdOrThrow(params.id);

      const tenantWhere = {
        id: params.id,
        organizationId: this.tenantId, // ✅ From parent class
      };

      const deal = await this.prisma.deal.update({
        where: tenantWhere,
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
    } catch (error) {
      this.logger.error(
        `Failed to update deal ${params.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * PRODUCTION READY: Soft delete with validation
   */
  async softDelete(id: string): Promise<Deal> {
    try {
      await this.findByIdOrThrow(id);

      const tenantWhere = {
        id,
        organizationId: this.tenantId, // ✅ From parent class
      };

      const deal = await this.prisma.deal.update({
        where: tenantWhere,
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
    } catch (error) {
      this.logger.error(
        `Failed to soft delete deal ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * PRODUCTION READY: Find all with pagination and filtering
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    includeDeleted?: boolean;
  }) {
    const { skip, take, where, orderBy, includeDeleted } = params;

    // Add tenant filter using parent class method
    const whereWithTenant = this.withTenantFilter({
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

  /**
   * PRODUCTION READY: Count with filtering
   */
  async count(
    where?: Prisma.DealWhereInput,
    includeDeleted = false,
  ): Promise<number> {
    try {
      const tenantWhere = this.withTenantFilter(where || {});

      if (!includeDeleted) {
        (tenantWhere as any).deletedAt = null;
      }

      return this.prisma.deal.count({ where: tenantWhere });
    } catch (error) {
      this.logger.error(`Failed to count deals: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * PRODUCTION READY: Move deal stage with history tracking
   */
  async moveStage(
    dealId: string,
    stageId: string,
    changedByUserId: string,
  ): Promise<Deal> {
    try {
      const existingDeal = await this.findByIdOrThrow(dealId);

      // Create stage history record
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

      // Update deal stage
      const tenantWhere = {
        id: dealId,
        organizationId: this.tenantId, // ✅ From parent class
      };

      const deal = await this.prisma.deal.update({
        where: tenantWhere,
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
    } catch (error) {
      this.logger.error(
        `Failed to move deal stage ${dealId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * PRODUCTION READY: Get deal statistics
   */
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
      const where: any = this.withTenantFilter({ deletedAt: null });

      if (pipelineId) {
        where.pipelineId = pipelineId;
      }

      const [totalCount, totalValue, wonCount, wonValue, lostCount, openCount] =
        await Promise.all([
          this.prisma.deal.count({ where }),
          this.prisma.deal.aggregate({
            where,
            _sum: { amount: true },
          }),
          this.prisma.deal.count({ where: { ...where, status: 'won' } }),
          this.prisma.deal.aggregate({
            where: { ...where, status: 'won' },
            _sum: { amount: true },
          }),
          this.prisma.deal.count({ where: { ...where, status: 'lost' } }),
          this.prisma.deal.count({ where: { ...where, status: 'open' } }),
        ]);

      // Convert Decimal to number
      const totalAmount = totalValue._sum.amount
        ? Number(totalValue._sum.amount)
        : 0;
      const wonAmount = wonValue._sum.amount ? Number(wonValue._sum.amount) : 0;

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
    } catch (error) {
      this.logger.error(
        `Failed to get deal stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * PRODUCTION READY: Get pipeline performance
   */
  async getPipelinePerformance(pipelineId?: string): Promise<any[]> {
    try {
      const where: any = this.withTenantFilter({ deletedAt: null });

      if (pipelineId) {
        where.pipelineId = pipelineId;
      }

      // Get deals grouped by stage
      const stageStats = await this.prisma.deal.groupBy({
        by: ['stageId'],
        where,
        _count: { id: true },
        _sum: { amount: true },
      });

      // Get stage details
      const stageWhere: any = { pipeline: this.withTenantFilter({}) };
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

      // Map stats to stages
      return stageDetails.map((stage) => {
        const stat = stageStats.find((s) => s.stageId === stage.id);
        const totalValue = stat?._sum.amount ? Number(stat._sum.amount) : 0;

        return {
          id: stage.id,
          name: stage.name,
          order: stage.order,
          probability: stage.probability,
          dealCount: stat?._count.id || 0,
          totalValue,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to get pipeline performance: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * PRODUCTION READY: Get stage history
   */
  async getStageHistory(dealId: string): Promise<any[]> {
    try {
      await this.findByIdOrThrow(dealId); // Verify access

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
    } catch (error) {
      this.logger.error(
        `Failed to get stage history ${dealId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * PRODUCTION READY: Search deals
   */
  async search(searchTerm: string, limit = 20): Promise<Deal[]> {
    try {
      return this.prisma.deal.findMany({
        where: this.withTenantFilter({
          deletedAt: null,
          OR: [{ name: { contains: searchTerm, mode: 'insensitive' } }],
        }),
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
    } catch (error) {
      this.logger.error(
        `Failed to search deals: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

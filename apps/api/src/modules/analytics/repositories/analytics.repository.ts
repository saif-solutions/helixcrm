// apps/api/src/modules/analytics/repositories/analytics.repository.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import {
  DealAnalyticsQueryDto,
  RevenueAnalyticsQueryDto,
  PipelineAnalyticsQueryDto,
  ActivityAnalyticsQueryDto,
  AnalyticsGroupBy,
  AnalyticsExportQueryDto,
} from '../dto/analytics-query.dto';
import {
  DealAnalyticsResponse,
  RevenueAnalyticsResponse,
  PipelineAnalyticsResponse,
  ActivityAnalyticsResponse,
  DealAnalyticsData,
  RevenueDataPoint,
  StageMetrics,
  ActivityRecord,
  ExportJob,
} from '../types/analytics.types';
import { toSafeNumber, isRecord } from '../../../shared/utils/type-guards';

// Define constants for deal statuses to avoid magic strings
const DEAL_STATUS = {
  WON: 'WON',
  LOST: 'LOST',
  OPEN: 'OPEN',
  ACTIVE: 'ACTIVE',
  NEW: 'NEW',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL: 'PROPOSAL',
  NEGOTIATION: 'NEGOTIATION',
} as const;

type DealStatus = (typeof DEAL_STATUS)[keyof typeof DEAL_STATUS];

// Define types for processed query with proper Date objects
interface ProcessedQuery {
  startDate: Date;
  endDate: Date;
  pipelineId?: string;
  stageId?: string;
  ownerUserId?: string;
  includeBottlenecks?: boolean;
  includeDuration?: boolean;
  durationDays?: number;
  limit?: number;
  page?: number;
  currency?: string;
  status?: string;
  [key: string]: unknown;
}

// Define types for deal statistics
interface DealStats {
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  salesVelocity: number;
}

// Define types for recurring revenue stats
interface RecurringRevenueStats {
  mrr: number;
  arr: number;
}

// Define bottleneck type
interface Bottleneck {
  stageId: string;
  stageName: string;
  averageDuration: number;
  stuckDeals: number;
  recommendation: string;
}

// Define pipeline stage data type
interface PipelineStageData {
  id: string;
  name: string;
  order: number;
  dealCount: number;
  totalValue: number;
  avgStageDuration: number;
  conversionRate: number;
  probability: number;
}

// Define pipeline data type
interface PipelineData {
  id: string;
  name: string;
  stages: PipelineStageData[];
  activeDeals: number;
  totalValue: number;
}

@Injectable()
export class AnalyticsRepository extends TenantAwareRepository {
  private readonly logger = new Logger(AnalyticsRepository.name);
  private readonly defaultDateRangeDays = 30;

  private readonly ACTIVE_DEAL_STATUSES: readonly DealStatus[] = [
    DEAL_STATUS.NEW,
    DEAL_STATUS.QUALIFIED,
    DEAL_STATUS.PROPOSAL,
    DEAL_STATUS.NEGOTIATION,
  ] as const;

  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get deal analytics from operational tables
   */
  async getDealAnalyticsFromOperational(
    query: DealAnalyticsQueryDto,
  ): Promise<DealAnalyticsResponse> {
    try {
      const tenantId = this.tenantId;
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }

      const processedQuery = this.processDateRange(query);
      const where = this.buildDealWhereClause(tenantId, processedQuery);

      const [dealsOverTime, stageMetrics, totalValue, wonValue, dealStats] =
        await Promise.all([
          this.getDealsOverTime(tenantId, processedQuery),
          this.getStageMetrics(tenantId, processedQuery),
          this.prisma.deal.aggregate({
            where,
            _sum: { amount: true },
            _count: true,
          }),
          this.prisma.deal.aggregate({
            where: { ...where, status: DEAL_STATUS.WON },
            _sum: { amount: true },
            _count: true,
          }),
          this.getDealStatistics(tenantId, processedQuery),
        ]);

      // Mark unused variables as intentionally unused
      void stageMetrics;

      const totalDeals = dealStats.totalDeals;
      const wonDeals = dealStats.wonDeals;
      const lostDeals = dealStats.lostDeals;
      const openDeals = dealStats.openDeals;
      const totalRevenue = toSafeNumber(totalValue._sum.amount, 0);
      const averageDealValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;
      const winRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

      // Transform dealsOverTime to DealAnalyticsData format
      const data: DealAnalyticsData[] = dealsOverTime.map((item) => ({
        period: item.date,
        totalDeals: item.count,
        wonDeals: 0,
        lostDeals: 0,
        openDeals: 0,
        averageDealValue: 0,
        winRate: 0,
      }));

      return {
        period: query.groupBy || AnalyticsGroupBy.DAY,
        totalDeals,
        wonDeals,
        lostDeals,
        openDeals,
        averageDealValue,
        winRate,
        salesVelocity: dealStats.salesVelocity,
        data,
        summary: {
          startDate: processedQuery.startDate.toISOString(),
          endDate: processedQuery.endDate.toISOString(),
          totalValue: totalRevenue,
          wonValue: toSafeNumber(wonValue._sum.amount, 0),
          pipelineId: query.pipelineId,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get deal analytics: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId: this.tenantId,
          query,
        },
      );
      throw new BadRequestException(
        `Failed to fetch deal analytics: ${errorMessage}`,
      );
    }
  }

  /**
   * Get revenue analytics from operational tables
   */
  async getRevenueAnalyticsFromOperational(
    query: RevenueAnalyticsQueryDto,
  ): Promise<RevenueAnalyticsResponse> {
    try {
      const tenantId = this.tenantId;
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }

      const processedQuery = this.processDateRange(query);
      const where = this.buildDealWhereClause(tenantId, processedQuery);

      const [revenueOverTime, forecastRevenue, totalRevenue] =
        await Promise.all([
          this.getRevenueOverTime(tenantId, processedQuery),
          this.calculateForecastRevenue(tenantId, processedQuery),
          this.prisma.deal.aggregate({
            where,
            _sum: { amount: true },
          }),
        ]);

      const recurringStats = await this.getRecurringRevenueStats(
        tenantId,
        processedQuery,
      );

      const totalRevenueAmount = toSafeNumber(totalRevenue._sum.amount, 0);
      const forecastRevenueAmount = forecastRevenue || 0;
      const mrr = recurringStats.mrr;
      const arr = recurringStats.arr;

      // Transform revenueOverTime to RevenueDataPoint format
      const data: RevenueDataPoint[] = revenueOverTime.map((item) => ({
        period: item.date,
        revenue: item.revenue,
        forecastRevenue: 0,
        dealCount: 0,
        averageDealSize: 0,
      }));

      return {
        period: query.groupBy || AnalyticsGroupBy.MONTH,
        totalRevenue: totalRevenueAmount,
        forecastRevenue: forecastRevenueAmount,
        mrr,
        arr,
        currency: query.currency || 'USD',
        data,
        summary: {
          startDate: processedQuery.startDate.toISOString(),
          endDate: processedQuery.endDate.toISOString(),
          growthRate: this.calculateGrowthRate(revenueOverTime),
          bestPerformingPipeline: await this.getBestPerformingPipeline(
            tenantId,
            processedQuery,
          ),
          topPerformer: await this.getTopPerformer(tenantId, processedQuery),
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get revenue analytics: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId: this.tenantId,
          query,
        },
      );
      throw new BadRequestException(
        `Failed to fetch revenue analytics: ${errorMessage}`,
      );
    }
  }

  /**
   * Get pipeline analytics from operational tables
   */
  async getPipelineAnalyticsFromOperational(
    query: PipelineAnalyticsQueryDto,
  ): Promise<PipelineAnalyticsResponse> {
    try {
      const tenantId = this.tenantId;
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }

      const processedQuery = this.processDateRange(query);

      const [pipelineData, bottleneckData, pipelineStats] = await Promise.all([
        this.getPipelineDataFromOperational(tenantId, processedQuery),
        query.includeBottlenecks
          ? this.getPipelineBottlenecks(tenantId, processedQuery)
          : Promise.resolve([] as Bottleneck[]),
        this.getPipelineStatistics(tenantId, processedQuery),
      ]);

      const stages: StageMetrics[] = pipelineData.flatMap((pipeline) =>
        pipeline.stages.map((stage) => ({
          stageId: stage.id,
          stageName: stage.name,
          order: stage.order,
          dealCount: stage.dealCount,
          totalValue: stage.totalValue,
          averageDuration: stage.avgStageDuration,
          conversionRate: stage.conversionRate,
          probability: stage.probability,
        })),
      );

      return {
        pipelineId: query.pipelineId,
        pipelineName: pipelineData[0]?.name,
        stages,
        averageDealDuration: pipelineStats.averageDealDuration || 0,
        bottlenecks: bottleneckData,
        summary: {
          totalDeals: pipelineStats.totalDeals,
          totalValue: pipelineStats.totalValue,
          averageWinRate: pipelineStats.averageWinRate,
          averageSalesCycle: pipelineStats.averageSalesCycle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get pipeline analytics: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId: this.tenantId,
          query,
        },
      );
      throw new BadRequestException(
        `Failed to fetch pipeline analytics: ${errorMessage}`,
      );
    }
  }

  /**
   * Get activity analytics from operational tables
   */
  async getActivityAnalyticsFromOperational(
    query: ActivityAnalyticsQueryDto,
  ): Promise<ActivityAnalyticsResponse> {
    try {
      const tenantId = this.tenantId;
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }

      const processedQuery = this.processDateRange(query);
      const { limit = 20, page = 1 } = processedQuery;
      const skip = (page - 1) * limit;

      const where = this.buildActivityWhereClause(tenantId, processedQuery);

      const [activities, total, byType, userActivity] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          include: {
            actor: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.auditLog.count({ where }),
        this.prisma.auditLog.groupBy({
          by: ['entityType', 'action'],
          where,
          _count: true,
        }),
        this.getUserActivityStats(tenantId, processedQuery),
      ]);

      const recentActivities: ActivityRecord[] = activities.map((log) => ({
        id: log.id,
        type: log.action,
        userId: log.actorUserId || '',
        userEmail: log.actor?.email || log.actorEmail || '',
        userName:
          log.actor?.firstName && log.actor?.lastName
            ? `${log.actor.firstName} ${log.actor.lastName}`
            : log.actor?.email || log.actorEmail || 'Unknown',
        entityType: log.entityType,
        entityId: log.entityId || '',
        timestamp: log.createdAt.toISOString(),
        metadata: isRecord(log.metadata) ? log.metadata : {},
      }));

      const activityByType = byType.reduce<Record<string, number>>(
        (acc, item) => {
          const key = `${item.entityType}:${item.action}`;
          acc[key] = item._count;
          return acc;
        },
        {},
      );

      return {
        totalActivities: total,
        byType: activityByType,
        recentActivities,
        userActivity,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get activity analytics: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId: this.tenantId,
          query,
        },
      );
      throw new BadRequestException(
        `Failed to fetch activity analytics: ${errorMessage}`,
      );
    }
  }

  /**
   * Get available exports for user/tenant
   */
  getAvailableExports(
    query: AnalyticsExportQueryDto,
    tenantId: string,
    userId: string,
  ): Promise<ExportJob[]> {
    try {
      // Build where clause with proper typing
      const where: {
        organizationId: string;
        userId: string;
        status?: string;
        createdAt?: { gte?: Date; lte?: Date };
      } = {
        organizationId: tenantId,
        userId,
      };

      if (query.status) {
        where.status = query.status;
      }
      if (query.startDate) {
        where.createdAt = {
          ...where.createdAt,
          gte: new Date(query.startDate),
        };
      }
      if (query.endDate) {
        where.createdAt = {
          ...where.createdAt,
          lte: new Date(query.endDate),
        };
      }

      // TODO: Uncomment when prisma.analyticsExport is available
      // const exports = await this.prisma.analyticsExport.findMany({
      //   where,
      //   orderBy: { createdAt: 'desc' },
      //   take: query.limit || 50,
      //   skip: query.page && query.limit ? (query.page - 1) * query.limit : 0
      // });
      //
      // return exports.map((exp) => ({
      //   exportId: exp.id,
      //   organizationId: exp.organizationId,
      //   userId: exp.userId,
      //   format: exp.format,
      //   include: exp.include as AnalyticsExportInclude[],
      //   status: exp.status,
      //   downloadToken: exp.downloadToken,
      //   downloadUrl: exp.downloadUrl || undefined,
      //   fileSize: exp.fileSize || undefined,
      //   recordCount: exp.recordCount || undefined,
      //   createdAt: exp.createdAt.toISOString(),
      //   completedAt: exp.completedAt?.toISOString(),
      //   expiresAt: exp.expiresAt.toISOString(),
      // }));

      // Return empty array for now until export functionality is implemented
      // Cast to ExportJob[] to satisfy type safety
      return [] as ExportJob[];
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get available exports: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId,
          userId,
          query,
        },
      );
      throw new BadRequestException(
        `Failed to fetch available exports: ${errorMessage}`,
      );
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Process date range from query, converting string dates to Date objects
   */
  private processDateRange<
    T extends { startDate?: string | Date; endDate?: string | Date },
  >(query: T): ProcessedQuery {
    const { startDate, endDate, ...rest } = query;

    // Convert string dates to Date objects, handle undefined
    const processedStartDate = startDate
      ? new Date(startDate)
      : new Date(Date.now() - this.defaultDateRangeDays * 24 * 60 * 60 * 1000);

    const processedEndDate = endDate ? new Date(endDate) : new Date();

    // Validate dates
    if (isNaN(processedStartDate.getTime())) {
      throw new BadRequestException('Invalid start date format');
    }
    if (isNaN(processedEndDate.getTime())) {
      throw new BadRequestException('Invalid end date format');
    }

    return {
      ...rest,
      startDate: processedStartDate,
      endDate: processedEndDate,
    } as ProcessedQuery;
  }

  private buildDealWhereClause(
    tenantId: string,
    query: ProcessedQuery,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {
      organizationId: tenantId,
      deletedAt: null,
    };

    // Build createdAt filter
    const createdAt: Record<string, Date> = {};
    if (query.startDate) createdAt.gte = query.startDate;
    if (query.endDate) createdAt.lte = query.endDate;

    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }

    // Add optional filters
    if (query.pipelineId) {
      where.pipelineId = query.pipelineId;
    }

    if (query.stageId) {
      where.stageId = query.stageId;
    }

    if (query.ownerUserId) {
      where.ownerUserId = query.ownerUserId;
    }

    return where;
  }

  private buildActivityWhereClause(
    tenantId: string,
    query: ProcessedQuery,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {
      organizationId: tenantId,
    };

    const createdAt: Record<string, Date> = {};
    if (query.startDate) createdAt.gte = query.startDate;
    if (query.endDate) createdAt.lte = query.endDate;

    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }

    return where;
  }

  private async getDealsOverTime(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<Array<{ date: string; count: number }>> {
    const deals = await this.prisma.deal.findMany({
      where: this.buildDealWhereClause(tenantId, query),
      select: { createdAt: true },
    });

    const grouped = deals.reduce<Record<string, number>>((acc, deal) => {
      const date = deal.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  }

  private async getStageMetrics(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<Array<{ stage: string; count: number; value: number }>> {
    const deals = await this.prisma.deal.findMany({
      where: this.buildDealWhereClause(tenantId, query),
      select: {
        status: true,
        amount: true,
      },
    });

    const grouped = deals.reduce<
      Record<string, { count: number; value: number }>
    >((acc, deal) => {
      const stage = deal.status;
      if (!acc[stage]) {
        acc[stage] = { count: 0, value: 0 };
      }
      acc[stage].count += 1;
      acc[stage].value += toSafeNumber(deal.amount, 0);
      return acc;
    }, {});

    return Object.entries(grouped).map(([stage, metrics]) => ({
      stage,
      count: metrics.count,
      value: metrics.value,
    }));
  }

  private async getDealStatistics(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<DealStats> {
    const where = this.buildDealWhereClause(tenantId, query);

    const [total, won, lost, open, velocity] = await Promise.all([
      this.prisma.deal.count({ where }),
      this.prisma.deal.count({ where: { ...where, status: DEAL_STATUS.WON } }),
      this.prisma.deal.count({ where: { ...where, status: DEAL_STATUS.LOST } }),
      this.prisma.deal.count({ where: { ...where, status: DEAL_STATUS.OPEN } }),
      this.calculateSalesVelocity(tenantId, query),
    ]);

    return {
      totalDeals: total,
      wonDeals: won,
      lostDeals: lost,
      openDeals: open,
      salesVelocity: velocity,
    };
  }

  private async calculateSalesVelocity(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<number> {
    const deals = await this.prisma.deal.findMany({
      where: {
        ...this.buildDealWhereClause(tenantId, query),
        status: DEAL_STATUS.WON,
        createdAt: { not: null },
        closedAt: { not: null },
      },
      select: {
        createdAt: true,
        closedAt: true,
      },
      take: 100,
    });

    if (deals.length === 0) return 0;

    const totalDays = deals.reduce((sum, deal) => {
      const days = Math.ceil(
        (deal.closedAt.getTime() - deal.createdAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return sum + days;
    }, 0);

    return totalDays / deals.length;
  }

  private async calculateForecastRevenue(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<number> {
    const deals = await this.prisma.deal.findMany({
      where: {
        ...this.buildDealWhereClause(tenantId, query),
        expectedCloseDate: { not: null },
        status: {
          in: [DEAL_STATUS.OPEN, DEAL_STATUS.ACTIVE, DEAL_STATUS.NEGOTIATION],
        },
      },
      select: {
        amount: true,
        probability: true,
      },
    });

    return deals.reduce((sum, deal) => {
      const probability = deal.probability || 50;
      return sum + (toSafeNumber(deal.amount, 0) * probability) / 100;
    }, 0);
  }

  private async getRevenueOverTime(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<Array<{ date: string; revenue: number }>> {
    const deals = await this.prisma.deal.findMany({
      where: {
        ...this.buildDealWhereClause(tenantId, query),
        status: DEAL_STATUS.WON,
      },
      select: {
        closedAt: true,
        amount: true,
      },
    });

    const grouped = deals.reduce<Record<string, number>>((acc, deal) => {
      if (deal.closedAt) {
        const date = deal.closedAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + toSafeNumber(deal.amount, 0);
      }
      return acc;
    }, {});

    return Object.entries(grouped).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }

  private calculateGrowthRate(
    revenueOverTime: Array<{ date: string; revenue: number }>,
  ): number {
    if (revenueOverTime.length < 2) return 0;

    const sorted = [...revenueOverTime].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const firstPeriod = sorted[0].revenue;
    const lastPeriod = sorted[sorted.length - 1].revenue;

    if (firstPeriod === 0) return lastPeriod > 0 ? 100 : 0;

    return ((lastPeriod - firstPeriod) / firstPeriod) * 100;
  }

  /**
   * Get recurring revenue statistics
   * Note: This method returns a Promise for consistency with repository pattern
   * In production, this would query subscription/recurring revenue data
   */
  private getRecurringRevenueStats(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _tenantId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: ProcessedQuery,
  ): Promise<RecurringRevenueStats> {
    // Simplified MRR/ARR calculation
    // In production, this would query subscription/recurring revenue data
    // For now, return mock data synchronously wrapped in Promise
    return Promise.resolve({
      mrr: 0,
      arr: 0,
    });
  }

  private async getBestPerformingPipeline(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<string | undefined> {
    const pipelineStats = await this.prisma.deal.groupBy({
      by: ['pipelineId'],
      where: this.buildDealWhereClause(tenantId, query),
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 1,
    });

    if (pipelineStats.length === 0 || !pipelineStats[0].pipelineId) {
      return undefined;
    }

    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineStats[0].pipelineId },
      select: { name: true },
    });

    return pipeline?.name;
  }

  private async getTopPerformer(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<string | undefined> {
    const userStats = await this.prisma.deal.groupBy({
      by: ['ownerUserId'],
      where: this.buildDealWhereClause(tenantId, query),
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 1,
    });

    if (userStats.length === 0 || !userStats[0].ownerUserId) {
      return undefined;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userStats[0].ownerUserId },
      select: { email: true, firstName: true, lastName: true },
    });

    return user?.email;
  }

  private async getPipelineDataFromOperational(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<PipelineData[]> {
    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        organizationId: tenantId,
        deletedAt: null,
        ...(query.pipelineId ? { id: query.pipelineId } : {}),
      },
      include: {
        stages: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          include: {
            deals: {
              where: {
                deletedAt: null,
                createdAt: {
                  ...(query.startDate ? { gte: query.startDate } : {}),
                  ...(query.endDate ? { lte: query.endDate } : {}),
                },
              },
              select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true,
                closedAt: true,
              },
            },
          },
        },
      },
    });

    return pipelines.map((pipeline) => {
      const allDeals = pipeline.stages.flatMap((stage) => stage.deals);
      const activeDeals = allDeals.filter((d) =>
        this.ACTIVE_DEAL_STATUSES.includes(d.status as DealStatus),
      );

      return {
        id: pipeline.id,
        name: pipeline.name,
        stages: pipeline.stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          order: stage.order,
          dealCount: stage.deals.length,
          totalValue: stage.deals.reduce(
            (sum, deal) => sum + toSafeNumber(deal.amount, 0),
            0,
          ),
          avgStageDuration: this.calculateAverageStageDuration(stage.deals),
          conversionRate: 0,
          probability: stage.probability || 0,
        })),
        activeDeals: activeDeals.length,
        totalValue: allDeals.reduce(
          (sum, deal) => sum + toSafeNumber(deal.amount, 0),
          0,
        ),
      };
    });
  }

  private calculateAverageStageDuration(
    deals: Array<{ createdAt: Date; closedAt: Date | null }>,
  ): number {
    if (deals.length === 0) return 0;

    const durations = deals
      .filter(
        (deal): deal is { createdAt: Date; closedAt: Date } =>
          deal.createdAt !== null && deal.closedAt !== null,
      )
      .map((deal) => {
        const closed = new Date(deal.closedAt);
        const created = new Date(deal.createdAt);
        return Math.ceil(
          (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
        );
      });

    if (durations.length === 0) return 0;

    return (
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length
    );
  }

  private async getPipelineBottlenecks(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<Bottleneck[]> {
    const pipelineData = await this.getPipelineDataFromOperational(
      tenantId,
      query,
    );
    const bottlenecks: Bottleneck[] = [];

    for (const pipeline of pipelineData) {
      for (const stage of pipeline.stages) {
        if (stage.avgStageDuration > 30) {
          bottlenecks.push({
            stageId: stage.id,
            stageName: stage.name,
            averageDuration: stage.avgStageDuration,
            stuckDeals: stage.dealCount,
            recommendation: `Consider automating follow-ups or reassigning deals stuck in ${stage.name}`,
          });
        }
      }
    }

    return bottlenecks;
  }

  private async getPipelineStatistics(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<{
    totalDeals: number;
    totalValue: number;
    averageWinRate: number;
    averageSalesCycle: number;
    averageDealDuration: number;
  }> {
    const where = this.buildDealWhereClause(tenantId, query);

    const [totalDeals, totalValue, wonDeals, dealDurations] = await Promise.all(
      [
        this.prisma.deal.count({ where }),
        this.prisma.deal.aggregate({ where, _sum: { amount: true } }),
        this.prisma.deal.count({
          where: { ...where, status: DEAL_STATUS.WON },
        }),
        this.prisma.deal.findMany({
          where: {
            ...where,
            status: DEAL_STATUS.WON,
            createdAt: { not: null },
            closedAt: { not: null },
          },
          select: { createdAt: true, closedAt: true },
          take: 100,
        }),
      ],
    );

    const averageWinRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

    let averageSalesCycle = 0;
    let averageDealDuration = 0;

    if (dealDurations.length > 0) {
      const totalDays = dealDurations.reduce((sum, deal) => {
        return (
          sum +
          Math.ceil(
            (deal.closedAt.getTime() - deal.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        );
      }, 0);
      averageSalesCycle = totalDays / dealDurations.length;
      averageDealDuration = averageSalesCycle;
    }

    return {
      totalDeals,
      totalValue: toSafeNumber(totalValue._sum.amount, 0),
      averageWinRate,
      averageSalesCycle,
      averageDealDuration,
    };
  }

  private async getUserActivityStats(
    tenantId: string,
    query: ProcessedQuery,
  ): Promise<
    Array<{
      userId: string;
      userEmail: string;
      userName: string;
      activityCount: number;
      lastActive: string;
    }>
  > {
    const userActivity = await this.prisma.auditLog.groupBy({
      by: ['actorUserId'],
      where: {
        organizationId: tenantId,
        createdAt: {
          ...(query.startDate ? { gte: query.startDate } : {}),
          ...(query.endDate ? { lte: query.endDate } : {}),
        },
        actorUserId: { not: null },
      },
      _count: true,
      _max: { createdAt: true },
      orderBy: { _count: { actorUserId: 'desc' } },
      take: 10,
    });

    const userIds = userActivity
      .map((item) => item.actorUserId)
      .filter((id): id is string => id !== null);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, organizationId: tenantId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    return userActivity.map((item) => {
      const userId = item.actorUserId || '';
      const user = userMap.get(userId);

      return {
        userId,
        userEmail: user?.email || '',
        userName:
          user?.firstName && user?.lastName
            ? `${user.firstName} ${user.lastName}`
            : user?.email || 'Unknown',
        activityCount: item._count,
        lastActive:
          item._max.createdAt?.toISOString() || new Date().toISOString(),
      };
    });
  }
}

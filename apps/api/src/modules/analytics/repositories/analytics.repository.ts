// File: src/modules/analytics/repositories/analytics.repository.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import {
  DealAnalyticsQueryDto,
  RevenueAnalyticsQueryDto,
  PipelineAnalyticsQueryDto,
  ActivityAnalyticsQueryDto,
  AnalyticsGroupBy,
  AnalyticsExportQueryDto, // ✅ CORRECT - This is the actual export name
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

@Injectable()
export class AnalyticsRepository extends TenantAwareRepository {
  private readonly logger = new Logger(AnalyticsRepository.name);
  private readonly defaultDateRangeDays = 30;

  private readonly ACTIVE_DEAL_STATUSES = [
    'NEW',
    'QUALIFIED',
    'PROPOSAL',
    'NEGOTIATION',
  ];

  // FIX: Change from private to protected AND pass to super()
  constructor(protected readonly prisma: PrismaService) {
    super(prisma); // PASS prisma to parent constructor
  }

  /**
   * Get deal analytics from operational tables
   */
  async getDealAnalyticsFromOperational(
    query: DealAnalyticsQueryDto,
  ): Promise<DealAnalyticsResponse> {
    try {
      const tenantId = this.tenantId;
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
            where: { ...where, status: 'WON' },
            _sum: { amount: true },
            _count: true,
          }),
          this.getDealStatistics(tenantId, processedQuery),
        ]);

      const totalDeals = dealStats.totalDeals;
      const wonDeals = dealStats.wonDeals;
      const lostDeals = dealStats.lostDeals;
      const openDeals = dealStats.openDeals;
      const totalRevenue = Number(totalValue._sum.amount || 0);
      const wonRevenue = Number(wonValue._sum.amount || 0);
      const averageDealValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;
      const winRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

      // Transform dealsOverTime to DealAnalyticsData format
      const data: DealAnalyticsData[] = dealsOverTime.map((item) => ({
        period: item.date,
        totalDeals: item.count,
        wonDeals: 0, // Would need additional query for won deals by period
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
          wonValue: wonRevenue,
          pipelineId: query.pipelineId,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get deal analytics: ${error.message}`,
        error.stack,
        {
          tenantId: this.tenantId,
          query,
        },
      );
      throw new BadRequestException('Failed to fetch deal analytics');
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
      const processedQuery = this.processDateRange(query);
      const where = this.buildDealWhereClause(tenantId, processedQuery);

      const [
        revenueOverTime,
        forecastRevenue,
        totalRevenue,
        wonRevenue,
        recurringStats,
      ] = await Promise.all([
        this.getRevenueOverTime(tenantId, processedQuery),
        this.calculateForecastRevenue(tenantId, processedQuery),
        this.prisma.deal.aggregate({
          where,
          _sum: { amount: true },
        }),
        this.prisma.deal.aggregate({
          where: { ...where, status: 'WON' },
          _sum: { amount: true },
        }),
        this.getRecurringRevenueStats(tenantId, processedQuery),
      ]);

      const totalRevenueAmount = Number(totalRevenue._sum.amount || 0);
      const wonRevenueAmount = Number(wonRevenue._sum.amount || 0);
      const forecastRevenueAmount = forecastRevenue || 0;
      const mrr = recurringStats.mrr;
      const arr = recurringStats.arr;

      // Transform revenueOverTime to RevenueDataPoint format
      const data: RevenueDataPoint[] = revenueOverTime.map((item) => ({
        period: item.date,
        revenue: item.revenue,
        forecastRevenue: 0, // Would need separate forecast by period
        dealCount: 0, // Would need additional query
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
    } catch (error: any) {
      this.logger.error(
        `Failed to get revenue analytics: ${error.message}`,
        error.stack,
        {
          tenantId: this.tenantId,
          query,
        },
      );
      throw new BadRequestException('Failed to fetch revenue analytics');
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
      const processedQuery = this.processDateRange(query);

      const [pipelineData, bottleneckData, pipelineStats] = await Promise.all([
        this.getPipelineDataFromOperational(tenantId, processedQuery),
        query.includeBottlenecks
          ? this.getPipelineBottlenecks(tenantId, processedQuery)
          : Promise.resolve([]),
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
    } catch (error: any) {
      this.logger.error(
        `Failed to get pipeline analytics: ${error.message}`,
        error.stack,
        {
          tenantId: this.tenantId,
          query,
        },
      );
      throw new BadRequestException('Failed to fetch pipeline analytics');
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
      const processedQuery = this.processDateRange(query);
      const { limit = 20, page = 1 } = processedQuery;
      const skip = (page - 1) * limit;

      const where = {
        organizationId: tenantId,
        createdAt: {
          ...(processedQuery.startDate
            ? { gte: processedQuery.startDate }
            : {}),
          ...(processedQuery.endDate ? { lte: processedQuery.endDate } : {}),
        },
      };

      const [activities, total, byType, userActivity] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          include: {
            // KEEP AS include SINCE actor RELATION EXISTS
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
        type: log.action as any,
        userId: log.actorUserId || '',
        userEmail: log.actor?.email || log.actorEmail || '', // Use actor relation if available
        userName:
          log.actor?.firstName && log.actor?.lastName
            ? `${log.actor.firstName} ${log.actor.lastName}`
            : log.actor?.email || log.actorEmail || 'Unknown',
        entityType: log.entityType,
        entityId: log.entityId || '',
        timestamp: log.createdAt.toISOString(),
        metadata: log.metadata as Record<string, any>, // Use metadata field
      }));

      const activityByType = byType.reduce(
        (acc, item) => {
          acc[item.entityType as any] = item._count;
          return acc;
        },
        {} as Record<string, number>,
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
    } catch (error: any) {
      this.logger.error(
        `Failed to get activity analytics: ${error.message}`,
        error.stack,
        {
          tenantId: this.tenantId,
          query,
        },
      );
      throw new BadRequestException('Failed to fetch activity analytics');
    }
  }

  /**
   * Get available exports for user/tenant
   */
  async getAvailableExports(
    query: AnalyticsExportQueryDto,
    tenantId: string,
    userId: string,
  ): Promise<ExportJob[]> {
    try {
      const where = {
        organizationId: tenantId,
        userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.startDate
          ? { createdAt: { gte: new Date(query.startDate) } }
          : {}),
        ...(query.endDate
          ? { createdAt: { lte: new Date(query.endDate) } }
          : {}),
      };

      // const exports = await this.prisma.analyticsExport.findMany({
      //   where,
      //   orderBy: { createdAt: 'desc' },
      //   take: query.limit || 50,
      //   skip: query.page && query.limit ? (query.page - 1) * query.limit : 0
      // });

      return exports.map((exp) => ({
        exportId: exp.id,
        organizationId: exp.organizationId,
        userId: exp.userId,
        format: exp.format,
        include: exp.include as any[],
        status: exp.status,
        downloadToken: exp.downloadToken,
        downloadUrl: exp.downloadUrl || undefined,
        fileSize: exp.fileSize || undefined,
        recordCount: exp.recordCount || undefined,
        createdAt: exp.createdAt.toISOString(),
        completedAt: exp.completedAt?.toISOString(),
        expiresAt: exp.expiresAt.toISOString(),
      }));
    } catch (error: any) {
      this.logger.error(
        `Failed to get available exports: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          query,
        },
      );
      throw new BadRequestException('Failed to fetch available exports');
    }
  }

  /**
   * Get export file path for download
   */
  // async getExportFilePath(jobId: string, tenantId: string): Promise<string | null> {
  //   try {
  //     const exportRecord = await this.prisma.analyticsExport.findFirst({
  //       where: {
  //         id: jobId,
  //         organizationId: tenantId,
  //         status: 'COMPLETED',
  //         expiresAt: { gt: new Date() }
  //       },
  //       select: { filePath: true }
  //     });

  //     return exportRecord?.filePath || null;
  //   } catch (error: any) {
  //     this.logger.error(`Failed to get export file path: ${error.message}`, error.stack, {
  //       jobId,
  //       tenantId
  //     });
  //     return null;
  //   }
  // }

  // ========== PRIVATE HELPER METHODS ==========

  private processDateRange(query: any): any {
    const { startDate, endDate, ...rest } = query;

    return {
      ...rest,
      startDate: startDate
        ? new Date(startDate)
        : new Date(
            Date.now() - this.defaultDateRangeDays * 24 * 60 * 60 * 1000,
          ),
      endDate: endDate ? new Date(endDate) : new Date(),
    };
  }

  private buildDealWhereClause(tenantId: string, query: any): any {
    const where: any = {
      organizationId: tenantId,
      deletedAt: null,
    };

    // Add date range filter
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = query.startDate;
      }
      if (query.endDate) {
        where.createdAt.lte = query.endDate;
      }
    }

    // Add pipeline filter if provided
    if (query.pipelineId) {
      where.pipelineId = query.pipelineId;
    }

    // Add stage filter if provided
    if (query.stageId) {
      where.stageId = query.stageId;
    }

    // Add owner filter if provided
    if (query.ownerUserId) {
      where.ownerUserId = query.ownerUserId;
    }

    return where;
  }

  private async getDealsOverTime(
    tenantId: string,
    query: any,
  ): Promise<Array<{ date: string; count: number }>> {
    const deals = await this.prisma.deal.findMany({
      where: this.buildDealWhereClause(tenantId, query),
      select: { createdAt: true },
    });

    const grouped = deals.reduce(
      (acc, deal) => {
        const date = deal.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  }

  private async getStageMetrics(
    tenantId: string,
    query: any,
  ): Promise<Array<{ stage: string; count: number; value: number }>> {
    const deals = await this.prisma.deal.findMany({
      where: this.buildDealWhereClause(tenantId, query),
      select: {
        status: true,
        amount: true,
      },
    });

    const grouped = deals.reduce(
      (acc, deal) => {
        const stage = deal.status;
        if (!acc[stage]) {
          acc[stage] = { count: 0, value: 0 };
        }
        acc[stage].count += 1;
        acc[stage].value += Number(deal.amount || 0);
        return acc;
      },
      {} as Record<string, { count: number; value: number }>,
    );

    return Object.entries(grouped).map(([stage, metrics]) => ({
      stage,
      count: metrics.count,
      value: metrics.value,
    }));
  }

  private async getDealStatistics(tenantId: string, query: any) {
    const where = this.buildDealWhereClause(tenantId, query);

    const [total, won, lost, open, velocity] = await Promise.all([
      this.prisma.deal.count({ where }),
      this.prisma.deal.count({ where: { ...where, status: 'WON' } }),
      this.prisma.deal.count({ where: { ...where, status: 'LOST' } }),
      this.prisma.deal.count({ where: { ...where, status: 'OPEN' } }),
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
    query: any,
  ): Promise<number> {
    // Simplified sales velocity calculation
    const deals = await this.prisma.deal.findMany({
      where: {
        ...this.buildDealWhereClause(tenantId, query),
        status: 'WON',
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
    query: any,
  ): Promise<number> {
    const deals = await this.prisma.deal.findMany({
      where: {
        ...this.buildDealWhereClause(tenantId, query),
        expectedCloseDate: { not: null },
        status: { in: ['OPEN', 'ACTIVE', 'NEGOTIATION'] },
      },
      select: {
        amount: true,
        probability: true,
      },
    });

    return deals.reduce((sum, deal) => {
      const probability = deal.probability || 50;
      return sum + (Number(deal.amount) || 0) * (probability / 100);
    }, 0);
  }

  private async getRevenueOverTime(
    tenantId: string,
    query: any,
  ): Promise<Array<{ date: string; revenue: number }>> {
    const deals = await this.prisma.deal.findMany({
      where: {
        ...this.buildDealWhereClause(tenantId, query),
        status: 'WON',
      },
      select: {
        closedAt: true,
        amount: true,
      },
    });

    const grouped = deals.reduce(
      (acc, deal) => {
        if (deal.closedAt) {
          const date = deal.closedAt.toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + Number(deal.amount || 0);
        }
        return acc;
      },
      {} as Record<string, number>,
    );

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

  private async getRecurringRevenueStats(tenantId: string, query: any) {
    // Simplified MRR/ARR calculation
    // In production, this would query subscription/recurring revenue data
    return {
      mrr: 0,
      arr: 0,
    };
  }

  private async getBestPerformingPipeline(
    tenantId: string,
    query: any,
  ): Promise<string | undefined> {
    const pipelineStats = await this.prisma.deal.groupBy({
      by: ['pipelineId'],
      where: this.buildDealWhereClause(tenantId, query),
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 1,
    });

    if (pipelineStats.length === 0) return undefined;

    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineStats[0].pipelineId },
      select: { name: true },
    });

    return pipeline?.name;
  }

  private async getTopPerformer(
    tenantId: string,
    query: any,
  ): Promise<string | undefined> {
    const userStats = await this.prisma.deal.groupBy({
      by: ['ownerUserId'],
      where: this.buildDealWhereClause(tenantId, query),
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: 1,
    });

    if (userStats.length === 0 || !userStats[0].ownerUserId) return undefined;

    const user = await this.prisma.user.findUnique({
      where: { id: userStats[0].ownerUserId },
      select: { email: true, firstName: true, lastName: true },
    });

    return user?.email;
  }

  private async getPipelineDataFromOperational(tenantId: string, query: any) {
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
        this.ACTIVE_DEAL_STATUSES.includes(d.status),
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
            (sum, deal) => sum + Number(deal.amount || 0),
            0,
          ),
          avgStageDuration: this.calculateAverageStageDuration(stage.deals),
          conversionRate: 0, // Would need stage transition data
          probability: stage.probability || 0,
        })),
        activeDeals: activeDeals.length,
        totalValue: allDeals.reduce(
          (sum, deal) => sum + Number(deal.amount || 0),
          0,
        ),
      };
    });
  }

  private calculateAverageStageDuration(deals: any[]): number {
    if (deals.length === 0) return 0;

    const durations = deals
      .filter((deal) => deal.createdAt && deal.closedAt)
      .map((deal) =>
        Math.ceil(
          (deal.closedAt.getTime() - deal.createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );

    if (durations.length === 0) return 0;

    return (
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length
    );
  }

  private async getPipelineBottlenecks(tenantId: string, query: any) {
    const pipelineData = await this.getPipelineDataFromOperational(
      tenantId,
      query,
    );

    const bottlenecks = [];
    for (const pipeline of pipelineData) {
      for (const stage of pipeline.stages) {
        if (stage.avgStageDuration > 30) {
          // More than 30 days is a bottleneck
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

  private async getPipelineStatistics(tenantId: string, query: any) {
    const where = this.buildDealWhereClause(tenantId, query);

    const [totalDeals, totalValue, wonDeals, dealDurations] = await Promise.all(
      [
        this.prisma.deal.count({ where }),
        this.prisma.deal.aggregate({ where, _sum: { amount: true } }),
        this.prisma.deal.count({ where: { ...where, status: 'WON' } }),
        this.prisma.deal.findMany({
          where: {
            ...where,
            status: 'WON',
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
      averageDealDuration = averageSalesCycle; // For now, use same value
    }

    return {
      totalDeals,
      totalValue: Number(totalValue._sum.amount || 0),
      averageWinRate,
      averageSalesCycle,
      averageDealDuration, // Add this
    };
  }

  private async getUserActivityStats(tenantId: string, query: any) {
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
      .filter(Boolean);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, organizationId: tenantId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    return userActivity.map((item) => ({
      userId: item.actorUserId,
      userEmail: userMap.get(item.actorUserId)?.email || '',
      userName:
        userMap.get(item.actorUserId)?.firstName &&
        userMap.get(item.actorUserId)?.lastName
          ? `${userMap.get(item.actorUserId)?.firstName} ${userMap.get(item.actorUserId)?.lastName}`
          : userMap.get(item.actorUserId)?.email || 'Unknown',
      activityCount: item._count,
      lastActive:
        item._max.createdAt?.toISOString() || new Date().toISOString(),
    }));
  }
}

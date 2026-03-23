// apps/api/src/modules/analytics/repositories/analytics-summary.repository.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { toSafeNumber, toSafeString } from '../../../shared/utils/type-guards';

// Define proper types for analytics responses
interface DealOverTimeData {
  date: string;
  count: number;
}

interface StageMetricsData {
  stage: string;
  count: number;
  value: number;
}

interface DealAnalyticsSummary {
  dealsOverTime: DealOverTimeData[];
  stageMetrics: StageMetricsData[];
  summary: {
    totalDeals: number;
    wonDeals: number;
    lostDeals: number;
    activeDeals: number;
  };
  source: 'summary';
}

interface RevenueOverTimeData {
  date: string;
  revenue: number;
}

interface RevenueAnalyticsSummary {
  forecastRevenue: number;
  revenueOverTime: RevenueOverTimeData[];
  summary: {
    totalRevenue: number;
    forecastedRevenue: number;
    averageDealSize: number;
  };
  source: 'summary';
}

// Query parameters interface
interface AnalyticsQuery {
  startDate?: Date;
  endDate?: Date;
  currency?: string;
  [key: string]: unknown;
}

// Type for Prisma where conditions
interface WhereCondition {
  organizationId: string;
  date?: {
    gte?: Date;
    lte?: Date;
  };
  currency?: string;
}

@Injectable()
export class AnalyticsSummaryRepository extends TenantAwareRepository {
  private readonly logger = new Logger(AnalyticsSummaryRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get deal analytics from summary tables
   */
  async getDealAnalyticsFromSummary(
    query: AnalyticsQuery,
  ): Promise<DealAnalyticsSummary> {
    try {
      const tenantId = this.tenantId;

      // Check if summary tables exist
      const summaryExists =
        await this.checkSummaryTableExists('deal_summary_daily');
      if (!summaryExists) {
        this.logger.warn(
          'Summary tables not available, returning empty analytics',
        );
        return this.getEmptyDealAnalytics();
      }

      // Build where conditions with proper typing
      const whereConditions: WhereCondition = {
        organizationId: tenantId,
      };

      if (query.startDate || query.endDate) {
        whereConditions.date = {};
        if (query.startDate) {
          whereConditions.date.gte = query.startDate;
        }
        if (query.endDate) {
          whereConditions.date.lte = query.endDate;
        }
      }

      // Get from summary table
      const summaryData = await this.prisma.dealSummaryDaily.findMany({
        where: whereConditions,
        orderBy: {
          date: 'asc',
        },
      });

      // Transform to match response format with safe type conversion
      const dealsOverTime: DealOverTimeData[] = summaryData.map((item) => ({
        date: item.date.toISOString().split('T')[0],
        count: toSafeNumber(item.dealCount, 0),
      }));

      // Get stage summary
      const stageSummary = await this.prisma.dealStageSummaryDaily.findMany({
        where: whereConditions,
      });

      const stageMetrics = stageSummary.reduce<StageMetricsData[]>(
        (acc, item) => {
          const stageName = toSafeString(item.stage, 'unknown');
          const existing = acc.find((s) => s.stage === stageName);
          const itemCount = toSafeNumber(item.dealCount, 0);
          const itemValue = toSafeNumber(item.totalValue, 0);

          if (existing) {
            existing.count += itemCount;
            existing.value += itemValue;
          } else {
            acc.push({
              stage: stageName,
              count: itemCount,
              value: itemValue,
            });
          }
          return acc;
        },
        [],
      );

      const totalDeals = dealsOverTime.reduce(
        (sum, item) => sum + item.count,
        0,
      );
      const wonDeals = stageMetrics.find((s) => s.stage === 'WON')?.count || 0;
      const lostDeals =
        stageMetrics.find((s) => s.stage === 'LOST')?.count || 0;
      const activeDeals =
        stageMetrics.find((s) => s.stage === 'ACTIVE')?.count || 0;

      return {
        dealsOverTime,
        stageMetrics,
        summary: {
          totalDeals,
          wonDeals,
          lostDeals,
          activeDeals,
        },
        source: 'summary',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to get deal analytics from summary: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      return this.getEmptyDealAnalytics();
    }
  }

  /**
   * Get revenue analytics from summary tables
   */
  async getRevenueAnalyticsFromSummary(
    query: AnalyticsQuery,
  ): Promise<RevenueAnalyticsSummary> {
    try {
      const tenantId = this.tenantId;

      // Check if summary tables exist
      const summaryExists = await this.checkSummaryTableExists(
        'revenue_summary_daily',
      );
      if (!summaryExists) {
        this.logger.warn(
          'Summary tables not available, returning empty revenue analytics',
        );
        return this.getEmptyRevenueAnalytics();
      }

      // Build where conditions with proper typing
      const whereConditions: WhereCondition = {
        organizationId: tenantId,
      };

      if (query.startDate || query.endDate) {
        whereConditions.date = {};
        if (query.startDate) {
          whereConditions.date.gte = query.startDate;
        }
        if (query.endDate) {
          whereConditions.date.lte = query.endDate;
        }
      }

      if (query.currency) {
        whereConditions.currency = toSafeString(query.currency, 'USD');
      }

      // Get from summary table
      const revenueSummary = await this.prisma.revenueSummaryDaily.findMany({
        where: whereConditions,
        orderBy: {
          date: 'asc',
        },
      });

      const revenueOverTime: RevenueOverTimeData[] = revenueSummary.map(
        (item) => ({
          date: item.date.toISOString().split('T')[0],
          revenue: toSafeNumber(item.revenue, 0),
        }),
      );

      // Get forecast from summary
      const forecastSummary =
        await this.prisma.dealForecastSummaryDaily.findMany({
          where: whereConditions,
        });

      const forecastRevenue = forecastSummary.reduce(
        (sum, item) => sum + toSafeNumber(item.forecastRevenue, 0),
        0,
      );

      const totalRevenue = revenueOverTime.reduce(
        (sum, item) => sum + item.revenue,
        0,
      );
      const averageDealSize =
        revenueOverTime.length > 0 ? totalRevenue / revenueOverTime.length : 0;

      return {
        forecastRevenue,
        revenueOverTime,
        summary: {
          totalRevenue,
          forecastedRevenue: forecastRevenue,
          averageDealSize,
        },
        source: 'summary',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to get revenue analytics from summary: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      return this.getEmptyRevenueAnalytics();
    }
  }

  /**
   * Check if a summary table exists
   */
  private async checkSummaryTableExists(tableName: string): Promise<boolean> {
    try {
      // Use raw SQL with proper typing - result is any from Prisma
      const result = await this.prisma
        .$queryRaw`SELECT 1 FROM ${tableName} LIMIT 1`;
      // Check if result exists (truthy) and has at least one row
      return (
        result !== null &&
        result !== undefined &&
        Array.isArray(result) &&
        result.length > 0
      );
    } catch {
      return false;
    }
  }

  /**
   * Return empty deal analytics structure
   */
  private getEmptyDealAnalytics(): DealAnalyticsSummary {
    return {
      dealsOverTime: [],
      stageMetrics: [],
      summary: {
        totalDeals: 0,
        wonDeals: 0,
        lostDeals: 0,
        activeDeals: 0,
      },
      source: 'summary',
    };
  }

  /**
   * Return empty revenue analytics structure
   */
  private getEmptyRevenueAnalytics(): RevenueAnalyticsSummary {
    return {
      forecastRevenue: 0,
      revenueOverTime: [],
      summary: {
        totalRevenue: 0,
        forecastedRevenue: 0,
        averageDealSize: 0,
      },
      source: 'summary',
    };
  }
}

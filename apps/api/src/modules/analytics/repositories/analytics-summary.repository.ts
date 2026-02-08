// File: src/modules/analytics/repositories/analytics-summary.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';

@Injectable()
export class AnalyticsSummaryRepository extends TenantAwareRepository {
  private readonly logger = new Logger(AnalyticsSummaryRepository.name);

  // FIX: Change from private to protected AND pass to super()
  constructor(protected readonly prisma: PrismaService) {
    super(prisma); // PASS prisma to parent constructor
  }

  /**
   * Get deal analytics from summary tables
   */
  async getDealAnalyticsFromSummary(query: any): Promise<any> {
    try {
      const tenantId = this.tenantId;

      // Check if summary tables exist
      const summaryExists =
        await this.checkSummaryTableExists('deal_summary_daily');
      if (!summaryExists) {
        throw new Error('Summary tables not available');
      }

      // Get from summary table
      const summaryData = await this.prisma.dealSummaryDaily.findMany({
        where: {
          organizationId: tenantId,
          date: {
            ...(query.startDate ? { gte: query.startDate } : {}),
            ...(query.endDate ? { lte: query.endDate } : {}),
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      // Transform to match operational response format
      const dealsOverTime = summaryData.map((item) => ({
        date: item.date.toISOString().split('T')[0],
        count: item.dealCount,
      }));

      // Get stage summary
      const stageSummary = await this.prisma.dealStageSummaryDaily.findMany({
        where: {
          organizationId: tenantId,
          date: {
            ...(query.startDate ? { gte: query.startDate } : {}),
            ...(query.endDate ? { lte: query.endDate } : {}),
          },
        },
      });

      const stageMetrics = stageSummary.reduce(
        (acc, item) => {
          const existing = acc.find((s) => s.stage === item.stage);
          if (existing) {
            existing.count += item.dealCount;
            existing.value += Number(item.totalValue);
          } else {
            acc.push({
              stage: item.stage,
              count: item.dealCount,
              value: Number(item.totalValue),
            });
          }
          return acc;
        },
        [] as Array<{ stage: string; count: number; value: number }>,
      );

      return {
        dealsOverTime,
        stageMetrics,
        summary: {
          totalDeals: dealsOverTime.reduce((sum, item) => sum + item.count, 0),
          wonDeals: stageMetrics.find((s) => s.stage === 'WON')?.count || 0,
          lostDeals: stageMetrics.find((s) => s.stage === 'LOST')?.count || 0,
          activeDeals:
            stageMetrics.find((s) => s.stage === 'ACTIVE')?.count || 0,
        },
        source: 'summary',
      };
    } catch (error: any) {
      this.logger.warn(
        `Failed to get deal analytics from summary: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get revenue analytics from summary tables
   */
  async getRevenueAnalyticsFromSummary(query: any): Promise<any> {
    try {
      const tenantId = this.tenantId;

      // Check if summary tables exist
      const summaryExists = await this.checkSummaryTableExists(
        'revenue_summary_daily',
      );
      if (!summaryExists) {
        throw new Error('Summary tables not available');
      }

      // Get from summary table
      const revenueSummary = await this.prisma.revenueSummaryDaily.findMany({
        where: {
          organizationId: tenantId,
          date: {
            ...(query.startDate ? { gte: query.startDate } : {}),
            ...(query.endDate ? { lte: query.endDate } : {}),
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      const revenueOverTime = revenueSummary.map((item) => ({
        date: item.date.toISOString().split('T')[0],
        revenue: item.revenue,
      }));

      // Get forecast from summary
      const forecastSummary =
        await this.prisma.dealForecastSummaryDaily.findMany({
          where: {
            organizationId: tenantId,
            date: {
              ...(query.startDate ? { gte: query.startDate } : {}),
              ...(query.endDate ? { lte: query.endDate } : {}),
            },
          },
        });

      const forecastRevenue = forecastSummary.reduce(
        (sum, item) => sum + Number(item.forecastRevenue),
        0,
      );

      return {
        forecastRevenue,
        revenueOverTime,
        summary: {
          totalRevenue: revenueOverTime.reduce(
            (sum, item) => sum + Number(item.revenue),
            0,
          ),
          forecastedRevenue: forecastRevenue,
          averageDealSize:
            revenueOverTime.length > 0
              ? revenueOverTime.reduce(
                  (sum, item) => sum + Number(item.revenue),
                  0,
                ) / revenueOverTime.length
              : 0,
        },
        source: 'summary',
      };
    } catch (error: any) {
      this.logger.warn(
        `Failed to get revenue analytics from summary: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Check if a summary table exists
   */
  private async checkSummaryTableExists(tableName: string): Promise<boolean> {
    try {
      // Try to query the table - if it fails, table doesn't exist
      await this.prisma.$queryRaw`SELECT 1 FROM ${tableName} LIMIT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

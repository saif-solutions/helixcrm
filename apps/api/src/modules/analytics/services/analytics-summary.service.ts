// apps/api/src/modules/analytics/services/analytics-summary.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { toSafeNumber, isArray } from '../../../shared/utils/type-guards';

// Define types for statistics results
interface DealStatsResult {
  total_deals: number | string;
  won_deals: number | string;
  lost_deals: number | string;
  open_deals: number | string;
  total_amount: number | string;
  won_amount: number | string;
  average_deal_size: number | string;
  win_rate: number | string;
}

interface RevenueStatsResult {
  won_revenue: number | string;
  forecast_revenue: number | string;
  total_revenue: number | string;
  total_deals: number | string;
  won_deals: number | string;
  average_deal_size: number | string;
}

interface StageStatsResult {
  deal_count: number | string;
  total_amount: number | string;
  average_amount: number | string;
  avg_duration_days: number | string;
  max_duration_days: number | string;
}

interface ActivityStatsResult {
  login_count: number | string;
  deal_created: number | string;
  deal_updated: number | string;
  deal_won: number | string;
  deal_lost: number | string;
  contact_created: number | string;
  contact_updated: number | string;
  lead_created: number | string;
  lead_converted: number | string;
  active_users: number | string;
  total_actions: number | string;
}

// Define types for summary data
interface DealSummaryData {
  id?: string;
  organizationId: string;
  date: Date;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  totalAmount: number;
  wonAmount: number;
  averageDealSize: number;
  winRate: number;
  currency: string;
  pipelineId: string | null;
  stageId: string | null;
  summarizedAt: Date;
}

interface RevenueSummaryData {
  id?: string;
  organizationId: string;
  date: Date;
  totalRevenue: number;
  wonRevenue: number;
  forecastRevenue: number;
  totalDeals: number;
  wonDeals: number;
  averageDealSize: number;
  currency: string;
  summarizedAt: Date;
}

interface AggregatedData {
  period: string;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  totalAmount: number;
  wonAmount: number;
  totalRevenue: number;
  wonRevenue: number;
  forecastRevenue: number;
  count: number;
}

@Injectable()
export class AnalyticsSummaryService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsSummaryService.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled =
      this.configService.get('ANALYTICS_SUMMARY_ENABLED', 'true') === 'true';
  }

  async onModuleInit() {
    if (this.isEnabled) {
      this.logger.log('Analytics summary service initialized');
      await this.updateAllSummariesIfStale();
    } else {
      this.logger.warn('Analytics summary service disabled via config');
    }
  }

  private async updateAllSummariesIfStale() {
    try {
      const latestSummary = await this.prisma.dealSummaryDaily.findFirst({
        orderBy: { summarizedAt: 'desc' },
        select: { summarizedAt: true },
      });

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      if (!latestSummary || latestSummary.summarizedAt < oneHourAgo) {
        this.logger.log('Summary tables are stale, updating...');
        await this.updateAllSummaries();
      } else {
        this.logger.log(
          `Summary tables are fresh (last updated: ${latestSummary.summarizedAt.toISOString()})`,
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error checking summary staleness: ${errorMessage}`);
    }
  }

  async updateAllSummaries(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Summary updates disabled');
      return;
    }

    this.logger.log('Starting update of all analytics summary tables...');
    const startTime = Date.now();

    try {
      await this.updateDealDailySummaries();
      await this.updateRevenueDailySummaries();
      await this.updatePipelineStageSummaries();
      await this.updateActivityDailySummaries();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Completed update of all analytics summary tables in ${duration}ms`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error updating analytics summaries: ${errorMessage}`);
      throw error;
    }
  }

  async updateDealDailySummaries(): Promise<void> {
    this.logger.debug('Updating deal daily summaries...');

    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const org of organizations) {
      try {
        const dealStatsResult = await this.prisma.$queryRaw<DealStatsResult[]>`
          SELECT 
            COUNT(*) as total_deals,
            COUNT(CASE WHEN status = 'won' THEN 1 END) as won_deals,
            COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_deals,
            COUNT(CASE WHEN status = 'open' THEN 1 END) as open_deals,
            COALESCE(SUM(amount), 0) as total_amount,
            COALESCE(SUM(CASE WHEN status = 'won' THEN amount ELSE 0 END), 0) as won_amount,
            COALESCE(AVG(amount), 0) as average_deal_size,
            CASE 
              WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN status = 'won' THEN 1 END)::decimal / COUNT(*)::decimal) * 100 
              ELSE 0 
            END as win_rate
          FROM deals 
          WHERE organization_id = ${org.id}
            AND deleted_at IS NULL
            AND created_at >= ${today}
        `;

        const stats =
          isArray(dealStatsResult) && dealStatsResult.length > 0
            ? dealStatsResult[0]
            : null;

        if (!stats) {
          this.logger.warn(`No deal stats returned for organization ${org.id}`);
          continue;
        }

        const existing = await this.prisma.dealSummaryDaily.findFirst({
          where: {
            organizationId: org.id,
            date: today,
          },
        });

        const summaryData: DealSummaryData = {
          organizationId: org.id,
          date: today,
          totalDeals: toSafeNumber(stats.total_deals, 0),
          wonDeals: toSafeNumber(stats.won_deals, 0),
          lostDeals: toSafeNumber(stats.lost_deals, 0),
          openDeals: toSafeNumber(stats.open_deals, 0),
          totalAmount: toSafeNumber(stats.total_amount, 0),
          wonAmount: toSafeNumber(stats.won_amount, 0),
          averageDealSize: toSafeNumber(stats.average_deal_size, 0),
          winRate: toSafeNumber(stats.win_rate, 0),
          currency: 'USD',
          pipelineId: null,
          stageId: null,
          summarizedAt: new Date(),
        };

        if (existing) {
          await this.prisma.dealSummaryDaily.update({
            where: { id: existing.id },
            data: summaryData,
          });
        } else {
          await this.prisma.dealSummaryDaily.create({
            data: summaryData,
          });
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Error updating deal summaries for organization ${org.id}: ${errorMessage}`,
        );
      }
    }
  }

  async updateRevenueDailySummaries(): Promise<void> {
    this.logger.debug('Updating revenue daily summaries...');

    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const org of organizations) {
      try {
        const revenueStatsResult = await this.prisma.$queryRaw<
          RevenueStatsResult[]
        >`
          SELECT 
            COALESCE(SUM(CASE WHEN status = 'won' THEN amount ELSE 0 END), 0) as won_revenue,
            COALESCE(SUM(CASE WHEN status = 'open' THEN amount * (probability::decimal / 100) ELSE 0 END), 0) as forecast_revenue,
            COALESCE(SUM(amount), 0) as total_revenue,
            COUNT(*) as total_deals,
            COUNT(CASE WHEN status = 'won' THEN 1 END) as won_deals,
            CASE 
              WHEN COUNT(*) > 0 THEN COALESCE(AVG(amount), 0)
              ELSE 0 
            END as average_deal_size
          FROM deals 
          WHERE organization_id = ${org.id}
            AND deleted_at IS NULL
            AND created_at >= ${today}
        `;

        const stats =
          isArray(revenueStatsResult) && revenueStatsResult.length > 0
            ? revenueStatsResult[0]
            : null;

        if (!stats) {
          this.logger.warn(
            `No revenue stats returned for organization ${org.id}`,
          );
          continue;
        }

        const existing = await this.prisma.revenueDailySummary.findFirst({
          where: {
            organizationId: org.id,
            date: today,
            currency: 'USD',
          },
        });

        const summaryData: RevenueSummaryData = {
          organizationId: org.id,
          date: today,
          totalRevenue: toSafeNumber(stats.total_revenue, 0),
          wonRevenue: toSafeNumber(stats.won_revenue, 0),
          forecastRevenue: toSafeNumber(stats.forecast_revenue, 0),
          totalDeals: toSafeNumber(stats.total_deals, 0),
          wonDeals: toSafeNumber(stats.won_deals, 0),
          averageDealSize: toSafeNumber(stats.average_deal_size, 0),
          currency: 'USD',
          summarizedAt: new Date(),
        };

        if (existing) {
          await this.prisma.revenueDailySummary.update({
            where: { id: existing.id },
            data: summaryData,
          });
        } else {
          await this.prisma.revenueDailySummary.create({
            data: summaryData,
          });
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Error updating revenue summaries for organization ${org.id}: ${errorMessage}`,
        );
      }
    }
  }

  async updatePipelineStageSummaries(): Promise<void> {
    this.logger.debug('Updating pipeline stage summaries...');

    const pipelines = await this.prisma.pipeline.findMany({
      include: {
        stages: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const pipeline of pipelines) {
      for (const stage of pipeline.stages) {
        try {
          const stageStatsResult = await this.prisma.$queryRaw<
            StageStatsResult[]
          >`
            SELECT 
              COUNT(*) as deal_count,
              COALESCE(SUM(amount), 0) as total_amount,
              COALESCE(AVG(amount), 0) as average_amount,
              COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400), 0) as avg_duration_days,
              COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400), 0) as max_duration_days
            FROM deals 
            WHERE organization_id = ${pipeline.organizationId}
              AND pipeline_id = ${pipeline.id}
              AND stage_id = ${stage.id}
              AND status = 'open'
              AND deleted_at IS NULL
          `;

          const stats =
            isArray(stageStatsResult) && stageStatsResult.length > 0
              ? stageStatsResult[0]
              : null;

          if (!stats) {
            continue;
          }

          const dealCount = toSafeNumber(stats.deal_count, 0);
          const avgDurationDays = toSafeNumber(stats.avg_duration_days, 0);
          const isBottleneck = dealCount > 10 || avgDurationDays > 30;

          const existing = await this.prisma.pipelineStageSummary.findFirst({
            where: {
              organizationId: pipeline.organizationId,
              pipelineId: pipeline.id,
              stageId: stage.id,
              date: today,
            },
          });

          const summaryData = {
            organizationId: pipeline.organizationId,
            pipelineId: pipeline.id,
            stageId: stage.id,
            date: today,
            dealCount,
            totalAmount: toSafeNumber(stats.total_amount, 0),
            averageAmount: toSafeNumber(stats.average_amount, 0),
            avgStageDuration: Math.round(avgDurationDays),
            maxStageDuration: Math.round(
              toSafeNumber(stats.max_duration_days, 0),
            ),
            isBottleneck,
            summarizedAt: new Date(),
          };

          if (existing) {
            await this.prisma.pipelineStageSummary.update({
              where: { id: existing.id },
              data: summaryData,
            });
          } else {
            await this.prisma.pipelineStageSummary.create({
              data: summaryData,
            });
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Error updating pipeline stage summary for stage ${stage.id}: ${errorMessage}`,
          );
        }
      }
    }
  }

  async updateActivityDailySummaries(): Promise<void> {
    this.logger.debug('Updating activity daily summaries...');

    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const org of organizations) {
      try {
        const activityStatsResult = await this.prisma.$queryRaw<
          ActivityStatsResult[]
        >`
          SELECT 
            COUNT(CASE WHEN action = 'USER_LOGIN' THEN 1 END) as login_count,
            COUNT(CASE WHEN entity_type = 'DEAL' AND action = 'CREATED' THEN 1 END) as deal_created,
            COUNT(CASE WHEN entity_type = 'DEAL' AND action = 'UPDATED' THEN 1 END) as deal_updated,
            COUNT(CASE WHEN entity_type = 'DEAL' AND action = 'WON' THEN 1 END) as deal_won,
            COUNT(CASE WHEN entity_type = 'DEAL' AND action = 'LOST' THEN 1 END) as deal_lost,
            COUNT(CASE WHEN entity_type = 'CONTACT' AND action = 'CREATED' THEN 1 END) as contact_created,
            COUNT(CASE WHEN entity_type = 'CONTACT' AND action = 'UPDATED' THEN 1 END) as contact_updated,
            COUNT(CASE WHEN entity_type = 'LEAD' AND action = 'CREATED' THEN 1 END) as lead_created,
            COUNT(CASE WHEN entity_type = 'LEAD' AND action = 'CONVERTED' THEN 1 END) as lead_converted,
            COUNT(DISTINCT actor_user_id) as active_users,
            COUNT(*) as total_actions
          FROM audit_logs 
          WHERE organization_id = ${org.id}
            AND created_at >= ${today}
            AND created_at < ${tomorrow}
        `;

        const stats =
          isArray(activityStatsResult) && activityStatsResult.length > 0
            ? activityStatsResult[0]
            : null;

        if (!stats) {
          this.logger.warn(
            `No activity stats returned for organization ${org.id}`,
          );
          continue;
        }

        const existing = await this.prisma.activityDailySummary.findFirst({
          where: {
            organizationId: org.id,
            date: today,
          },
        });

        const summaryData = {
          organizationId: org.id,
          date: today,
          loginCount: toSafeNumber(stats.login_count, 0),
          dealCreated: toSafeNumber(stats.deal_created, 0),
          dealUpdated: toSafeNumber(stats.deal_updated, 0),
          dealWon: toSafeNumber(stats.deal_won, 0),
          dealLost: toSafeNumber(stats.deal_lost, 0),
          contactCreated: toSafeNumber(stats.contact_created, 0),
          contactUpdated: toSafeNumber(stats.contact_updated, 0),
          leadCreated: toSafeNumber(stats.lead_created, 0),
          leadConverted: toSafeNumber(stats.lead_converted, 0),
          activeUsers: toSafeNumber(stats.active_users, 0),
          totalActions: toSafeNumber(stats.total_actions, 0),
          summarizedAt: new Date(),
        };

        if (existing) {
          await this.prisma.activityDailySummary.update({
            where: { id: existing.id },
            data: summaryData,
          });
        } else {
          await this.prisma.activityDailySummary.create({
            data: summaryData,
          });
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Error updating activity summaries for organization ${org.id}: ${errorMessage}`,
        );
      }
    }
  }

  async getDealAnalyticsFromSummary(
    organizationId: string,
    query: {
      startDate?: Date | string;
      endDate?: Date | string;
      groupBy?: string;
    },
  ) {
    if (!this.isEnabled) {
      throw new Error('Analytics summary service is disabled');
    }

    const { startDate, endDate, groupBy = 'day' } = query;

    const whereConditions: {
      organizationId: string;
      date?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      organizationId,
    };

    if (startDate) {
      whereConditions.date = {
        ...whereConditions.date,
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      whereConditions.date = {
        ...whereConditions.date,
        lte: new Date(endDate),
      };
    }

    const summaries = await this.prisma.dealSummaryDaily.findMany({
      where: whereConditions,
      orderBy: { date: 'asc' },
    });

    return this.aggregateSummaries(summaries, groupBy);
  }

  async getRevenueAnalyticsFromSummary(
    organizationId: string,
    query: {
      startDate?: Date | string;
      endDate?: Date | string;
      groupBy?: string;
      currency?: string;
    },
  ) {
    if (!this.isEnabled) {
      throw new Error('Analytics summary service is disabled');
    }

    const { startDate, endDate, groupBy = 'day', currency = 'USD' } = query;

    const whereConditions: {
      organizationId: string;
      currency: string;
      date?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      organizationId,
      currency,
    };

    if (startDate) {
      whereConditions.date = {
        ...whereConditions.date,
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      whereConditions.date = {
        ...whereConditions.date,
        lte: new Date(endDate),
      };
    }

    const summaries = await this.prisma.revenueDailySummary.findMany({
      where: whereConditions,
      orderBy: { date: 'asc' },
    });

    return this.aggregateSummaries(summaries, groupBy);
  }

  private aggregateSummaries(
    summaries: Array<{
      date: Date;
      totalDeals?: number | null;
      wonDeals?: number | null;
      lostDeals?: number | null;
      openDeals?: number | null;
      totalAmount?: number | null;
      wonAmount?: number | null;
      totalRevenue?: number | null;
      wonRevenue?: number | null;
      forecastRevenue?: number | null;
    }>,
    groupBy: string,
  ): {
    data: AggregatedData[];
    source: string;
    period: string;
  } {
    if (groupBy === 'day') {
      const formattedData = summaries.map((summary) => ({
        period: summary.date.toISOString().split('T')[0],
        totalDeals: toSafeNumber(summary.totalDeals, 0),
        wonDeals: toSafeNumber(summary.wonDeals, 0),
        lostDeals: toSafeNumber(summary.lostDeals, 0),
        openDeals: toSafeNumber(summary.openDeals, 0),
        totalAmount: toSafeNumber(summary.totalAmount, 0),
        wonAmount: toSafeNumber(summary.wonAmount, 0),
        totalRevenue: toSafeNumber(summary.totalRevenue, 0),
        wonRevenue: toSafeNumber(summary.wonRevenue, 0),
        forecastRevenue: toSafeNumber(summary.forecastRevenue, 0),
        count: 1,
      }));

      return {
        data: formattedData,
        source: 'summary-tables',
        period: 'day',
      };
    }

    // Group by week, month, etc.
    const aggregated: Record<string, AggregatedData> = {};

    for (const summary of summaries) {
      const date = new Date(summary.date);
      let key: string;

      if (groupBy === 'week') {
        const week = this.getWeekNumber(date);
        key = `${date.getFullYear()}-W${week}`;
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      } else if (groupBy === 'year') {
        key = date.getFullYear().toString();
      } else {
        key = date.toISOString().split('T')[0];
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          period: key,
          totalDeals: 0,
          wonDeals: 0,
          lostDeals: 0,
          openDeals: 0,
          totalAmount: 0,
          wonAmount: 0,
          totalRevenue: 0,
          wonRevenue: 0,
          forecastRevenue: 0,
          count: 0,
        };
      }

      const agg = aggregated[key];
      agg.totalDeals += toSafeNumber(summary.totalDeals, 0);
      agg.wonDeals += toSafeNumber(summary.wonDeals, 0);
      agg.lostDeals += toSafeNumber(summary.lostDeals, 0);
      agg.openDeals += toSafeNumber(summary.openDeals, 0);
      agg.totalAmount += toSafeNumber(summary.totalAmount, 0);
      agg.wonAmount += toSafeNumber(summary.wonAmount, 0);
      agg.totalRevenue += toSafeNumber(summary.totalRevenue, 0);
      agg.wonRevenue += toSafeNumber(summary.wonRevenue, 0);
      agg.forecastRevenue += toSafeNumber(summary.forecastRevenue, 0);
      agg.count += 1;
    }

    return {
      data: Object.values(aggregated),
      source: 'summary-tables',
      period: groupBy,
    };
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

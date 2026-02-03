import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AnalyticsSummaryService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsSummaryService.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.isEnabled = this.configService.get('ANALYTICS_SUMMARY_ENABLED', 'true') === 'true';
  }

  async onModuleInit() {
    if (this.isEnabled) {
      this.logger.log('Analytics summary service initialized');
      // Optionally run an initial summary on startup
      await this.updateAllSummariesIfStale();
    } else {
      this.logger.warn('Analytics summary service disabled via config');
    }
  }

  /**
   * Update all summary tables if they're stale (older than 1 hour)
   */
  private async updateAllSummariesIfStale() {
    try {
      // Check when the last summary was updated
      const latestSummary = await this.prisma.dealDailySummary.findFirst({
        orderBy: { summarizedAt: 'desc' },
        select: { summarizedAt: true },
      });

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (!latestSummary || latestSummary.summarizedAt < oneHourAgo) {
        this.logger.log('Summary tables are stale, updating...');
        await this.updateAllSummaries();
      } else {
        this.logger.log(`Summary tables are fresh (last updated: ${latestSummary.summarizedAt})`);
      }
    } catch (error) {
      this.logger.error('Error checking summary staleness:', error);
    }
  }

  /**
   * Update all summary tables
   */
  async updateAllSummaries(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Summary updates disabled');
      return;
    }

    this.logger.log('Starting update of all analytics summary tables...');
    const startTime = Date.now();

    try {
      // Update in sequence to avoid overloading the database
      await this.updateDealDailySummaries();
      await this.updateRevenueDailySummaries();
      await this.updatePipelineStageSummaries();
      await this.updateActivityDailySummaries();

      const duration = Date.now() - startTime;
      this.logger.log(`Completed update of all analytics summary tables in ${duration}ms`);
    } catch (error) {
      this.logger.error('Error updating analytics summaries:', error);
      throw error;
    }
  }

  /**
   * Update deal daily summaries
   */
  async updateDealDailySummaries(): Promise<void> {
    this.logger.debug('Updating deal daily summaries...');
    
    // Get all organizations
    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const org of organizations) {
      try {
        // Get deal statistics for today
        const dealStats = await this.prisma.$queryRaw`
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

        const stats = dealStats[0] as any;

        // For DealDailySummary: @@unique([organizationId, date, pipelineId, stageId, currency])
        // Since pipelineId and stageId can be null, we need to handle this differently
        // Let's use a simpler approach for now - find and update
        
        // First, try to find existing summary
        const existing = await this.prisma.dealDailySummary.findFirst({
          where: {
            organizationId: org.id,
            date: today,
            currency: 'USD',
            pipelineId: null,
            stageId: null,
          },
        });

        const summaryData = {
          organizationId: org.id,
          date: today,
          totalDeals: parseInt(stats.total_deals) || 0,
          wonDeals: parseInt(stats.won_deals) || 0,
          lostDeals: parseInt(stats.lost_deals) || 0,
          openDeals: parseInt(stats.open_deals) || 0,
          totalAmount: parseFloat(stats.total_amount) || 0,
          wonAmount: parseFloat(stats.won_amount) || 0,
          averageDealSize: parseFloat(stats.average_deal_size) || 0,
          winRate: parseFloat(stats.win_rate) || 0,
          currency: 'USD',
          pipelineId: null,
          stageId: null,
          summarizedAt: new Date(),
        };

        if (existing) {
          await this.prisma.dealDailySummary.update({
            where: { id: existing.id },
            data: summaryData,
          });
        } else {
          await this.prisma.dealDailySummary.create({
            data: summaryData,
          });
        }
      } catch (error) {
        this.logger.error(`Error updating deal summaries for organization ${org.id}:`, error);
      }
    }
  }

  /**
   * Update revenue daily summaries
   */
  async updateRevenueDailySummaries(): Promise<void> {
    this.logger.debug('Updating revenue daily summaries...');
    
    const organizations = await this.prisma.organization.findMany({
      select: { id: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const org of organizations) {
      try {
        // Get revenue statistics
        const revenueStats = await this.prisma.$queryRaw`
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

        const stats = revenueStats[0] as any;

        // For RevenueDailySummary: @@unique([organizationId, date, currency])
        // Find existing or create new
        const existing = await this.prisma.revenueDailySummary.findFirst({
          where: {
            organizationId: org.id,
            date: today,
            currency: 'USD',
          },
        });

        const summaryData = {
          organizationId: org.id,
          date: today,
          totalRevenue: parseFloat(stats.total_revenue) || 0,
          wonRevenue: parseFloat(stats.won_revenue) || 0,
          forecastRevenue: parseFloat(stats.forecast_revenue) || 0,
          totalDeals: parseInt(stats.total_deals) || 0,
          wonDeals: parseInt(stats.won_deals) || 0,
          averageDealSize: parseFloat(stats.average_deal_size) || 0,
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
      } catch (error) {
        this.logger.error(`Error updating revenue summaries for organization ${org.id}:`, error);
      }
    }
  }

  /**
   * Update pipeline stage summaries
   */
  async updatePipelineStageSummaries(): Promise<void> {
    this.logger.debug('Updating pipeline stage summaries...');
    
    // Get all pipelines with their stages
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
          // Get stage statistics
          const stageStats = await this.prisma.$queryRaw`
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

          const stats = stageStats[0] as any;
          const dealCount = parseInt(stats.deal_count) || 0;
          
          // Simple bottleneck detection: stage has more than 10 deals or average duration > 30 days
          const isBottleneck = dealCount > 10 || parseFloat(stats.avg_duration_days) > 30;

          // For PipelineStageSummary: @@unique([organizationId, pipelineId, stageId, date])
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
            totalAmount: parseFloat(stats.total_amount) || 0,
            averageAmount: parseFloat(stats.average_amount) || 0,
            avgStageDuration: Math.round(parseFloat(stats.avg_duration_days) || 0),
            maxStageDuration: Math.round(parseFloat(stats.max_duration_days) || 0),
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
        } catch (error) {
          this.logger.error(`Error updating pipeline stage summary for stage ${stage.id}:`, error);
        }
      }
    }
  }

  /**
   * Update activity daily summaries
   */
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
        // Get activity counts from audit logs
        const activityStats = await this.prisma.$queryRaw`
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

        const stats = activityStats[0] as any;

        // For ActivityDailySummary: @@unique([organizationId, date])
        const existing = await this.prisma.activityDailySummary.findFirst({
          where: {
            organizationId: org.id,
            date: today,
          },
        });

        const summaryData = {
          organizationId: org.id,
          date: today,
          loginCount: parseInt(stats.login_count) || 0,
          dealCreated: parseInt(stats.deal_created) || 0,
          dealUpdated: parseInt(stats.deal_updated) || 0,
          dealWon: parseInt(stats.deal_won) || 0,
          dealLost: parseInt(stats.deal_lost) || 0,
          contactCreated: parseInt(stats.contact_created) || 0,
          contactUpdated: parseInt(stats.contact_updated) || 0,
          leadCreated: parseInt(stats.lead_created) || 0,
          leadConverted: parseInt(stats.lead_converted) || 0,
          activeUsers: parseInt(stats.active_users) || 0,
          totalActions: parseInt(stats.total_actions) || 0,
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
      } catch (error) {
        this.logger.error(`Error updating activity summaries for organization ${org.id}:`, error);
      }
    }
  }

  /**
   * Get deal analytics from summary tables
   */
  async getDealAnalyticsFromSummary(organizationId: string, query: any) {
    if (!this.isEnabled) {
      throw new Error('Analytics summary service is disabled');
    }

    const { startDate, endDate, groupBy = 'day' } = query;
    
    // Use summary tables for faster queries
    const summaries = await this.prisma.dealDailySummary.findMany({
      where: {
        organizationId,
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
        pipelineId: null, // Get only general summaries for now
        stageId: null,
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate based on groupBy
    return this.aggregateSummaries(summaries, groupBy, 'deal');
  }

  /**
   * Get revenue analytics from summary tables
   */
  async getRevenueAnalyticsFromSummary(organizationId: string, query: any) {
    if (!this.isEnabled) {
      throw new Error('Analytics summary service is disabled');
    }

    const { startDate, endDate, groupBy = 'day' } = query;
    
    const summaries = await this.prisma.revenueDailySummary.findMany({
      where: {
        organizationId,
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
        currency: query.currency || 'USD',
      },
      orderBy: { date: 'asc' },
    });

    return this.aggregateSummaries(summaries, groupBy, 'revenue');
  }

  /**
   * Helper method to aggregate summaries by time period
   */
  private aggregateSummaries(summaries: any[], groupBy: string, type: 'deal' | 'revenue'): any {
    if (groupBy === 'day') {
      return {
        data: summaries,
        source: 'summary-tables',
        period: 'day'
      };
    }

    // Group by week, month, etc.
    const aggregated: any = {};
    
    summaries.forEach(summary => {
      const date = new Date(summary.date);
      let key: string;
      
      if (groupBy === 'week') {
        // Get week number
        const week = this.getWeekNumber(date);
        key = `${date.getFullYear()}-W${week}`;
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      } else if (groupBy === 'year') {
        key = date.getFullYear().toString();
      } else {
        key = date.toISOString().split('T')[0]; // Default to day
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
      agg.totalDeals += summary.totalDeals || 0;
      agg.wonDeals += summary.wonDeals || 0;
      agg.lostDeals += summary.lostDeals || 0;
      agg.openDeals += summary.openDeals || 0;
      agg.totalAmount += parseFloat(summary.totalAmount || 0);
      agg.wonAmount += parseFloat(summary.wonAmount || 0);
      agg.totalRevenue += parseFloat(summary.totalRevenue || 0);
      agg.wonRevenue += parseFloat(summary.wonRevenue || 0);
      agg.forecastRevenue += parseFloat(summary.forecastRevenue || 0);
      agg.count += 1;
    });
    
    return {
      data: Object.values(aggregated),
      source: 'summary-tables',
      period: groupBy
    };
  }

  /**
   * Get week number from date
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

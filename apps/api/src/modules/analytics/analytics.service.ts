import { Injectable, Logger, Inject, NotFoundException, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectQueue } from '@nestjs/bullmq';
import { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditLogService, AuditAction, AuditSeverity, AuditEntityType } from '../../shared/audit-log/audit-log.service';     
import { AppLogger } from '../../shared/logging/logger.service';
import { AnalyticsSummaryService } from './services/analytics-summary.service';
import {
  DealAnalyticsQueryDto,
  RevenueAnalyticsQueryDto,
  PipelineAnalyticsQueryDto,
  ActivityAnalyticsQueryDto,
  AnalyticsExportQueryDto,
  AnalyticsGroupBy,
  ExportFormat,
  AnalyticsExportInclude,
  ActivityType,
} from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly useSummaryTables: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly appLogger: AppLogger,
    private readonly configService: ConfigService,
    private readonly analyticsSummaryService: AnalyticsSummaryService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Optional() @InjectQueue('analytics-export') private exportQueue?: Queue,
  ) {
    this.useSummaryTables = this.configService.get('ANALYTICS_USE_SUMMARY_TABLES', 'true') === 'true';
    this.logger.log(`Analytics service initialized - Summary tables: ${this.useSummaryTables ? 'ENABLED' : 'DISABLED'}`);
  }

  // ==================== DEAL ANALYTICS ====================
  async getDealAnalytics(organizationId: string, query: DealAnalyticsQueryDto) {
    // Try to use summary tables first if enabled
    if (this.useSummaryTables && !query.includeVelocity) {
      try {
        return await this.getDealAnalyticsFromSummary(organizationId, query);
      } catch (error) {
        this.logger.warn('Failed to use summary tables, falling back to operational tables:', error.message);
      }
    }

    // Fall back to operational tables
    return await this.getDealAnalyticsFromOperational(organizationId, query);
  }

  /**
   * Get deal analytics from summary tables (fast path)
   */
  private async getDealAnalyticsFromSummary(organizationId: string, query: DealAnalyticsQueryDto) {
    const cacheKey = this.buildCacheKey('deals-summary', organizationId, query);
    const cacheTtl = this.configService.get<number>('ANALYTICS_CACHE_TTL', 300);

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for deal analytics (summary): ${cacheKey}`);
      return cached;
    }

    // Use summary service
    const result = await this.analyticsSummaryService.getDealAnalyticsFromSummary(organizationId, query);

    // Cache the result
    await this.cacheManager.set(cacheKey, result, cacheTtl * 1000);

    return result;
  }

  /**
   * Get deal analytics from operational tables (slow path - fallback)
   */
  private async getDealAnalyticsFromOperational(organizationId: string, query: DealAnalyticsQueryDto) {
    const cacheKey = this.buildCacheKey('deals-operational', organizationId, query);
    const cacheTtl = this.configService.get<number>('ANALYTICS_CACHE_TTL', 300);

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for deal analytics (operational): ${cacheKey}`);
      return cached;
    }

    // Apply defaults
    const processedQuery = {
      ...query,
      groupBy: query.groupBy || AnalyticsGroupBy.MONTH,
      limit: query.limit || 100,
      page: query.page || 1,
      includeDeleted: query.includeDeleted || false,
      includeVelocity: query.includeVelocity || false,
    };

    // Build query conditions
    const where = this.buildDealWhereClause(organizationId, processedQuery);

    // Execute analytics queries
    const [
      totalCount,
      totalValue,
      wonCount,
      wonValue,
      lostCount,
      openCount,
      dealsOverTime,
      stageMetrics,
    ] = await Promise.all([
      // Basic counts
      this.prisma.deal.count({ where }),
      this.prisma.deal.aggregate({ where, _sum: { amount: true } }),
      this.prisma.deal.count({ where: { ...where, status: 'won' } }),
      this.prisma.deal.aggregate({
        where: { ...where, status: 'won' },
        _sum: { amount: true } 
      }),
      this.prisma.deal.count({ where: { ...where, status: 'lost' } }),
      this.prisma.deal.count({ where: { ...where, status: 'open' } }),

      // Time-based analytics (simplified for Phase 3.4)
      this.getDealsOverTime(organizationId, processedQuery),

      // Stage metrics
      this.getStageMetrics(organizationId, processedQuery),
    ]);

    // Calculate derived metrics
    const totalAmount = totalValue._sum.amount ? Number(totalValue._sum.amount) : 0;
    const wonAmount = wonValue._sum.amount ? Number(wonValue._sum.amount) : 0;
    const averageDealValue = totalCount > 0 ? totalAmount / totalCount : 0;
    const winRate = totalCount > 0 ? (wonCount / totalCount) * 100 : 0;

    // Build response
    const result = {
      period: processedQuery.groupBy,
      totalDeals: totalCount,
      wonDeals: wonCount,
      lostDeals: lostCount,
      openDeals: openCount,
      totalAmount,
      wonAmount,
      averageDealValue,
      winRate,
      dealsOverTime,
      stageMetrics,
      source: 'operational-tables', // Indicate this came from operational tables
    };

    // Cache the result
    await this.cacheManager.set(cacheKey, result, cacheTtl * 1000);

    return result;
  }

  // ==================== REVENUE ANALYTICS ====================
  async getRevenueAnalytics(organizationId: string, query: RevenueAnalyticsQueryDto) {
    // Try to use summary tables first if enabled
    if (this.useSummaryTables) {
      try {
        return await this.getRevenueAnalyticsFromSummary(organizationId, query);
      } catch (error) {
        this.logger.warn('Failed to use revenue summary tables, falling back to operational tables:', error.message);
      }
    }

    // Fall back to operational tables (original implementation)
    const cacheKey = this.buildCacheKey('revenue', organizationId, query);
    const cacheTtl = this.configService.get<number>('ANALYTICS_CACHE_TTL', 300);

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for revenue analytics: ${cacheKey}`);
      return cached;
    }

    // Apply defaults
    const processedQuery = {
      ...query,
      groupBy: query.groupBy || AnalyticsGroupBy.MONTH,
      limit: query.limit || 100,
      page: query.page || 1,
      includeDeleted: query.includeDeleted || false,
      includeForecast: query.includeForecast ?? true,
      currency: query.currency || 'USD',
    };

    // Build where clause
    const where = this.buildDealWhereClause(organizationId, processedQuery);

    // Calculate revenue metrics
    const [
      totalRevenue,
      wonRevenue,
      forecastRevenue,
      dealsOverTime,
    ] = await Promise.all([
      // Total revenue (all deals)
      this.prisma.deal.aggregate({
        where,
        _sum: { amount: true },
      }),
      // Won revenue
      this.prisma.deal.aggregate({
        where: { ...where, status: 'won' },
        _sum: { amount: true },
      }),
      // Forecast revenue (open deals with probability)
      this.calculateForecastRevenue(organizationId, processedQuery),
      // Revenue over time
      this.getRevenueOverTime(organizationId, processedQuery),
    ]);

    const totalRevenueAmount = totalRevenue._sum.amount ? Number(totalRevenue._sum.amount) : 0;
    const wonRevenueAmount = wonRevenue._sum.amount ? Number(wonRevenue._sum.amount) : 0;
    const forecastRevenueAmount = forecastRevenue || 0;

    // Build response
    const result = {
      period: processedQuery.groupBy,
      totalRevenue: totalRevenueAmount,
      wonRevenue: wonRevenueAmount,
      forecastRevenue: forecastRevenueAmount,
      dealsOverTime,
      currency: processedQuery.currency,
      source: 'operational-tables',
    };

    // Cache the result
    await this.cacheManager.set(cacheKey, result, cacheTtl * 1000);

    return result;
  }

  /**
   * Get revenue analytics from summary tables (fast path)
   */
  private async getRevenueAnalyticsFromSummary(organizationId: string, query: RevenueAnalyticsQueryDto) {
    const cacheKey = this.buildCacheKey('revenue-summary', organizationId, query);
    const cacheTtl = this.configService.get<number>('ANALYTICS_CACHE_TTL', 300);

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for revenue analytics (summary): ${cacheKey}`);
      return cached;
    }

    // Use summary service
    const result = await this.analyticsSummaryService.getRevenueAnalyticsFromSummary(organizationId, query);

    // Add source indicator
    result.source = 'summary-tables';

    // Cache the result
    await this.cacheManager.set(cacheKey, result, cacheTtl * 1000);

    return result;
  }

  // ==================== PIPELINE ANALYTICS ====================
  async getPipelineAnalytics(organizationId: string, query: PipelineAnalyticsQueryDto) {
    const cacheKey = this.buildCacheKey('pipeline', organizationId, query);
    const cacheTtl = this.configService.get<number>('ANALYTICS_CACHE_TTL', 300);

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for pipeline analytics: ${cacheKey}`);
      return cached;
    }

    // Apply defaults
    const processedQuery = {
      ...query,
      includeBottlenecks: query.includeBottlenecks ?? true,
      includeDuration: query.includeDuration ?? true,
      durationDays: query.durationDays || 90,
    };

    // Try to use summary tables for pipeline data
    if (this.useSummaryTables) {
      try {
        const summaryData = await this.getPipelineDataFromSummary(organizationId, processedQuery);
        if (summaryData) {
          // Cache the result
          await this.cacheManager.set(cacheKey, summaryData, cacheTtl * 1000);
          return summaryData;
        }
      } catch (error) {
        this.logger.warn('Failed to use pipeline summary tables:', error.message);
      }
    }

    // Fall back to operational tables
    const pipelineData = await this.getPipelineData(organizationId, processedQuery);
    
    // Cache the result
    await this.cacheManager.set(cacheKey, pipelineData, cacheTtl * 1000);

    return pipelineData;
  }

  /**
   * Get pipeline data from summary tables
   */
  private async getPipelineDataFromSummary(organizationId: string, query: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get latest pipeline stage summaries
    const stageSummaries = await this.prisma.pipelineStageSummary.findMany({
      where: {
        organizationId,
        date: today,
      },
      orderBy: {
        pipelineId: 'asc',
        stageId: 'asc',
      },
    });

    if (stageSummaries.length === 0) {
      return null;
    }

    // We need to fetch pipeline and stage details separately
    const pipelineIds = [...new Set(stageSummaries.map(s => s.pipelineId))];
    const stageIds = [...new Set(stageSummaries.map(s => s.stageId))];

    const [pipelines, stages] = await Promise.all([
      this.prisma.pipeline.findMany({
        where: { id: { in: pipelineIds } },
        select: { id: true, name: true },
      }),
      this.prisma.pipelineStage.findMany({
        where: { id: { in: stageIds } },
        select: { id: true, name: true, order: true },
      }),
    ]);

    const pipelineMap = new Map(pipelines.map(p => [p.id, p]));
    const stageMap = new Map(stages.map(s => [s.id, s]));

    // Transform to match the expected response format
    const pipelinesMap = new Map();
    
    for (const summary of stageSummaries) {
      const pipelineId = summary.pipelineId;
      const pipeline = pipelineMap.get(pipelineId);
      const stage = stageMap.get(summary.stageId);
      
      if (!pipeline || !stage) continue;
      
      if (!pipelinesMap.has(pipelineId)) {
        pipelinesMap.set(pipelineId, {
          id: pipelineId,
          name: pipeline.name,
          stages: [],
          totalDeals: 0,
          totalAmount: 0,
        });
      }
      
      const pipelineData = pipelinesMap.get(pipelineId);
      pipelineData.stages.push({
        id: summary.stageId,
        name: stage.name,
        order: stage.order,
        dealCount: summary.dealCount,
        totalAmount: Number(summary.totalAmount),
        averageAmount: Number(summary.averageAmount),
        avgStageDuration: summary.avgStageDuration,
        maxStageDuration: summary.maxStageDuration,
        isBottleneck: summary.isBottleneck,
      });
      
      pipelineData.totalDeals += summary.dealCount;
      pipelineData.totalAmount += Number(summary.totalAmount);
    }

    const pipelineResults = Array.from(pipelinesMap.values());
    
    // Calculate bottlenecks
    const bottlenecks = query.includeBottlenecks 
      ? pipelineResults.flatMap(p => p.stages.filter(s => s.isBottleneck))
      : [];

    return {
      pipelines: pipelineResults,
      bottlenecks,
      source: 'summary-tables',
    };
  }

  // ==================== ACTIVITY ANALYTICS ====================
  async getActivityAnalytics(organizationId: string, query: ActivityAnalyticsQueryDto) {
    // Try to use summary tables first
    if (this.useSummaryTables) {
      try {
        return await this.getActivityAnalyticsFromSummary(organizationId, query);
      } catch (error) {
        this.logger.warn('Failed to use activity summary tables:', error.message);
      }
    }

    // Fall back to operational tables
    return await this.getActivityAnalyticsFromOperational(organizationId, query);
  }

  /**
   * Get activity analytics from summary tables
   */
  private async getActivityAnalyticsFromSummary(organizationId: string, query: ActivityAnalyticsQueryDto) {
    const { startDate, endDate, limit = 20, page = 1 } = query;
    
    const skip = (page - 1) * limit;
    
    // Get activity summaries
    const summaries = await this.prisma.activityDailySummary.findMany({
      where: {
        organizationId,
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    });

    const total = await this.prisma.activityDailySummary.count({
      where: {
        organizationId,
        date: {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        },
      },
    });

    // Get top users from audit logs (still need operational data for this)
    const topUsers = await this.getTopUsers(organizationId, query);

    return {
      summaries,
      topUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      source: 'summary-tables',
    };
  }

  /**
   * Get activity analytics from operational tables
   */
  private async getActivityAnalyticsFromOperational(organizationId: string, query: ActivityAnalyticsQueryDto) {
    const cacheKey = this.buildCacheKey('activity', organizationId, query);
    const cacheTtl = this.configService.get<number>('ANALYTICS_CACHE_TTL', 300);

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for activity analytics: ${cacheKey}`);
      return cached;
    }

    // Apply defaults
    const processedQuery = {
      ...query,
      limit: query.limit || 20,
      page: query.page || 1,
    };

    const { startDate, endDate, limit, page } = processedQuery;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      organizationId,
      createdAt: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
    };

    // Get recent activities
    const activities = await this.prisma.auditLog.findMany({
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
    });

    // Get total count
    const total = await this.prisma.auditLog.count({ where });

    // Get activity by type
    const byType = await this.prisma.auditLog.groupBy({
      by: ['entityType', 'action'],
      where,
      _count: true,
    });

    // Get top users
    const topUsers = await this.getTopUsers(organizationId, processedQuery);

    // Build response
    const result = {
      activities,
      byType,
      topUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      source: 'operational-tables',
    };

    // Cache the result
    await this.cacheManager.set(cacheKey, result, cacheTtl * 1000);

    return result;
  }

  // ==================== HELPER METHODS ====================
  
  private buildCacheKey(prefix: string, organizationId: string, query: any): string {
    const queryStr = JSON.stringify(query);
    const hash = require('crypto').createHash('md5').update(queryStr).digest('hex');
    return `analytics:${prefix}:${organizationId}:${hash}`;
  }

  private buildDealWhereClause(organizationId: string, query: any) {
    const where: any = {
      organizationId,
      deletedAt: query.includeDeleted ? undefined : null,
    };

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

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

  private async getDealsOverTime(organizationId: string, query: any): Promise<any[]> {
    // Simplified implementation - in production, this would use proper date grouping
    return [];
  }

  private async getStageMetrics(organizationId: string, query: any): Promise<any[]> {
    // Simplified implementation
    return [];
  }

  private async calculateForecastRevenue(organizationId: string, query: any): Promise<number> {
    // Simplified implementation
    return 0;
  }

  private async getRevenueOverTime(organizationId: string, query: any): Promise<any> {
    // Simplified implementation
    return {};
  }

  private async getPipelineData(organizationId: string, query: any): Promise<any> {
    // Simplified implementation
    return { pipelines: [], bottlenecks: [] };
  }

  private async getTopUsers(organizationId: string, query: any): Promise<any[]> {
    // Simplified implementation
    return [];
  }

  private async getUserEmail(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email || 'Unknown';
  }

  async queueExportJob(organizationId: string, userId: string, query: any): Promise<any> {
    // Simplified implementation
    return { exportId: 'test', downloadToken: 'test' };
  }

  async getExportData(token: string, organizationId: string, userId: string): Promise<any> {
    // Simplified implementation
    return { format: 'csv', exportId: 'test', data: 'test' };
  }
}

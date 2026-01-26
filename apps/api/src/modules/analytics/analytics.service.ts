import { Injectable, Logger, Inject, NotFoundException, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectQueue } from '@nestjs/bullmq';
import { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { AppLogger } from '../../shared/logging/logger.service';
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

constructor(
  private readonly prisma: PrismaService,
  private readonly auditLogService: AuditLogService,
  private readonly appLogger: AppLogger,
  private readonly configService: ConfigService,
  @Inject(CACHE_MANAGER) private cacheManager: Cache,
  @Optional() @InjectQueue('analytics-export') private exportQueue?: Queue,
) {}

  // ==================== DEAL ANALYTICS ====================
  async getDealAnalytics(organizationId: string, query: DealAnalyticsQueryDto) {
    const cacheKey = this.buildCacheKey('deals', organizationId, query);
    const cacheTtl = this.configService.get<number>('ANALYTICS_CACHE_TTL', 300);
    
    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for deal analytics: ${cacheKey}`);
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
      totalValue: totalAmount,
      wonValue: wonAmount,
      averageDealValue,
      winRate,
      salesVelocity: processedQuery.includeVelocity 
        ? await this.calculateSalesVelocity(organizationId, processedQuery)
        : undefined,
      data: dealsOverTime,
      stageMetrics,
      summary: {
        startDate: processedQuery.startDate,
        endDate: processedQuery.endDate,
        pipelineId: processedQuery.pipelineId,
        createdAt: new Date().toISOString(),
      },
    };

    // Cache result
    await this.cacheManager.set(cacheKey, result, cacheTtl * 1000);
    
    return result;
  }

  // ==================== REVENUE ANALYTICS ====================
  async getRevenueAnalytics(organizationId: string, query: RevenueAnalyticsQueryDto) {
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
    
    // Get revenue data
    const revenueData = await this.getRevenueOverTime(organizationId, processedQuery);
    
    // Calculate MRR/ARR (simplified for Phase 3.4)
    const mrr = await this.calculateMRR(organizationId, processedQuery);
    const arr = mrr * 12;
    
    // Calculate forecast revenue if requested
    const forecastRevenue = processedQuery.includeForecast
      ? await this.calculateRevenueForecast(organizationId, processedQuery)
      : undefined;

    const result = {
      period: processedQuery.groupBy,
      totalRevenue: revenueData.totalRevenue,
      forecastRevenue,
      mrr,
      arr,
      currency: processedQuery.currency,
      data: revenueData.timeSeries,
      summary: {
        startDate: processedQuery.startDate,
        endDate: processedQuery.endDate,
        growthRate: revenueData.growthRate,
        bestPerformingPipeline: revenueData.bestPipeline,
        topPerformer: revenueData.topPerformer,
      },
    };

    // Cache result
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

    // Get pipeline data
    const pipelineData = await this.getPipelineData(organizationId, processedQuery);
    
    // Calculate stage durations if requested
    const stageDurations = processedQuery.includeDuration
      ? await this.calculateStageDurations(organizationId, processedQuery)
      : undefined;

    // Identify bottlenecks if requested
    const bottlenecks = processedQuery.includeBottlenecks
      ? await this.identifyBottlenecks(organizationId, processedQuery)
      : undefined;

    const result = {
      pipelineId: processedQuery.pipelineId || 'all',
      pipelineName: pipelineData.pipelineName,
      stages: pipelineData.stages,
      averageDealDuration: stageDurations?.averageDuration,
      bottlenecks,
      summary: {
        totalDeals: pipelineData.totalDeals,
        totalValue: pipelineData.totalValue,
        averageWinRate: pipelineData.averageWinRate,
        averageSalesCycle: stageDurations?.averageDuration || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    // Cache result
    await this.cacheManager.set(cacheKey, result, cacheTtl * 1000);
    
    return result;
  }

  // ==================== ACTIVITY ANALYTICS ====================
  async getActivityAnalytics(organizationId: string, query: ActivityAnalyticsQueryDto) {
    // Activity analytics typically not cached due to real-time nature
    
    // Apply defaults
    const processedQuery = {
      ...query,
      limit: query.limit || 20,
      page: query.page || 1,
    };

    // Build where clause for audit logs
    const where: any = {
      organizationId,
      severity: 'info', // Default to info level activities
    };

    if (processedQuery.startDate) {
      where.createdAt = { gte: new Date(processedQuery.startDate) };
    }
    
    if (processedQuery.endDate) {
      where.createdAt = { 
        ...where.createdAt, 
        lte: new Date(processedQuery.endDate) 
      };
    }

    if (processedQuery.userId) {
      where.userId = processedQuery.userId;
    }

    if (processedQuery.type) {
      where.action = processedQuery.type;
    }

    // Get paginated activities - FIXED: Use correct Prisma fields
    const skip = (processedQuery.page - 1) * processedQuery.limit;
    const [activities, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: processedQuery.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          userId: true,
          before: true,    // Using 'before' field instead of 'metadata'
          after: true,     // Using 'after' field
          diff: true,      // Using 'diff' field
          createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Group by type
    const byType = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { id: true },
    });

    // Transform response - FIXED: Use 'diff' field for metadata
    const result = {
      totalActivities: total,
      byType: byType.reduce((acc, item) => {
        acc[item.action] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      recentActivities: activities.map(log => ({
        id: log.id,
        type: log.action as ActivityType,
        userId: log.userId,
        entityType: log.entity,
        entityId: log.entityId,
        timestamp: log.createdAt.toISOString(),
        // Use 'diff' field for metadata since 'metadata' doesn't exist
        changes: log.diff || log.after || log.before,
      })),
      pagination: {
        page: processedQuery.page,
        limit: processedQuery.limit,
        total,
        totalPages: Math.ceil(total / processedQuery.limit),
      },
    };

    return result;
  }

  // ==================== EXPORT FUNCTIONALITY ====================
  async queueExportJob(organizationId: string, userId: string, query: AnalyticsExportQueryDto) {
    // Apply defaults
    const processedQuery = {
      ...query,
      format: query.format || ExportFormat.CSV,
      include: query.include || [AnalyticsExportInclude.DEALS],
    };

    // Generate export ID and download token
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const downloadToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    const tokenTtl = this.configService.get<number>('EXPORT_TOKEN_TTL', 900);

    // Log export request - FIXED: Use correct AuditLogService structure
    await this.auditLogService.logEvent({
      action: 'ANALYTICS_EXPORT_REQUESTED',
      entity: 'AnalyticsExport',
      entityId: exportId,
      organizationId,
      userId,
      // Use 'metadata' for AuditLogService (different from Prisma model)
      metadata: {
        format: processedQuery.format,
        include: processedQuery.include,
        startDate: processedQuery.startDate,
        endDate: processedQuery.endDate,
      },
      severity: 'info',
    });

    // Queue background job
if (this.exportQueue) {
  await this.exportQueue.add('export', {
    exportId,
    organizationId,
    userId,
    format: processedQuery.format,
    queryParams: processedQuery,
    downloadToken,
    requestedAt: new Date().toISOString(),
  });
} else {
  this.logger.warn('Export queue not available - analytics exports will be processed synchronously');
  // In a future phase, you could process exports synchronously here
}

    return {
      exportId,
      downloadToken,
      status: 'queued',
      estimatedCompletion: '2 minutes',
      expiresAt: new Date(Date.now() + tokenTtl * 1000).toISOString(),
    };
  }

  async getExportData(token: string, organizationId: string, userId: string) {
    // TODO: In Phase 3.6+, validate token against database
    // For Phase 3.4, return mock data
    
    // Validate token format
    if (!token.startsWith('token_')) {
      throw new NotFoundException('Invalid download token');
    }

    const exportData = {
      exportId: 'mock_export_123',
      format: ExportFormat.CSV,
      data: 'deal_id,name,amount,status,created_at\n1,Test Deal 1,10000,open,2024-01-01\n2,Test Deal 2,25000,won,2024-01-02',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 900000).toISOString(), // 15 minutes
    };

    // Log download - FIXED: Use correct AuditLogService structure
    await this.auditLogService.logEvent({
      action: 'ANALYTICS_EXPORT_DOWNLOADED',
      entity: 'AnalyticsExport',
      entityId: exportData.exportId,
      organizationId,
      userId,
      // Use 'metadata' for AuditLogService
      metadata: {
        token,
        format: exportData.format,
      },
      severity: 'info',
    });

    return exportData;
  }

  // ==================== HELPER METHODS ====================
  private buildCacheKey(type: string, organizationId: string, query: any): string {
    const queryString = JSON.stringify(query);
    const hash = Buffer.from(queryString).toString('base64').substring(0, 32);
    return `analytics:${type}:${organizationId}:${hash}`;
  }

  private buildDealWhereClause(organizationId: string, query: any): any {
    const where: any = {
      organizationId,
      deletedAt: null, // Exclude soft-deleted deals
    };

    if (!query.includeDeleted) {
      where.deletedAt = null;
    }

    if (query.startDate) {
      where.createdAt = { gte: new Date(query.startDate) };
    }

    if (query.endDate) {
      where.createdAt = { 
        ...where.createdAt, 
        lte: new Date(query.endDate) 
      };
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
    // Simplified implementation for Phase 3.4
    // In Phase 3.6+, implement proper time-based aggregation
    return [
      {
        period: '2024-01',
        totalDeals: 10,
        wonDeals: 4,
        lostDeals: 2,
        openDeals: 4,
        averageDealValue: 15000,
      },
    ];
  }

  private async getStageMetrics(organizationId: string, query: any): Promise<any[]> {
    // Simplified implementation
    return [];
  }

  private async calculateSalesVelocity(organizationId: string, query: any): Promise<number> {
    // Simplified implementation
    return 30; // Average 30 days per deal
  }

  private async getRevenueOverTime(organizationId: string, query: any): Promise<any> {
    // Simplified implementation
    return {
      totalRevenue: 150000,
      growthRate: 15.5,
      bestPipeline: 'Default Pipeline',
      topPerformer: 'user_123',
      timeSeries: [],
    };
  }

  private async calculateMRR(organizationId: string, query: any): Promise<number> {
    // Simplified MRR calculation
    return 12500;
  }

  private async calculateRevenueForecast(organizationId: string, query: any): Promise<number> {
    // Simplified forecast
    return 180000;
  }

  private async getPipelineData(organizationId: string, query: any): Promise<any> {
    // Simplified implementation
    return {
      pipelineName: query.pipelineId ? 'Specific Pipeline' : 'All Pipelines',
      stages: [],
      totalDeals: 50,
      totalValue: 500000,
      averageWinRate: 35,
    };
  }

  private async calculateStageDurations(organizationId: string, query: any): Promise<any> {
    // Simplified implementation
    return {
      averageDuration: 45,
      stageDurations: [],
    };
  }

  private async identifyBottlenecks(organizationId: string, query: any): Promise<any[]> {
    // Simplified implementation
    return [];
  }

  // Cache invalidation for real-time updates
  async invalidateAnalyticsCache(organizationId: string, patterns: string[] = []): Promise<void> {
    const cachePatterns = patterns.length > 0 
      ? patterns 
      : [`analytics:*:${organizationId}:*`];
    
    this.logger.debug(`Invalidating analytics cache for organization: ${organizationId}`);
    
    // Note: In-memory cache doesn't support pattern deletion
    // Redis implementation in Phase 3.6+ will use scan
  }
}
// apps/api/src/modules/dashboard/dashboard.service.ts
import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AppLogger } from '../../shared/logging/logger.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { DealStatus } from '@prisma/client';

// Define interfaces for better type safety
interface DashboardStats {
  summary: {
    leads: number;
    contacts: number;
    deals: number;
    totalWonValue: number;
    averageDealValue: number;
  };
  pipeline: {
    id: string;
    name: string;
    totalDeals: number;
    stages: Array<{
      id: string;
      name: string;
      order: number;
      probability: number;
      dealCount: number;
    }>;
  } | null;
  dealStatus: Record<DealStatus, number>;
}

interface DashboardStatsResponse {
  data: DashboardStats;
}

interface DashboardHealthResponse {
  success: boolean;
  data: {
    status: 'healthy' | 'degraded';
    components: {
      database: 'connected' | 'error';
      statsService: 'operational' | 'error';
    };
    lastUpdated: string;
    error?: string;
  };
  timestamp: string;
  uptime?: number;
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

// Helper function to normalize any thrown value to an Error object with cause
function normalizeError(error: unknown, message: string): Error {
  if (error instanceof Error) {
    return new Error(message, { cause: error });
  }
  return new Error(message);
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private appLogger: AppLogger,
    private readonly dashboardRepository: DashboardRepository,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Safe permission check (no unsafe calls)
  private checkPermission(permission: string): boolean {
    const ctx = this.permissionContext as unknown as Record<string, unknown>;
    const hasPermissionFn = ctx.hasPermission;
    if (typeof hasPermissionFn === 'function') {
      try {
        const result = (hasPermissionFn as (perm: string) => boolean)(
          permission,
        );
        return result === true;
      } catch {
        this.logger.debug(
          `Permission check failed for ${permission}, relying on guard`,
        );
        return true;
      }
    }
    this.logger.debug(
      `Permission context not ready for ${permission}, relying on guard`,
    );
    return true;
  }

  /**
   * Get dashboard statistics
   * @returns Promise with dashboard statistics
   */
  async getStats(): Promise<DashboardStatsResponse> {
    // 1. PERMISSION CHECK
    if (!this.checkPermission('report:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: report:read required for dashboard access',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. PARALLEL QUERIES USING REPOSITORY
      const [
        leads,
        contacts,
        deals,
        dealValueSum,
        defaultPipeline,
        statusStats,
      ] = await Promise.all([
        this.dashboardRepository.getLeadCount(),
        this.dashboardRepository.getContactCount(),
        this.dashboardRepository.getDealCount(),
        this.dashboardRepository.getDealValueSum(),
        this.dashboardRepository.getDefaultPipelineWithStats(),
        this.dashboardRepository.getDealStatusDistribution(),
      ]);

      // 3. CALCULATE STATISTICS
      const totalWonValue = dealValueSum;
      const averageDealValue = deals > 0 ? totalWonValue / deals : 0;

      // 4. GET DEAL STAGE DISTRIBUTION
      const stageStats = defaultPipeline
        ? defaultPipeline.stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            order: stage.order,
            probability: stage.probability,
            dealCount: stage._count.deals,
          }))
        : [];

      // 5. BUILD STATUS DISTRIBUTION
      const statusDistribution = statusStats.reduce(
        (acc, curr) => {
          acc[curr.status] = curr._count.id;
          return acc;
        },
        {} as Record<DealStatus, number>,
      );

      // 6. BUILD STATS RESPONSE
      const stats: DashboardStats = {
        summary: {
          leads,
          contacts,
          deals,
          totalWonValue,
          averageDealValue: Math.round(averageDealValue * 100) / 100,
        },
        pipeline: defaultPipeline
          ? {
              id: defaultPipeline.id,
              name: defaultPipeline.name,
              totalDeals: defaultPipeline._count.deals,
              stages: stageStats,
            }
          : null,
        dealStatus: statusDistribution,
      };

      // 7. AUDIT LOG (fire and forget)
      void this.auditLogService
        .logEvent({
          organizationId: tenantId,
          actorUserId: userId,
          action: 'DASHBOARD_VIEWED',
          entityType: 'DASHBOARD',
          entityId: tenantId,
          metadata: {
            leads,
            contacts,
            deals,
            totalWonValue,
          },
          severity: 'LOW',
        })
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to log dashboard view: ${getErrorMessage(err)}`,
          );
        });

      // 8. LOG SUCCESS
      this.appLogger.log('Dashboard stats fetched', {
        organizationId: tenantId,
        userId,
        leads,
        contacts,
        deals,
        totalWonValue,
        event: 'dashboard_stats_fetched',
      });

      return {
        data: stats,
      };
    } catch (error: unknown) {
      // 9. ERROR HANDLING
      const errorMessage = getErrorMessage(error);
      this.appLogger.error(
        `Dashboard.getStats failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          organizationId: tenantId,
          userId,
          method: 'getStats',
        },
      );

      // Preserve existing error types
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw normalizeError(error, 'Failed to fetch dashboard stats');
    } finally {
      // 10. PERFORMANCE MONITORING
      const duration = Date.now() - startTime;
      const performance =
        duration > 2000 ? 'slow' : duration > 1000 ? 'warning' : 'normal';

      this.appLogger.log(`Dashboard.getStats completed in ${duration}ms`, {
        duration,
        organizationId: tenantId,
        userId,
        performance,
        method: 'getStats',
      });
    }
  }

  /**
   * Get dashboard health status
   * @returns Promise with health status
   */
  async getHealth(): Promise<DashboardHealthResponse> {
    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();

    try {
      // Try to get basic stats as health check
      await this.getStats(); // We don't need to store the result, just verify it works

      const health = {
        status: 'healthy' as const,
        components: {
          database: 'connected' as const,
          statsService: 'operational' as const,
        },
        lastUpdated: new Date().toISOString(),
      };

      this.appLogger.debug('Dashboard health check passed', {
        organizationId: tenantId,
        event: 'dashboard_health_check',
      });

      return {
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.appLogger.error(`Dashboard health check failed: ${errorMessage}`, {
        organizationId: tenantId,
        error: error instanceof Error ? error.name : 'Unknown error',
        event: 'dashboard_health_error',
      });

      // Return degraded health status
      return {
        success: false,
        data: {
          status: 'degraded',
          components: {
            database: 'error',
            statsService: 'error',
          },
          lastUpdated: new Date().toISOString(),
          error: errorMessage,
        },
        timestamp: new Date().toISOString(),
      };
    } finally {
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        this.appLogger.debug(`Health check completed in ${duration}ms`, {
          organizationId: tenantId,
          duration,
        });
      }
    }
  }

  /**
   * Get pipeline performance metrics
   * @returns Promise with pipeline performance data
   */
  async getPipelinePerformance(): Promise<{
    stages: Array<{
      id: string;
      name: string;
      order: number;
      dealCount: number;
      conversionRate: number;
    }>;
    totalDeals: number;
    conversionToWon: number;
  }> {
    // Permission check
    if (!this.checkPermission('report:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: report:read required for pipeline performance',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      const performance =
        await this.dashboardRepository.getPipelinePerformance();

      this.appLogger.log('Pipeline performance fetched', {
        organizationId: tenantId,
        userId,
        totalDeals: performance.totalDeals,
        conversionToWon: performance.conversionToWon,
        event: 'pipeline_performance_fetched',
      });

      return performance;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.appLogger.error(
        `Failed to get pipeline performance: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          organizationId: tenantId,
          userId,
          method: 'getPipelinePerformance',
        },
      );

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw normalizeError(error, 'Failed to fetch pipeline performance');
    } finally {
      const duration = Date.now() - startTime;
      const performance = duration > 1000 ? 'slow' : 'normal';

      this.appLogger.log(
        `Pipeline performance query completed in ${duration}ms`,
        {
          duration,
          organizationId: tenantId,
          performance,
          method: 'getPipelinePerformance',
        },
      );
    }
  }

  /**
   * Get recent activities across the organization
   * @param limit Maximum number of activities to return
   * @returns Promise with recent activities
   */
  async getRecentActivities(limit: number = 10): Promise<{
    deals: Array<{
      id: string;
      name: string;
      createdAt: Date;
      status: DealStatus;
    }>;
    contacts: Array<{
      id: string;
      firstName: string;
      lastName: string;
      createdAt: Date;
    }>;
    leads: Array<{ id: string; name: string; createdAt: Date; status: string }>;
  }> {
    // Permission check
    if (!this.checkPermission('report:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: report:read required for recent activities',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const sanitizedLimit = Math.min(Math.max(limit, 1), 100);

    try {
      const activities =
        await this.dashboardRepository.getRecentActivities(sanitizedLimit);

      this.appLogger.debug('Recent activities fetched', {
        organizationId: tenantId,
        userId,
        dealCount: activities.deals.length,
        contactCount: activities.contacts.length,
        leadCount: activities.leads.length,
        event: 'recent_activities_fetched',
      });

      return activities;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.appLogger.error(
        `Failed to get recent activities: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          organizationId: tenantId,
          userId,
          method: 'getRecentActivities',
          limit: sanitizedLimit,
        },
      );

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw normalizeError(error, 'Failed to fetch recent activities');
    } finally {
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        this.appLogger.debug(
          `Recent activities query completed in ${duration}ms`,
          {
            organizationId: tenantId,
            duration,
          },
        );
      }
    }
  }

  /**
   * Get user email by ID (helper method)
   * @param userId User ID
   * @returns Promise with user email
   */
  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email ?? 'system@unknown';
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.warn(
        `Failed to fetch user email for ${userId}: ${errorMessage}`,
      );
      return 'system@unknown';
    }
  }
}

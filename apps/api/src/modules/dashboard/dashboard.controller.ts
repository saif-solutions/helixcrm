// apps/api/src/modules/dashboard/dashboard.controller.ts
import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query, // Add this missing import
  Logger,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { DashboardService } from './dashboard.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

// Define interface for authenticated request user
interface AuthenticatedUser {
  sub: string;
  id?: string;
  organizationId?: string;
  org?: string;
  email?: string;
}

// Define extended Request type with user property
interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

// Define response types for Swagger documentation
interface DashboardStatsResponse {
  success: boolean;
  data: {
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
    dealStatus: Record<string, number>;
  };
  timestamp: string;
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

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(AuthGuard, TenantGuard, PermissionGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  private extractUserFromRequest(req: AuthenticatedRequest): AuthenticatedUser {
    if (!req.user) {
      throw new ForbiddenException('User not authenticated');
    }
    return req.user;
  }

  private getUserId(req: AuthenticatedRequest): string {
    const user = this.extractUserFromRequest(req);
    const userId = user.sub ?? user.id;
    if (!userId) {
      throw new ForbiddenException('User ID not found in request');
    }
    return userId;
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('report:read')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description:
      'Retrieve comprehensive dashboard statistics including leads, contacts, deals, and pipeline data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'object' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  async getStats(
    @Req() req: AuthenticatedRequest,
  ): Promise<DashboardStatsResponse> {
    const startTime = Date.now();
    const userId = this.getUserId(req);

    try {
      this.logger.log(`Fetching dashboard stats for user: ${userId}`, {
        userId,
        event: 'dashboard_stats_request',
      });

      const result = await this.dashboardService.getStats();

      const response: DashboardStatsResponse = {
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      };

      // Log success with summary metrics
      const { summary } = result.data;
      this.logger.debug(`Dashboard stats retrieved successfully`, {
        userId,
        dealsCount: summary.deals,
        contactsCount: summary.contacts,
        leadsCount: summary.leads,
        totalWonValue: summary.totalWonValue,
        event: 'dashboard_stats_success',
      });

      return response;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to fetch dashboard stats: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          userId,
          event: 'dashboard_stats_error',
        },
      );

      throw error;
    } finally {
      const duration = Date.now() - startTime;
      const performance =
        duration > 2000 ? 'slow' : duration > 1000 ? 'warning' : 'normal';

      this.logger.debug(`Dashboard stats request completed in ${duration}ms`, {
        userId,
        duration,
        performance,
        event: 'dashboard_stats_complete',
      });
    }
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('report:read')
  @ApiOperation({
    summary: 'Check dashboard health',
    description:
      'Get the health status of the dashboard service and its dependencies',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health check completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
      },
    },
  })
  async getDashboardHealth(
    @Req() req: AuthenticatedRequest,
  ): Promise<DashboardHealthResponse> {
    const startTime = Date.now();
    const userId = this.getUserId(req);

    try {
      this.logger.debug(`Dashboard health check requested`, {
        userId,
        event: 'dashboard_health_request',
      });

      const health = await this.dashboardService.getHealth();

      const response: DashboardHealthResponse = {
        success: health.success,
        data: health.data,
        timestamp: health.timestamp,
        uptime: health.uptime,
      };

      const status = health.success ? 'healthy' : 'degraded';
      this.logger.log(
        `Dashboard health check completed with status: ${status}`,
        {
          userId,
          status,
          components: health.data.components,
          event: 'dashboard_health_complete',
        },
      );

      return response;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Dashboard health check failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          userId,
          event: 'dashboard_health_error',
        },
      );

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
        this.logger.debug(`Health check request completed in ${duration}ms`, {
          userId,
          duration,
          event: 'dashboard_health_duration',
        });
      }
    }
  }

  @Get('pipeline-performance')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('report:read')
  @ApiOperation({
    summary: 'Get pipeline performance metrics',
    description:
      'Retrieve detailed pipeline performance including stage conversion rates',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pipeline performance retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getPipelinePerformance(@Req() req: AuthenticatedRequest): Promise<{
    success: boolean;
    data: {
      stages: Array<{
        id: string;
        name: string;
        order: number;
        dealCount: number;
        conversionRate: number;
      }>;
      totalDeals: number;
      conversionToWon: number;
    };
    timestamp: string;
  }> {
    const startTime = Date.now();
    const userId = this.getUserId(req);

    try {
      this.logger.debug(`Fetching pipeline performance`, {
        userId,
        event: 'pipeline_performance_request',
      });

      const performance = await this.dashboardService.getPipelinePerformance();

      const response = {
        success: true,
        data: performance,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug(`Pipeline performance retrieved`, {
        userId,
        totalDeals: performance.totalDeals,
        conversionToWon: performance.conversionToWon,
        stagesCount: performance.stages.length,
        event: 'pipeline_performance_success',
      });

      return response;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to fetch pipeline performance: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          userId,
          event: 'pipeline_performance_error',
        },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        this.logger.debug(
          `Pipeline performance request completed in ${duration}ms`,
          {
            userId,
            duration,
            event: 'pipeline_performance_duration',
          },
        );
      }
    }
  }

  @Get('recent-activities')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('report:read')
  @ApiOperation({
    summary: 'Get recent activities',
    description:
      'Retrieve recent activities including deals, contacts, and leads',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of activities to return (1-50)',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent activities retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getRecentActivities(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ): Promise<{
    success: boolean;
    data: {
      deals: Array<{
        id: string;
        name: string;
        createdAt: Date;
        status: string;
      }>;
      contacts: Array<{
        id: string;
        firstName: string;
        lastName: string;
        createdAt: Date;
      }>;
      leads: Array<{
        id: string;
        name: string;
        createdAt: Date;
        status: string;
      }>;
    };
    timestamp: string;
  }> {
    const startTime = Date.now();
    const userId = this.getUserId(req);
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const sanitizedLimit = isNaN(parsedLimit)
      ? 10
      : Math.min(Math.max(parsedLimit, 1), 50);

    try {
      this.logger.debug(
        `Fetching recent activities with limit: ${sanitizedLimit}`,
        {
          userId,
          limit: sanitizedLimit,
          event: 'recent_activities_request',
        },
      );

      const activities =
        await this.dashboardService.getRecentActivities(sanitizedLimit);

      const response = {
        success: true,
        data: activities,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug(`Recent activities retrieved`, {
        userId,
        dealsCount: activities.deals.length,
        contactsCount: activities.contacts.length,
        leadsCount: activities.leads.length,
        event: 'recent_activities_success',
      });

      return response;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `Failed to fetch recent activities: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          userId,
          event: 'recent_activities_error',
        },
      );
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        this.logger.debug(
          `Recent activities request completed in ${duration}ms`,
          {
            userId,
            duration,
            event: 'recent_activities_duration',
          },
        );
      }
    }
  }
}

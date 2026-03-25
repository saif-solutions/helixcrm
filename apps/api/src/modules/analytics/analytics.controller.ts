// apps/api/src/modules/analytics/analytics.controller.ts

import {
  Controller,
  Get,
  UseGuards,
  Query,
  Request,
  Res,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { PermissionGuard } from '../../shared/guards/permission.guard';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';
import { AnalyticsService } from './analytics.service';
import {
  DealAnalyticsQueryDto,
  RevenueAnalyticsQueryDto,
  PipelineAnalyticsQueryDto,
  ActivityAnalyticsQueryDto,
  AnalyticsExportQueryDto,
  AnalyticsGroupBy,
  ExportFormat,
  AnalyticsExportInclude,
} from './dto/analytics-query.dto';

// Type for authenticated request
interface AuthenticatedRequest {
  user?: {
    sub: string;
    email: string;
    organizationId: string;
  };
}

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller({ path: 'analytics', version: '1' })
@UseGuards(AuthGuard, PermissionGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('deals')
  @ApiOperation({ summary: 'Get deal analytics' })
  @ApiResponse({ status: 200, description: 'Deal analytics data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  @RequirePermission('analytics.read')
  async getDealAnalytics(
    @Query() query: DealAnalyticsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<unknown> {
    void req; // Reserved for future use

    const processedQuery = {
      ...query,
      groupBy: query.groupBy || AnalyticsGroupBy.MONTH,
      limit: query.limit || 100,
      page: query.page || 1,
      includeDeleted: query.includeDeleted || false,
      includeVelocity: query.includeVelocity || false,
    };

    return this.analyticsService.getDealAnalytics(processedQuery);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  @RequirePermission('analytics.read')
  async getRevenueAnalytics(
    @Query() query: RevenueAnalyticsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<unknown> {
    void req;

    const processedQuery = {
      ...query,
      groupBy: query.groupBy || AnalyticsGroupBy.MONTH,
      limit: query.limit || 100,
      page: query.page || 1,
      includeDeleted: query.includeDeleted || false,
      includeForecast: query.includeForecast ?? true,
      currency: query.currency || 'USD',
    };

    return this.analyticsService.getRevenueAnalytics(processedQuery);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get pipeline health analytics' })
  @ApiResponse({ status: 200, description: 'Pipeline analytics data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  @RequirePermission('analytics.read')
  async getPipelineAnalytics(
    @Query() query: PipelineAnalyticsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<unknown> {
    void req;

    const processedQuery = {
      ...query,
      includeBottlenecks: query.includeBottlenecks ?? true,
      includeDuration: query.includeDuration ?? true,
      durationDays: query.durationDays || 90,
    };

    return this.analyticsService.getPipelineAnalytics(processedQuery);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get activity analytics' })
  @ApiResponse({ status: 200, description: 'Activity analytics data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  @RequirePermission('analytics.read')
  async getActivityAnalytics(
    @Query() query: ActivityAnalyticsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<unknown> {
    void req;

    const processedQuery = {
      ...query,
      limit: query.limit || 20,
      page: query.page || 1,
    };

    return this.analyticsService.getActivityAnalytics(processedQuery);
  }

  @Get('exports')
  @ApiOperation({ summary: 'Get available analytics exports' })
  @ApiResponse({ status: 200, description: 'List of available exports' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  @RequirePermission('analytics.read')
  async getAvailableExports(
    @Query() query: AnalyticsExportQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<unknown> {
    void req;

    const processedQuery = {
      ...query,
      format: query.format || ExportFormat.CSV,
      include: query.include || [AnalyticsExportInclude.DEALS],
    };

    return this.analyticsService.getAvailableExports(processedQuery);
  }

  @Get('exports/:jobId')
  @ApiOperation({ summary: 'Get export job status' })
  @ApiResponse({ status: 200, description: 'Export job status' })
  @ApiResponse({ status: 404, description: 'Export job not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @RequirePermission('analytics.read')
  async getExportStatus(
    @Param('jobId') jobId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<unknown> {
    void req;
    return this.analyticsService.getExportStatus(jobId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Create analytics export job' })
  @ApiResponse({ status: 202, description: 'Export job queued successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - export functionality not available',
  })
  @RequirePermission('analytics.export')
  async createAnalyticsExport(
    @Query() query: AnalyticsExportQueryDto,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<Response> {
    void req;

    const processedQuery = {
      ...query,
      format: query.format || ExportFormat.CSV,
      include: query.include || [AnalyticsExportInclude.DEALS],
    };

    const result =
      await this.analyticsService.createAnalyticsExport(processedQuery);

    return res.status(HttpStatus.ACCEPTED).json({
      message: 'Export job queued successfully',
      exportId: result.jobId,
      downloadToken: result.downloadToken,
      estimatedCompletion: result.estimatedCompletion || '2 minutes',
      downloadUrl: `/analytics/export/download/${result.downloadToken}`,
    });
  }

  @Get('export/download/:token')
  @ApiOperation({ summary: 'Download exported analytics data' })
  @ApiResponse({ status: 200, description: 'Export file download' })
  @ApiResponse({ status: 404, description: 'Export not found or expired' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 400,
    description: 'Export functionality not available',
  })
  @RequirePermission('analytics.export')
  async downloadExport(
    @Param('token') token: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<Response> {
    void req;

    const jobId = token.replace('token-', '');
    const exportData = await this.analyticsService.downloadExport(jobId, token);

    res.setHeader('Content-Type', exportData.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportData.filename}"`,
    );

    return res.send(exportData.data);
  }
}

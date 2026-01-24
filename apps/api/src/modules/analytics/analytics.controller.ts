import {
  Controller,
  Get,
  UseGuards,
  Query,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller({ path: 'analytics', version: '1' })
@UseGuards(AuthGuard, PermissionGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('deals')
  @ApiOperation({ summary: 'Get deal analytics' })
  @ApiResponse({ status: 200, description: 'Deal analytics data' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @RequirePermission('analytics.read')
  async getDealAnalytics(
    @Query() query: DealAnalyticsQueryDto,
    @Request() req: any,
  ) {
    // Apply defaults in service layer (as per PM recommendation)
    const processedQuery = {
      ...query,
      groupBy: query.groupBy || AnalyticsGroupBy.MONTH,
      limit: query.limit || 100,
      page: query.page || 1,
      includeDeleted: query.includeDeleted || false,
      includeVelocity: query.includeVelocity || false,
    };

    return this.analyticsService.getDealAnalytics(
      req.user.organizationId,
      processedQuery,
    );
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics data' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @RequirePermission('analytics.read')
  async getRevenueAnalytics(
    @Query() query: RevenueAnalyticsQueryDto,
    @Request() req: any,
  ) {
    // Apply defaults in service layer
    const processedQuery = {
      ...query,
      groupBy: query.groupBy || AnalyticsGroupBy.MONTH,
      limit: query.limit || 100,
      page: query.page || 1,
      includeDeleted: query.includeDeleted || false,
      includeForecast: query.includeForecast ?? true,
      currency: query.currency || 'USD',
    };

    return this.analyticsService.getRevenueAnalytics(
      req.user.organizationId,
      processedQuery,
    );
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get pipeline health analytics' })
  @ApiResponse({ status: 200, description: 'Pipeline analytics data' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @RequirePermission('analytics.read')
  async getPipelineAnalytics(
    @Query() query: PipelineAnalyticsQueryDto,
    @Request() req: any,
  ) {
    // Apply defaults in service layer
    const processedQuery = {
      ...query,
      includeBottlenecks: query.includeBottlenecks ?? true,
      includeDuration: query.includeDuration ?? true,
      durationDays: query.durationDays || 90,
    };

    return this.analyticsService.getPipelineAnalytics(
      req.user.organizationId,
      processedQuery,
    );
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get activity analytics' })
  @ApiResponse({ status: 200, description: 'Activity analytics data' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @RequirePermission('analytics.read')
  async getActivityAnalytics(
    @Query() query: ActivityAnalyticsQueryDto,
    @Request() req: any,
  ) {
    // Apply defaults in service layer
    const processedQuery = {
      ...query,
      limit: query.limit || 20,
      page: query.page || 1,
    };

    return this.analyticsService.getActivityAnalytics(
      req.user.organizationId,
      processedQuery,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiResponse({ status: 202, description: 'Export job queued successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @RequirePermission('analytics.export')
  async exportAnalytics(
    @Query() query: AnalyticsExportQueryDto,
    @Request() req: any,
    @Res() res: Response,
  ) {
    // Apply defaults in service layer
    const processedQuery = {
      ...query,
      format: query.format || ExportFormat.CSV,
      include: query.include || [AnalyticsExportInclude.DEALS],
    };

    const result = await this.analyticsService.queueExportJob(
      req.user.organizationId,
      req.user.sub,
      processedQuery,
    );

    return res.status(HttpStatus.ACCEPTED).json({
      message: 'Export job queued successfully',
      exportId: result.exportId,
      downloadToken: result.downloadToken,
      estimatedCompletion: '2 minutes',
      downloadUrl: `/analytics/export/download/${result.downloadToken}`,
    });
  }

  @Get('export/download/:token')
  @ApiOperation({ summary: 'Download exported analytics data' })
  @ApiResponse({ status: 200, description: 'Export file download' })
  @ApiResponse({ status: 404, description: 'Export not found or expired' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async downloadExport(
    @Request() req: any,
    @Res() res: Response,
  ) {
    const token = req.params.token;
    const userId = req.user.sub;
    const organizationId = req.user.organizationId;

    const exportData = await this.analyticsService.getExportData(
      token,
      organizationId,
      userId,
    );

    // Set appropriate headers based on format
    if (exportData.format === ExportFormat.CSV) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${exportData.exportId}.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${exportData.exportId}.json"`);
    }

    return res.send(exportData.data);
  }
}
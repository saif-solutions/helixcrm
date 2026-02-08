// src/modules/export-queue/export-queue.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ExportQueueService } from './export-queue.service';
import { RequirePermission } from '../../shared/decorators/require-permission.decorator';

export class RequestExportDto {
  exportType: 'contacts' | 'deals' | 'leads' | 'all';
  format: 'csv' | 'excel' | 'pdf';
  filters?: Record<string, any>;
  options?: {
    includeArchived?: boolean;
    includeDeleted?: boolean;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

@ApiTags('Export Queue')
@ApiBearerAuth()
@Controller('export-queue')
export class ExportQueueController {
  constructor(private readonly exportQueueService: ExportQueueService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request a new export' })
  @ApiResponse({ status: 201, description: 'Export job queued successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Export limit exceeded' })
  @RequirePermission('export.*')
  async requestExport(@Body() requestExportDto: RequestExportDto) {
    const { exportType, format, filters, options } = requestExportDto;

    return this.exportQueueService.requestExport(
      exportType,
      format,
      filters,
      options,
    );
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Get export job status' })
  @ApiResponse({ status: 200, description: 'Export job status' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiParam({ name: 'jobId', description: 'Export job ID' })
  @RequirePermission('export.read')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.exportQueueService.getJobStatus(jobId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List export jobs' })
  @ApiResponse({ status: 200, description: 'List of export jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @RequirePermission('export.read')
  async listUserJobs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
  ) {
    return this.exportQueueService.listUserJobs(page, limit, status);
  }

  @Delete('cancel/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an export job' })
  @ApiResponse({ status: 200, description: 'Job cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 409, description: 'Job cannot be cancelled' })
  @ApiParam({ name: 'jobId', description: 'Export job ID' })
  @RequirePermission('export.manage')
  async cancelJob(@Param('jobId') jobId: string) {
    return this.exportQueueService.cancelJob(jobId);
  }

  @Get('download/:jobId')
  @ApiOperation({ summary: 'Download exported file' })
  @ApiResponse({ status: 200, description: 'File download information' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Job or file not found' })
  @ApiResponse({ status: 409, description: 'Export not ready' })
  @ApiParam({ name: 'jobId', description: 'Export job ID' })
  @RequirePermission('export.read')
  async downloadExport(@Param('jobId') jobId: string) {
    return this.exportQueueService.downloadExport(jobId);
  }

  @Delete('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up old export jobs (admin only)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  @ApiResponse({ status: 403, description: 'Admin permission required' })
  @ApiQuery({ name: 'daysToKeep', required: false, type: Number })
  @RequirePermission('system.admin')
  async cleanupOldJobs(@Query('daysToKeep') daysToKeep: number = 30) {
    return this.exportQueueService.cleanupOldJobs(daysToKeep);
  }
}

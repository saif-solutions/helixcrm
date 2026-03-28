// apps/api/src/modules/analytics/dto/analytics-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { ValidateDateRange } from '../../../shared/validators/date-range.validator';
import { IsValidCurrencyCode } from '../../../shared/validators/currency-code.validator';

// Helper function for safe boolean transformation
function transformToBoolean(value: unknown): boolean {
  if (value === 'true' || value === true || value === '1') {
    return true;
  }
  return false;
}

// Helper function for safe string transformation (uppercase)
function transformToUpperCase(value: unknown): string {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  if (typeof value === 'number') {
    return String(value).toUpperCase();
  }
  if (typeof value === 'boolean') {
    return String(value).toUpperCase();
  }
  if (value === null || value === undefined) {
    return '';
  }
  return '';
}

// Helper function for safe array transformation
function transformToArray(value: unknown): unknown[] {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value;
  return [value];
}

// ==================== ENUMS ====================
export enum AnalyticsGroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

export enum AnalyticsExportInclude {
  DEALS = 'deals',
  REVENUE = 'revenue',
  PIPELINE = 'pipeline',
  ACTIVITY = 'activity',
}

export enum ActivityType {
  DEAL_CREATED = 'deal_created',
  DEAL_CLOSED = 'deal_closed',
  DEAL_UPDATED = 'deal_updated',
  STAGE_MOVED = 'stage_moved',
  PIPELINE_CREATED = 'pipeline_created',
  USER_LOGIN = 'user_login',
  EXPORT_GENERATED = 'export_generated',
}

// ==================== BASE QUERY DTO ====================
export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for analytics (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for analytics (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  @ValidateDateRange()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by pipeline ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @ApiPropertyOptional({
    description: 'Filter by stage ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @ApiPropertyOptional({
    description: 'Filter by owner user ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;

  @ApiPropertyOptional({
    description: 'Time grouping interval',
    enum: AnalyticsGroupBy,
    default: AnalyticsGroupBy.MONTH,
  })
  @IsOptional()
  @IsEnum(AnalyticsGroupBy)
  groupBy?: AnalyticsGroupBy;

  @ApiPropertyOptional({
    description: 'Include deleted records',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => transformToBoolean(value))
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Limit results (for pagination)',
    minimum: 1,
    maximum: 500,
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Page number (for pagination)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;
}

// ==================== DEAL ANALYTICS DTO ====================
export class DealAnalyticsQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Calculate sales velocity (requires stage history)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => transformToBoolean(value))
  includeVelocity?: boolean;
}

// ==================== REVENUE ANALYTICS DTO ====================
export class RevenueAnalyticsQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Include revenue forecast based on expected close dates',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => transformToBoolean(value))
  includeForecast?: boolean;

  @ApiPropertyOptional({
    description: 'Currency code for revenue calculations (ISO 4217)',
    default: 'USD',
    example: 'EUR',
  })
  @IsOptional()
  @IsString()
  @IsValidCurrencyCode()
  @Transform(({ value }) => transformToUpperCase(value))
  currency?: string;
}

// ==================== PIPELINE ANALYTICS DTO ====================
export class PipelineAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by pipeline ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @ApiPropertyOptional({
    description: 'Include bottleneck analysis',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => transformToBoolean(value))
  includeBottlenecks?: boolean;

  @ApiPropertyOptional({
    description: 'Calculate average stage duration',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => transformToBoolean(value))
  includeDuration?: boolean;

  @ApiPropertyOptional({
    description: 'Lookback period for stage duration (days)',
    minimum: 1,
    maximum: 365,
    default: 90,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  durationDays?: number;
}

// ==================== ACTIVITY ANALYTICS DTO ====================
export class ActivityAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for activity analytics (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for activity analytics (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  @ValidateDateRange()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by activity type',
    enum: ActivityType,
    example: ActivityType.DEAL_CREATED,
  })
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @ApiPropertyOptional({
    description: 'Results per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Page number',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;
}

// ==================== EXPORT QUERY DTO ====================
export class AnalyticsExportQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for export (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for export (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  @ValidateDateRange()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by export status',
    enum: ['pending', 'processing', 'completed', 'failed'],
    example: 'completed',
  })
  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Export format',
    enum: ExportFormat,
    default: ExportFormat.CSV,
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @ApiPropertyOptional({
    description: 'Data types to include in export',
    enum: AnalyticsExportInclude,
    isArray: true,
    example: [AnalyticsExportInclude.DEALS, AnalyticsExportInclude.REVENUE],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AnalyticsExportInclude, { each: true })
  @Transform(({ value }) => transformToArray(value))
  include?: AnalyticsExportInclude[];

  @ApiPropertyOptional({
    description: 'Filter by pipeline ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @ApiPropertyOptional({
    description: 'Filter by owner user ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID()
  ownerUserId?: string;
}

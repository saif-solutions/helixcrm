import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsDate,
  IsInt,
  Min,
  IsIn,
  IsArray,
  IsEnum,
  Matches,
} from 'class-validator';

export class AuditLogQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 25,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Min(25)
  @Min(100)
  limit?: number = 25;

  @ApiPropertyOptional({
    description: 'Filter by action type',
    example: 'USER_CREATED',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by multiple actions',
    type: [String],
    example: ['USER_CREATED', 'USER_UPDATED'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actions?: string[];

  @ApiPropertyOptional({
    description: 'Filter by entity type',
    example: 'USER',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Filter by multiple entity types',
    type: [String],
    example: ['USER', 'CONTACT'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entityTypes?: string[];

  @ApiPropertyOptional({
    description: 'Filter by actor type',
    example: 'USER',
  })
  @IsOptional()
  @IsString()
  actorType?: string;

  @ApiPropertyOptional({
    description: 'Filter by multiple actor types',
    type: [String],
    example: ['USER', 'SYSTEM'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actorTypes?: string[];

  @ApiPropertyOptional({
    description: 'Filter by severity level',
    example: 'HIGH',
  })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({
    description: 'Filter by multiple severity levels',
    type: [String],
    example: ['HIGH', 'CRITICAL'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  severities?: string[];

  @ApiPropertyOptional({
    description: 'Search term for actor email, entity ID, or action',
    example: 'admin@example.com',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  from?: Date;

  @ApiPropertyOptional({
    description: 'End date for filtering (ISO format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  to?: Date;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['createdAt', 'severity', 'action'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'severity', 'action'])
  sortBy?: 'createdAt' | 'severity' | 'action' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Filter by source',
    enum: ['WEB', 'API', 'MOBILE', 'SYSTEM', 'BATCH_JOB', 'INTEGRATION', 'CLI'],
    example: 'WEB',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Filter by outcome',
    enum: ['SUCCESS', 'FAILURE', 'PARTIAL', 'WARNING'],
    example: 'SUCCESS',
  })
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiPropertyOptional({
    description: 'Filter by actor email',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'Invalid email format',
  })
  actorEmail?: string;

  @ApiPropertyOptional({
    description: 'Organization ID',
    example: 'org_123',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
    example: 'user_123',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by request ID',
    example: 'req_123',
  })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional({
    description: 'Filter by correlation ID',
    example: 'corr_123',
  })
  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class AuditStatsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for statistics (ISO format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  from?: Date;

  @ApiPropertyOptional({
    description: 'End date for statistics (ISO format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  to?: Date;

  @ApiPropertyOptional({
    description: 'Organization ID',
    example: 'org_123',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

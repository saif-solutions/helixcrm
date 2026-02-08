// apps/api/src/modules/audit-logs/application/dto/create-audit-log.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNotEmpty,
  IsEmail,
  Matches,
} from 'class-validator';
import {
  AuditAction,
  AuditEntityType,
  ActorType,
  AuditSeverity,
  AuditLogTypes,
} from '../../domain';

export class CreateAuditLogDto {
  @ApiProperty({
    description: 'Action performed',
    example: 'USER_CREATED',
    enum: Object.values(AuditAction),
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(AuditAction, { message: 'Invalid action value' })
  action: AuditAction;

  @ApiProperty({
    description: 'Type of entity affected',
    example: 'USER',
    enum: Object.values(AuditEntityType),
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(AuditEntityType, { message: 'Invalid entity type value' })
  entityType: AuditEntityType;

  @ApiPropertyOptional({
    description: 'ID of the entity affected',
    example: 'user_123',
  })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'User ID of the actor',
    example: 'user_456',
  })
  @IsOptional()
  @IsString()
  actorUserId?: string;

  @ApiProperty({
    description: 'Email of the actor',
    example: 'admin@example.com',
  })
  @IsString()
  @IsEmail()
  actorEmail: string;

  @ApiPropertyOptional({
    description: 'Name of the actor',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  actorName?: string;

  @ApiProperty({
    description: 'Type of actor',
    example: 'USER',
    enum: Object.values(ActorType),
  })
  @IsString()
  @IsEnum(ActorType, { message: 'Invalid actor type value' })
  actorType: ActorType;

  @ApiProperty({
    description: 'Severity of the audit log',
    example: 'MEDIUM',
    enum: Object.values(AuditSeverity),
  })
  @IsString()
  @IsEnum(AuditSeverity, { message: 'Invalid severity value' })
  severity: AuditSeverity;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { oldRole: 'USER', newRole: 'ADMIN' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'IP address of the request',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, {
    message: 'Invalid IP address format',
  })
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User agent string',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Request ID for tracing',
    example: 'req_123',
  })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional({
    description: 'Correlation ID for distributed tracing',
    example: 'corr_123',
  })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiProperty({
    description: 'Organization ID',
    example: 'org_123',
  })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional({
    description: 'Display-friendly action name',
    example: 'User Created',
  })
  @IsOptional()
  @IsString()
  displayAction?: string;

  @ApiPropertyOptional({
    description: 'Whether this is an extended action',
    example: false,
  })
  @IsOptional()
  isExtendedAction?: boolean;

  @ApiPropertyOptional({
    description: 'Human-readable description',
    example: 'User John Doe was created by admin',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Source of the action',
    example: 'WEB',
    enum: ['WEB', 'API', 'MOBILE', 'SYSTEM', 'BATCH_JOB', 'INTEGRATION', 'CLI'],
  })
  @IsOptional()
  @IsEnum(['WEB', 'API', 'MOBILE', 'SYSTEM', 'BATCH_JOB', 'INTEGRATION', 'CLI'])
  source?: string;

  @ApiPropertyOptional({
    description: 'Outcome of the action',
    example: 'SUCCESS',
    enum: ['SUCCESS', 'FAILURE', 'PARTIAL', 'WARNING'],
  })
  @IsOptional()
  @IsEnum(['SUCCESS', 'FAILURE', 'PARTIAL', 'WARNING'])
  outcome?: string;

  @ApiPropertyOptional({
    description: 'ID of the affected user (for user-related actions)',
    example: 'user_789',
  })
  @IsOptional()
  @IsString()
  affectedUserId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for auth-related logs',
    example: 'session_123',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Duration of the action in milliseconds',
    example: 150,
  })
  @IsOptional()
  durationMs?: number;

  @ApiPropertyOptional({
    description: 'Resource path/URL',
    example: '/api/users',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  // Add validation method
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!AuditLogTypes.isAuditAction(this.action)) {
      errors.push(`Invalid action: ${this.action}`);
    }

    if (!AuditLogTypes.isAuditEntityType(this.entityType)) {
      errors.push(`Invalid entity type: ${this.entityType}`);
    }

    if (!AuditLogTypes.isAuditSeverity(this.severity)) {
      errors.push(`Invalid severity: ${this.severity}`);
    }

    if (!AuditLogTypes.isActorType(this.actorType)) {
      errors.push(`Invalid actor type: ${this.actorType}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

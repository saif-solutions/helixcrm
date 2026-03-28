// apps/api/src/contracts/audit/audit.contract.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  IsISO8601,
  IsArray,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// NOTE: New AuditAction values must be backward-compatible
// and never change semantic meaning once released
export enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',

  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  ROLE_CHANGED = 'ROLE_CHANGED',

  // CRM Operations
  CONTACT_CREATED = 'CONTACT_CREATED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  CONTACT_DELETED = 'CONTACT_DELETED',
  DEAL_CREATED = 'DEAL_CREATED',
  DEAL_UPDATED = 'DEAL_UPDATED',
  DEAL_DELETED = 'DEAL_DELETED',
  PIPELINE_CREATED = 'PIPELINE_CREATED',
  PIPELINE_UPDATED = 'PIPELINE_UPDATED',
  PIPELINE_DELETED = 'PIPELINE_DELETED',
  LEAD_CREATED = 'LEAD_CREATED',
  LEAD_UPDATED = 'LEAD_UPDATED',
  LEAD_DELETED = 'LEAD_DELETED',

  // Security
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CSRF_FAILURE = 'CSRF_FAILURE',
  RATE_LIMIT_TRIGGERED = 'RATE_LIMIT_TRIGGERED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export enum AuditEntityType {
  AUTH = 'AUTH',
  USER = 'USER',
  CONTACT = 'CONTACT',
  DEAL = 'DEAL',
  PIPELINE = 'PIPELINE',
  LEAD = 'LEAD',
  ACCOUNT = 'ACCOUNT',
  ACTIVITY = 'ACTIVITY',
  SYSTEM = 'SYSTEM',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}

/**
 * Audit metadata interface with proper typing
 */
export interface AuditMetadata {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  source?: string;
  correlationId?: string;
  [key: string]: unknown;
}

// Read-only response DTO — never used as input
export class AuditLogResponse {
  id: string;
  action: AuditAction;
  actorType: ActorType;
  actorEmail: string;
  actorUserId?: string;
  entityType: AuditEntityType;
  entityId?: string;
  organizationId: string;
  severity: AuditSeverity;
  metadata?: AuditMetadata;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class AuditLogListResponse {
  logs: AuditLogResponse[];
  total: number;
  page: number;
  limit: number;
}

export class CreateAuditLogInput {
  @IsEnum(AuditAction)
  @IsNotEmpty()
  action: AuditAction;

  @IsEnum(ActorType)
  @IsNotEmpty()
  actorType: ActorType;

  @IsString()
  @IsNotEmpty()
  actorEmail: string;

  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @IsEnum(AuditEntityType)
  @IsNotEmpty()
  entityType: AuditEntityType;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsEnum(AuditSeverity)
  @IsNotEmpty()
  severity: AuditSeverity;

  @IsOptional()
  @IsObject()
  metadata?: AuditMetadata;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  /**
   * Validate business invariants
   * @returns Array of warning messages (not errors), empty array if valid
   */
  validateInvariants(): string[] {
    return [
      ...AuditInvariants.validateActorContext(this),
      ...AuditInvariants.validateSeverityContext(this),
      ...AuditInvariants.validateEntityContext(this),
    ];
  }
}

export class AuditLogQueryParams {
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsEnum(AuditEntityType)
  entityType?: AuditEntityType;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

  @IsOptional()
  @IsString()
  actorEmail?: string;

  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Max(200, { message: 'Maximum limit is 200 for performance reasons' })
  limit?: number = 50;

  @IsOptional()
  @IsString()
  organizationId?: string;

  validateInvariants(): string[] {
    return AuditInvariants.validateQueryParams(this);
  }
}

export class BulkAuditLogInput {
  @IsArray()
  @Type(() => CreateAuditLogInput)
  logs: CreateAuditLogInput[];

  @IsOptional()
  @IsString()
  batchId?: string;

  validateInvariants(): string[] {
    const warnings: string[] = [];

    // Check batch size limits (warning only)
    if (this.logs.length > 1000) {
      warnings.push('Batch size exceeds recommended maximum of 1000 logs');
    }

    // Validate each log (collect warnings)
    this.logs.forEach((log, index) => {
      const logWarnings = log.validateInvariants();
      if (logWarnings.length > 0) {
        warnings.push(`Log ${index + 1}: ${logWarnings.join(', ')}`);
      }
    });

    return warnings;
  }
}

/**
 * Business invariants for audit logging
 * NOTE: These are warnings/recommendations, not blockers
 * Audit systems must be fail-open, not fail-closed
 */
export class AuditInvariants {
  /**
   * Invariant: Actor context validation (warnings only)
   */
  static validateActorContext(input: CreateAuditLogInput): string[] {
    const warnings: string[] = [];

    if (input.actorType === ActorType.USER && !input.actorUserId) {
      warnings.push(
        'USER actor type typically includes actorUserId for traceability',
      );
    }

    if (input.actorType === ActorType.SYSTEM && input.actorUserId) {
      warnings.push('SYSTEM actor type typically does not have actorUserId');
    }

    return warnings;
  }

  /**
   * Invariant: Severity context validation (warnings only)
   */
  static validateSeverityContext(input: CreateAuditLogInput): string[] {
    const warnings: string[] = [];

    // CRITICAL severity should have IP address for investigation
    if (input.severity === AuditSeverity.CRITICAL && !input.ipAddress) {
      warnings.push('CRITICAL severity logs are more useful with IP address');
    }

    // Security-related actions typically have higher severity
    const securityActions = [
      AuditAction.LOGIN_FAILURE,
      AuditAction.PERMISSION_DENIED,
      AuditAction.CSRF_FAILURE,
      AuditAction.RATE_LIMIT_TRIGGERED,
    ];

    if (
      securityActions.includes(input.action) &&
      input.severity === AuditSeverity.LOW
    ) {
      warnings.push(
        'Security actions typically have MEDIUM or higher severity',
      );
    }

    return warnings;
  }

  /**
   * Invariant: Entity context validation (warnings only)
   */
  static validateEntityContext(input: CreateAuditLogInput): string[] {
    const warnings: string[] = [];

    // Entity-specific actions are more useful with entityId
    const entitySpecificActions = [
      AuditAction.USER_UPDATED,
      AuditAction.USER_DELETED,
      AuditAction.CONTACT_UPDATED,
      AuditAction.CONTACT_DELETED,
      AuditAction.DEAL_UPDATED,
      AuditAction.DEAL_DELETED,
      AuditAction.PIPELINE_UPDATED,
      AuditAction.PIPELINE_DELETED,
      AuditAction.LEAD_UPDATED,
      AuditAction.LEAD_DELETED,
    ];

    if (entitySpecificActions.includes(input.action) && !input.entityId) {
      warnings.push(`${input.action} is more useful with entityId`);
    }

    return warnings;
  }

  /**
   * Invariant: Query parameter validation
   */
  static validateQueryParams(input: AuditLogQueryParams): string[] {
    const warnings: string[] = [];

    // Date range validation
    if (input.startDate && input.endDate) {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);

      if (start > end) {
        warnings.push('startDate should be before endDate');
      }

      // Warn about very large date ranges
      const daysDifference =
        (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
      if (daysDifference > 365) {
        warnings.push(
          'Query spans more than 1 year, consider smaller date ranges',
        );
      }
    }

    return warnings;
  }

  /**
   * Invariant: Audit trail integrity (deferred to service layer)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static validateAuditTrail(_logs: CreateAuditLogInput[]): string[] {
    // This would require timestamps and business context
    // Deferred to service layer
    return [];
  }
}

// Phase-2 / Analysis layer interfaces
export interface AuditSummary {
  totalLogs: number;
  byAction: Record<AuditAction, number>;
  bySeverity: Record<AuditSeverity, number>;
  byEntityType: Record<AuditEntityType, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

// Phase-2 / Alerting layer interface
export interface SecurityAlert {
  id: string;
  type:
    | 'BRUTE_FORCE'
    | 'UNAUTHORIZED_ACCESS'
    | 'DATA_EXFILTRATION'
    | 'SYSTEM_BREACH';
  severity: AuditSeverity;
  description: string;
  affectedEntities: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  evidence: AuditLogResponse[];
}

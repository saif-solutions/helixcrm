// File: apps/api/src/shared/audit-log/audit-log.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueueService, AuditJobData } from './audit-queue.service';
import { AuditIntegrityService } from '../audit-integrity/audit-integrity.service';

// Import Prisma enums
import { $Enums } from '.prisma/client';

// Re-export Prisma enums for use in other modules
export const AuditAction = $Enums.AuditAction;
export const AuditEntityType = $Enums.AuditEntityType;
export const AuditSeverity = $Enums.AuditSeverity;

// Create type aliases for convenience
export type AuditAction = $Enums.AuditAction;
export type AuditEntityType = $Enums.AuditEntityType;
export type AuditSeverity = $Enums.AuditSeverity;

interface AuditLogData {
  action: AuditAction;
  entityType: AuditEntityType;
  actorEmail: string;
  actorUserId?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  severity: AuditSeverity;
  organizationId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * LANE 1: Strict request-based logging for controllers
 * Context: HTTP request with user authentication
 * Usage: AuthController, REST controllers only
 */
interface LogWithRequestParams {
  request: Request;
  action: AuditAction;
  entityType: AuditEntityType;
  actorEmail: string;
  actorUserId?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
  organizationId?: string | null;
}

/**
 * LANE 2: Flexible logging for application services
 * Context: May or may not have HTTP request
 * Usage: Application services (Deals, RBAC, etc.)
 */
interface LogEventParams {
  request?: Request; // OPTIONAL
  action: AuditAction;
  entityType: AuditEntityType;
  actorEmail: string;
  actorUserId?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
  organizationId?: string | null;
}

/**
 * LANE 3: Specialized auth event logging
 * Context: Auth-specific events with simplified interface
 * Usage: Auth service methods
 */
interface LogAuthEventParams {
  request?: Request; // OPTIONAL for auth service
  action: AuditAction;
  actorEmail: string;
  actorUserId?: string;
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
  organizationId?: string | null;
}

/**
 * MODES:
 * - SYNC_MODE: All audit writes are synchronous (default fallback)
 * - ASYNC_MODE: Non-critical writes go to queue, critical writes are sync
 * - QUEUE_DISABLED: Force synchronous mode even if queue is available
 */
export enum AuditMode {
  SYNC_MODE = 'SYNC_MODE',
  ASYNC_MODE = 'ASYNC_MODE',
  QUEUE_DISABLED = 'QUEUE_DISABLED',
}

/**
 * CONTRACT:
 * - logWithRequest: REQUIRES request context, fail-fast on missing organizationId
 * - logEvent: OPTIONAL request, flexible for application services
 * - logAuthEvent: OPTIONAL request, simplified for auth events
 * - Login flows MUST explicitly pass organizationId
 * - Failed authentication events may lack organization context and are logged accordingly
 *
 * ASYNC ENHANCEMENTS:
 * - Critical events (security breaches, failures) are always synchronous
 * - Non-critical events (user actions, reads) go to async queue
 * - Queue unavailable → automatic fallback to synchronous mode
 *
 * INTEGRITY ENHANCEMENTS:
 * - All audit events are also added to append-only integrity chain
 * - Hash chaining ensures tamper detection
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private auditMode: AuditMode = AuditMode.SYNC_MODE;
  private queueAvailable = false;

  /**
   * Actions that are allowed during system bootstrap (no organization context required)
   * These represent special lifecycle events where organization may not be resolved yet
   */
  private readonly BOOTSTRAP_ALLOWED_ACTIONS = new Set<AuditAction>([
    AuditAction.USER_CREATED,
    AuditAction.LOGIN_SUCCESS,
  ]);

  /**
   * Critical actions that must always be written synchronously
   * These represent security events where immediate persistence is required
   */
  private readonly CRITICAL_ACTIONS = new Set<AuditAction>([
    AuditAction.LOGIN_FAILURE,
    AuditAction.USER_DELETED,
    AuditAction.PERMISSION_DENIED,
    AuditAction.PASSWORD_CHANGE,
    AuditAction.RATE_LIMIT_TRIGGERED,
    AuditAction.CSRF_FAILURE,
    AuditAction.SYSTEM_ERROR,
  ]);

  constructor(
    private prisma: PrismaService,
    @Optional()
    @Inject(AuditQueueService)
    private readonly auditQueueService?: AuditQueueService,
    @Optional()
    @Inject(AuditIntegrityService)
    private readonly auditIntegrityService?: AuditIntegrityService,
  ) {
    this.initializeAuditMode();
  }

  /**
   * Initialize audit mode based on queue availability
   */
  private initializeAuditMode() {
    if (this.auditQueueService) {
      this.auditMode = AuditMode.ASYNC_MODE;
      this.queueAvailable = true;
      this.logger.log(
        'Audit queue service available - enabling async audit mode',
      );
    } else {
      this.auditMode = AuditMode.SYNC_MODE;
      this.queueAvailable = false;
      this.logger.warn(
        'Audit queue service not available - using synchronous mode only',
      );
    }
  }

  /**
   * Check if an action requires organization context
   * Certain bootstrap actions are exempt from this requirement
   */
  private requiresOrganizationContext(action: AuditAction): boolean {
    // Allow bootstrap actions to proceed without organization context
    if (this.BOOTSTRAP_ALLOWED_ACTIONS.has(action)) {
      return false;
    }

    // All other actions require organization context
    const actionsRequiringOrgContext = [
      'USER_UPDATED',
      'PERMISSION_GRANTED',
      'ROLE_ASSIGNED',
      'ROLE_CREATED',
      'ROLE_UPDATED',
      'ROLE_DELETED',
      'DEAL_CREATED',
      'DEAL_UPDATED',
      'DEAL_DELETED',
      'CONTACT_CREATED',
      'CONTACT_UPDATED',
      'CONTACT_DELETED',
      'ANALYTICS_EXPORT_REQUESTED',
      'ANALYTICS_EXPORT_DOWNLOADED',
      'ANALYTICS_EXPORT_COMPLETED',
      'ANALYTICS_EXPORT_FAILED',
    ];

    return actionsRequiringOrgContext.includes(action);
  }

  /**
   * Determine if an action should be processed synchronously
   */
  private isCriticalAction(action: AuditAction): boolean {
    return this.CRITICAL_ACTIONS.has(action);
  }

  // ==================== CORE AUDIT LOGGING METHODS ====================

  /**
   * Strict audit logging for controllers with HTTP request context
   * CONTRACT: Requires request, fail-fast on missing organization context
   */
  async logWithRequest(
    request: Request,
    action: AuditAction,
    entityType: AuditEntityType,
    actorEmail: string,
    actorUserId?: string,
    entityId?: string,
    metadata?: Record<string, any>,
    severity: AuditSeverity = AuditSeverity.MEDIUM,
    organizationId?: string | null,
  ) {
    try {
      // Validate that we have organization context
      // For actions that require organization context, fail fast if missing
      // EXCEPTION: Bootstrap actions (USER_CREATED, LOGIN_SUCCESS) are allowed without org context

      let resolvedOrganizationId = organizationId;

      // Try to get organizationId from request.user if not provided
      if (!resolvedOrganizationId && (request as any).user?.organizationId) {
        resolvedOrganizationId = (request as any).user.organizationId;
      }

      // For actions that require organization context, throw if missing
      // BUT: Allow bootstrap actions to proceed without organization context
      if (this.requiresOrganizationContext(action) && !resolvedOrganizationId) {
        throw new InternalServerErrorException(
          `Audit log requires organization context for action: ${action}. ` +
            `Actor: ${actorEmail}, Entity: ${entityType}`,
        );
      }

      // Log a warning for missing org context on bootstrap actions
      if (
        !resolvedOrganizationId &&
        this.BOOTSTRAP_ALLOWED_ACTIONS.has(action)
      ) {
        this.logger.warn(
          `Bootstrap audit action: ${action} recorded without organization context. ` +
            `Actor: ${actorEmail}, Entity: ${entityType}. ` +
            `This is acceptable during system bootstrap.`,
        );

        // Add bootstrap metadata for traceability
        if (metadata) {
          metadata.bootstrap = true;
          metadata.bootstrapReason = 'organization_context_not_resolved_yet';
        } else {
          metadata = {
            bootstrap: true,
            bootstrapReason: 'organization_context_not_resolved_yet',
          };
        }
      } else if (!resolvedOrganizationId && action !== 'LOGIN_FAILURE') {
        // Log warning for other non-bootstrap actions missing org context
        this.logger.warn(
          `Audit log missing organization context for action: ${action}. ` +
            `Actor: ${actorEmail}, Entity: ${entityType}. ` +
            `This is acceptable for failed authentication attempts.`,
        );
      }

      // Prepare audit data
      const auditData: AuditLogData = {
        action,
        entityType,
        actorEmail,
        actorUserId,
        entityId,
        metadata,
        severity,
        organizationId: resolvedOrganizationId,
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
        requestId:
          (request as any).id || (request as any).headers['x-request-id'],
      };

      // Determine if we should use async queue
      const isCritical = this.isCriticalAction(action);

      if (
        this.queueAvailable &&
        this.auditMode === AuditMode.ASYNC_MODE &&
        !isCritical
      ) {
        // Use async queue for non-critical events
        return await this.logToQueue(auditData);
      } else {
        // Use synchronous logging for critical events or when queue is unavailable
        if (isCritical) {
          this.logger.debug(
            `Critical action ${action} - using synchronous logging`,
          );
        }
        return await this.createAuditLogEntrySync(auditData);
      }
    } catch (error) {
      return this.handleAuditError(
        error,
        action,
        entityType,
        actorEmail,
        organizationId,
      );
    }
  }

  /**
   * Object-based version for cleaner controller usage
   */
  async logWithRequestObject(params: LogWithRequestParams) {
    return this.logWithRequest(
      params.request,
      params.action,
      params.entityType,
      params.actorEmail,
      params.actorUserId,
      params.entityId,
      params.metadata,
      params.severity || AuditSeverity.MEDIUM,
      params.organizationId,
    );
  }

  // ==================== LANE 2: Flexible Application Service Logging ====================

  /**
   * Flexible audit logging for application services
   * CONTRACT: Optional request, auto-routes to appropriate lane
   */
  async logEvent(params: LogEventParams) {
    try {
      // Route to appropriate lane based on context
      if (params.request) {
        // Has request context → use Lane 1
        return this.logWithRequest(
          params.request,
          params.action,
          params.entityType,
          params.actorEmail,
          params.actorUserId,
          params.entityId,
          params.metadata,
          params.severity || AuditSeverity.MEDIUM,
          params.organizationId,
        );
      } else {
        // No request context → use Lane 3 (direct/system logging)
        return this.logDirect(
          params.action,
          params.entityType,
          params.actorEmail,
          params.actorUserId,
          params.entityId,
          params.metadata,
          params.severity || AuditSeverity.MEDIUM,
          params.organizationId,
        );
      }
    } catch (error) {
      return this.handleAuditError(
        error,
        params.action,
        params.entityType,
        params.actorEmail,
        params.organizationId,
      );
    }
  }

  // ==================== LANE 3: Auth Service & Direct/System Logging ====================

  /**
   * Specialized method for auth events
   * CONTRACT: Simplified interface, optional request
   */
  async logAuthEvent(params: LogAuthEventParams) {
    try {
      if (params.request) {
        // Has request context → use Lane 1
        return this.logWithRequest(
          params.request,
          params.action,
          AuditEntityType.AUTH,
          params.actorEmail,
          params.actorUserId,
          undefined, // entityId
          params.metadata,
          params.severity || AuditSeverity.MEDIUM,
          params.organizationId,
        );
      } else {
        // No request context → use Lane 3 (direct/system logging)
        return this.logDirect(
          params.action,
          AuditEntityType.AUTH,
          params.actorEmail,
          params.actorUserId,
          undefined, // entityId
          params.metadata,
          params.severity || AuditSeverity.MEDIUM,
          params.organizationId,
        );
      }
    } catch (error) {
      return this.handleAuditError(
        error,
        params.action,
        AuditEntityType.AUTH,
        params.actorEmail,
        params.organizationId,
      );
    }
  }

  /**
   * Direct/system-level audit logging
   * CONTRACT: No request context, for background jobs/system events
   */
  async logDirect(
    action: AuditAction,
    entityType: AuditEntityType,
    actorEmail: string,
    actorUserId?: string,
    entityId?: string,
    metadata?: Record<string, any>,
    severity: AuditSeverity = AuditSeverity.MEDIUM,
    organizationId?: string | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      const auditData: AuditLogData = {
        action,
        entityType,
        actorEmail,
        actorUserId,
        entityId,
        metadata,
        severity,
        organizationId,
        ipAddress,
        userAgent,
        requestId: `system-${Date.now()}`,
      };

      // Determine if we should use async queue
      const isCritical = this.isCriticalAction(action);

      if (
        this.queueAvailable &&
        this.auditMode === AuditMode.ASYNC_MODE &&
        !isCritical
      ) {
        // Use async queue for non-critical events
        return await this.logToQueue(auditData);
      } else {
        // Use synchronous logging for critical events or when queue is unavailable
        return await this.createAuditLogEntrySync(auditData);
      }
    } catch (error) {
      return this.handleAuditError(
        error,
        action,
        entityType,
        actorEmail,
        organizationId,
      );
    }
  }

  // ==================== ASYNC QUEUE METHODS ====================

  /**
   * Log audit event to async queue
   */
  private async logToQueue(auditData: AuditLogData): Promise<any> {
    try {
      if (!this.auditQueueService) {
        throw new Error('Audit queue service not available');
      }

      const jobData: Omit<AuditJobData, 'isCritical'> = {
        action: auditData.action,
        entityType: auditData.entityType,
        actorEmail: auditData.actorEmail,
        actorUserId: auditData.actorUserId,
        entityId: auditData.entityId,
        metadata: auditData.metadata,
        severity: auditData.severity,
        organizationId: auditData.organizationId,
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
        requestId: auditData.requestId,
      };

      const job = await this.auditQueueService.addAuditEvent(jobData);

      this.logger.debug(`Audit event queued: ${auditData.action}`, {
        jobId: job.id,
        action: auditData.action,
        actorEmail: auditData.actorEmail,
      });

      return {
        queued: true,
        jobId: job.id,
        action: auditData.action,
        message: 'Audit event queued for async processing',
      };
    } catch (error) {
      // If queue fails, fall back to synchronous logging
      this.logger.warn(
        `Queue failed for audit ${auditData.action}, falling back to sync: ${error.message}`,
      );
      return await this.createAuditLogEntrySync(auditData);
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

/**
 * Synchronous audit log creation with integrity chain integration
 */
private async createAuditLogEntrySync(auditData: AuditLogData) {
  try {
    // Build the base data
    const data: any = {
      action: auditData.action,
      entityType: auditData.entityType,
      actorEmail: auditData.actorEmail,
      actorUserId: auditData.actorUserId,
      entityId: auditData.entityId,
      metadata: auditData.metadata,
      severity: auditData.severity,
      ipAddress: auditData.ipAddress,
      userAgent: auditData.userAgent,
      requestId: auditData.requestId,
    };

    // Handle organizationId - try to resolve if missing for LOGIN_SUCCESS
    let organizationId = auditData.organizationId;
    
    if (!organizationId && auditData.action === 'LOGIN_SUCCESS' && auditData.actorUserId) {
      try {
        // Try to fetch user's organization for login audit
        const user = await this.prisma.user.findUnique({
          where: { id: auditData.actorUserId },
          select: { organizationId: true }
        });
        if (user?.organizationId) {
          organizationId = user.organizationId;
          this.logger.debug(`Resolved organization ${organizationId} for login audit log`);
        }
      } catch (error) {
        this.logger.warn('Could not fetch user organization for audit log', { 
          actorUserId: auditData.actorUserId,
          error: error.message 
        });
      }
    }

    // Now set organizationId if we have it
    if (organizationId) {
      data.organizationId = organizationId;
    } else {
      // For bootstrap actions without organization, log warning and skip
      if (auditData.action === 'LOGIN_SUCCESS') {
        this.logger.warn(
          `Bootstrap audit action: LOGIN_SUCCESS recorded without organization context. ` +
          `Actor: ${auditData.actorEmail}, Entity: ${auditData.entityType}. ` +
          `This is acceptable during system bootstrap.`
        );
        return null; // Skip audit log creation
      }
    }

    const auditLog = await this.prisma.auditLog.create({
      data,
    });

    // INTEGRITY: Add to append-only chain
    await this.appendToIntegrityChain(auditLog, auditData);

    this.logger.debug(
      `Audit log created synchronously: ${auditData.action} for ${auditData.entityType}`,
      {
        auditId: auditLog.id,
        actorEmail: auditData.actorEmail,
        organizationId: organizationId || 'not-provided',
        mode: 'SYNC',
      },
    );

    return auditLog;
  } catch (error) {
    // If creation fails due to organizationId constraint, try an alternative approach
    if (error.message.includes('organization') && !auditData.organizationId) {
      this.logger.warn(
        `Audit log creation failed without organizationId for ${auditData.action}. ` +
        `This is expected for bootstrap actions. Audit will be skipped.`,
      );

      // Return null to indicate audit was skipped
      // The main operation should continue
      return null;
    }

    // Re-throw other errors
    throw error;
  }
}
  /**
   * Add audit event to integrity chain
   */
  private async appendToIntegrityChain(
    auditLog: any,
    auditData: AuditLogData,
  ): Promise<void> {
    try {
      if (!this.auditIntegrityService) {
        this.logger.debug(
          'Audit integrity service not available, skipping chain append',
        );
        return;
      }

      const integrityEvent = {
        action: auditData.action,
        entityType: auditData.entityType,
        entityId: auditData.entityId,
        userId: auditData.actorUserId,
        tenantId: auditData.organizationId,
        details: auditData.metadata,
        timestamp: new Date(),
        metadata: {
          auditLogId: auditLog.id,
          ipAddress: auditData.ipAddress,
          userAgent: auditData.userAgent,
          requestId: auditData.requestId,
          severity: auditData.severity,
          actorEmail: auditData.actorEmail,
        },
      };

      const hash = await this.auditIntegrityService.appendEvent(integrityEvent);

      this.logger.debug(
        `Audit event added to integrity chain: ${hash.substring(0, 16)}...`,
      );
    } catch (error) {
      // Don't fail the main audit operation if integrity chain fails
      this.logger.error(
        `Failed to append to integrity chain: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle audit logging errors gracefully
   */
  private handleAuditError(
    error: any,
    action: AuditAction,
    entityType: AuditEntityType,
    actorEmail: string,
    organizationId?: string | null,
  ) {
    // If the error is that audit was skipped (returned null), just log debug
    if (error === null) {
      this.logger.debug(`Audit log skipped for bootstrap action: ${action}`, {
        action,
        actorEmail,
      });
      return null;
    }

    // Log error but don't fail the main operation
    this.logger.error(`Failed to create audit log: ${error.message}`, {
      action,
      entityType,
      actorEmail,
      organizationId,
      error: error.stack,
    });

    // Re-throw if it's our intentional validation error
    if (error instanceof InternalServerErrorException) {
      throw error;
    }

    // For database errors, log but continue
    this.logger.warn(
      `Audit log creation failed (database error), but main operation continues. ` +
        `Action: ${action}, Actor: ${actorEmail}`,
    );

    return null;
  }

  // ==================== PUBLIC UTILITY METHODS ====================

  /**
   * Get current audit mode
   */
  getAuditMode(): AuditMode {
    return this.auditMode;
  }

  /**
   * Check if async queue is available
   */
  isQueueAvailable(): boolean {
    return this.queueAvailable;
  }

  /**
   * Force audit mode (for testing/debugging)
   */
  setAuditMode(mode: AuditMode) {
    this.auditMode = mode;
    this.logger.log(`Audit mode changed to: ${mode}`);
  }

  // ==================== QUERY & MAINTENANCE METHODS ====================

  /**
   * Query audit logs with filtering
   */
  async queryLogs(filters: {
    organizationId?: string;
    actorUserId?: string;
    action?: AuditAction;
    entityType?: AuditEntityType;
    startDate?: Date;
    endDate?: Date;
    severity?: AuditSeverity;
    take?: number;
    skip?: number;
  }) {
    const where: any = {};

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.actorUserId) {
      where.actorUserId = filters.actorUserId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.take || 100,
        skip: filters.skip || 0,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page: Math.floor((filters.skip || 0) / (filters.take || 100)) + 1,
      totalPages: Math.ceil(total / (filters.take || 100)),
    };
  }

  /**
   * Clean up old audit logs (retention policy)
   */
  async cleanupOldLogs(retentionDays: number = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          severity: {
            in: ['LOW', 'MEDIUM'] as AuditSeverity[],
          },
        },
      });

      this.logger.log(
        `Cleaned up ${result.count} old audit logs older than ${retentionDays} days`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to cleanup old audit logs: ${error.message}`);
      throw error;
    }
  }
}

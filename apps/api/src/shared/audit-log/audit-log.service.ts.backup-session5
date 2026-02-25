// File: apps/api/src/shared/audit-log/audit-log.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

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
 * CONTRACT:
 * - logWithRequest: REQUIRES request context, fail-fast on missing organizationId
 * - logEvent: OPTIONAL request, flexible for application services
 * - logAuthEvent: OPTIONAL request, simplified for auth events
 * - Login flows MUST explicitly pass organizationId
 * - Failed authentication events may lack organization context and are logged accordingly
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  
  /**
   * Actions that are allowed during system bootstrap (no organization context required)
   * These represent special lifecycle events where organization may not be resolved yet
   */
  private readonly BOOTSTRAP_ALLOWED_ACTIONS = new Set<AuditAction>([
    AuditAction.USER_CREATED,
    AuditAction.LOGIN_SUCCESS,
  ]);
  
  constructor(private prisma: PrismaService) {}
  
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
      'ANALYTICS_EXPORT_FAILED'
    ];
    
    return actionsRequiringOrgContext.includes(action);
  }

  // ==================== LANE 1: Strict Request-Based Logging ====================
  
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
    organizationId?: string | null
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
          `Actor: ${actorEmail}, Entity: ${entityType}`
        );
      }

      // Log a warning for missing org context on bootstrap actions
      if (!resolvedOrganizationId && this.BOOTSTRAP_ALLOWED_ACTIONS.has(action)) {
        this.logger.warn(
          `Bootstrap audit action: ${action} recorded without organization context. ` +
          `Actor: ${actorEmail}, Entity: ${entityType}. ` +
          `This is acceptable during system bootstrap.`
        );
        
        // Add bootstrap metadata for traceability
        if (metadata) {
          metadata.bootstrap = true;
          metadata.bootstrapReason = 'organization_context_not_resolved_yet';
        } else {
          metadata = {
            bootstrap: true,
            bootstrapReason: 'organization_context_not_resolved_yet'
          };
        }
      } else if (!resolvedOrganizationId && action !== 'LOGIN_FAILURE') {
        // Log warning for other non-bootstrap actions missing org context
        this.logger.warn(
          `Audit log missing organization context for action: ${action}. ` +
          `Actor: ${actorEmail}, Entity: ${entityType}. ` +
          `This is acceptable for failed authentication attempts.`
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
        requestId: (request as any).id || (request as any).headers['x-request-id']
      };

      return await this.createAuditLogEntry(auditData);
    } catch (error) {
      return this.handleAuditError(error, action, entityType, actorEmail, organizationId);
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
      params.organizationId
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
          params.organizationId
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
          params.organizationId
        );
      }
    } catch (error) {
      return this.handleAuditError(
        error, 
        params.action, 
        params.entityType, 
        params.actorEmail, 
        params.organizationId
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
          params.organizationId
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
          params.organizationId
        );
      }
    } catch (error) {
      return this.handleAuditError(
        error, 
        params.action, 
        AuditEntityType.AUTH, 
        params.actorEmail, 
        params.organizationId
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
    userAgent?: string
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
        requestId: `system-${Date.now()}`
      };

      return await this.createAuditLogEntry(auditData);
    } catch (error) {
      return this.handleAuditError(error, action, entityType, actorEmail, organizationId);
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Create audit log entry in database
   */
/**
 * Create audit log entry in database
 */
private async createAuditLogEntry(auditData: AuditLogData) {
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
      requestId: auditData.requestId
    };

    // Handle organizationId - check if we should include it
    // If organizationId is provided, use it
    // If it's null/undefined, we need to handle based on database constraints
    if (auditData.organizationId) {
      data.organizationId = auditData.organizationId;
    } else {
      // For bootstrap actions, we might not have organizationId
      // Try without it first, if that fails, we'll catch the error
      // and the main operation will continue (per handleAuditError)
    }

    const auditLog = await this.prisma.auditLog.create({
      data
    });

    this.logger.debug(`Audit log created: ${auditData.action} for ${auditData.entityType}`, {
      auditId: auditLog.id,
      actorEmail: auditData.actorEmail,
      organizationId: auditData.organizationId
    });

    return auditLog;
  } catch (error) {
    // If creation fails due to organizationId constraint, try an alternative approach
    if (error.message.includes('organization') && !auditData.organizationId) {
      this.logger.warn(`Audit log creation failed without organizationId for ${auditData.action}. ` +
        `This is expected for bootstrap actions. Audit will be skipped.`);
      
      // Return null to indicate audit was skipped
      // The main operation should continue
      return null;
    }
    
    // Re-throw other errors
    throw error;
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
  organizationId?: string | null
) {
  // If the error is that audit was skipped (returned null), just log debug
  if (error === null) {
    this.logger.debug(`Audit log skipped for bootstrap action: ${action}`, {
      action,
      actorEmail
    });
    return null;
  }

  // Log error but don't fail the main operation
  this.logger.error(`Failed to create audit log: ${error.message}`, {
    action,
    entityType,
    actorEmail,
    organizationId,
    error: error.stack
  });

  // Re-throw if it's our intentional validation error
  if (error instanceof InternalServerErrorException) {
    throw error;
  }

  // For database errors, log but continue
  this.logger.warn(
    `Audit log creation failed (database error), but main operation continues. ` +
    `Action: ${action}, Actor: ${actorEmail}`
  );
  
  return null;
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
              name: true
            }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      total,
      page: Math.floor((filters.skip || 0) / (filters.take || 100)) + 1,
      totalPages: Math.ceil(total / (filters.take || 100))
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
            lt: cutoffDate
          },
          severity: {
            in: ['LOW', 'MEDIUM'] as AuditSeverity[]
          }
        }
      });

      this.logger.log(`Cleaned up ${result.count} old audit logs older than ${retentionDays} days`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to cleanup old audit logs: ${error.message}`);
      throw error;
    }
  }
}
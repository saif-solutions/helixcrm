import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { 
  AuditAction as PrismaAuditAction,
  AuditEntityType as PrismaAuditEntityType,
  ActorType as PrismaActorType,
  AuditSeverity as PrismaAuditSeverity
} from '@prisma/client';

// ==================== ENUM DEFINITIONS ====================
// Extend Prisma enums with additional business actions
export enum AuditAction {
  // Core actions from Prisma schema
  LOGIN_SUCCESS = PrismaAuditAction.LOGIN_SUCCESS,
  LOGIN_FAILURE = PrismaAuditAction.LOGIN_FAILURE,
  LOGOUT = PrismaAuditAction.LOGOUT,
  PASSWORD_CHANGE = PrismaAuditAction.PASSWORD_CHANGE,
  TOKEN_REFRESH = PrismaAuditAction.TOKEN_REFRESH,
  
  USER_CREATED = PrismaAuditAction.USER_CREATED,
  USER_UPDATED = PrismaAuditAction.USER_UPDATED,
  USER_DELETED = PrismaAuditAction.USER_DELETED,
  ROLE_CHANGED = PrismaAuditAction.ROLE_CHANGED,
  
  CONTACT_CREATED = PrismaAuditAction.CONTACT_CREATED,
  CONTACT_UPDATED = PrismaAuditAction.CONTACT_UPDATED,
  CONTACT_DELETED = PrismaAuditAction.CONTACT_DELETED,
  
  DEAL_CREATED = PrismaAuditAction.DEAL_CREATED,
  DEAL_UPDATED = PrismaAuditAction.DEAL_UPDATED,
  DEAL_DELETED = PrismaAuditAction.DEAL_DELETED,
  
  PIPELINE_CREATED = PrismaAuditAction.PIPELINE_CREATED,
  PIPELINE_UPDATED = PrismaAuditAction.PIPELINE_UPDATED,
  PIPELINE_DELETED = PrismaAuditAction.PIPELINE_DELETED,
  
  LEAD_CREATED = PrismaAuditAction.LEAD_CREATED,
  LEAD_UPDATED = PrismaAuditAction.LEAD_UPDATED,
  LEAD_DELETED = PrismaAuditAction.LEAD_DELETED,
  
  PERMISSION_DENIED = PrismaAuditAction.PERMISSION_DENIED,
  CSRF_FAILURE = PrismaAuditAction.CSRF_FAILURE,
  RATE_LIMIT_TRIGGERED = PrismaAuditAction.RATE_LIMIT_TRIGGERED,
  SYSTEM_ERROR = PrismaAuditAction.SYSTEM_ERROR,
  
  // Extended actions (stored as custom actions in metadata or as SYSTEM_ERROR with details)
  ANALYTICS_EXPORT_REQUESTED = 'ANALYTICS_EXPORT_REQUESTED',
  ANALYTICS_EXPORT_DOWNLOADED = 'ANALYTICS_EXPORT_DOWNLOADED',
  ANALYTICS_EXPORT_COMPLETED = 'ANALYTICS_EXPORT_COMPLETED',
  ANALYTICS_EXPORT_FAILED = 'ANALYTICS_EXPORT_FAILED',
  
  ROLE_CREATED = 'ROLE_CREATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  ROLE_DELETED = 'ROLE_DELETED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',
}

// Entity types that match database ENUM
export enum AuditEntityType {
  AUTH = PrismaAuditEntityType.AUTH,
  USER = PrismaAuditEntityType.USER,
  CONTACT = PrismaAuditEntityType.CONTACT,
  DEAL = PrismaAuditEntityType.DEAL,
  PIPELINE = PrismaAuditEntityType.PIPELINE,
  LEAD = PrismaAuditEntityType.LEAD,
  ACCOUNT = PrismaAuditEntityType.ACCOUNT,
  ACTIVITY = PrismaAuditEntityType.ACTIVITY,
  SYSTEM = PrismaAuditEntityType.SYSTEM,
}

// Severity levels that match database ENUM
export enum AuditSeverity {
  LOW = PrismaAuditSeverity.LOW,
  MEDIUM = PrismaAuditSeverity.MEDIUM,
  HIGH = PrismaAuditSeverity.HIGH,
  CRITICAL = PrismaAuditSeverity.CRITICAL,
}

// Actor types that match database ENUM (UPPERCASE)
export enum ActorType {
  USER = PrismaActorType.USER,
  SYSTEM = PrismaActorType.SYSTEM,
}

// Type guard to check if action is a Prisma native action
const isPrismaNativeAction = (action: AuditAction): action is PrismaAuditAction => {
  return Object.values(PrismaAuditAction).includes(action as PrismaAuditAction);
};

// Type guard to check if action is extended action
const isExtendedAction = (action: AuditAction): boolean => {
  return !isPrismaNativeAction(action);
};

// Map extended actions to closest Prisma action for database storage
const mapExtendedToPrismaAction = (action: AuditAction): PrismaAuditAction => {
  const actionMap: Record<string, PrismaAuditAction> = {
    [AuditAction.ANALYTICS_EXPORT_REQUESTED]: PrismaAuditAction.SYSTEM_ERROR,
    [AuditAction.ANALYTICS_EXPORT_DOWNLOADED]: PrismaAuditAction.SYSTEM_ERROR,
    [AuditAction.ANALYTICS_EXPORT_COMPLETED]: PrismaAuditAction.SYSTEM_ERROR,
    [AuditAction.ANALYTICS_EXPORT_FAILED]: PrismaAuditAction.SYSTEM_ERROR,
    [AuditAction.ROLE_CREATED]: PrismaAuditAction.USER_CREATED,
    [AuditAction.ROLE_UPDATED]: PrismaAuditAction.USER_UPDATED,
    [AuditAction.ROLE_DELETED]: PrismaAuditAction.USER_DELETED,
    [AuditAction.ROLE_ASSIGNED]: PrismaAuditAction.ROLE_CHANGED,
    [AuditAction.ROLE_REMOVED]: PrismaAuditAction.ROLE_CHANGED,
  };
  
  return actionMap[action] || PrismaAuditAction.SYSTEM_ERROR;
};

export interface AuditLogData {
  organizationId: string;
  actorUserId?: string;
  actorEmail: string;
  actorType?: ActorType;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  requestId?: string;
  severity?: AuditSeverity;
}

@Injectable()
export class AuditLogService {
  constructor(
    private prisma: PrismaService,
  ) {}

  private getSeverityForAction(action: AuditAction): AuditSeverity {
    // Map actions to severity levels
    const highSeverityActions: AuditAction[] = [
      AuditAction.PERMISSION_DENIED,
      AuditAction.CSRF_FAILURE,
      AuditAction.SYSTEM_ERROR,
      AuditAction.ANALYTICS_EXPORT_FAILED,
    ];
    
    const mediumSeverityActions: AuditAction[] = [
      AuditAction.LOGIN_SUCCESS,
      AuditAction.LOGIN_FAILURE,
      AuditAction.LOGOUT,
      AuditAction.PASSWORD_CHANGE,
      AuditAction.RATE_LIMIT_TRIGGERED,
      AuditAction.ROLE_CHANGED,
      AuditAction.USER_DELETED,
      AuditAction.ANALYTICS_EXPORT_REQUESTED,
      AuditAction.ANALYTICS_EXPORT_COMPLETED,
      AuditAction.ROLE_CREATED,
      AuditAction.ROLE_UPDATED,
      AuditAction.ROLE_DELETED,
      AuditAction.ROLE_ASSIGNED,
      AuditAction.ROLE_REMOVED,
    ];
    
    if (highSeverityActions.includes(action)) return AuditSeverity.HIGH;
    if (mediumSeverityActions.includes(action)) return AuditSeverity.MEDIUM;
    return AuditSeverity.LOW;
  }

  async logEvent(data: AuditLogData): Promise<void> {
    try {
      // 🔥 CRITICAL: Use Prisma enum values (uppercase)
      const actorType = data.actorType || 
        (data.actorEmail === 'system@helixcrm' ? ActorType.SYSTEM : ActorType.USER);
      
      const severity = data.severity || this.getSeverityForAction(data.action);
      
      // Determine database action (map extended actions if needed)
      const dbAction = isPrismaNativeAction(data.action) 
        ? (data.action as PrismaAuditAction)
        : mapExtendedToPrismaAction(data.action);
      
      // Enhanced metadata to preserve extended action details
      const enhancedMetadata = {
        ...data.metadata,
        ...(isExtendedAction(data.action) && {
          _extendedAction: data.action,
          _originalAction: data.action,
        }),
      };
      
      await this.prisma.auditLog.create({
        data: {
          organizationId: data.organizationId,
          actorUserId: data.actorUserId,
          actorEmail: data.actorEmail,
          actorType: actorType,
          action: dbAction,
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: enhancedMetadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          correlationId: data.correlationId,
          requestId: data.requestId,
          severity: severity,
        },
      });
      
      // Log success for debugging (optional)
      if (process.env.NODE_ENV === 'development') {
        console.log(`📝 Audit logged: ${data.action} for ${data.entityType}`);
      }
    } catch (error) {
      // Enterprise-grade error handling
      console.error('Audit logging failed:', {
        error: error.message,
        action: data.action,
        entityType: data.entityType,
        actorEmail: data.actorEmail,
        timestamp: new Date().toISOString(),
      });
      
      // In production, you might want to:
      // 1. Send to error monitoring service (Sentry, Datadog)
      // 2. Queue for retry
      // 3. Fallback to file-based logging
    }
  }

  // Helper method that can be called from controllers with request context
  async logWithRequest(
    request: any,
    action: AuditAction,
    entityType: AuditEntityType,
    actorEmail: string,
    actorUserId?: string,
    entityId?: string,
    metadata?: Record<string, any>,
    severity?: AuditSeverity,
  ): Promise<void> {
    // 🔥 CRITICAL: Get real organizationId, not 'system' string
    const organizationId = request?.user?.organizationId || 
                         request?.organizationId || 
                         this.getDefaultOrganizationId();
    
    const ipAddress = request?.ip || 
                     request?.socket?.remoteAddress || 
                     request?.headers?.['x-forwarded-for'] ||
                     'unknown';
    
    const userAgent = request?.headers?.['user-agent'] || 'unknown';
    const requestId = (request as any).requestId || this.generateRequestId();
    const correlationId = (request as any).correlationId || requestId;
    
    await this.logEvent({
      organizationId,
      actorUserId,
      actorEmail,
      action,
      entityType,
      entityId,
      metadata: {
        ...metadata,
        requestPath: request?.originalUrl,
        requestMethod: request?.method,
        userAgent,
      },
      ipAddress,
      userAgent,
      requestId,
      correlationId,
      severity,
    });
  }

  // Convenience methods
  async logAuthEvent(
    request: any,
    action: AuditAction,
    email: string,
    userId?: string,
    metadata?: Record<string, any>,
    severity?: AuditSeverity,
  ): Promise<void> {
    await this.logWithRequest(
      request,
      action,
      AuditEntityType.AUTH,
      email,
      userId,
      undefined,
      metadata,
      severity,
    );
  }

  // System actor events with enhanced logging
  async logSystemEvent(
    organizationId: string,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId?: string,
    metadata?: Record<string, any>,
    severity: AuditSeverity = AuditSeverity.MEDIUM,
  ): Promise<void> {
    await this.logEvent({
      organizationId,
      actorEmail: 'system@helixcrm',
      actorType: ActorType.SYSTEM,
      action,
      entityType,
      entityId,
      metadata: {
        ...metadata,
        systemProcess: process.env.npm_lifecycle_event || 'unknown',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
      severity,
    });
  }

  // Advanced query with extended action support
  async getAuditLogs(params: {
    organizationId: string;
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    action?: AuditAction;
    entityType?: AuditEntityType;
    actorEmail?: string;
    severity?: AuditSeverity;
    actorType?: ActorType;
    includeExtendedActions?: boolean;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 25), 100);
    const skip = (page - 1) * limit;
    const includeExtended = params.includeExtendedActions ?? true;

    const where: any = {
      organizationId: params.organizationId,
    };

    // Apply date filters
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    // Apply action filter (handle extended actions)
    if (params.action) {
      if (isPrismaNativeAction(params.action)) {
        where.action = params.action;
      } else if (includeExtended) {
        // For extended actions, filter by metadata
        where.AND = where.AND || [];
        where.AND.push({
          metadata: {
            path: ['_extendedAction'],
            equals: params.action,
          },
        });
      }
    }

    // Apply other filters
    if (params.entityType) where.entityType = params.entityType;
    if (params.actorEmail) where.actorEmail = { contains: params.actorEmail, mode: 'insensitive' };
    if (params.severity) where.severity = params.severity;
    if (params.actorType) where.actorType = params.actorType;

    try {
      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            actorEmail: true,
            actorUserId: true,
            actorType: true,
            ipAddress: true,
            userAgent: true,
            metadata: true,
            correlationId: true,
            requestId: true,
            severity: true,
            createdAt: true,
          },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      // Transform logs to include extended action info
      const transformedLogs = logs.map(log => ({
        ...log,
        // If metadata contains extended action, use it as the display action
        displayAction: log.metadata?._extendedAction || log.action,
        isExtendedAction: !!log.metadata?._extendedAction,
      }));

      return {
        logs: transformedLogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      throw new Error('Unable to retrieve audit logs. Please try again.');
    }
  }

  // Get statistics for dashboard
  async getAuditStatistics(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const [totalLogs, logsBySeverity, topActions] = await Promise.all([
        this.prisma.auditLog.count({
          where: {
            organizationId,
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.auditLog.groupBy({
          by: ['severity'],
          where: {
            organizationId,
            createdAt: { gte: startDate },
          },
          _count: true,
        }),
        this.prisma.auditLog.groupBy({
          by: ['action'],
          where: {
            organizationId,
            createdAt: { gte: startDate },
          },
          _count: true,
          orderBy: {
            _count: {
              action: 'desc',
            },
          },
          take: 10,
        }),
      ]);

      return {
        totalLogs,
        logsBySeverity: logsBySeverity.map(item => ({
          severity: item.severity,
          count: item._count,
        })),
        topActions: topActions.map(item => ({
          action: item.action,
          count: item._count,
        })),
        timeRange: {
          start: startDate,
          end: new Date(),
          days,
        },
      };
    } catch (error) {
      console.error('Failed to fetch audit statistics:', error);
      return {
        totalLogs: 0,
        logsBySeverity: [],
        topActions: [],
        timeRange: { start: startDate, end: new Date(), days },
      };
    }
  }

  // Get available actions for filtering (includes extended actions)
  async getAvailableActions(): Promise<Array<{ value: string; label: string; isExtended: boolean }>> {
    const prismaActions = Object.values(PrismaAuditAction).map(action => ({
      value: action,
      label: this.formatActionLabel(action),
      isExtended: false,
    }));
    
    const extendedActions = [
      AuditAction.ANALYTICS_EXPORT_REQUESTED,
      AuditAction.ANALYTICS_EXPORT_DOWNLOADED,
      AuditAction.ANALYTICS_EXPORT_COMPLETED,
      AuditAction.ANALYTICS_EXPORT_FAILED,
      AuditAction.ROLE_CREATED,
      AuditAction.ROLE_UPDATED,
      AuditAction.ROLE_DELETED,
      AuditAction.ROLE_ASSIGNED,
      AuditAction.ROLE_REMOVED,
    ].map(action => ({
      value: action,
      label: this.formatActionLabel(action),
      isExtended: true,
    }));
    
    return [...prismaActions, ...extendedActions];
  }

  // Get available entity types for filtering
  async getAvailableEntityTypes(): Promise<Array<{ value: AuditEntityType; label: string }>> {
    return Object.values(AuditEntityType).map(type => ({
      value: type,
      label: this.formatEntityTypeLabel(type),
    }));
  }

  // Get available severity levels for filtering
  async getAvailableSeverityLevels(): Promise<Array<{ value: AuditSeverity; label: string }>> {
    return Object.values(AuditSeverity).map(severity => ({
      value: severity,
      label: this.formatSeverityLabel(severity),
    }));
  }

  // Get available actor types for filtering
  async getAvailableActorTypes(): Promise<Array<{ value: ActorType; label: string }>> {
    return Object.values(ActorType).map(type => ({
      value: type,
      label: this.formatActorTypeLabel(type),
    }));
  }

  // Clean up old audit logs (for retention policy)
  async cleanupOldLogs(daysToKeep: number = 90): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    try {
      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });
      
      return { deletedCount: result.count };
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
      return { deletedCount: 0 };
    }
  }

  // Private helper methods
  private getDefaultOrganizationId(): string {
    // In production, you might want to use a configurable default
    return process.env.DEFAULT_ORGANIZATION_ID || '00000000-0000-0000-0000-000000000000';
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatActionLabel(action: string): string {
    return action
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatEntityTypeLabel(type: AuditEntityType): string {
    return this.formatActionLabel(type);
  }

  private formatSeverityLabel(severity: AuditSeverity): string {
    const labels = {
      [AuditSeverity.LOW]: 'Low',
      [AuditSeverity.MEDIUM]: 'Medium',
      [AuditSeverity.HIGH]: 'High',
      [AuditSeverity.CRITICAL]: 'Critical',
    };
    return labels[severity] || severity;
  }

  private formatActorTypeLabel(type: ActorType): string {
    const labels = {
      [ActorType.USER]: 'User',
      [ActorType.SYSTEM]: 'System',
    };
    return labels[type] || type;
  }
}
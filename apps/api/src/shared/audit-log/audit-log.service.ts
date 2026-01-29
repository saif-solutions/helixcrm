import { Injectable, Inject } from '@nestjs/common';
import { AuditLogService as NewAuditLogService } from '../../modules/audit-logs/application/services/audit-log.service';
import { IAuditLogRepository } from '../../modules/audit-logs/infrastructure/repositories/audit-log.repository.interface';

// Re-export domain enums for backward compatibility
export {
  AuditAction,
  AuditEntityType,
  ActorType,
  AuditSeverity,
} from '../../modules/audit-logs/domain';

export interface AuditLogData {
  organizationId: string;
  actorUserId?: string;
  actorEmail: string;
  actorType?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  requestId?: string;
  severity?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @Inject('IAuditLogRepository') // Use string token
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly newAuditLogService: NewAuditLogService,
  ) {}

  async logEvent(data: AuditLogData): Promise<void> {
    try {
      // Use the new service with mapped data
      await this.newAuditLogService.logEvent({
        organizationId: data.organizationId,
        actorUserId: data.actorUserId,
        actorEmail: data.actorEmail,
        actorType: data.actorType as any,
        action: data.action as any,
        entityType: data.entityType as any,
        entityId: data.entityId,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        correlationId: data.correlationId,
        requestId: data.requestId,
        severity: data.severity as any,
      });
    } catch (error) {
      console.error('Bridge service failed, falling back:', error);
      // Fallback to direct repository
      await this.auditLogRepository.create({
        organizationId: data.organizationId,
        actorUserId: data.actorUserId,
        actorEmail: data.actorEmail,
        actorType: data.actorType as any,
        action: data.action as any,
        entityType: data.entityType as any,
        entityId: data.entityId,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        correlationId: data.correlationId,
        requestId: data.requestId,
        severity: data.severity as any,
      });
    }
  }

  // Keep all existing methods for backward compatibility
  async logWithRequest(
    request: any,
    action: string,
    entityType: string,
    actorEmail: string,
    actorUserId?: string,
    entityId?: string,
    metadata?: Record<string, any>,
    severity?: string,
  ): Promise<void> {
    const organizationId = request?.user?.organizationId || 
                         request?.organizationId || 
                         '00000000-0000-0000-0000-000000000000';
    
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

  async logAuthEvent(
    request: any,
    action: string,
    email: string,
    userId?: string,
    metadata?: Record<string, any>,
    severity?: string,
  ): Promise<void> {
    await this.logWithRequest(
      request,
      action,
      'AUTH',
      email,
      userId,
      undefined,
      metadata,
      severity,
    );
  }

  async logSystemEvent(
    organizationId: string,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Record<string, any>,
    severity: string = 'MEDIUM',
  ): Promise<void> {
    await this.logEvent({
      organizationId,
      actorEmail: 'system@helixcrm',
      actorType: 'SYSTEM',
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

  // Add other methods from the old service
  async getAuditLogs(params: any) {
    // Forward to new service
    return this.newAuditLogService.getAuditLogs(params as any);
  }

  async getAuditStatistics(organizationId: string, days: number = 30) {
    return this.newAuditLogService.getAuditStatistics(organizationId, days);
  }

  async getAvailableActions() {
    return this.newAuditLogService.getAvailableActions();
  }

  async getAvailableEntityTypes() {
    return this.newAuditLogService.getAvailableEntityTypes();
  }

  async getAvailableSeverityLevels() {
    return this.newAuditLogService.getAvailableSeverityLevels();
  }

  async getAvailableActorTypes() {
    return this.newAuditLogService.getAvailableActorTypes();
  }

  async cleanupOldLogs(daysToKeep: number = 90) {
    return this.newAuditLogService.cleanupOldLogs(daysToKeep);
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
// apps/api/src/modules/audit-logs/application/services/audit-log-query.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { IAuditLogRepositoryToken } from '../../infrastructure/repositories/audit-log.repository.interface';
import { IAuditLogRepository } from '../../infrastructure/repositories/audit-log.repository.interface';
import {
  AuditAction,
  AuditEntityType,
  ActorType,
  AuditSeverity,
  AuditLogQuery,
  PaginatedAuditLogs,
  AuditStatistics,
  FilterOption,
  AuditLogTypes,
} from '../../domain';

@Injectable()
export class AuditLogQueryService {
  constructor(
    @Inject(IAuditLogRepositoryToken) // Use Symbol token
    private readonly auditLogRepository: IAuditLogRepository,
  ) {}

  async logEvent(data: {
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
  }): Promise<void> {
    const severity = data.severity || this.getSeverityForAction(data.action);

    const actorType =
      data.actorType ||
      (data.actorEmail === 'system@helixcrm'
        ? ActorType.SYSTEM
        : ActorType.USER);

    await this.auditLogRepository.create({
      ...data,
      severity,
      actorType,
    });
  }

  async getAuditLogs(query: AuditLogQuery): Promise<PaginatedAuditLogs> {
    return await this.auditLogRepository.findPaginated(query);
  }

  async getAuditStatistics(
    organizationId: string,
    days: number = 30,
  ): Promise<AuditStatistics> {
    return await this.auditLogRepository.getStatistics(organizationId, days);
  }

  async getAvailableActions(): Promise<FilterOption[]> {
    const actions = await this.auditLogRepository.getAvailableActions();
    return actions.map((action) => ({
      value: action.value,
      label: this.formatActionLabel(action.value),
      isExtended: !AuditLogTypes.isAuditAction(action.value),
      count: action.count,
    }));
  }

  async getAvailableEntityTypes(): Promise<FilterOption[]> {
    const entityTypes = await this.auditLogRepository.getAvailableEntityTypes();
    return entityTypes.map((type) => ({
      value: type.value,
      label: this.formatEntityTypeLabel(type.value),
      count: type.count,
    }));
  }

  async getAvailableSeverityLevels(): Promise<FilterOption[]> {
    const severityLevels =
      await this.auditLogRepository.getAvailableSeverityLevels();
    return severityLevels.map((severity) => ({
      value: severity.value,
      label: this.formatSeverityLabel(severity.value as AuditSeverity),
      count: severity.count,
    }));
  }

  async getAvailableActorTypes(): Promise<FilterOption[]> {
    const actorTypes = await this.auditLogRepository.getAvailableActorTypes();
    return actorTypes.map((type) => ({
      value: type.value,
      label: this.formatActorTypeLabel(type.value as ActorType),
      count: type.count,
    }));
  }

  async cleanupOldLogs(
    daysToKeep: number = 90,
  ): Promise<{ deletedCount: number }> {
    return await this.auditLogRepository.cleanupOldLogs(daysToKeep);
  }

  private getSeverityForAction(action: AuditAction): AuditSeverity {
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

  private formatActionLabel(action: string): string {
    return action
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatEntityTypeLabel(type: string): string {
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

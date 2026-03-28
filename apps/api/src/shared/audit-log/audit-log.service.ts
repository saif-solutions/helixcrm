// apps/api/src/shared/audit-log/audit-log.service.ts

import {
  Injectable,
  InternalServerErrorException,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { Job } from 'bullmq';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueueService, AuditJobData } from './audit-queue.service';
import { AuditIntegrityService } from '../audit-integrity/audit-integrity.service';
import { Prisma } from '@prisma/client';
import {
  Prisma,
  AuditAction,
  AuditEntityType,
  AuditSeverity,
} from '@prisma/client';

// Constants arrays for validation
export const AUDIT_ACTIONS = Object.values(AuditAction);
export const AUDIT_ENTITY_TYPES = Object.values(AuditEntityType);
export const AUDIT_SEVERITIES = Object.values(AuditSeverity);

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

interface RequestWithUser extends Request {
  user?: {
    organizationId?: string;
    id?: string;
    [key: string]: any;
  };
  id?: string;
}

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

interface LogEventParams {
  request?: Request;
  action: AuditAction;
  entityType: AuditEntityType;
  actorEmail: string;
  actorUserId?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
  organizationId?: string | null;
}

interface LogAuthEventParams {
  request?: Request;
  action: AuditAction;
  actorEmail: string;
  actorUserId?: string;
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
  organizationId?: string | null;
}

export enum AuditMode {
  SYNC_MODE = 'SYNC_MODE',
  ASYNC_MODE = 'ASYNC_MODE',
  QUEUE_DISABLED = 'QUEUE_DISABLED',
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private auditMode: AuditMode = AuditMode.SYNC_MODE;
  private queueAvailable = false;

  private readonly BOOTSTRAP_ALLOWED_ACTIONS = new Set<AuditAction>([
    AuditAction.USER_CREATED,
    AuditAction.LOGIN_SUCCESS,
  ]);

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

  private initializeAuditMode(): void {
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

  private requiresOrganizationContext(action: AuditAction): boolean {
    if (this.BOOTSTRAP_ALLOWED_ACTIONS.has(action)) {
      return false;
    }

    const actionsRequiringOrgContext: AuditAction[] = [
      AuditAction.USER_UPDATED,
      AuditAction.PERMISSION_GRANTED,
      AuditAction.ROLE_ASSIGNED,
      AuditAction.ROLE_CREATED,
      AuditAction.ROLE_UPDATED,
      AuditAction.ROLE_DELETED,
      AuditAction.DEAL_CREATED,
      AuditAction.DEAL_UPDATED,
      AuditAction.DEAL_DELETED,
      AuditAction.CONTACT_CREATED,
      AuditAction.CONTACT_UPDATED,
      AuditAction.CONTACT_DELETED,
      AuditAction.ANALYTICS_EXPORT_REQUESTED,
      AuditAction.ANALYTICS_EXPORT_DOWNLOADED,
      AuditAction.ANALYTICS_EXPORT_COMPLETED,
      AuditAction.ANALYTICS_EXPORT_FAILED,
      AuditAction.WEBHOOK_CREATED,
      AuditAction.WEBHOOK_UPDATED,
      AuditAction.WEBHOOK_DELETED,
      AuditAction.WEBHOOK_TRIGGERED,
      AuditAction.WEBHOOK_RETRY,
      AuditAction.WEBHOOK_CLEANUP,
    ];

    return actionsRequiringOrgContext.includes(action);
  }

  private isCriticalAction(action: AuditAction): boolean {
    return this.CRITICAL_ACTIONS.has(action);
  }

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
  ): Promise<any> {
    try {
      const typedRequest = request as RequestWithUser;
      let resolvedOrganizationId = organizationId;

      if (!resolvedOrganizationId && typedRequest.user?.organizationId) {
        resolvedOrganizationId = typedRequest.user.organizationId;
      }

      if (this.requiresOrganizationContext(action) && !resolvedOrganizationId) {
        throw new InternalServerErrorException(
          `Audit log requires organization context for action: ${action}. ` +
            `Actor: ${actorEmail}, Entity: ${entityType}`,
        );
      }

      if (
        !resolvedOrganizationId &&
        this.BOOTSTRAP_ALLOWED_ACTIONS.has(action)
      ) {
        this.logger.warn(
          `Bootstrap audit action: ${action} recorded without organization context. ` +
            `Actor: ${actorEmail}, Entity: ${entityType}.`,
        );

        if (metadata) {
          metadata.bootstrap = true;
          metadata.bootstrapReason = 'organization_context_not_resolved_yet';
        } else {
          metadata = {
            bootstrap: true,
            bootstrapReason: 'organization_context_not_resolved_yet',
          };
        }
      } else if (
        !resolvedOrganizationId &&
        action !== AuditAction.LOGIN_FAILURE
      ) {
        this.logger.warn(
          `Audit log missing organization context for action: ${action}. ` +
            `Actor: ${actorEmail}, Entity: ${entityType}.`,
        );
      }

      const auditData: AuditLogData = {
        action,
        entityType,
        actorEmail,
        actorUserId,
        entityId,
        metadata,
        severity,
        organizationId: resolvedOrganizationId,
        ipAddress: typedRequest.ip,
        userAgent: typedRequest.get('user-agent') || undefined,
        requestId:
          typedRequest.id ||
          (typedRequest.headers['x-request-id'] as string) ||
          undefined,
      };

      const isCritical = this.isCriticalAction(action);

      if (
        this.queueAvailable &&
        this.auditMode === AuditMode.ASYNC_MODE &&
        !isCritical
      ) {
        return await this.logToQueue(auditData);
      } else {
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

  async logWithRequestObject(params: LogWithRequestParams): Promise<any> {
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

  async logEvent(params: LogEventParams): Promise<any> {
    try {
      if (params.request) {
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

  async logAuthEvent(params: LogAuthEventParams): Promise<any> {
    try {
      if (params.request) {
        return this.logWithRequest(
          params.request,
          params.action,
          AuditEntityType.AUTH,
          params.actorEmail,
          params.actorUserId,
          undefined,
          params.metadata,
          params.severity || AuditSeverity.MEDIUM,
          params.organizationId,
        );
      } else {
        return this.logDirect(
          params.action,
          AuditEntityType.AUTH,
          params.actorEmail,
          params.actorUserId,
          undefined,
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
  ): Promise<any> {
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

      const isCritical = this.isCriticalAction(action);

      if (
        this.queueAvailable &&
        this.auditMode === AuditMode.ASYNC_MODE &&
        !isCritical
      ) {
        return await this.logToQueue(auditData);
      } else {
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

      const job = (await this.auditQueueService.addAuditEvent(jobData)) as Job;
      const jobId = job?.id ? String(job.id) : 'unknown';

      this.logger.debug(`Audit event queued: ${auditData.action}`, {
        jobId,
        action: auditData.action,
        actorEmail: auditData.actorEmail,
      });

      return {
        queued: true,
        jobId,
        action: auditData.action,
        message: 'Audit event queued for async processing',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Queue failed for audit ${auditData.action}, falling back to sync: ${errorMessage}`,
      );
      return await this.createAuditLogEntrySync(auditData);
    }
  }

  private async createAuditLogEntrySync(auditData: AuditLogData): Promise<any> {
    try {
      let organizationId = auditData.organizationId;

      if (
        !organizationId &&
        auditData.action === AuditAction.LOGIN_SUCCESS &&
        auditData.actorUserId
      ) {
        try {
          const user = await this.prisma.user.findUnique({
            where: { id: auditData.actorUserId },
            select: { organizationId: true },
          });
          if (user?.organizationId) {
            organizationId = user.organizationId;
            this.logger.debug(
              `Resolved organization ${organizationId} for login audit log`,
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn('Could not fetch user organization for audit log', {
            actorUserId: auditData.actorUserId,
            error: errorMessage,
          });
        }
      }

      if (!organizationId) {
        if (auditData.action === AuditAction.LOGIN_SUCCESS) {
          this.logger.warn(
            `Bootstrap audit action: LOGIN_SUCCESS recorded without organization context. ` +
              `Actor: ${auditData.actorEmail}, Entity: ${auditData.entityType}.`,
          );
          return null;
        }

        throw new InternalServerErrorException(
          `Organization ID is required for audit log: ${auditData.action}`,
        );
      }

      const data: Prisma.AuditLogCreateInput = {
        action: auditData.action,
        entityType: auditData.entityType,
        entityId: auditData.entityId,
        actorEmail: auditData.actorEmail,
        severity: auditData.severity,
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
        requestId: auditData.requestId,
        metadata: auditData.metadata as Prisma.InputJsonValue,
        organization: {
          connect: { id: organizationId },
        },
        actor: auditData.actorUserId
          ? {
              connect: { id: auditData.actorUserId },
            }
          : undefined,
      };

      const auditLog = await this.prisma.auditLog.create({
        data,
        include: {
          actor: true,
          organization: true,
        },
      });

      await this.appendToIntegrityChain(auditLog, auditData);

      this.logger.debug(
        `Audit log created synchronously: ${auditData.action} for ${auditData.entityType}`,
        {
          auditId: auditLog.id,
          actorEmail: auditData.actorEmail,
          organizationId,
          mode: 'SYNC',
        },
      );

      return auditLog;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to create audit log: ${errorMessage}`,
        errorStack,
      );
      return null;
    }
  }

  private async appendToIntegrityChain(
    auditLog: { id: string },
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to append to integrity chain: ${errorMessage}`,
        errorStack,
      );
    }
  }

  private handleAuditError(
    error: unknown,
    action: AuditAction,
    entityType: AuditEntityType,
    actorEmail: string,
    organizationId?: string | null,
  ): null {
    if (error === null) {
      this.logger.debug(`Audit log skipped for bootstrap action: ${action}`, {
        action,
        actorEmail,
      });
      return null;
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      `Failed to create audit log: ${errorMessage}`,
      errorStack,
      {
        action,
        entityType,
        actorEmail,
        organizationId,
      },
    );

    if (error instanceof InternalServerErrorException) {
      throw error;
    }

    this.logger.warn(
      `Audit log creation failed (database error), but main operation continues. ` +
        `Action: ${action}, Actor: ${actorEmail}`,
    );

    return null;
  }

  getAuditMode(): AuditMode {
    return this.auditMode;
  }

  isQueueAvailable(): boolean {
    return this.queueAvailable;
  }

  setAuditMode(mode: AuditMode): void {
    this.auditMode = mode;
    this.logger.log(`Audit mode changed to: ${mode}`);
  }

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
  }): Promise<{
    logs: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.organizationId !== undefined) {
      where.organizationId = filters.organizationId;
    }

    if (filters.actorUserId !== undefined) {
      where.actor = {
        id: filters.actorUserId,
      };
    }

    if (filters.action !== undefined) {
      where.action = filters.action;
    }

    if (filters.entityType !== undefined) {
      where.entityType = filters.entityType;
    }

    if (filters.severity !== undefined) {
      where.severity = filters.severity;
    }

    if (filters.startDate !== undefined || filters.endDate !== undefined) {
      where.createdAt = {};
      if (filters.startDate !== undefined) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate !== undefined) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const take = filters.take ?? 100;
    const skip = filters.skip ?? 0;

    try {
      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
            actor: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        total,
        page: Math.floor(skip / take) + 1,
        totalPages: Math.ceil(total / take),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to query audit logs: ${errorMessage}`,
        errorStack,
        { filters },
      );
      throw error;
    }
  }

  async cleanupOldLogs(
    retentionDays: number = 365,
  ): Promise<{ count: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          severity: {
            in: [AuditSeverity.LOW, AuditSeverity.MEDIUM],
          },
        },
      });

      this.logger.log(
        `Cleaned up ${result.count} old audit logs older than ${retentionDays} days`,
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to cleanup old audit logs: ${errorMessage}`);
      throw error;
    }
  }
}

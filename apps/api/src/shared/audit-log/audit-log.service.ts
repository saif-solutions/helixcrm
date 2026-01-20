import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AppLogger } from "../logging/logger.service";

export interface AuditEvent {
  action: string;
  entity: string;
  entityId?: string;
  organizationId?: string;
  userId?: string;
  before?: any;
  after?: any;
  correlationId?: string;
  severity?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

@Injectable()
export class AuditLogService {
  constructor(
    private prisma: PrismaService,
    private logger: AppLogger,
  ) {}

  async logEvent(event: AuditEvent) {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          action: event.action,
          entity: event.entity,
          entityId: event.entityId,
          organizationId: event.organizationId,
          userId: event.userId,
          before: event.before,
          after: event.after,
          correlationId: event.correlationId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          severity: event.severity || 'info',
        },
      });

      this.logger.debug("Audit log created", {
        auditLogId: auditLog.id,
        action: event.action,
      });

      return auditLog;
    } catch (error) {
      this.logger.error("Failed to create audit log", error.stack);
      return null;
    }
  }
}

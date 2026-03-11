import { Request } from 'express';
import { AuditAction, AuditEntityType, AuditSeverity } from './audit-log.service';

export interface LogWithRequestParams {
  request: Request;
  action: AuditAction;
  entityType: AuditEntityType;
  actorEmail: string;
  actorUserId?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  severity: AuditSeverity;
  organizationId?: string;
}

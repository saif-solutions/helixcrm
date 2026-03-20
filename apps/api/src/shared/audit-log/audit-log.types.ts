import { Request } from 'express';

// Use the same string literal types as in audit-log.service.ts
export type AuditAction =
  | 'USER_CREATED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'USER_DELETED'
  | 'PERMISSION_DENIED'
  | 'PASSWORD_CHANGE'
  | 'RATE_LIMIT_TRIGGERED'
  | 'CSRF_FAILURE'
  | 'SYSTEM_ERROR'
  | 'USER_UPDATED'
  | 'PERMISSION_GRANTED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'DEAL_CREATED'
  | 'DEAL_UPDATED'
  | 'DEAL_DELETED'
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  | 'CONTACT_DELETED'
  | 'ANALYTICS_EXPORT_REQUESTED'
  | 'ANALYTICS_EXPORT_DOWNLOADED'
  | 'ANALYTICS_EXPORT_COMPLETED'
  | 'ANALYTICS_EXPORT_FAILED'
  | 'WEBHOOK_CREATED'
  | 'WEBHOOK_UPDATED'
  | 'WEBHOOK_DELETED'
  | 'WEBHOOK_TRIGGERED'
  | 'WEBHOOK_RETRY'
  | 'WEBHOOK_CLEANUP'
  | 'WEBHOOK_DELIVERED'
  | 'WEBHOOK_DELIVERY_FAILED';

export type AuditEntityType =
  | 'AUTH'
  | 'USER'
  | 'ROLE'
  | 'PERMISSION'
  | 'DEAL'
  | 'CONTACT'
  | 'ANALYTICS'
  | 'WEBHOOK'
  | 'WEBHOOK_DELIVERY';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

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

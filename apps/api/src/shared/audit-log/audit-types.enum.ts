// Re-export Prisma enums with consistent naming
export {
  ActorType,
  AuditAction,
  AuditEntityType,
  AuditSeverity,
} from '@prisma/client';

// Extended actions can be added as a separate type
export type ExtendedAuditAction =
  | 'ANALYTICS_EXPORT_REQUESTED'
  | 'ANALYTICS_EXPORT_DOWNLOADED'
  | 'ANALYTICS_EXPORT_COMPLETED'
  | 'ANALYTICS_EXPORT_FAILED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REMOVED';

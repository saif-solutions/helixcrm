// Domain enums - independent of database implementation
// These are the canonical definitions used throughout the application

export enum AuditAction {
  // Auth events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  
  // User management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  
  // Data events
  CONTACT_CREATED = 'CONTACT_CREATED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  CONTACT_DELETED = 'CONTACT_DELETED',
  DEAL_CREATED = 'DEAL_CREATED',
  DEAL_UPDATED = 'DEAL_UPDATED',
  DEAL_DELETED = 'DEAL_DELETED',
  PIPELINE_CREATED = 'PIPELINE_CREATED',
  PIPELINE_UPDATED = 'PIPELINE_UPDATED',
  PIPELINE_DELETED = 'PIPELINE_DELETED',
  LEAD_CREATED = 'LEAD_CREATED',
  LEAD_UPDATED = 'LEAD_UPDATED',
  LEAD_DELETED = 'LEAD_DELETED',
  
  // System events
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CSRF_FAILURE = 'CSRF_FAILURE',
  RATE_LIMIT_TRIGGERED = 'RATE_LIMIT_TRIGGERED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  
  // Extended actions (business-specific)
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

export enum AuditEntityType {
  AUTH = 'AUTH',
  USER = 'USER',
  CONTACT = 'CONTACT',
  DEAL = 'DEAL',
  PIPELINE = 'PIPELINE',
  LEAD = 'LEAD',
  ACCOUNT = 'ACCOUNT',
  ACTIVITY = 'ACTIVITY',
  SYSTEM = 'SYSTEM',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}

// Domain entity interface
export interface AuditLog {
  id: string;
  organizationId: string;
  actorUserId?: string;
  actorEmail: string;
  actorType: ActorType;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  requestId?: string;
  severity: AuditSeverity;
  createdAt: Date;
  updatedAt: Date;
}

// Query interface for filtering
export interface AuditLogQuery {
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
  search?: string;
}

// Paginated response
export interface PaginatedAuditLogs {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

// Statistics interface
export interface AuditStatistics {
  totalLogs: number;
  logsBySeverity: Array<{
    severity: AuditSeverity;
    count: number;
  }>;
  topActions: Array<{
    action: AuditAction;
    count: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
    days: number;
  };
}

// Filter options for UI
export interface FilterOption {
  value: string;
  label: string;
  isExtended?: boolean;
  count?: number;
}

// Type guard to check if value is valid AuditAction
export function isAuditAction(value: string): value is AuditAction {
  return Object.values(AuditAction).includes(value as AuditAction);
}

// Type guard to check if value is valid AuditEntityType
export function isAuditEntityType(value: string): value is AuditEntityType {
  return Object.values(AuditEntityType).includes(value as AuditEntityType);
}

// Type guard to check if value is valid AuditSeverity
export function isAuditSeverity(value: string): value is AuditSeverity {
  return Object.values(AuditSeverity).includes(value as AuditSeverity);
}

// Type guard to check if value is valid ActorType
export function isActorType(value: string): value is ActorType {
  return Object.values(ActorType).includes(value as ActorType);
}

// Mapper functions to convert between domain and database enums
export class AuditLogEnumMapper {
  static toDatabaseAction(action: AuditAction): string {
    // Map extended actions to base Prisma actions if needed
    const actionMap: Record<string, string> = {
      [AuditAction.ANALYTICS_EXPORT_REQUESTED]: 'SYSTEM_ERROR',
      [AuditAction.ANALYTICS_EXPORT_DOWNLOADED]: 'SYSTEM_ERROR',
      [AuditAction.ANALYTICS_EXPORT_COMPLETED]: 'SYSTEM_ERROR',
      [AuditAction.ANALYTICS_EXPORT_FAILED]: 'SYSTEM_ERROR',
      [AuditAction.ROLE_CREATED]: 'USER_CREATED',
      [AuditAction.ROLE_UPDATED]: 'USER_UPDATED',
      [AuditAction.ROLE_DELETED]: 'USER_DELETED',
      [AuditAction.ROLE_ASSIGNED]: 'ROLE_CHANGED',
      [AuditAction.ROLE_REMOVED]: 'ROLE_CHANGED',
    };
    
    return actionMap[action] || action;
  }

  static fromDatabaseAction(action: string): AuditAction {
    // Check if it's a valid domain action
    if (isAuditAction(action)) {
      return action;
    }
    
    // Default fallback
    return AuditAction.SYSTEM_ERROR;
  }
}

// Export type guards as utilities
export const AuditLogTypes = {
  isAuditAction,
  isAuditEntityType,
  isAuditSeverity,
  isActorType,
} as const;

// Helper to convert Prisma enums to domain enums
export function fromPrismaAction(prismaAction: string): AuditAction {
  // Try to match with our domain actions
  const allActions = Object.values(AuditAction) as string[];
  if (allActions.includes(prismaAction)) {
    return prismaAction as AuditAction;
  }
  
  // Try to handle extended actions stored in database
  if (prismaAction === 'SYSTEM_ERROR') {
    // This might be an extended action - need metadata to know
    return AuditAction.SYSTEM_ERROR;
  }
  
  // Default fallback
  return AuditAction.SYSTEM_ERROR;
}
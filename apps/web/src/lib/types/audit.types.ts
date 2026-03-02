// Frontend audit types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorUserId?: string;
  actorEmail: string;
  actorType: string;
  severity: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  createdAt: string;
  organizationId: string;
  displayAction?: string;
  isExtendedAction?: boolean;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  actorType?: string;
  severity?: string;
  search?: string;
  from?: string;
  to?: string;
  sort?: 'asc' | 'desc';
  sortBy?: 'createdAt' | 'severity' | 'action'; // Add this
}

export type PaginatedAuditLogs = PaginatedResponse<AuditLog>;

export interface AuditStats {
  total: number;
  logsBySeverity: Array<{
    severity: string;
    count: number;
  }>;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  timeRange: {
    start: string;
    end: string;
    days: number;
  };
}

// Helper functions for display
export const getActionLabel = (action: string): string => {
  return action
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    'LOW': 'bg-green-100 text-green-800',
    'MEDIUM': 'bg-yellow-100 text-yellow-800',
    'HIGH': 'bg-orange-100 text-orange-800',
    'CRITICAL': 'bg-red-100 text-red-800',
  };
  return colors[severity] || 'bg-gray-100 text-gray-800';
};

// Enum-like constants for frontend use
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  CONTACT_CREATED: 'CONTACT_CREATED',
  CONTACT_UPDATED: 'CONTACT_UPDATED',
  CONTACT_DELETED: 'CONTACT_DELETED',
  DEAL_CREATED: 'DEAL_CREATED',
  DEAL_UPDATED: 'DEAL_UPDATED',
  DEAL_DELETED: 'DEAL_DELETED',
  PIPELINE_CREATED: 'PIPELINE_CREATED',
  PIPELINE_UPDATED: 'PIPELINE_UPDATED',
  PIPELINE_DELETED: 'PIPELINE_DELETED',
  LEAD_CREATED: 'LEAD_CREATED',
  LEAD_UPDATED: 'LEAD_UPDATED',
  LEAD_DELETED: 'LEAD_DELETED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CSRF_FAILURE: 'CSRF_FAILURE',
  RATE_LIMIT_TRIGGERED: 'RATE_LIMIT_TRIGGERED',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
} as const;

export const AUDIT_ENTITY_TYPES = {
  AUTH: 'AUTH',
  USER: 'USER',
  CONTACT: 'CONTACT',
  DEAL: 'DEAL',
  PIPELINE: 'PIPELINE',
  LEAD: 'LEAD',
  ACCOUNT: 'ACCOUNT',
  ACTIVITY: 'ACTIVITY',
  SYSTEM: 'SYSTEM',
} as const;

export const ACTOR_TYPES = {
  USER: 'USER',
  SYSTEM: 'SYSTEM',
} as const;

export const AUDIT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

// Add these interfaces at the end of your existing file:

export interface AuditTrendData {
  date: string;
  count: number;
  bySeverity: Record<string, number>;
  byOutcome?: Record<string, number>;
}

export interface ActorActivity {
  actorEmail: string;
  actorName?: string;
  actorType: string;
  totalActions: number;
  lastActivityAt: string;
  severityBreakdown: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}

export interface AuditAlert {
  id: string;
  type: 'THRESHOLD' | 'PATTERN' | 'ANOMALY';
  severity: string;
  message: string;
  criteria: Record<string, unknown>;
  triggeredAt: string;
  logs: AuditLog[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface RealTimeAuditEvent {
  type: 'NEW_LOG' | 'STATS_UPDATE' | 'ALERT';
  payload: AuditLog | AuditStats | AuditAlert;
  timestamp: string;
}

export interface AuditExportRequest {
  format: 'CSV' | 'JSON' | 'PDF';
  filters: Partial<AuditLogQueryParams>;
  includeFields?: string[];
  timezone?: string;
}
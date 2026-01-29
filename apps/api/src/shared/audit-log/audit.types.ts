// audit.types.ts - Complete frontend audit types system
// ==================== CORE INTERFACES ====================

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
  // Core identifiers
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  
  // Actor information
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  actorType: string;
  
  // Classification
  severity: string;
  metadata?: Record<string, any>;
  
  // Request/context info
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  
  // Timestamps and organization
  createdAt: string;
  organizationId: string;
  
  // Display/UI helpers
  displayAction?: string;
  isExtendedAction?: boolean;
  
  // Enhanced fields (optional)
  description?: string;
  source?: 'WEB' | 'API' | 'MOBILE' | 'SYSTEM' | 'BATCH_JOB' | 'INTEGRATION' | 'CLI';
  outcome?: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'WARNING';
  affectedUserId?: string;
  sessionId?: string;
  durationMs?: number;
  resource?: string;
}

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

export interface AuditLogQueryParams {
  // Pagination
  page?: number;
  limit?: number;
  
  // Filters
  action?: string | string[];
  entityType?: string | string[];
  actorType?: string | string[];
  severity?: string | string[];
  search?: string;
  from?: string;
  to?: string;
  
  // Sorting
  sort?: 'asc' | 'desc';
  sortBy?: 'createdAt' | 'severity' | 'action';
  
  // Enhanced filters
  source?: string | string[];
  outcome?: string | string[];
  actorEmail?: string;
  organizationId?: string;
}

export type PaginatedAuditLogs = PaginatedResponse<AuditLog>;

export interface AuditStats {
  total: number;
  
  // Breakdowns
  logsBySeverity: Array<{
    severity: string;
    count: number;
    percentage: number;
  }>;
  logsBySource: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  logsByOutcome: Array<{
    outcome: string;
    count: number;
    percentage: number;
  }>;
  
  // Top lists
  topActions: Array<{
    action: string;
    count: number;
    severity: string;
  }>;
  topActors: Array<{
    actorEmail: string;
    actorName?: string;
    count: number;
    lastActivity: string;
  }>;
  
  // Time analysis
  timeRange: {
    start: string;
    end: string;
    days: number;
  };
  averageDailyLogs: number;
  peakHour?: string;
}

export interface AuditExportRequest {
  format: 'CSV' | 'JSON' | 'PDF';
  filters: Partial<AuditLogQueryParams>;
  includeFields?: string[];
  timezone?: string;
}

export interface RealTimeAuditEvent {
  type: 'NEW_LOG' | 'STATS_UPDATE' | 'ALERT';
  payload: AuditLog | AuditStats | AuditAlert;
  timestamp: string;
}

export interface AuditAlert {
  id: string;
  type: 'THRESHOLD' | 'PATTERN' | 'ANOMALY';
  severity: string;
  message: string;
  criteria: Record<string, any>;
  triggeredAt: string;
  logs: AuditLog[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// ==================== HELPER FUNCTIONS ====================

export const getActionLabel = (action: string): string => {
  return action
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    'LOW': 'bg-green-100 text-green-800 border-green-300',
    'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'HIGH': 'bg-orange-100 text-orange-800 border-orange-300',
    'CRITICAL': 'bg-red-100 text-red-800 border-red-300',
  };
  return colors[severity] || 'bg-gray-100 text-gray-800 border-gray-300';
};

export const getSeverityIcon = (severity: string): string => {
  const icons: Record<string, string> = {
    'LOW': '✓',
    'MEDIUM': '⚠',
    'HIGH': '❗',
    'CRITICAL': '🚨',
  };
  return icons[severity] || '•';
};

export const getSourceIcon = (source?: string): string => {
  const icons: Record<string, string> = {
    'WEB': '🌐',
    'API': '🔌',
    'MOBILE': '📱',
    'SYSTEM': '⚙',
    'BATCH_JOB': '⏰',
    'INTEGRATION': '🔄',
    'CLI': '💻',
  };
  return source ? icons[source] || '📄' : '📄';
};

export const getOutcomeColor = (outcome?: string): string => {
  const colors: Record<string, string> = {
    'SUCCESS': 'text-green-600',
    'FAILURE': 'text-red-600',
    'PARTIAL': 'text-yellow-600',
    'WARNING': 'text-orange-600',
  };
  return outcome ? colors[outcome] || 'text-gray-600' : 'text-gray-600';
};

export const getOutcomeIcon = (outcome?: string): string => {
  const icons: Record<string, string> = {
    'SUCCESS': '✅',
    'FAILURE': '❌',
    'PARTIAL': '⚠️',
    'WARNING': '⚠️',
  };
  return outcome ? icons[outcome] || '🔸' : '🔸';
};

export const formatAuditTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const calculateDuration = (start: string, end?: string): string => {
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const durationMs = endTime - startTime;
  
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  if (durationMs < 3600000) return `${(durationMs / 60000).toFixed(1)}m`;
  return `${(durationMs / 3600000).toFixed(1)}h`;
};

// ==================== CONSTANTS ====================

export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  
  // User Management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_INVITED: 'USER_INVITED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  PERMISSION_CHANGED: 'PERMISSION_CHANGED',
  
  // Data Operations
  CONTACT_CREATED: 'CONTACT_CREATED',
  CONTACT_UPDATED: 'CONTACT_UPDATED',
  CONTACT_DELETED: 'CONTACT_DELETED',
  CONTACT_IMPORTED: 'CONTACT_IMPORTED',
  CONTACT_EXPORTED: 'CONTACT_EXPORTED',
  
  DEAL_CREATED: 'DEAL_CREATED',
  DEAL_UPDATED: 'DEAL_UPDATED',
  DEAL_DELETED: 'DEAL_DELETED',
  DEAL_STAGE_CHANGED: 'DEAL_STAGE_CHANGED',
  
  PIPELINE_CREATED: 'PIPELINE_CREATED',
  PIPELINE_UPDATED: 'PIPELINE_UPDATED',
  PIPELINE_DELETED: 'PIPELINE_DELETED',
  
  LEAD_CREATED: 'LEAD_CREATED',
  LEAD_UPDATED: 'LEAD_UPDATED',
  LEAD_DELETED: 'LEAD_DELETED',
  LEAD_CONVERTED: 'LEAD_CONVERTED',
  
  // File Operations
  FILE_UPLOADED: 'FILE_UPLOADED',
  FILE_DOWNLOADED: 'FILE_DOWNLOADED',
  FILE_DELETED: 'FILE_DELETED',
  
  // System Operations
  BACKUP_CREATED: 'BACKUP_CREATED',
  BACKUP_RESTORED: 'BACKUP_RESTORED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  CONFIG_CHANGED: 'CONFIG_CHANGED',
  
  // Security Events
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  CSRF_FAILURE: 'CSRF_FAILURE',
  RATE_LIMIT_TRIGGERED: 'RATE_LIMIT_TRIGGERED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  BRUTE_FORCE_ATTEMPT: 'BRUTE_FORCE_ATTEMPT',
  DATA_EXFILTRATION_ATTEMPT: 'DATA_EXFILTRATION_ATTEMPT',
  
  // System Health
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SERVICE_DOWN: 'SERVICE_DOWN',
  SERVICE_RESTORED: 'SERVICE_RESTORED',
  MAINTENANCE_START: 'MAINTENANCE_START',
  MAINTENANCE_END: 'MAINTENANCE_END',
  
  // Integration Events
  WEBHOOK_SENT: 'WEBHOOK_SENT',
  WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
  API_CALL: 'API_CALL',
  SYNC_STARTED: 'SYNC_STARTED',
  SYNC_COMPLETED: 'SYNC_COMPLETED',
  SYNC_FAILED: 'SYNC_FAILED',
  
  // Audit Specific
  AUDIT_LOG_EXPORTED: 'AUDIT_LOG_EXPORTED',
  AUDIT_LOG_PURGED: 'AUDIT_LOG_PURGED',
  
  // Custom Business Actions
  CUSTOM_ACTION: 'CUSTOM_ACTION',
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
  FILE: 'FILE',
  SETTINGS: 'SETTINGS',
  BACKUP: 'BACKUP',
  WEBHOOK: 'WEBHOOK',
  API_KEY: 'API_KEY',
  INTEGRATION: 'INTEGRATION',
  AUDIT: 'AUDIT',
  CUSTOM: 'CUSTOM',
} as const;

export const ACTOR_TYPES = {
  USER: 'USER',
  SYSTEM: 'SYSTEM',
  SERVICE_ACCOUNT: 'SERVICE_ACCOUNT',
  API_CLIENT: 'API_CLIENT',
  INTEGRATION: 'INTEGRATION',
} as const;

export const AUDIT_SEVERITY = {
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export const AUDIT_SOURCES = {
  WEB: 'WEB',
  API: 'API',
  MOBILE: 'MOBILE',
  SYSTEM: 'SYSTEM',
  BATCH_JOB: 'BATCH_JOB',
  INTEGRATION: 'INTEGRATION',
  CLI: 'CLI',
  WEBHOOK: 'WEBHOOK',
} as const;

export const AUDIT_OUTCOMES = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  PARTIAL: 'PARTIAL',
  WARNING: 'WARNING',
} as const;

// ==================== TYPE UTILITIES ====================

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
export type AuditEntityType = typeof AUDIT_ENTITY_TYPES[keyof typeof AUDIT_ENTITY_TYPES];
export type ActorType = typeof ACTOR_TYPES[keyof typeof ACTOR_TYPES];
export type AuditSeverity = typeof AUDIT_SEVERITY[keyof typeof AUDIT_SEVERITY];
export type AuditSource = typeof AUDIT_SOURCES[keyof typeof AUDIT_SOURCES];
export type AuditOutcome = typeof AUDIT_OUTCOMES[keyof typeof AUDIT_OUTCOMES];

export const isSecurityEvent = (action: string): boolean => {
  const securityActions = [
    'LOGIN_FAILURE',
    'PERMISSION_DENIED',
    'CSRF_FAILURE',
    'RATE_LIMIT_TRIGGERED',
    'SUSPICIOUS_ACTIVITY',
    'BRUTE_FORCE_ATTEMPT',
    'DATA_EXFILTRATION_ATTEMPT',
  ];
  return securityActions.includes(action);
};

export const isHighSeverity = (severity: string): boolean => {
  return severity === 'HIGH' || severity === 'CRITICAL';
};

export const isSystemActor = (actorType: string): boolean => {
  return actorType === 'SYSTEM' || actorType === 'SERVICE_ACCOUNT' || actorType === 'INTEGRATION';
};
import {
  AuditLog,
  AuditLogQuery,
  PaginatedAuditLogs,
  AuditStatistics,
  FilterOption,
} from '../../domain';

export interface IAuditLogRepository {
  create(data: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  findPaginated(query: AuditLogQuery): Promise<PaginatedAuditLogs>;
  getStatistics(organizationId: string, days: number): Promise<AuditStatistics>;
  getAvailableActions(): Promise<Array<{ value: string; count: number }>>;
  getAvailableEntityTypes(): Promise<Array<{ value: string; count: number }>>;
  getAvailableSeverityLevels(): Promise<Array<{ value: string; count: number }>>;
  getAvailableActorTypes(): Promise<Array<{ value: string; count: number }>>;
  cleanupOldLogs(daysToKeep: number): Promise<{ deletedCount: number }>;
}
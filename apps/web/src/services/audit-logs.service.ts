import api from './api'; // Fixed: default import
import {
  AuditLog,
  PaginatedAuditLogs,
  AuditLogQueryParams,
  AuditStats,
} from '../lib/types/audit.types';

export const auditLogsService = {
  async getAuditLogs(params: AuditLogQueryParams): Promise<PaginatedAuditLogs> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await api.get(`/admin/audit-logs?${queryParams}`);
    return response.data;
  },

  async getStats(): Promise<AuditStats> {
    const response = await api.get('/admin/audit-logs/stats');
    return response.data;
  },

  async exportToCSV(params: AuditLogQueryParams): Promise<Blob> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await api.get(`/admin/audit-logs?${queryParams}&limit=1000`, {
      responseType: 'blob',
      headers: {
        Accept: 'text/csv',
      },
    });

    return response.data;
  },

  // Client-side CSV generation as fallback
  generateCSV(logs: AuditLog[]): string {
    const headers = [
      'Date',
      'Action',
      'Entity Type',
      'Entity ID',
      'Actor Email',
      'Actor Type',
      'Severity',
      'IP Address',
      'User Agent',
      'Metadata',
    ];

    const rows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.displayAction || log.action,
      log.entityType,
      log.entityId || '',
      log.actorEmail,
      log.actorType,
      log.severity,
      log.ipAddress || '',
      log.userAgent || '',
      log.metadata ? JSON.stringify(log.metadata) : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csvContent;
  },
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuditFilters } from '../../components/audit/AuditFilters';
import { AuditLogsTable } from '../../components/audit/AuditLogsTable';
import { Button } from '../../components/atoms/Button';
import { auditLogsService } from '../../services/audit-logs.service';
import { AuditLog, AuditLogQueryParams } from '../../lib/types/audit.types';
import { usePermission } from '../../lib/hooks/usePermission';
import { ErrorDisplay } from '../../components/feedback/ErrorDisplay';
import { Card } from '../../components/molecules/Card';
import { Shield } from 'lucide-react';

const AuditLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entityType: '',
    actorType: '',
    severity: '',
    from: '',
    to: '',
  });

  // Check if user has audit:read permission
  useEffect(() => {
    if (!hasPermission('audit:read')) {
      navigate('/');
    }
  }, [hasPermission, navigate]);

  // Fetch audit logs when dependencies change
  useEffect(() => {
    // Only fetch if user has permission
    if (!hasPermission('audit:read')) return;

    const fetchAuditLogs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params: AuditLogQueryParams = {
          page: pagination.page,
          limit: pagination.limit,
          sort: 'desc' as const,
          action: filters.action || undefined,
          entityType: filters.entityType || undefined,
          actorType: filters.actorType || undefined,
          severity: filters.severity || undefined,
          search: filters.search || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        };

        const response = await auditLogsService.getAuditLogs(params);
        setLogs(response.data);
        setPagination(response.pagination);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Failed to fetch audit logs';
        setError(errorMessage);
        console.error('Failed to load audit logs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();
  }, [
    pagination.page,
    pagination.limit,
    filters.search,
    filters.action,
    filters.entityType,
    filters.actorType,
    filters.severity,
    filters.from,
    filters.to,
    hasPermission,
  ]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      action: '',
      entityType: '',
      actorType: '',
      severity: '',
      from: '',
      to: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleExportCSV = async () => {
    try {
      setIsLoading(true);
      
      const csvData = auditLogsService.generateCSV(logs);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('CSV exported successfully');
    } catch (err) {
      console.error('Failed to export CSV:', err);
      setError('Failed to export CSV');
    } finally {
      setIsLoading(false);
    }
  };

  // Show access denied if no permission
  if (!hasPermission('audit:read')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">
            You don't have permission to view audit logs.
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600 mt-1">
              Monitor and review all system activities and user actions
            </p>
          </div>
          {/* Export CSV - requires audit:read or report:read */}
          {(hasPermission('audit:read') || hasPermission('report:read')) && (
            <Button
              variant="primary"
              onClick={handleExportCSV}
              disabled={isLoading || logs.length === 0}
            >
              Export CSV
            </Button>
          )}
        </div>

        <AuditFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        <AuditLogsTable
          logs={logs}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          pagination={pagination}
        />
      </div>
    </div>
  );
};

export default AuditLogsPage;
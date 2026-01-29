import React, { useState, useEffect } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { AuditFilters } from '../../components/audit/AuditFilters';
import { AuditLogsTable } from '../../components/audit/AuditLogsTable';
import { Button } from '../../components/atoms/Button';
import { auditLogsService } from '../../services/audit-logs.service';
import { AuditLog, AuditLogQueryParams } from '../../lib/types/audit.types';
import { useAuthStore } from '../../stores/auth.store';
import { useNavigate } from 'react-router-dom';
import { ErrorDisplay } from '../../components/feedback/ErrorDisplay';

const AuditLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
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

  const debouncedSearch = useDebouncedValue(filters.search, 500);

  // Check if user is admin
  useEffect(() => {
    // Check if user has admin role - handle both role formats
    // Use type assertion to check for admin role since TypeScript doesn't know about it
    const userRole = user?.role;
    const hasAdminRole = userRole === 'admin' || String(userRole).toUpperCase() === 'ADMIN';
    const hasRolesArray = (user as any)?.roles;
    const isAdminFromRoles = hasRolesArray && (
      (Array.isArray(hasRolesArray) && hasRolesArray.includes('ADMIN')) ||
      (Array.isArray(hasRolesArray) && hasRolesArray.includes('admin'))
    );
    
    const isAdmin = hasAdminRole || isAdminFromRoles;
    
    if (user && !isAdmin) {
      navigate('/');
      alert('Access denied. Admin privileges required.');
    }
  }, [user, navigate]);

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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
      alert('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [
    pagination.page,
    pagination.limit,
    debouncedSearch,
    filters.action,
    filters.entityType,
    filters.actorType,
    filters.severity,
    filters.from,
    filters.to,
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
      const params: AuditLogQueryParams = {
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        actorType: filters.actorType || undefined,
        severity: filters.severity || undefined,
        search: filters.search || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      };

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
      
      alert('CSV exported successfully');
    } catch (err) {
      alert('Failed to export CSV');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return <ErrorDisplay message={error} onRetry={fetchAuditLogs} />;
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
          <Button
            variant="primary"
            onClick={handleExportCSV}
            disabled={isLoading || logs.length === 0}
          >
            Export CSV
          </Button>
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
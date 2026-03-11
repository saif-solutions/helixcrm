// apps/web/src/pages/LeadsPage.tsx
import React, { useState, useMemo } from 'react';
import { useApiQuery } from '../hooks/useApiQuery';
import { useApiMutation } from '../hooks/useApiMutation';
import { useToast } from '../components/feedback/ToastProvider';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { EmptyState } from '../components/feedback/EmptyState';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { LeadsAPI } from '../services/api';
import type { Lead, LeadStatus, CreateLeadDto, UpdateLeadDto } from '../lib/types/crm.types';

// Add this type definition
type LeadsApiResponse = {
  data: Lead[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
import { usePermission } from '../lib/hooks/usePermission';
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Edit,
  Trash2,
  UserPlus,
} from 'lucide-react';

// Import dialog components
import { Dialog } from '../components/molecules/Dialog/Dialog';
import LeadForm from '../components/leads/LeadForm';

const statusOptions: {
  value: LeadStatus | 'all';
  label: string;
  color: string;
  bgColor: string;
}[] = [
  { value: 'all', label: 'All Leads', color: 'text-gray-800', bgColor: 'bg-gray-100' },
  { value: 'new', label: 'New', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  { value: 'contacted', label: 'Contacted', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  { value: 'qualified', label: 'Qualified', color: 'text-green-800', bgColor: 'bg-green-100' },
  { value: 'converted', label: 'Converted', color: 'text-purple-800', bgColor: 'bg-purple-100' },
  { value: 'disqualified', label: 'Disqualified', color: 'text-red-800', bgColor: 'bg-red-100' },
];

const ITEMS_PER_PAGE = 20;

const LeadsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  // Debounce search term
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  const { success, error: showError } = useToast();

  const { hasPermission } = usePermission();

  // Calculate skip for Phase 3.4 API
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // Fetch leads from Phase 3.4 API
  const {
    data: leadsResponse,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useApiQuery<LeadsApiResponse>(
    ['leads', currentPage.toString(), debouncedSearchTerm, selectedStatus],
    () => LeadsAPI.list(skip, ITEMS_PER_PAGE),
    {
      placeholderData: (previousData: LeadsApiResponse | undefined) => previousData,
      staleTime: 30 * 1000, // 30 seconds
    }
  );

  // Phase 3.4: Create lead mutation
  const createLeadMutation = useApiMutation<Lead, Error, CreateLeadDto>(
    (data: CreateLeadDto) => LeadsAPI.create(data as unknown as Record<string, unknown>),
    {
      onSuccess: () => {
        success('Lead Created', 'Lead has been created successfully');
        setShowCreateDialog(false);
        refetch();
      },
      onError: (error: Error) => {
        showError('Create Failed', error.message || 'Failed to create lead');
      },
    }
  );

  // Phase 3.4: Update lead mutation
  const updateLeadMutation = useApiMutation<Lead, Error, { id: string; data: UpdateLeadDto }>(
    ({ id, data }: { id: string; data: UpdateLeadDto }) =>
      LeadsAPI.update(id, data as unknown as Record<string, unknown>),
    {
      onSuccess: () => {
        success('Lead Updated', 'Lead has been updated successfully');
        setShowEditDialog(false);
        setSelectedLead(null);
        refetch();
      },
      onError: (error: Error) => {
        showError('Update Failed', error.message || 'Failed to update lead');
      },
    }
  );

  // Phase 3.4: Delete lead mutation
  const deleteLeadMutation = useApiMutation<{ success: boolean; message: string }, Error, string>(
    (id: string) => LeadsAPI.delete(id),
    {
      onSuccess: () => {
        success('Lead Deleted', 'Lead has been deleted successfully');
        setShowDeleteConfirm(false);
        setLeadToDelete(null);
        refetch();
      },
      onError: (error: Error) => {
        showError('Delete Failed', error.message || 'Failed to delete lead');
      },
    }
  );

  // Calculate stats from the current data
  const leadStats = useMemo(() => {
    if (!leadsResponse?.data) return null;

    const leads = leadsResponse.data;
    const byStatus = leads.reduce(
      (acc: Record<string, number>, lead: Lead) => {
        const status = lead.status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate conversion rate (qualified + converted) / total
    const qualifiedLeads = (byStatus.qualified || 0) + (byStatus.converted || 0);
    const conversionRate = leads.length > 0 ? (qualifiedLeads / leads.length) * 100 : 0;

    return {
      total: leads.length,
      byStatus,
      conversionRate,
    };
  }, [leadsResponse]);

  // Handle API errors
  React.useEffect(() => {
    if (error) {
      showError(
        'Failed to load leads',
        error instanceof Error ? error.message : 'Please try again'
      );
    }
  }, [error, showError]);

  const leads = leadsResponse?.data || [];
  const meta = leadsResponse?.meta;
  const totalLeads = meta?.total || 0;
  const totalPages = Math.ceil(totalLeads / ITEMS_PER_PAGE) || 1;

  // Calculate showing range
  const showingStart = totalLeads > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalLeads);

  const handleCreateLead = (data: CreateLeadDto) => {
    createLeadMutation.mutate(data);
  };

  const handleUpdateLead = (id: string, data: UpdateLeadDto) => {
    updateLeadMutation.mutate({ id, data });
  };

  const handleDeleteLead = (id: string) => {
    deleteLeadMutation.mutate(id);
  };

  const handleExport = () => {
    success('Export Started', 'Your leads export will begin shortly');
    // TODO: Implement export functionality using Phase 3.4 API
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Generate pagination range
  const paginationRange = useMemo(() => {
    const delta = 2;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];

    range.push(1);

    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i > 1 && i < totalPages) {
        range.push(i);
      }
    }

    if (totalPages > 1) {
      range.push(totalPages);
    }

    // Sort and deduplicate
    const sortedRange = [...new Set(range)].sort((a, b) => Number(a) - Number(b));

    let prev = 0;
    for (const i of sortedRange) {
      if (typeof i === 'number') {
        if (i - prev === 2) {
          rangeWithDots.push(prev + 1);
        } else if (i - prev !== 1) {
          rangeWithDots.push('...');
        }
        rangeWithDots.push(i);
        prev = i;
      }
    }

    return rangeWithDots;
  }, [currentPage, totalPages]);

  // Show loading state
  if (isLoading && !leads.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !leads.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Failed to load leads"
          message="There was an error loading your leads. Please try again."
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">
            {totalLeads} lead{totalLeads !== 1 ? 's' : ''} in your pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasPermission('report:read') && (
            <Button
              variant="outline"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExport}
              disabled={totalLeads === 0}
            >
              Export
            </Button>
          )}
          {/* Only show New Lead button if user has lead:write permission */}
          {hasPermission('lead:write') && (
            <Button
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setShowCreateDialog(true)}
              loading={createLeadMutation.isPending}
            >
              New Lead
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {statusOptions.map((status) => {
          const count =
            status.value === 'all'
              ? leadStats?.total || 0
              : leadStats?.byStatus?.[status.value as LeadStatus] || 0;

          return (
            <Card key={status.value} className="p-4 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 truncate">{status.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{count.toLocaleString()}</p>
                  {status.value === 'all' && leadStats && leadStats.conversionRate > 0 && (
                    <div className="flex items-center mt-2">
                      <BarChart3 className="w-3 h-3 text-gray-400 mr-1" />
                      <p className="text-xs text-gray-500">
                        {leadStats.conversionRate.toFixed(1)}% conversion
                      </p>
                    </div>
                  )}
                </div>
                <div
                  className={`px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color} min-w-[2rem] flex justify-center`}
                >
                  {count}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="search"
                  placeholder="Search leads by name, email, or phone..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page when search changes
                  }}
                />
              </div>
              {debouncedSearchTerm !== searchTerm && searchTerm && (
                <p className="text-xs text-gray-500 mt-1 pl-2">Searching for: "{searchTerm}"</p>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value as LeadStatus | 'all');
                    setCurrentPage(1); // Reset to first page when filter changes
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white min-w-[140px]"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Active filters indicator */}
          {(debouncedSearchTerm || selectedStatus !== 'all') && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-medium text-gray-500">Active filters:</span>
              {debouncedSearchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                  Search: "{debouncedSearchTerm}"
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                  Status: {statusOptions.find((s) => s.value === selectedStatus)?.label}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('all');
                  setCurrentPage(1);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Leads Table */}
      <Card>
        {leads.length === 0 ? (
          <EmptyState
            title={searchTerm || selectedStatus !== 'all' ? 'No matching leads' : 'No leads yet'}
            message={
              searchTerm || selectedStatus !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : hasPermission('lead:write')
                  ? 'Get started by adding your first lead'
                  : 'No leads available'
            }
            actionLabel={hasPermission('lead:write') ? 'Add Lead' : undefined}
            onAction={hasPermission('lead:write') ? () => setShowCreateDialog(true) : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[180px]">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[200px]">
                      Contact
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[120px]">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[140px]">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[180px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead: Lead) => {
                    const statusConfig = statusOptions.find((s) => s.value === lead.status);
                    return (
                      <tr
                        key={lead.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center text-primary-700 font-medium mr-3">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate" title={lead.name}>
                                {lead.name}
                              </div>
                              <div className="text-xs text-gray-500 truncate" title={lead.id}>
                                ID: {lead.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {lead.email && (
                              <div className="text-sm text-gray-600 truncate" title={lead.email}>
                                ✉️ {lead.email}
                              </div>
                            )}
                            {lead.phone && (
                              <div className="text-sm text-gray-600 truncate" title={lead.phone}>
                                📞 {lead.phone}
                              </div>
                            )}
                            {!lead.email && !lead.phone && (
                              <div className="text-sm text-gray-400 italic">No contact info</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig?.bgColor} ${statusConfig?.color}`}
                          >
                            {statusConfig?.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className="text-sm text-gray-600"
                            title={formatDateTime(lead.createdAt)}
                          >
                            {formatDate(lead.createdAt)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(lead.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {/* Only show Edit button if user has lead:write permission */}
                            {hasPermission('lead:write') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-primary-600"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setShowEditDialog(true);
                                }}
                                leftIcon={<Edit className="w-4 h-4" />}
                              >
                                Edit
                              </Button>
                            )}

                            {/* Only show Delete button if user has lead:delete permission */}
                            {hasPermission('lead:delete') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-red-600"
                                onClick={() => {
                                  setLeadToDelete(lead.id);
                                  setShowDeleteConfirm(true);
                                }}
                                leftIcon={<Trash2 className="w-4 h-4" />}
                              >
                                Delete
                              </Button>
                            )}

                            {/* Show message if user has no permissions */}
                            {!hasPermission('lead:write') && !hasPermission('lead:delete') && (
                              <span className="text-sm text-gray-400">View only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-t">
                <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                  Showing <span className="font-medium">{showingStart}</span> to{' '}
                  <span className="font-medium">{showingEnd}</span> of{' '}
                  <span className="font-medium">{totalLeads.toLocaleString()}</span> leads
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center">
                    {paginationRange.map((pageNumber, index) => {
                      if (pageNumber === '...') {
                        return (
                          <span key={`dots-${index}`} className="px-2 py-1 text-gray-400">
                            ...
                          </span>
                        );
                      }

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber as number)}
                          className={`w-8 h-8 mx-0.5 rounded-md text-sm font-medium transition-colors ${
                            currentPage === pageNumber
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Loading indicator when fetching new data */}
            {isFetching && (
              <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center pointer-events-none">
                <LoadingSpinner size="md" />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Create Lead Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Create New Lead"
        size="lg"
      >
        <LeadForm
          onSubmit={(data) => handleCreateLead(data as CreateLeadDto)}
          onCancel={() => setShowCreateDialog(false)}
          loading={createLeadMutation.isPending}
        />
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedLead(null);
        }}
        title="Edit Lead"
        size="lg"
      >
        {selectedLead && (
          <LeadForm
            initialData={selectedLead}
            onSubmit={(data) => handleUpdateLead(selectedLead.id, data)}
            onCancel={() => {
              setShowEditDialog(false);
              setSelectedLead(null);
            }}
            loading={updateLeadMutation.isPending}
            isEdit
          />
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setLeadToDelete(null);
        }}
        title="Delete Lead"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this lead? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setLeadToDelete(null);
              }}
              disabled={deleteLeadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => leadToDelete && handleDeleteLead(leadToDelete)}
              loading={deleteLeadMutation.isPending}
            >
              Delete Lead
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Help Text */}
      <div className="mt-6 text-sm text-gray-600">
        <p className="font-medium mb-1">Tips:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use search to find leads by name, email, or phone number</li>
          <li>Filter by status to focus on specific lead stages</li>
          <li>Click on a lead to view and edit details</li>
          <li>Export data for external analysis</li>
          <li>Use the inline actions for quick edits and deletions</li>
        </ul>
      </div>
    </div>
  );
};

export default LeadsPage;

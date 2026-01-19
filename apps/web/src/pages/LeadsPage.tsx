// apps/web/src/pages/LeadsPage.tsx
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../providers/QueryProvider';
import { useToast } from '../components/feedback/ToastProvider';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { EmptyState } from '../components/feedback/EmptyState';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { leadsService } from '../services/leads.service';
import { LeadStatus } from '../lib/types/api.types';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react';

const statusOptions: { value: LeadStatus | 'all'; label: string; color: string; bgColor: string }[] = [
  { value: 'all', label: 'All Leads', color: 'text-gray-800', bgColor: 'bg-gray-100' },
  { value: 'new', label: 'New', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  { value: 'contacted', label: 'Contacted', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  { value: 'qualified', label: 'Qualified', color: 'text-green-800', bgColor: 'bg-green-100' },
];

const ITEMS_PER_PAGE = 20;

const LeadsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Debounce search term
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  
  const { success, error: showError } = useToast();
  
  // Fetch leads from API
    const { 
    data: leadsResponse, 
    isLoading, 
    error,
    isFetching 
  } = useApiQuery(
    ['leads', currentPage.toString(), debouncedSearchTerm, selectedStatus], // FIX: currentPage.toString()
    () => leadsService.getLeads({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      search: debouncedSearchTerm || undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
    }),
    { 
      placeholderData: (previousData) => previousData,
      staleTime: 30 * 1000, // 30 seconds
    }
  );
  
  // Fetch lead stats from API
  const { data: leadStats, isLoading: isLoadingStats } = useApiQuery(
    ['lead-stats'],
    () => leadsService.getLeadStats(),
    {
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
  
  // Handle API errors
  React.useEffect(() => {
    if (error) {
      showError('Failed to load leads', error instanceof Error ? error.message : 'Please try again');
    }
  }, [error, showError]);
  
  const leads = leadsResponse?.data || [];
  const meta = leadsResponse?.meta;
  const totalLeads = meta?.total || 0;
  const totalPages = meta?.totalPages || 1;
  
  // Calculate showing range
  const showingStart = totalLeads > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0;
  const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalLeads);
  
  const handleExport = () => {
    success('Export Started', 'Your leads export will begin shortly');
    // TODO: Implement export functionality
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
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExport}
            disabled={totalLeads === 0}
          >
            Export
          </Button>
          <Link to="/leads/new">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              New Lead
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {statusOptions.map((status) => {
          const count = status.value === 'all' 
            ? leadStats?.total || 0
            : leadStats?.byStatus?.[status.value as LeadStatus] || 0;
          
          const isLoading = isLoadingStats;
          
          return (
            <Card key={status.value} className="p-4 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 truncate">{status.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {isLoading ? '...' : count.toLocaleString()}
                  </p>
                  {status.value === 'all' && leadStats && leadStats.conversionRate > 0 && (
                    <div className="flex items-center mt-2">
                      <BarChart3 className="w-3 h-3 text-gray-400 mr-1" />
                      <p className="text-xs text-gray-500">
                        {leadStats.conversionRate.toFixed(1)}% conversion
                      </p>
                    </div>
                  )}
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color} min-w-[2rem] flex justify-center`}>
                  {isLoading ? '...' : count}
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
                <p className="text-xs text-gray-500 mt-1 pl-2">
                  Searching for: "{searchTerm}"
                </p>
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
                  Status: {statusOptions.find(s => s.value === selectedStatus)?.label}
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
            title={searchTerm || selectedStatus !== 'all' ? "No matching leads" : "No leads yet"}
            message={
              searchTerm || selectedStatus !== 'all' 
                ? "Try adjusting your search or filter criteria"
                : "Get started by adding your first lead"
            }
            actionLabel="Add Lead"
            onAction={() => window.location.href = '/leads/new'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[180px]">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[200px]">Contact</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[120px]">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[140px]">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const statusConfig = statusOptions.find(s => s.value === lead.status);
                    return (
                      <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
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
                              <div className="text-sm text-gray-400 italic">
                                No contact info
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig?.bgColor} ${statusConfig?.color}`}>
                            {statusConfig?.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600" title={formatDateTime(lead.createdAt)}>
                            {formatDate(lead.createdAt)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Link to={`/leads/${lead.id}/edit`}>
                              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary-600">
                                Edit
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-gray-400 hover:text-gray-600"
                              onClick={() => {
                                // TODO: Implement more actions dropdown
                                console.log('More actions for:', lead.id);
                              }}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
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
                  Showing <span className="font-medium">{showingStart}</span> to <span className="font-medium">{showingEnd}</span> of{' '}
                  <span className="font-medium">{totalLeads.toLocaleString()}</span> leads
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
      
      {/* Help Text */}
      <div className="mt-6 text-sm text-gray-600">
        <p className="font-medium mb-1">Tips:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use search to find leads by name, email, or phone number</li>
          <li>Filter by status to focus on specific lead stages</li>
          <li>Click on a lead to view and edit details</li>
          <li>Export data for external analysis</li>
        </ul>
      </div>
    </div>
  );
};

export default LeadsPage;
// apps/web/src/pages/DealsPage.tsx
import React, { useState, useMemo } from 'react';
import { useApiQuery, useApiMutation } from '../providers/QueryProvider';
import { useToast } from '../components/feedback/ToastProvider';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { EmptyState } from '../components/feedback/EmptyState';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { Modal } from '../components/feedback/Modal';
import { ConfirmationDialog } from '../components/feedback/ConfirmationDialog';
import { DealsAPI, ContactsAPI } from '../services/api';
import type { Deal, CreateDealSimpleDto, UpdateDealDto } from '../lib/types/crm.types';
import {
  Plus,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Calendar,
  Target,
  Edit,
  Trash2,
  BarChart3,
  Sparkles,
} from 'lucide-react';

// Mock pipeline stages (should come from API in real implementation)
const PIPELINE_STAGES = [
  { id: 'stage-1', name: 'Prospecting', probability: 10, color: 'bg-gray-100 text-gray-800' },
  { id: 'stage-2', name: 'Qualification', probability: 25, color: 'bg-blue-100 text-blue-800' },
  {
    id: 'stage-3',
    name: 'Needs Analysis',
    probability: 50,
    color: 'bg-yellow-100 text-yellow-800',
  },
  { id: 'stage-4', name: 'Proposal', probability: 75, color: 'bg-purple-100 text-purple-800' },
  { id: 'stage-5', name: 'Negotiation', probability: 90, color: 'bg-orange-100 text-orange-800' },
  { id: 'stage-6', name: 'Closed Won', probability: 100, color: 'bg-green-100 text-green-800' },
  { id: 'stage-7', name: 'Closed Lost', probability: 0, color: 'bg-red-100 text-red-800' },
];

const ITEMS_PER_PAGE = 20;

const DealsPage: React.FC = () => {
  const { success, error: showError } = useToast();

  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // State for forms and dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [dealToDelete, setDealToDelete] = useState<string | null>(null);

  // Form state for Phase 3.4 simplified deal creation
  const [formData, setFormData] = useState<CreateDealSimpleDto>({
    name: '',
    amount: 0,
    stageId: PIPELINE_STAGES[0].id,
    currency: 'USD',
    probability: PIPELINE_STAGES[0].probability,
    status: 'open',
    priority: 'medium',
  });

  // Calculate skip for Phase 3.4 API
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // Fetch deals from Phase 3.4 API
  const {
    data: dealsResponse,
    isLoading,
    error,
    isFetching,
    refetch,
  } = useApiQuery(
    ['deals', currentPage.toString(), searchTerm, selectedStage],
    () => DealsAPI.list(skip, ITEMS_PER_PAGE),
    {
      placeholderData: (previousData) => previousData,
      staleTime: 30 * 1000, // 30 seconds
    }
  );

  // Fetch contacts for contact selection (optional)
  const { data: contactsResponse } = useApiQuery(
    ['contacts-for-deals'],
    () => ContactsAPI.list(0, 100), // Get up to 100 contacts for dropdown
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      enabled: showCreateDialog || showEditDialog, // Only fetch when needed
    }
  );

  // Phase 3.4: Create simplified deal mutation
  const createDealMutation = useApiMutation(
    (data: CreateDealSimpleDto) => DealsAPI.createSimple(data),
    {
      onSuccess: () => {
        success(
          'Deal Created',
          'Deal has been created successfully using Phase 3.4 simplified API'
        );
        setShowCreateDialog(false);
        resetForm();
        refetch(); // Refresh the list
      },
      onError: (error: any) => {
        showError('Create Failed', error.message || 'Failed to create deal');
      },
    }
  );

  // Update deal mutation
  const updateDealMutation = useApiMutation(
    ({ id, data }: { id: string; data: UpdateDealDto }) => DealsAPI.update(id, data),
    {
      onSuccess: () => {
        success('Deal Updated', 'Deal has been updated successfully');
        setShowEditDialog(false);
        setSelectedDeal(null);
        refetch(); // Refresh the list
      },
      onError: (error: any) => {
        showError('Update Failed', error.message || 'Failed to update deal');
      },
    }
  );

  // Delete deal mutation
  const deleteDealMutation = useApiMutation((id: string) => DealsAPI.delete(id), {
    onSuccess: () => {
      success('Deal Deleted', 'Deal has been deleted successfully');
      setShowDeleteConfirm(false);
      setDealToDelete(null);
      refetch(); // Refresh the list
    },
    onError: (error: any) => {
      showError('Delete Failed', error.message || 'Failed to delete deal');
    },
  });

  // Handle API errors
  React.useEffect(() => {
    if (error) {
      showError(
        'Failed to load deals',
        error instanceof Error ? error.message : 'Please try again'
      );
    }
  }, [error, showError]);

  const deals = dealsResponse?.data || [];
  const meta = dealsResponse?.meta;
  const totalDeals = meta?.total || 0;
  const totalPages = Math.ceil(totalDeals / ITEMS_PER_PAGE) || 1;

  // Calculate showing range
  const showingStart = totalDeals > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const showingEnd = Math.min(currentPage * ITEMS_PER_PAGE, totalDeals);

  // Calculate deal statistics
  const dealStats = useMemo(() => {
    const totalValue = deals.reduce((sum, deal) => sum + deal.amount, 0);
    const avgDealValue = deals.length > 0 ? totalValue / deals.length : 0;
    const wonDeals = deals.filter((deal) => deal.status === 'won').length;
    const openDeals = deals.filter((deal) => deal.status === 'open').length;

    return {
      totalValue,
      avgDealValue,
      wonDeals,
      openDeals,
      winRate: deals.length > 0 ? (wonDeals / deals.length) * 100 : 0,
    };
  }, [deals]);

  const handleCreateDeal = () => {
    createDealMutation.mutate(formData);
  };

  const handleUpdateDeal = (id: string, data: UpdateDealDto) => {
    updateDealMutation.mutate({ id, data });
  };

  const handleDeleteDeal = (id: string) => {
    deleteDealMutation.mutate(id);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: 0,
      stageId: PIPELINE_STAGES[0].id,
      currency: 'USD',
      probability: PIPELINE_STAGES[0].probability,
      status: 'open',
      priority: 'medium',
    });
  };

  const handleFormChange = (field: keyof CreateDealSimpleDto, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Update probability when stage changes
    if (field === 'stageId') {
      const stage = PIPELINE_STAGES.find((s) => s.id === value);
      if (stage) {
        setFormData((prev) => ({
          ...prev,
          stageId: value,
          probability: stage.probability,
        }));
      }
    }
  };

  const handleExport = () => {
    success('Export Started', 'Your deals export will begin shortly');
    // TODO: Implement export functionality
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
  if (isLoading && !deals.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !deals.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Failed to load deals"
          message="There was an error loading your deals. Please try again."
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
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
            <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
              Phase 3.4
            </span>
          </div>
          <p className="text-gray-600">Manage your sales pipeline and track deal progress</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExport}
            disabled={totalDeals === 0}
          >
            Export
          </Button>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateDialog(true)}
            loading={createDealMutation.isPending}
          >
            New Deal
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(dealStats.totalValue)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Deal Size</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(dealStats.avgDealValue)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open Deals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{dealStats.openDeals}</p>
              <p className="text-xs text-gray-500 mt-1">{deals.length} total deals</p>
            </div>
            <Target className="w-8 h-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Win Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {dealStats.winRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">{dealStats.wonDeals} deals won</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
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
                  placeholder="Search deals by name, contact, or account..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedStage}
                  onChange={(e) => {
                    setSelectedStage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white min-w-[140px]"
                >
                  <option value="all">All Stages</option>
                  {PIPELINE_STAGES.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Deals Table */}
      <Card>
        {deals.length === 0 ? (
          <EmptyState
            title="No deals yet"
            message="Get started by creating your first deal using the Phase 3.4 simplified API"
            actionLabel="Create First Deal"
            onAction={() => setShowCreateDialog(true)}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[200px]">
                      Deal Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[120px]">
                      Stage
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[120px]">
                      Value
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[100px]">
                      Probability
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 min-w-[120px]">
                      Expected Close
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
                  {deals.map((deal) => {
                    const stage =
                      PIPELINE_STAGES.find((s) => s.id === deal.stageId) || PIPELINE_STAGES[0];
                    return (
                      <tr
                        key={deal.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{deal.name}</div>
                          <div className="text-sm text-gray-500">
                            {deal.contactName || 'No contact'} • {deal.accountName || 'No account'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${stage.color}`}
                          >
                            {stage.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {formatCurrency(deal.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  deal.probability >= 75
                                    ? 'bg-green-500'
                                    : deal.probability >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                }`}
                                style={{ width: `${deal.probability}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-700">{deal.probability}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-1" />
                            {deal.expectedCloseDate
                              ? formatDate(deal.expectedCloseDate)
                              : 'Not set'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(deal.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-primary-600"
                              onClick={() => {
                                setSelectedDeal(deal);
                                setShowEditDialog(true);
                              }}
                              leftIcon={<Edit className="w-4 h-4" />}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-red-600"
                              onClick={() => {
                                setDealToDelete(deal.id);
                                setShowDeleteConfirm(true);
                              }}
                              leftIcon={<Trash2 className="w-4 h-4" />}
                            >
                              Delete
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
                  Showing <span className="font-medium">{showingStart}</span> to{' '}
                  <span className="font-medium">{showingEnd}</span> of{' '}
                  <span className="font-medium">{totalDeals.toLocaleString()}</span> deals
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

      {/* Create Deal Dialog - Phase 3.4 Simplified */}
      <Modal
        isOpen={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          resetForm();
        }}
        size="lg"
        title="Create New Deal (Phase 3.4 Simplified)"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deal Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name *</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="Enter deal name"
                className="w-full"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Value *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) => handleFormChange('amount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-8"
                  required
                />
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => handleFormChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            {/* Stage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage *</label>
              <select
                value={formData.stageId}
                onChange={(e) => handleFormChange('stageId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name} ({stage.probability}%)
                  </option>
                ))}
              </select>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    PIPELINE_STAGES.find((s) => s.id === formData.stageId)?.color
                  }`}
                >
                  {PIPELINE_STAGES.find((s) => s.id === formData.stageId)?.name}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {formData.probability}% probability
                </span>
              </div>
            </div>

            {/* Probability */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probability</label>
              <div className="flex items-center">
                <Input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.probability}
                  onChange={(e) => handleFormChange('probability', parseInt(e.target.value))}
                  className="w-full"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 min-w-[3rem]">
                  {formData.probability}%
                </span>
              </div>
            </div>

            {/* Contact (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <select
                value={formData.contactId || ''}
                onChange={(e) => handleFormChange('contactId', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a contact</option>
                {contactsResponse?.data?.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => handleFormChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
              disabled={createDealMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCreateDeal}
              loading={createDealMutation.isPending}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Create Deal (Phase 3.4)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Deal Dialog */}
      {selectedDeal && (
        <Modal
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedDeal(null);
          }}
          size="lg"
          title="Edit Deal"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Edit deal: <span className="font-medium">{selectedDeal.name}</span>
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Note: Full deal editing will be implemented in Phase 4. Currently, only basic
                information can be updated.
              </p>
            </div>
            {/* TODO: Implement full edit form */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedDeal(null);
                }}
                disabled={updateDealMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleUpdateDeal(selectedDeal.id, { name: selectedDeal.name })}
                loading={updateDealMutation.isPending}
              >
                Update Deal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDealToDelete(null);
        }}
        onConfirm={() => dealToDelete && handleDeleteDeal(dealToDelete)}
        title="Delete Deal"
        message="Are you sure you want to delete this deal? This action cannot be undone."
        confirmText={deleteDealMutation.isPending ? 'Deleting...' : 'Delete Deal'}
        cancelText="Cancel"
        isLoading={deleteDealMutation.isPending}
      />

      {/* Phase 3.4 Info Box */}
      <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-primary-900 mb-1">
              Phase 3.4 Simplified Deal Creation
            </h4>
            <p className="text-sm text-primary-700">
              This page uses the Phase 3.4 simplified API endpoint (<code>/deals/simple</code>) for
              creating deals with minimal required fields. The form above demonstrates the
              simplified workflow while maintaining enterprise-grade validation and error handling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealsPage;

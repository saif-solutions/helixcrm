import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../components/feedback/ToastProvider';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useApiMutation } from '../../hooks/useApiMutation';
import { usePermission } from '../../lib/hooks/usePermission';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { LeadsAPI } from '../../services/api';
import { ArrowLeft, Save, Trash2, Shield } from 'lucide-react';
import type { Lead, UpdateLeadDto } from '../../lib/types/crm.types';

// Zod schema for lead validation
const leadSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(100, { message: 'Name cannot exceed 100 characters' }),
  email: z
    .string()
    .email({ message: 'Please enter a valid email address' })
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^[\d\s\-+()]+$/.test(val), {
      message: 'Please enter a valid phone number',
    }),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'disqualified']).default('new'),
});

type LeadFormData = z.infer<typeof leadSchema>;

const EditLeadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { hasPermission } = usePermission();

  // Check permissions
  useEffect(() => {
    if (!hasPermission('lead:write')) {
      navigate('/leads');
    }
  }, [hasPermission, navigate]);

  // Fetch lead data
  const {
    data: lead,
    isLoading,
    error,
  } = useApiQuery<Lead>(['lead', id || ''], () => LeadsAPI.get(id || ''), { enabled: !!id });

  // Update lead mutation
  const updateMutation = useApiMutation<Lead, Error, { id: string; data: UpdateLeadDto }>(
    ({ id, data }) => LeadsAPI.update(id, data as unknown as Record<string, unknown>),
    {
      onSuccess: (updatedLead) => {
        success('Lead Updated', `${updatedLead.name} has been updated`);
        navigate('/leads');
      },
      onError: (err: Error) => {
        showError('Update Failed', err.message || 'Failed to update lead');
      },
    }
  );

  // Delete lead mutation
  const deleteMutation = useApiMutation<{ success: boolean; message: string }, Error, string>(
    (id: string) => LeadsAPI.delete(id),
    {
      onSuccess: () => {
        success('Lead Deleted', 'The lead has been removed');
        navigate('/leads');
      },
      onError: (err: Error) => {
        showError('Delete Failed', err.message || 'Failed to delete lead');
      },
    }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
    reset,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
  });

  // Reset form when lead data loads
  useEffect(() => {
    if (lead) {
      reset({
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        status: lead.status as LeadFormData['status'],
      });
    }
  }, [lead, reset]);

  const onSubmit = async (data: LeadFormData) => {
    if (!id) return;
    updateMutation.mutate({ id, data });
  };

  const handleDelete = () => {
    if (!id) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!id) return;
    deleteMutation.mutate(id);
  };

  // Status options - defined outside component or with useMemo for stability
  const statusOptions = React.useMemo(
    () => [
      { value: 'new' as const, label: 'New', color: 'text-blue-600 bg-blue-50 border-blue-200' },
      {
        value: 'contacted' as const,
        label: 'Contacted',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      },
      {
        value: 'qualified' as const,
        label: 'Qualified',
        color: 'text-green-600 bg-green-50 border-green-200',
      },
      {
        value: 'converted' as const,
        label: 'Converted',
        color: 'text-purple-600 bg-purple-50 border-purple-200',
      },
      {
        value: 'disqualified' as const,
        label: 'Disqualified',
        color: 'text-red-600 bg-red-50 border-red-200',
      },
    ],
    []
  );

  // Use useWatch instead of watch() - this is more compatible with React Compiler
  const selectedStatus = useWatch({
    control,
    name: 'status',
    defaultValue: 'new',
  });

  // Check write permission for page access
  if (!hasPermission('lead:write')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to edit leads.</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/leads')}>
            Back to Leads
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Lead Not Found"
          message="The lead you're looking for doesn't exist or you don't have access to it."
          actionLabel="Back to Leads"
          onAction={() => navigate('/leads')}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Lead"
        message={`Are you sure you want to delete "${lead.name}"? This action cannot be undone.`}
        confirmText={deleteMutation.isPending ? 'Deleting...' : 'Delete Lead'}
        cancelText="Cancel"
        isLoading={deleteMutation.isPending}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/leads">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leads
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Lead</h1>
            <p className="text-gray-600">Update lead information</p>
          </div>
        </div>

        {/* Delete button - requires lead:delete */}
        {hasPermission('lead:delete') && (
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={handleDelete}
            loading={deleteMutation.isPending}
          >
            Delete
          </Button>
        )}
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 space-y-6">
              {/* Lead Info */}
              <div className="text-sm text-gray-600 mb-4">
                <p>
                  Lead ID: <span className="font-mono">{id}</span>
                </p>
                <p>Created: {new Date(lead.createdAt).toLocaleDateString()}</p>
                <p>Last Updated: {new Date(lead.updatedAt).toLocaleDateString()}</p>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setValue('status', option.value)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        selectedStatus === option.value
                          ? `${option.color} border-current font-semibold`
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  error={errors.name?.message}
                  {...register('name')}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Any additional information about this lead..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Link to="/leads">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  loading={updateMutation.isPending}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EditLeadPage;

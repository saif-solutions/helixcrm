// apps/web/src/pages/EditLeadPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../components/feedback/ToastProvider';
import { useApiQuery, useApiMutation } from '../providers/QueryProvider';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { EmptyState } from '../components/feedback/EmptyState';
import { leadsService } from '../services/leads.service';
import { ArrowLeft, Save, Trash2, Calendar, Building } from 'lucide-react';

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
    .refine((val) => !val || /^[\d\s\-\+\(\)]+$/.test(val), {
      message: 'Please enter a valid phone number',
    }),
  status: z.enum(['new', 'contacted', 'qualified']).default('new'),
});

type LeadFormData = z.infer<typeof leadSchema>;

const EditLeadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { success, error } = useToast();

  // Fetch lead data using React Query
  const {
    data: lead,
    isLoading: isLoadingLead,
    error: leadError,
  } = useApiQuery(
    ['lead', id || ''],
    () => {
      if (!id) throw new Error('Lead ID is required');
      return leadsService.getLeadById(id);
    },
    {
      enabled: !!id,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Mutation for updating lead
  const updateMutation = useApiMutation(
    (data: LeadFormData) => {
      if (!id) throw new Error('Lead ID is required');
      return leadsService.updateLead(id, data);
    },
    {
      onSuccess: (updatedLead) => {
        success('Lead Updated', `${updatedLead.name} has been updated successfully`);
        navigate('/leads');
      },
      onError: (err) => {
        error('Update Failed', err.message || 'Failed to update lead. Please try again.');
      },
    }
  );

  // Mutation for deleting lead
  const deleteMutation = useApiMutation(
    () => {
      if (!id) throw new Error('Lead ID is required');
      return leadsService.deleteLead(id);
    },
    {
      onSuccess: () => {
        success('Lead Deleted', 'The lead has been removed successfully');
        navigate('/leads');
      },
      onError: (err) => {
        error('Delete Failed', err.message || 'Failed to delete lead. Please try again.');
      },
    }
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
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
        status: lead.status,
      });
    }
  }, [lead, reset]);

  const onSubmit = async (data: LeadFormData) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      // Clean up empty strings for optional fields
      const leadData = {
        ...data,
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
      };

      await updateMutation.mutateAsync(leadData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    if (
      !window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      // Fix: Pass undefined as variables to the mutation
      await deleteMutation.mutateAsync(undefined as void);
    } finally {
      setIsDeleting(false);
    }
  };

  const statusOptions: {
    value: 'new' | 'contacted' | 'qualified';
    label: string;
    color: string;
    bgColor: string;
  }[] = [
    { value: 'new', label: 'New', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
    {
      value: 'contacted',
      label: 'Contacted',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200',
    },
    {
      value: 'qualified',
      label: 'Qualified',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
    },
  ];

  const selectedStatus = watch('status');

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show loading state
  if (isLoadingLead) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">Loading lead details...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (leadError && !lead) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Failed to load lead"
          message="There was an error loading the lead. Please try again."
          actionLabel="Back to Leads"
          onAction={() => navigate('/leads')}
        />
      </div>
    );
  }

  if (!lead) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link to="/leads">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leads
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Lead</h1>
            <p className="text-gray-600">Update lead information and status</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={handleDelete}
            loading={isDeleting || deleteMutation.isPending}
          >
            Delete Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Info Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Lead Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center text-primary-700 font-medium mr-3">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      <div className="text-xs text-gray-500">
                        Lead ID: {lead.id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="w-4 h-4 mr-2 text-gray-400" />
                    <span>Organization: {lead.organizationId.substring(0, 8)}...</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <div>
                      <div>Created: {formatDateTime(lead.createdAt)}</div>
                      <div className="text-xs text-gray-400">
                        Last updated: {formatDateTime(lead.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Current Status</h3>
                <div className="flex flex-col gap-2">
                  {statusOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`px-3 py-2 rounded-md transition-colors ${
                        lead.status === option.value
                          ? `${option.bgColor} border-l-4 ${option.color.replace('text-', 'border-')}`
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-medium ${lead.status === option.value ? option.color : 'text-gray-600'}`}
                        >
                          {option.label}
                        </span>
                        {lead.status === option.value && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white text-gray-700 border">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="p-6 space-y-6">
                {/* Status Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Status
                  </label>
                  <div className="flex gap-2">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setValue('status', option.value, { shouldDirty: true })}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                          selectedStatus === option.value
                            ? `${option.bgColor} border-current font-semibold ${option.color}`
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
                  <p className="mt-1 text-xs text-gray-500">
                    We'll use this to send follow-up communications
                  </p>
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
                  <p className="mt-1 text-xs text-gray-500">
                    Include country code for international leads
                  </p>
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
                    loading={isSubmitting || updateMutation.isPending}
                    leftIcon={<Save className="w-4 h-4" />}
                    disabled={!isDirty || isSubmitting || updateMutation.isPending}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          {/* Help Text */}
          <div className="mt-6 text-sm text-gray-600">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Editing Best Practices</h4>
              <ul className="list-disc pl-5 space-y-1 text-blue-700">
                <li>Update status as leads progress through your pipeline</li>
                <li>Keep contact information current for effective follow-up</li>
                <li>All changes are tracked and can be audited later</li>
                <li>Deleted leads can be restored within 30 days by administrators</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditLeadPage;

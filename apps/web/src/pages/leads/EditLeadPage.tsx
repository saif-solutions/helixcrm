// apps/web/src/pages/leads/EditLeadPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../components/feedback/ToastProvider';
import { useApiQuery } from '../../providers/QueryProvider';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { Lead } from '../../lib/types/api.types';

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

// Mock lead data for now - will be replaced with API call
const mockLead: Lead = {
  id: '1',
  name: 'John Smith',
  email: 'john@example.com',
  phone: '+1 (555) 123-4567',
  status: 'new',
  organizationId: 'org-123',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
};

const EditLeadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { success, error } = useToast();

  // Fetch lead data
  const { data: lead, isLoading } = useApiQuery(
    ['lead', id || ''],
    async () => {
      // TODO: Replace with real API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!id) throw new Error('Lead ID not found');
      return mockLead; // Replace with API call
    },
    { enabled: !!id }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
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
      // TODO: Replace with real API call
      console.log('Updating lead:', id, data);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      success('Lead Updated', `${data.name} has been updated`);
      navigate('/leads');
    } catch (err) {
      error('Update Failed', 'Failed to update lead. Please try again.');
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
      // TODO: Replace with real API call
      console.log('Deleting lead:', id);
      await new Promise((resolve) => setTimeout(resolve, 500));

      success('Lead Deleted', 'The lead has been removed');
      navigate('/leads');
    } catch (err) {
      error('Delete Failed', 'Failed to delete lead. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusOptions: {
    value: 'new' | 'contacted' | 'qualified';
    label: string;
    color: string;
  }[] = [
    { value: 'new', label: 'New', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    {
      value: 'contacted',
      label: 'Contacted',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    },
    {
      value: 'qualified',
      label: 'Qualified',
      color: 'text-green-600 bg-green-50 border-green-200',
    },
  ];

  const selectedStatus = watch('status');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
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

        <Button
          variant="danger"
          size="sm"
          leftIcon={<Trash2 className="w-4 h-4" />}
          onClick={handleDelete}
          loading={isDeleting}
        >
          Delete
        </Button>
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
                <div className="flex gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setValue('status', option.value)}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
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
                  defaultValue="Initial contact made via email. Interested in enterprise plan."
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
                  loading={isSubmitting}
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

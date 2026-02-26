// apps/web/src/pages/leads/NewLeadPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../../components/feedback/ToastProvider';
import { useQueryClient } from '../../providers/QueryProvider';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { leadsService } from '../../services/leads.service';
import { ArrowLeft, Save } from 'lucide-react';

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

const NewLeadPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      status: 'new',
    },
  });

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);

    try {
      // Clean up empty strings for optional fields
      const leadData = {
        ...data,
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
      };

      console.log('Creating lead:', leadData);
      const createdLead = await leadsService.createLead(leadData);

      // Invalidate leads queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      success('Lead Created', `${createdLead.name} has been added to your leads`);
      navigate('/leads');
    } catch (err: any) {
      console.error('Failed to create lead:', err);

      // Handle specific error cases
      if (err.status === 400) {
        error('Validation Error', 'Please check your input and try again');
      } else if (err.status === 403) {
        error('Permission Denied', 'You do not have permission to create leads');
      } else {
        error('Creation Failed', err.message || 'Failed to create lead. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
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
            <h1 className="text-2xl font-bold text-gray-900">New Lead</h1>
            <p className="text-gray-600">Add a new potential customer to your pipeline</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 space-y-6">
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
                <p className="mt-1 text-xs text-gray-500">
                  Optional - but recommended for better engagement
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
                <p className="mt-1 text-xs text-gray-500">Optional - include country code</p>
              </div>

              {/* Notes (optional for future) */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
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
                  loading={isSubmitting}
                  leftIcon={<Save className="w-4 h-4" />}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Lead'}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-sm text-gray-600">
          <p>
            <span className="font-medium">Tip:</span> Complete as much information as possible to
            help your team effectively follow up with this lead.
          </p>
          <p className="mt-1">
            <span className="font-medium">Note:</span> Leads are automatically assigned to your
            organization.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NewLeadPage;

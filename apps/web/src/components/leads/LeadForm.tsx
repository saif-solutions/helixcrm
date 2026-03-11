// apps/web/src/components/leads/LeadForm.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Select } from '../atoms/Select';
import type { Lead, CreateLeadDto, UpdateLeadDto, LeadStatus } from '../../lib/types/crm.types';

interface LeadFormProps {
  onSubmit: (data: CreateLeadDto | UpdateLeadDto) => void;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Lead;
  isEdit?: boolean;
  className?: string;
}

const LeadForm: React.FC<LeadFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  initialData,
  isEdit = false,
  className = '',
}) => {
  // Form state
  const [formData, setFormData] = useState<CreateLeadDto>({
    name: '',
    email: '',
    phone: '',
    status: 'new',
    source: '',
    company: '',
    title: '',
    notes: '',
    estimatedValue: undefined,
    tags: [],
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with initial data if editing
  useEffect(() => {
    if (initialData && isEdit) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        status: initialData.status || 'new',
        source: initialData.source || '',
        company: initialData.company || '',
        title: initialData.title || '',
        notes: initialData.notes || '',
        estimatedValue: initialData.estimatedValue,
        tags: initialData.tags || [],
      });
    }
  }, [initialData, isEdit]);

  // Handle input changes
  const handleInputChange = (field: keyof CreateLeadDto, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Email validation (if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (if provided)
    if (formData.phone && !/^[\d\s+()-]{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare data for submission
    const submissionData: CreateLeadDto = {
      ...formData,
      // Convert empty strings to undefined for optional fields
      email: formData.email?.trim() || undefined,
      phone: formData.phone?.trim() || undefined,
      company: formData.company?.trim() || undefined,
      title: formData.title?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      source: formData.source?.trim() || undefined,
      estimatedValue: formData.estimatedValue || undefined,
      tags: formData.tags?.filter((tag) => tag.trim()) || undefined,
    };

    onSubmit(submissionData);
  };

  // Status options
  const statusOptions = [
    { value: 'new', label: 'New', color: 'text-blue-800', bgColor: 'bg-blue-100' },
    { value: 'contacted', label: 'Contacted', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
    { value: 'qualified', label: 'Qualified', color: 'text-green-800', bgColor: 'bg-green-100' },
    { value: 'converted', label: 'Converted', color: 'text-purple-800', bgColor: 'bg-purple-100' },
    { value: 'disqualified', label: 'Disqualified', color: 'text-red-800', bgColor: 'bg-red-100' },
  ];

  // Source options
  const sourceOptions = [
    { value: '', label: 'Select source' },
    { value: 'website', label: 'Website' },
    { value: 'referral', label: 'Referral' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'email_campaign', label: 'Email Campaign' },
    { value: 'event', label: 'Event' },
    { value: 'cold_call', label: 'Cold Call' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {isEdit ? 'Edit Lead' : 'New Lead Information'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter lead's full name"
              error={errors.name}
              disabled={loading}
              required
              className="w-full"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="name@example.com"
              error={errors.email}
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <Input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="(123) 456-7890"
              error={errors.phone}
              disabled={loading}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Company Information */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Company Information</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <Input
              type="text"
              value={formData.company || ''}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Company name"
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
            <Input
              type="text"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Job title"
              disabled={loading}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Lead Details */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Lead Details</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <Select
              value={formData.status}
              onChange={(value) => handleInputChange('status', value as LeadStatus)}
              options={statusOptions.map((status) => ({
                value: status.value,
                label: status.label,
              }))}
              disabled={loading}
              className="w-full"
            />
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  statusOptions.find((s) => s.value === formData.status)?.bgColor
                } ${statusOptions.find((s) => s.value === formData.status)?.color}`}
              >
                {statusOptions.find((s) => s.value === formData.status)?.label}
              </span>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <Select
              value={formData.source || ''}
              onChange={(value) => handleInputChange('source', value)}
              options={sourceOptions}
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Estimated Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Value ($)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.estimatedValue || ''}
              onChange={(e) =>
                handleInputChange(
                  'estimatedValue',
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              placeholder="0.00"
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add any notes or comments about this lead..."
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Tags (simple implementation) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <Input
          type="text"
          value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
          onChange={(e) => {
            const tags = e.target.value
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0);
            handleInputChange('tags', tags);
          }}
          placeholder="Enter tags separated by commas"
          disabled={loading}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Separate tags with commas (e.g., "hot lead, enterprise, follow-up")
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {isEdit ? 'Update Lead' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
};

export default LeadForm;

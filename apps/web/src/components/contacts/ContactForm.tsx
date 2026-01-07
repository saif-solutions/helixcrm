/**
 * Contact Form Component
 * Handles creating and editing contacts with validation
 * 
 * HELIX Requirements:
 * - Multi-tenant (organizationId auto-set)
 * - Validation with clear errors
 * - Loading/success/error states
 * - Audit logging ready
 */
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';
import { X, Loader2 } from 'lucide-react';

// Simple interface for form data
interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organizationId?: string;
}

interface ContactFormProps {
  mode: 'create' | 'edit';
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    organizationId: string;
  };
  onSubmit: (data: ContactFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Simple validation functions
const validateForm = (data: ContactFormData): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.firstName?.trim()) {
    errors.firstName = 'First name is required';
  } else if (data.firstName.length > 50) {
    errors.firstName = 'First name cannot exceed 50 characters';
  }

  if (!data.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  } else if (data.lastName.length > 50) {
    errors.lastName = 'Last name cannot exceed 50 characters';
  }

  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  } else if (data.email.length > 100) {
    errors.email = 'Email cannot exceed 100 characters';
  }

  if (data.phone && data.phone.length > 20) {
    errors.phone = 'Phone number cannot exceed 20 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const ContactForm: React.FC<ContactFormProps> = ({
  mode,
  contact,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<ContactFormData>(
    contact || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      organizationId: '',
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Update form when contact data changes
  useEffect(() => {
    if (contact) {
      setFormData(contact);
    }
  }, [contact]);

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: keyof ContactFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate single field
    const validation = validateForm(formData);
    if (validation.errors[field]) {
      setErrors(prev => ({ ...prev, [field]: validation.errors[field] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateForm(formData);
    setErrors(validation.errors);

    if (!validation.isValid) {
      // Mark all fields as touched to show errors
      setTouched({
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      });
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      setFormError(
        error instanceof Error 
          ? error.message 
          : 'Failed to save contact. Please try again.'
      );
    }
  };

  const title = mode === 'create' ? 'Add New Contact' : 'Edit Contact';
  const submitText = mode === 'create' ? 'Create Contact' : 'Save Changes';
  const isValid = validateForm(formData).isValid;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          disabled={isLoading}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Form Error Display */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{formError}</p>
            </div>
          )}

          {/* First Name */}
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
              First Name *
            </label>
            <Input
              id="firstName"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              onBlur={() => handleBlur('firstName')}
              error={!!errors.firstName && touched.firstName}
              disabled={isLoading}
            />
            {errors.firstName && touched.firstName && (
              <p className="text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
              Last Name *
            </label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              onBlur={() => handleBlur('lastName')}
              error={!!errors.lastName && touched.lastName}
              disabled={isLoading}
            />
            {errors.lastName && touched.lastName && (
              <p className="text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email *
            </label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              error={!!errors.email && touched.email}
              disabled={isLoading}
            />
            {errors.email && touched.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              error={!!errors.phone && touched.phone}
              disabled={isLoading}
            />
            {errors.phone && touched.phone && (
              <p className="text-sm text-red-600">{errors.phone}</p>
            )}
            <p className="text-xs text-gray-500">
              Optional. Include country code for international numbers.
            </p>
          </div>

          {/* Organization ID (hidden, auto-set) */}
          <input type="hidden" value={formData.organizationId || ''} />
        </CardContent>

        <CardFooter className="flex justify-end space-x-3 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !isValid}
            loading={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              submitText
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

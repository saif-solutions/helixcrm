// Location: apps/web/src/pages/RegisterPage.tsx
// Changes: Removed unused 'password' variable

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/atoms/Button';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from '../components/feedback/ToastProvider';
import { SessionExpiredModal } from '../components/auth/SessionExpiredModal';
import { registerSchema, RegisterFormData } from '../lib/validation/auth.schema';
import { mapBackendErrorToMessage, getFieldError } from '../lib/utils/auth-error-mapper';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, sessionExpired, clearSessionExpired } = useAuthStore();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isFormSubmitting },
    setError,
    setFocus,
    clearErrors,
    // watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      organizationName: '',
    },
    mode: 'onBlur',
  });

  // Watch password for confirmation validation (Zod handles this, but we keep watch for UI feedback)
  // const password = watch('password');

  // Focus first invalid field on submit
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstError = Object.keys(errors)[0] as keyof RegisterFormData;
      setFocus(firstError);
    }
  }, [errors, setFocus]);

  // Handle session expiration modal
  const handleCloseSessionModal = () => {
    clearSessionExpired();
    navigate('/login', { replace: true });
  };

  const onSubmit = async (data: RegisterFormData) => {
    setBackendError(null);
    clearErrors();
    setIsSubmitting(true);

    try {
      await registerUser(data);
      showSuccessToast('Registration Successful', 'Welcome to HelixCRM! Your account has been created.');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Map backend error to user-friendly message
      const mappedError = mapBackendErrorToMessage(error);
      setBackendError(mappedError.message);
      
      // Set field-specific errors
      const fieldErrors = [
        'email', 'password', 'firstName', 'lastName', 'organizationName'
      ] as const;
      
      fieldErrors.forEach(field => {
        const fieldError = getFieldError(error, field);
        if (fieldError) {
          setError(field, { type: 'manual', message: fieldError });
        }
      });
      
      // Show toast for general errors
      const hasFieldErrors = fieldErrors.some(field => errors[field]);
      if (!hasFieldErrors) {
        showErrorToast('Registration Failed', mappedError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">H</span>
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Navigate to login page"
              >
                Sign in here
              </Link>
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            {backendError && (
              <div 
                className="rounded-md bg-red-50 p-4"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{backendError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                      aria-invalid={errors.firstName ? 'true' : 'false'}
                      className={`block w-full px-3 py-2 border ${
                        errors.firstName ? 'border-red-300 text-red-900 placeholder-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                      disabled={isSubmitting || isLoading}
                      {...register('firstName')}
                    />
                    {errors.firstName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.firstName && (
                    <p id="firstName-error" className="mt-2 text-sm text-red-600" role="alert">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                      aria-invalid={errors.lastName ? 'true' : 'false'}
                      className={`block w-full px-3 py-2 border ${
                        errors.lastName ? 'border-red-300 text-red-900 placeholder-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                      disabled={isSubmitting || isLoading}
                      {...register('lastName')}
                    />
                    {errors.lastName && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.lastName && (
                    <p id="lastName-error" className="mt-2 text-sm text-red-600" role="alert">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Organization */}
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                  Organization Name *
                </label>
                <div className="mt-1 relative">
                  <input
                    id="organizationName"
                    type="text"
                    autoComplete="organization"
                    aria-describedby={errors.organizationName ? 'organizationName-error' : undefined}
                    aria-invalid={errors.organizationName ? 'true' : 'false'}
                    className={`block w-full px-3 py-2 border ${
                      errors.organizationName ? 'border-red-300 text-red-900 placeholder-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isSubmitting || isLoading}
                    {...register('organizationName')}
                  />
                  {errors.organizationName && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {errors.organizationName && (
                  <p id="organizationName-error" className="mt-2 text-sm text-red-600" role="alert">
                    {errors.organizationName.message}
                  </p>
                )}
              </div>
              
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    aria-invalid={errors.email ? 'true' : 'false'}
                    className={`block w-full px-3 py-2 border ${
                      errors.email ? 'border-red-300 text-red-900 placeholder-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isSubmitting || isLoading}
                    {...register('email')}
                  />
                  {errors.email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {errors.email && (
                  <p id="email-error" className="mt-2 text-sm text-red-600" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>
              
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    aria-describedby={errors.password ? 'password-error' : 'password-hint'}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    className={`block w-full px-3 py-2 border ${
                      errors.password ? 'border-red-300 text-red-900 placeholder-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isSubmitting || isLoading}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md"
                    disabled={isSubmitting || isLoading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-controls="password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <p id="password-error" className="mt-2 text-sm text-red-600" role="alert">
                    {errors.password.message}
                  </p>
                ) : (
                  <p id="password-hint" className="mt-1 text-xs text-gray-500">
                    Must be at least 8 characters with 1 letter and 1 number
                  </p>
                )}
              </div>
              
              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                    className={`block w-full px-3 py-2 border ${
                      errors.confirmPassword ? 'border-red-300 text-red-900 placeholder-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isSubmitting || isLoading}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md"
                    disabled={isSubmitting || isLoading}
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                    aria-controls="confirmPassword"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id="confirm-password-error" className="mt-2 text-sm text-red-600" role="alert">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center"
                disabled={isSubmitting || isLoading || isFormSubmitting}
                loading={isSubmitting || isLoading}
                aria-label="Create account"
              >
                {isSubmitting || isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>
                By creating an account, you agree to our{' '}
                <a 
                  href="#" 
                  className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label="Read our Terms of Service"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a 
                  href="#" 
                  className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label="Read our Privacy Policy"
                >
                  Privacy Policy
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
      
      {/* Session Expired Modal */}
      <SessionExpiredModal
        isOpen={sessionExpired}
        onClose={handleCloseSessionModal}
      />
    </>
  );
};

export default RegisterPage;
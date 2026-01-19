// Location: apps/web/src/pages/LoginPage.tsx
// Changes: Fixed toast import and removed unused variable

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/atoms/Button';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from '../components/feedback/ToastProvider';
import { SessionExpiredModal } from '../components/auth/SessionExpiredModal';
import { loginSchema, LoginFormData } from '../lib/validation/auth.schema';
import { mapBackendErrorToMessage, getFieldError } from '../lib/utils/auth-error-mapper';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, sessionExpired, clearSessionExpired } = useAuthStore();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isFormSubmitting },
    setError,
    setFocus,
    clearErrors,
    reset
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    mode: 'onBlur',
  });

  // Focus first invalid field on submit
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstError = Object.keys(errors)[0] as keyof LoginFormData;
      setFocus(firstError);
    }
  }, [errors, setFocus]);

  // Handle session expiration modal
  const handleCloseSessionModal = () => {
    clearSessionExpired();
    navigate('/login', { replace: true });
  };

  const onSubmit = async (data: LoginFormData) => {
    setBackendError(null);
    clearErrors();
    setIsSubmitting(true);

    try {
      await login(data);
      showSuccessToast('Login successful!', 'Welcome back to HelixCRM');
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Map backend error to user-friendly message
      const mappedError = mapBackendErrorToMessage(error);
      setBackendError(mappedError.message);
      
      // Set field-specific errors
      const fieldError = getFieldError(error, 'email');
      if (fieldError) {
        setError('email', { type: 'manual', message: fieldError });
      }
      
      const passwordError = getFieldError(error, 'password');
      if (passwordError) {
        setError('password', { type: 'manual', message: passwordError });
      }
      
      // Show toast for general errors
      if (!fieldError && !passwordError) {
        showErrorToast('Login Failed', mappedError.message);
      }
      
      // Preserve email field value by not resetting the form
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoCredentials = (email: string, password: string) => {
    reset({ email, password, rememberMe: false });
    setBackendError(null);
    clearErrors();
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <button
                onClick={() => navigate('/register')}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Navigate to registration page"
              >
                request a demo
              </button>
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
              {/* Email Field */}
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
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
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
              
              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    className={`block w-full px-3 py-2 border ${
                      errors.password ? 'border-red-300 text-red-900 placeholder-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isSubmitting || isLoading}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
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
                {errors.password && (
                  <p id="password-error" className="mt-2 text-sm text-red-600" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>
              
              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || isLoading}
                    {...register('rememberMe')}
                  />
                  <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>
                
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || isLoading}
                    aria-label="Navigate to forgot password page"
                  >
                    Forgot your password?
                  </button>
                </div>
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
                aria-label="Sign in to your account"
              >
                {isSubmitting || isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>
          
          {/* Demo Credentials */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Demo credentials:{' '}
              <button
                onClick={() => handleDemoCredentials('admin@helixcrm.test', 'Admin123!')}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={isSubmitting || isLoading}
                aria-label="Use admin demo credentials"
              >
                Admin
              </button>{' '}
              |{' '}
              <button
                onClick={() => handleDemoCredentials('user@helixcrm.test', 'User123!')}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={isSubmitting || isLoading}
                aria-label="Use user demo credentials"
              >
                User
              </button>
            </p>
          </div>
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

export default LoginPage;
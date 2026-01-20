import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from '../components/feedback/ToastProvider';
import { SessionExpiredModal } from '../components/auth/SessionExpiredModal';
import { loginSchema, LoginFormData } from '../lib/schemas/auth.schema';
import { mapBackendErrorToFormErrors } from '../lib/utils/auth-error-mapper';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, sessionExpired, clearSessionExpired, authError } = useAuthStore();
  const { error: showErrorToast } = useToast();
  
  const [showPassword, setShowPassword] = React.useState(false);
  const [backendFieldErrors, setBackendFieldErrors] = React.useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setFocus,
    clearErrors,
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    mode: 'onBlur',
  });

  // Focus first invalid field
  useEffect(() => {
    const firstError = Object.keys(errors)[0] as keyof LoginFormData;
    if (firstError) {
      setFocus(firstError);
    }
  }, [errors, setFocus]);

  // Handle backend field errors
  useEffect(() => {
    Object.entries(backendFieldErrors).forEach(([field, message]) => {
      setError(field as keyof LoginFormData, {
        type: 'manual',
        message,
      });
    });
  }, [backendFieldErrors, setError]);

  const handleCloseSessionModal = () => {
    clearSessionExpired();
    navigate('/login', { replace: true });
  };

  const onSubmit = async (data: LoginFormData) => {
    clearErrors();
    setBackendFieldErrors({});
    
    try {
      await login(data);
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      const formErrors = mapBackendErrorToFormErrors(error);
      
      // Set field errors
      if (formErrors.fieldErrors) {
        setBackendFieldErrors(formErrors.fieldErrors);
      }
      
      // Show toast for non-field errors
      if (formErrors.formError && !formErrors.fieldErrors) {
        showErrorToast('Login Failed', formErrors.formError);
      }
    }
  };

  const handleDemoCredentials = (email: string, password: string) => {
    reset({ email, password, rememberMe: false });
    clearErrors();
    setBackendFieldErrors({});
  };

  const isSubmittingForm = isSubmitting || isLoading;

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h1>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <button
                onClick={() => navigate('/register')}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2"
                aria-label="Navigate to registration page"
              >
                request a demo
              </button>
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Global Error Banner */}
            {authError && (
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
                    <p className="text-sm font-medium text-red-800">{authError}</p>
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
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    disabled={isSubmittingForm}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    aria-invalid={errors.email ? 'true' : 'false'}
                    {...register('email')}
                  />
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
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isSubmittingForm}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isSubmittingForm}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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
              
              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSubmittingForm}
                  {...register('rememberMe')}
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmittingForm}
                disabled={isSubmittingForm}
                aria-label="Sign in to your account"
              >
                Sign in
              </Button>
              
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                  disabled={isSubmittingForm}
                >
                  Forgot your password?
                </button>
              </div>
            </div>
          </form>
          
          {/* Demo Credentials */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Demo credentials:{' '}
              <button
                onClick={() => handleDemoCredentials('admin@helixcrm.test', 'Admin123!')}
                className="font-medium text-blue-600 hover:text-blue-500"
                disabled={isSubmittingForm}
              >
                Admin
              </button>{' '}
              |{' '}
              <button
                onClick={() => handleDemoCredentials('user@helixcrm.test', 'User123!')}
                className="font-medium text-blue-600 hover:text-blue-500"
                disabled={isSubmittingForm}
              >
                User
              </button>
            </p>
          </div>
        </div>
      </div>
      
      <SessionExpiredModal
        isOpen={sessionExpired}
        onClose={handleCloseSessionModal}
      />
    </>
  );
};

export default LoginPage;
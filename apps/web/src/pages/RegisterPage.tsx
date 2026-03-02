import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { useAuthStore } from '../stores/auth.store';
import { useToast } from '../components/feedback/ToastProvider';
import { SessionExpiredModal } from '../components/auth/SessionExpiredModal';
import { registerSchema, RegisterFormData } from '../lib/schemas/auth.schema';
import { mapBackendErrorToFormErrors } from '../lib/utils/auth-error-mapper';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    register: registerUser,
    isLoading,
    sessionExpired,
    clearSessionExpired,
    authError,
  } = useAuthStore();
  const { error: showErrorToast } = useToast();

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [backendFieldErrors, setBackendFieldErrors] = React.useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setFocus,
    clearErrors,
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

  // Focus first invalid field
  useEffect(() => {
    const firstError = Object.keys(errors)[0] as keyof RegisterFormData;
    if (firstError) {
      setFocus(firstError);
    }
  }, [errors, setFocus]);

  // Handle backend field errors
  useEffect(() => {
    Object.entries(backendFieldErrors).forEach(([field, message]) => {
      setError(field as keyof RegisterFormData, {
        type: 'manual',
        message,
      });
    });
  }, [backendFieldErrors, setError]);

  const handleCloseSessionModal = () => {
    clearSessionExpired();
    navigate('/login', { replace: true });
  };

  const onSubmit = async (data: RegisterFormData) => {
    clearErrors();
    setBackendFieldErrors({});

    try {
      await registerUser(data);
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      const formErrors = mapBackendErrorToFormErrors(error);

      // Set field errors
      if (formErrors.fieldErrors) {
        setBackendFieldErrors(formErrors.fieldErrors);
      }

      // Show toast for non-field errors
      if (formErrors.formError && !formErrors.fieldErrors) {
        showErrorToast('Registration Failed', formErrors.formError);
      }
    }
  };

  const isSubmittingForm = isSubmitting || isLoading;

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
            <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Create your account
            </h1>
            <p className="mt-2 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
                aria-label="Navigate to login page"
              >
                Sign in here
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Global Error Banner */}
            {authError && (
              <div className="rounded-md bg-red-50 p-4" role="alert" aria-live="assertive">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{authError}</p>
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
                  <Input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    disabled={isSubmittingForm}
                    aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                    aria-invalid={errors.firstName ? 'true' : 'false'}
                    {...register('firstName')}
                  />
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
                  <Input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    disabled={isSubmittingForm}
                    aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                    aria-invalid={errors.lastName ? 'true' : 'false'}
                    {...register('lastName')}
                  />
                  {errors.lastName && (
                    <p id="lastName-error" className="mt-2 text-sm text-red-600" role="alert">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Organization */}
              <div>
                <label
                  htmlFor="organizationName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Organization Name *
                </label>
                <Input
                  id="organizationName"
                  type="text"
                  autoComplete="organization"
                  disabled={isSubmittingForm}
                  aria-describedby={errors.organizationName ? 'organizationName-error' : undefined}
                  aria-invalid={errors.organizationName ? 'true' : 'false'}
                  {...register('organizationName')}
                />
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
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={isSubmittingForm}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  {...register('email')}
                />
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
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isSubmittingForm}
                    aria-describedby={errors.password ? 'password-error' : 'password-hint'}
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
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm Password *
                </label>
                <div className="mt-1 relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isSubmittingForm}
                    aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isSubmittingForm}
                    aria-label={
                      showConfirmPassword
                        ? 'Hide password confirmation'
                        : 'Show password confirmation'
                    }
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
                fullWidth
                loading={isSubmittingForm}
                disabled={isSubmittingForm}
                aria-label="Create account"
              >
                Create Account
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              <p>
                By creating an account, you agree to our{' '}
                <a
                  href="#"
                  className="font-medium text-primary-600 hover:text-primary-500"
                  aria-label="Read our Terms of Service"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="#"
                  className="font-medium text-primary-600 hover:text-primary-500"
                  aria-label="Read our Privacy Policy"
                >
                  Privacy Policy
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>

      <SessionExpiredModal isOpen={sessionExpired} onClose={handleCloseSessionModal} />
    </>
  );
};

export default RegisterPage;

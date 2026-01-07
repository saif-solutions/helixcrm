import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useToast } from '../components/feedback/ToastProvider';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { ErrorDisplay } from '../components/feedback/ErrorDisplay';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { success: showSuccess, error: showError } = useToast();
  const navigate = useNavigate();

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError('No reset token provided');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/password-reset/validate-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        
        if (data.valid) {
          setIsTokenValid(true);
        } else {
          setTokenError('Invalid or expired reset token');
        }
      } catch (err) {
        setTokenError('Failed to validate token. Please try again.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }
    
    setIsLoading(true);
    setFormError(null);
    
    try {
      const response = await fetch(`${API_URL}/auth/password-reset/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: password,
          confirmPassword,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }
      
      setSuccess(true);
      showSuccess('Password reset', 'Your password has been reset successfully');
      
      // Clear form
      setPassword('');
      setConfirmPassword('');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setFormError(message);
      showError('Reset failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToForgotPassword = () => {
    navigate('/forgot-password');
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-neutral-600">Validating reset token...</p>
        </div>
      </div>
    );
  }

  if (!isTokenValid || tokenError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-neutral-900">Invalid Reset Link</h1>
          
          <ErrorDisplay
            title="Unable to reset password"
            message={tokenError || 'This password reset link is invalid or has expired.'}
            className="mt-4"
          />
          
          <div className="mt-8 space-y-4">
            <button
              onClick={handleBackToForgotPassword}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Request New Reset Link
            </button>
            
            <Link
              to="/login"
              className="inline-block w-full text-center text-primary-600 hover:text-primary-700 font-medium py-2"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-neutral-900">Password Reset Successful!</h1>
          
          <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-lg">
            <p className="text-success-700">
              Your password has been updated successfully.
            </p>
            <p className="text-success-600 text-sm mt-2">
              You will be redirected to the login page shortly...
            </p>
          </div>
          
          <div className="mt-8">
            <LoadingSpinner size="sm" />
            <p className="mt-2 text-neutral-600 text-sm">Redirecting to login</p>
          </div>
          
          <div className="mt-6">
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Go to login now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl font-bold">H</span>
            </div>
          </Link>
          
          <h1 className="text-2xl font-bold text-neutral-900">Reset Your Password</h1>
          <p className="text-neutral-600 mt-2">
            Create a new password for your account
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <ErrorDisplay
              message={formError}
              onRetry={() => setFormError(null)}
              retryLabel="Try again"
            />
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                disabled={isLoading}
                required
              />
              <div className="mt-2">
                <PasswordStrengthIndicator password={password} />
              </div>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                disabled={isLoading}
                required
              />
            </div>
          </div>
          
          <PasswordRequirements />
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" color="white" className="mr-2" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={handleBackToForgotPassword}
              className="text-primary-600 hover:text-primary-700 font-medium"
              disabled={isLoading}
            >
              ← Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper component: Password strength indicator
function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;
  
  const requirements = [
    { test: /.{8,}/, label: 'At least 8 characters' },
    { test: /[a-z]/, label: 'Lowercase letter' },
    { test: /[A-Z]/, label: 'Uppercase letter' },
    { test: /\d/, label: 'Number' },
    { test: /[@$!%*?&]/, label: 'Special character' },
  ];
  
  const metCount = requirements.filter(req => req.test.test(password)).length;
  const strength = metCount / requirements.length;
  
  let strengthColor = 'bg-error-500';
  let strengthText = 'Weak';
  
  if (strength >= 0.6) {
    strengthColor = 'bg-warning-500';
    strengthText = 'Fair';
  }
  
  if (strength >= 0.8) {
    strengthColor = 'bg-success-500';
    strengthText = 'Strong';
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-600">Password strength:</span>
        <span className="text-xs font-medium text-neutral-700">{strengthText}</span>
      </div>
      <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${strengthColor} transition-all duration-300`}
          style={{ width: `${strength * 100}%` }}
        />
      </div>
    </div>
  );
}

// Helper component: Password requirements
function PasswordRequirements() {
  return (
    <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
      <h3 className="text-sm font-medium text-neutral-700 mb-2">Password Requirements</h3>
      <ul className="text-xs text-neutral-600 space-y-1">
        <li className="flex items-center">
          <svg className="w-4 h-4 text-success-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Minimum 8 characters
        </li>
        <li className="flex items-center">
          <svg className="w-4 h-4 text-success-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          At least one uppercase letter
        </li>
        <li className="flex items-center">
          <svg className="w-4 h-4 text-success-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          At least one lowercase letter
        </li>
        <li className="flex items-center">
          <svg className="w-4 h-4 text-success-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          At least one number
        </li>
        <li className="flex items-center">
          <svg className="w-4 h-4 text-success-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          At least one special character (@$!%*?&)
        </li>
      </ul>
    </div>
  );
}
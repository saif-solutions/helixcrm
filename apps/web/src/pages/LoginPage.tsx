import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../components/feedback/ToastProvider';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { ErrorDisplay } from '../components/feedback/ErrorDisplay';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UserData {
  id: string;
  email: string;
  organizationId: string;
  // Optional fields that might not be in the response
  name?: string;
  role?: string;
  tokenVersion?: number;
}

interface LoginResponse {
  access_token: string;
  user: UserData;
}

interface LoginError {
  statusCode: number;
  message: string;
  error?: string;
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('user_a@test.com');
  const [password, setPassword] = useState('TestPass123!');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  
  const { success, error: showError, warning, info } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for session expiry message
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('session') === 'expired') {
      setShowSessionExpired(true);
      warning('Session expired', 'Please log in again to continue');
    }
    
    if (params.get('logout') === 'true') {
      success('Logged out', 'You have been successfully logged out');
    }
  }, [location, warning, success]);

  // Check for redirect from other pages
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          rememberMe 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorData = data as LoginError;
        
        // Handle specific error cases
        if (errorData.message?.includes('locked')) {
          throw new Error('Account is temporarily locked. Please try again in 15 minutes or contact support.');
        }
        
        if (errorData.message?.includes('invalid')) {
          throw new Error('Invalid email or password. Please try again.');
        }
        
        throw new Error(errorData.message || 'Login failed');
      }
      
      const successData = data as LoginResponse;
      
      // Store token and user data
      localStorage.setItem('helix_token', successData.access_token);
      localStorage.setItem('helix_user', JSON.stringify(successData.user));
      
      // Extract token version from JWT payload (simplified for MVP)
      // In production, you would decode the JWT to get tokenVersion
      const tokenVersion = successData.user.tokenVersion || 1;
      localStorage.setItem('token_version', tokenVersion.toString());
      
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Clear any existing session expiry warning
      setShowSessionExpired(false);
      
      const userName = successData.user.name || successData.user.email.split('@')[0];
      success('Login successful', `Welcome back, ${userName}!`);
      
      // Redirect to dashboard or previous page
      navigate(from, { replace: true });
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      showError('Login failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoUser: 'user_a' | 'user_b' | 'admin') => {
    setIsLoading(true);
    setError(null);
    
    const demoCredentials = {
      user_a: { 
        email: 'user_a@test.com', 
        password: 'TestPass123!',
        name: 'User A'
      },
      user_b: { 
        email: 'user_b@test.com', 
        password: 'TestPass123!',
        name: 'User B'
      },
      admin: { 
        email: 'admin@test.com', 
        password: 'TestPass123!',
        name: 'Admin User'
      }
    };
    
    const { email: demoEmail, password: demoPassword, name } = demoCredentials[demoUser];
    setEmail(demoEmail);
    setPassword(demoPassword);
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: demoEmail, password: demoPassword }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorData = data as LoginError;
        throw new Error(errorData.message || 'Demo login failed');
      }
      
      const successData = data as LoginResponse;
      
      // Store token and user data
      localStorage.setItem('helix_token', successData.access_token);
      localStorage.setItem('helix_user', JSON.stringify(successData.user));
      
      // Extract token version from JWT payload
      const tokenVersion = successData.user.tokenVersion || 1;
      localStorage.setItem('token_version', tokenVersion.toString());
      
      success('Demo login successful', `Logged in as ${name}`);
      navigate('/dashboard');
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Demo login failed';
      setError(message);
      showError('Demo login failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">H</span>
            </div>
          </Link>
          
          <h1 className="text-2xl font-bold text-neutral-900">Welcome Back</h1>
          <p className="text-neutral-600 mt-2">
            Sign in to your HelixCRM account
          </p>
        </div>
        
        {/* Session Expired Warning */}
        {showSessionExpired && (
          <div className="mb-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-warning-800">Session Expired</h3>
                <div className="mt-1 text-sm text-warning-700">
                  <p>Your previous session has expired. Please log in again.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Demo Login Buttons (for testing) */}
        <div className="mb-6">
          <p className="text-sm text-neutral-600 mb-3 text-center">Quick test logins:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('user_a')}
              disabled={isLoading}
              className="px-3 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span className="truncate">User A</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('user_b')}
              disabled={isLoading}
              className="px-3 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span className="truncate">User B</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              disabled={isLoading}
              className="px-3 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <span className="truncate">Admin</span>
            </button>
          </div>
        </div>
        
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-neutral-500">Or sign in manually</span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <ErrorDisplay
              title="Login failed"
              message={error}
              onRetry={() => setError(null)}
              retryLabel="Try again"
            />
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-50"
              disabled={isLoading}
              required
              autoComplete="email"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-50"
              disabled={isLoading}
              required
              autoComplete="current-password"
            />
          </div>
          
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded disabled:opacity-50"
              disabled={isLoading}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700">
              Remember me on this device
            </label>
          </div>
          
          <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
            <p className="font-medium mb-1">Security Note:</p>
            <ul className="space-y-1">
              <li className="flex items-start">
                <svg className="w-3 h-3 text-neutral-400 mt-0.5 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Session expires after 15 minutes of inactivity</span>
              </li>
              <li className="flex items-start">
                <svg className="w-3 h-3 text-neutral-400 mt-0.5 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Account locks after 5 failed login attempts</span>
              </li>
            </ul>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" color="white" className="mr-2" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-neutral-200">
          <p className="text-neutral-600 text-sm text-center">
            Don't have an account?{' '}
            <button
              onClick={() => info('Account creation', 'Please contact your system administrator for account creation.')}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Contact your administrator
            </button>
          </p>
        </div>
        
        <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <p className="text-xs text-neutral-500 text-center">
            By signing in, you agree to our{' '}
            <button
              onClick={() => info('Terms of Service', 'Terms will be available after pilot phase.')}
              className="text-primary-600 hover:text-primary-700"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              onClick={() => info('Privacy Policy', 'Privacy policy will be available after pilot phase.')}
              className="text-primary-600 hover:text-primary-700"
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
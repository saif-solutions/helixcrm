import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Configure axios to send credentials (cookies)
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:3001/api/v1';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  csrfToken: string | null;
  refreshCsrfToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// CSRF token management
let currentCsrfToken: string | null = null;

// Axios interceptor to add CSRF token to requests
axios.interceptors.request.use(
  (config) => {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(config.method?.toUpperCase() || '')) {
      return config;
    }

    // Skip CSRF for auth endpoints (they're exempt in backend)
    const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
    const isAuthEndpoint = authEndpoints.some(endpoint => 
      config.url?.includes(endpoint)
    );

    if (isAuthEndpoint) {
      return config;
    }

    // Add CSRF token to other requests
    if (currentCsrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = currentCsrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Axios interceptor to handle 403 CSRF errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If CSRF token error (403), refresh token and retry
    if (error.response?.status === 403 && 
        error.response?.data?.message?.includes('CSRF') &&
        !originalRequest._retry) {
      
      originalRequest._retry = true;
      
      try {
        // Refresh CSRF token
        await refreshCsrfToken();
        
        // Update the request with new CSRF token
        if (currentCsrfToken) {
          originalRequest.headers['X-CSRF-Token'] = currentCsrfToken;
        }
        
        // Retry the request
        return axios(originalRequest);
      } catch (csrfError) {
        // If CSRF refresh fails, logout user
        console.error('CSRF token refresh failed:', csrfError);
        window.location.href = '/login';
        return Promise.reject(csrfError);
      }
    }

    // If unauthorized (401), try to refresh access token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the access token
        await axios.post('/auth/refresh');
        
        // Retry the original request
        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        console.error('Token refresh failed:', refreshError);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Function to fetch CSRF token
async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await axios.get('/auth/csrf-token');
    return response.data.csrfToken || null;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
}

// Function to refresh CSRF token
async function refreshCsrfToken(): Promise<string | null> {
  const token = await fetchCsrfToken();
  currentCsrfToken = token;
  return token;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const navigate = useNavigate();

  // Initialize - check if user is already logged in (cookies handle this)
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        // First, get CSRF token
        const token = await refreshCsrfToken();
        setCsrfToken(token);
        
        // Try to get current user (will fail if not authenticated)
        const response = await axios.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        // Not logged in or token expired
        console.log('Not authenticated:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe?: boolean) => {
    setIsLoading(true);
    try {
      // First get fresh CSRF token
      await refreshCsrfToken();
      
      // Login request (CSRF not required for auth endpoints)
      const response = await axios.post('/auth/login', {
        email,
        password,
        rememberMe,
      });

      // Cookies are automatically set by backend (httpOnly)
      // Token is also in response for backward compatibility
      setUser(response.data.user);
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API result
      setUser(null);
      setCsrfToken(null);
      currentCsrfToken = null;
      navigate('/login');
    }
  };

  const refreshCsrfTokenWrapper = async () => {
    const token = await refreshCsrfToken();
    setCsrfToken(token);
    return token;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        csrfToken,
        refreshCsrfToken: refreshCsrfTokenWrapper,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Create properly configured axios instance
const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  withCredentials: true,
  timeout: 10000,
});

// Debug logging
api.interceptors.request.use(
  (config) => {
    console.log(`‚û°Ô∏è ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('‚ùå Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`‚¨ÖÔ∏è ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('‚ùå Response error:', error.message);
    return Promise.reject(error);
  }
);

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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Ì¥ç Checking authentication status...');
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        console.log('‚úÖ User authenticated:', response.data.user.email);
      } catch (error: any) {
        console.log('‚ö†Ô∏è Not authenticated:', error.message);
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
      console.log('Ì¥ê Attempting login for:', email);
      const response = await api.post('/auth/login', {
        email,
        password,
        rememberMe,
      });

      console.log('‚úÖ Login successful:', response.data.user.email);
      setUser(response.data.user);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('‚ùå Login failed:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Ì∫™ Logging out...');
      await api.post('/auth/logout');
    } catch (error) {
      console.error('‚ö†Ô∏è Logout error:', error);
    } finally {
      setUser(null);
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

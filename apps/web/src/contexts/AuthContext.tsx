import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore, User } from '../stores/auth.store';
import { useToast } from '../components/feedback/ToastProvider';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string, organizationName: string) => Promise<void>;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    isLoading,
    isAuthenticated,
    sessionExpired,
    initialize,
    login,
    logout,
    register,
    clearSessionExpired,
    setSessionExpired,
  } = useAuthStore();
  
  const { success, error } = useToast();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show session expired toast when session expires
  useEffect(() => {
    if (sessionExpired) {
error(
  'Session Expired',
  'Your session has expired. Please log in again to continue.'
);
clearSessionExpired();
    }
  }, [sessionExpired, error, clearSessionExpired]);

  const handleLogin = async (email: string, password: string) => {
    try {
      await login({ email, password, rememberMe: false });
      success('Login successful', 'Welcome back!');
    } catch (err: any) {
      const message = err.message || 'Login failed';
      error('Login failed', message);
      throw err;
    }
  };

  const handleRegister = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    organizationName: string
  ) => {
    try {
      await register({ 
        email, 
        password, 
        confirmPassword: password,
        firstName,
        lastName,
        organizationName,
      });
      success('Registration successful', 'Welcome to HelixCRM!');
    } catch (err: any) {
      const message = err.message || 'Registration failed';
      error('Registration failed', message);
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      success('Logged out', 'You have been successfully logged out');
    } catch (err) {
      console.error('Logout error:', err);
      // Still show success since local state is cleared
      success('Logged out', 'You have been logged out');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    sessionExpired,
    login: handleLogin,
    logout: handleLogout,
    register: handleRegister,
    clearSessionExpired,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

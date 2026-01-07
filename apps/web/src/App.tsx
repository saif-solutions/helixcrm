import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { ToastProvider } from './components/feedback/ToastProvider';
import { AuthProvider } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import { ContactsPage } from './pages/ContactsPage';
import './styles/globals.css';

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Debug: Check what tokens exist
  const localStorageToken = localStorage.getItem('helix_token');
  const sessionStorageToken = sessionStorage.getItem('helix_token');
  const token = localStorageToken || sessionStorageToken;
  
  console.log('Ì¥ê ProtectedRoute check:', {
    hasLocalStorageToken: !!localStorageToken,
    hasSessionStorageToken: !!sessionStorageToken,
    hasToken: !!token,
    tokenLength: token?.length
  });
  
  // TEMPORARY: For development, allow access without token to test pages
  const isDevelopment = import.meta.env.MODE === 'development';
  if (!token && isDevelopment) {
    console.warn('‚ö†Ô∏è Development mode: Allowing access without token for testing');
    return <>{children}</>;
  }
  
  if (!token) {
    console.log('‚ùå No token found, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('‚úÖ Token found, allowing access');
  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App error:', error, errorInfo);
      }}
    >
      <ToastProvider>
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              
              <Route path="/contacts" element={
                <ProtectedRoute>
                  <ContactsPage />
                </ProtectedRoute>
              } />
              
              {/* Redirect root to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

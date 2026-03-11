import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { SessionExpiredModal } from './components/auth/SessionExpiredModal';
import { ToastProvider } from './components/feedback/ToastProvider';
import { QueryProvider } from './providers/QueryProvider';
import { Layout } from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import { ContactsPage } from './pages/ContactsPage';
import LeadsPage from './pages/LeadsPage';
import DealsPage from './pages/DealsPage';
import NewLeadPage from './pages/leads/NewLeadPage';
import EditLeadPage from './pages/leads/EditLeadPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { initializeApi } from './services/api';
import { PermissionDebug } from './components/dev/PermissionDebug';
import { performanceMonitor } from './lib/performance/performance-monitor';

console.log(`🚀 App Configuration:
  - Environment: ${import.meta.env.MODE}
  - API URL: ${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}
`);

function App() {
  const { initialize, sessionExpired, clearSessionExpired } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize performance monitoring
        performanceMonitor.initialize();

        // Initialize API (CSRF token)
        await initializeApi();

        // Initialize auth (check session)
        await initialize();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Don't block the UI - show login page with error
      } finally {
        setIsInitialized(true);
      }
    };

    initApp();
  }, [initialize]);

  const handleCloseSessionModal = () => {
    clearSessionExpired();
  };

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Initializing HelixCRM...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryProvider>
      <ToastProvider>
        <Router>
          <div className="App">
            <ErrorBoundary>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected routes */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="contacts" element={<ContactsPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="leads/new" element={<NewLeadPage />} />
                  <Route path="leads/:id/edit" element={<EditLeadPage />} />
                  <Route path="deals" element={<DealsPage />} />
                </Route>
              </Routes>
            </ErrorBoundary>

            {/* Global Session Expired Modal */}
            <SessionExpiredModal isOpen={sessionExpired} onClose={handleCloseSessionModal} />

            {/* Permission Debug Tool (only shows in development) */}
            <PermissionDebug />
          </div>
        </Router>
      </ToastProvider>
    </QueryProvider>
  );
}

export default App;

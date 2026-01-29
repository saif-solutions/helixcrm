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

// Development mode configuration
const IS_DEV = import.meta.env.DEV;

console.log(`🚀 App Configuration:
  - Environment: ${import.meta.env.MODE}
  - Development Mode: ${IS_DEV}
`);

function App() {
  const { initialize, sessionExpired, clearSessionExpired, isAuthenticated } = useAuthStore();
  const [apiInitialized, setApiInitialized] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize API
        await initializeApi();
        setApiInitialized(true);
        
        // Initialize auth store (won't fail if backend is offline)
        await initialize();
      } catch (error) {
        console.warn('⚠️ App initialization warning:', error);
        
        // In development, continue even if API fails
        if (IS_DEV) {
          setApiInitialized(true);
          setOfflineMode(true);
          console.log('🔧 Running in offline development mode');
        }
      }
    };

    initApp();
  }, [initialize]);

  const handleCloseSessionModal = () => {
    clearSessionExpired();
  };

  // Show loading state while initializing
  if (!apiInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Initializing HelixCRM...</p>
          {IS_DEV && (
            <p className="mt-2 text-sm text-neutral-500">
              Waiting for backend connection on {import.meta.env.VITE_API_URL}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Development mode warning banner
  const DevBanner = () => {
    if (!IS_DEV) return null;
    
    return (
      <div className="bg-warning-100 border-b border-warning-300 text-warning-800 px-4 py-2 text-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-semibold">🔧 Development Mode</span>
            {offlineMode && <span className="ml-2">(Offline - Backend not connected)</span>}
          </div>
          <div>
            Backend: {offlineMode ? '❌ Offline' : '✅ Connected'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <QueryProvider>
      <ToastProvider>
        <Router>
          <div className="App">
            <DevBanner />
            
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
          </div>
        </Router>
      </ToastProvider>
    </QueryProvider>
  );
}

export default App;
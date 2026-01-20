import { useEffect } from 'react';
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
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  const { initialize, sessionExpired, clearSessionExpired } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleCloseSessionModal = () => {
    clearSessionExpired();
  };

  return (
    <QueryProvider>
      <ToastProvider>
        <Router>
          <div className="App">
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
              </Route>
            </Routes>

            {/* Global Session Expired Modal */}
            <SessionExpiredModal
              isOpen={sessionExpired}
              onClose={handleCloseSessionModal}
            />
          </div>
        </Router>
      </ToastProvider>
    </QueryProvider>
  );
}

export default App;
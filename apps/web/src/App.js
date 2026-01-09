import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const ProtectedRoute = ({ children }) => {
    // Debug: Check what tokens exist
    const localStorageToken = localStorage.getItem('helix_token');
    const sessionStorageToken = sessionStorage.getItem('helix_token');
    const token = localStorageToken || sessionStorageToken;
    console.log('��� ProtectedRoute check:', {
        hasLocalStorageToken: !!localStorageToken,
        hasSessionStorageToken: !!sessionStorageToken,
        hasToken: !!token,
        tokenLength: token?.length
    });
    // TEMPORARY: For development, allow access without token to test pages
    const isDevelopment = import.meta.env.MODE === 'development';
    if (!token && isDevelopment) {
        console.warn('⚠️ Development mode: Allowing access without token for testing');
        return _jsx(_Fragment, { children: children });
    }
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    console.log('✅ Token found, allowing access');
    return _jsx(_Fragment, { children: children });
};
function App() {
    return (_jsx(ErrorBoundary, { onError: (error, errorInfo) => {
            console.error('App error:', error, errorInfo);
        }, children: _jsx(ToastProvider, { children: _jsx(Router, { children: _jsx(AuthProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/forgot-password", element: _jsx(ForgotPasswordPage, {}) }), _jsx(Route, { path: "/reset-password", element: _jsx(ResetPasswordPage, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(ProtectedRoute, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/contacts", element: _jsx(ProtectedRoute, { children: _jsx(ContactsPage, {}) }) }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) })] }) }) }) }) }));
}
export default App;

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/feedback/ToastProvider';
import { LoadingSpinner } from '../components/feedback/LoadingSpinner';
import { ErrorDisplay } from '../components/feedback/ErrorDisplay';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const { success: showSuccess, error: showError } = useToast();
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/auth/password-reset/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to send reset email');
            }
            setSuccess(true);
            showSuccess('Reset email sent', 'Check your email for the password reset link');
            // Clear form
            setEmail('');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            showError('Reset failed', message);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleBackToLogin = () => {
        navigate('/login');
    };
    if (success) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center", children: [_jsx("div", { className: "w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6", children: _jsx("svg", { className: "w-8 h-8 text-success-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M5 13l4 4L19 7" }) }) }), _jsx("h1", { className: "text-2xl font-bold text-neutral-900", children: "Check your email" }), _jsxs("div", { className: "mt-4 p-4 bg-success-50 border border-success-200 rounded-lg", children: [_jsxs("p", { className: "text-success-700", children: ["We've sent password reset instructions to ", _jsx("span", { className: "font-semibold", children: email })] }), _jsx("p", { className: "text-success-600 text-sm mt-2", children: "If you don't see the email, check your spam folder." })] }), _jsxs("div", { className: "mt-8 space-y-4", children: [_jsx("button", { onClick: handleBackToLogin, className: "w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors", children: "Back to Login" }), _jsxs("p", { className: "text-neutral-600 text-sm", children: ["Didn't receive the email?", ' ', _jsx("button", { onClick: () => setSuccess(false), className: "text-primary-600 hover:text-primary-700 font-medium", children: "Try again" })] })] })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-primary-50 to-neutral-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "max-w-md w-full bg-white rounded-xl shadow-lg p-8", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx(Link, { to: "/", className: "inline-block", children: _jsx("div", { className: "w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx("span", { className: "text-white text-xl font-bold", children: "H" }) }) }), _jsx("h1", { className: "text-2xl font-bold text-neutral-900", children: "Forgot Password" }), _jsx("p", { className: "text-neutral-600 mt-2", children: "Enter your email and we'll send you reset instructions" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [error && (_jsx(ErrorDisplay, { message: error, onRetry: () => setError(null), retryLabel: "Try again" })), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-neutral-700 mb-2", children: "Email Address" }), _jsx("input", { id: "email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "you@example.com", className: "w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors", disabled: isLoading, required: true })] }), _jsx("button", { type: "submit", disabled: isLoading, className: "w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center", children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(LoadingSpinner, { size: "sm", color: "white", className: "mr-2" }), "Sending..."] })) : ('Send Reset Instructions') }), _jsx("div", { className: "text-center", children: _jsx("button", { type: "button", onClick: handleBackToLogin, className: "text-primary-600 hover:text-primary-700 font-medium", disabled: isLoading, children: "\u2190 Back to Login" }) })] }), _jsx("div", { className: "mt-8 pt-6 border-t border-neutral-200", children: _jsxs("p", { className: "text-neutral-600 text-sm text-center", children: ["Remember your password?", ' ', _jsx(Link, { to: "/login", className: "text-primary-600 hover:text-primary-700 font-medium", children: "Sign in" })] }) })] }) }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Toast Notification System
 * Global notification system with context
 */
import { createContext, useContext, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
const ToastContext = createContext(undefined);
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const removeToast = (id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };
    const addToast = (toastProps) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = {
            id,
            duration: 5000,
            ...toastProps,
        };
        setToasts((prev) => [...prev, newToast]);
        // Auto-remove toast after duration
        if (newToast.duration) {
            setTimeout(() => {
                removeToast(id);
            }, newToast.duration);
        }
    };
    const toast = addToast;
    const success = (title, description) => addToast({ title, description, type: 'success' });
    const error = (title, description) => addToast({ title, description, type: 'error' });
    const warning = (title, description) => addToast({ title, description, type: 'warning' });
    const info = (title, description) => addToast({ title, description, type: 'info' });
    return (_jsxs(ToastContext.Provider, { value: { toasts, toast, success, error, warning, info, removeToast }, children: [children, _jsx(ToastContainer, {})] }));
};
const ToastContainer = () => {
    const { toasts, removeToast } = useToast();
    if (toasts.length === 0)
        return null;
    const icons = {
        success: CheckCircle,
        error: XCircle,
        warning: AlertTriangle,
        info: Info,
    };
    const colors = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };
    return (_jsx("div", { className: "fixed bottom-4 right-4 z-50 flex flex-col gap-2", children: toasts.map((toast) => {
            const Icon = icons[toast.type];
            return (_jsxs("div", { className: `flex items-start gap-3 rounded-lg border p-4 shadow-lg w-96 ${colors[toast.type]}`, role: "alert", children: [_jsx(Icon, { className: "h-5 w-5 flex-shrink-0 mt-0.5" }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-medium", children: toast.title }), toast.description && (_jsx("p", { className: "mt-1 text-sm opacity-90", children: toast.description }))] }), _jsx("button", { onClick: () => removeToast(toast.id), className: "ml-2 flex-shrink-0 rounded-md p-1 hover:bg-white/20", "aria-label": "Close notification", children: _jsx(X, { className: "h-4 w-4" }) })] }, toast.id));
        }) }));
};
// Helper functions for direct usage
let toastContext;
export const toast = {
    success: (title, description) => {
        if (toastContext) {
            toastContext.success(title, description);
        }
        else {
            console.warn('Toast context not available. Make sure ToastProvider is initialized.');
        }
    },
    error: (title, description) => {
        if (toastContext) {
            toastContext.error(title, description);
        }
        else {
            console.warn('Toast context not available. Make sure ToastProvider is initialized.');
        }
    },
    warning: (title, description) => {
        if (toastContext) {
            toastContext.warning(title, description);
        }
        else {
            console.warn('Toast context not available. Make sure ToastProvider is initialized.');
        }
    },
    info: (title, description) => {
        if (toastContext) {
            toastContext.info(title, description);
        }
        else {
            console.warn('Toast context not available. Make sure ToastProvider is initialized.');
        }
    },
};
// Export toast functions as default
export default toast;

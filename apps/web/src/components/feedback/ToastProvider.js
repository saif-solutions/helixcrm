import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from './Toast';
import { v4 as uuidv4 } from 'uuid';
const ToastContext = createContext(undefined);
const DEFAULT_DURATION = 5000; // 5 seconds
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message) => {
        const id = uuidv4();
        const toast = {
            ...message,
            id,
            duration: message.duration || DEFAULT_DURATION,
        };
        setToasts((prev) => [...prev, toast]);
        // Auto-dismiss after duration
        if (toast.duration !== Infinity) {
            setTimeout(() => {
                removeToast(id);
            }, toast.duration);
        }
        return id;
    }, []);
    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);
    const updateToast = useCallback((id, updates) => {
        setToasts((prev) => prev.map((toast) => toast.id === id ? { ...toast, ...updates } : toast));
    }, []);
    return (_jsxs(ToastContext.Provider, { value: { toasts, addToast, removeToast, updateToast }, children: [children, _jsx("div", { className: "fixed top-4 right-4 z-toast flex flex-col gap-2 w-full max-w-sm", children: toasts.map((toast) => (_jsx(Toast, { id: toast.id, title: toast.title, description: toast.description, type: toast.type, onDismiss: () => removeToast(toast.id) }, toast.id))) })] }));
};
export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    const { addToast, removeToast, updateToast } = context;
    const toast = useCallback((message) => {
        return addToast(message);
    }, [addToast]);
    const success = useCallback((title, description) => {
        return addToast({ title, description, type: 'success' });
    }, [addToast]);
    const error = useCallback((title, description) => {
        return addToast({ title, description, type: 'error' });
    }, [addToast]);
    const warning = useCallback((title, description) => {
        return addToast({ title, description, type: 'warning' });
    }, [addToast]);
    const info = useCallback((title, description) => {
        return addToast({ title, description, type: 'info' });
    }, [addToast]);
    return {
        toast,
        success,
        error,
        warning,
        info,
        removeToast,
        updateToast,
    };
};

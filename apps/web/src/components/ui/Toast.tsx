/**
 * Toast Notification System
 * Global notification system with context
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (props: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const addToast = (toastProps: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
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
  const success = (title: string, description?: string) => addToast({ title, description, type: 'success' });
  const error = (title: string, description?: string) => addToast({ title, description, type: 'error' });
  const warning = (title: string, description?: string) => addToast({ title, description, type: 'warning' });
  const info = (title: string, description?: string) => addToast({ title, description, type: 'info' });

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, warning, info, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

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

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg w-96 ${colors[toast.type]}`}
            role="alert"
          >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-sm opacity-90">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 flex-shrink-0 rounded-md p-1 hover:bg-white/20"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// Helper functions for direct usage
let toastContext: ToastContextType | undefined;

export const toast = {
  success: (title: string, description?: string) => {
    if (toastContext) {
      toastContext.success(title, description);
    } else {
      console.warn('Toast context not available. Make sure ToastProvider is initialized.');
    }
  },
  error: (title: string, description?: string) => {
    if (toastContext) {
      toastContext.error(title, description);
    } else {
      console.warn('Toast context not available. Make sure ToastProvider is initialized.');
    }
  },
  warning: (title: string, description?: string) => {
    if (toastContext) {
      toastContext.warning(title, description);
    } else {
      console.warn('Toast context not available. Make sure ToastProvider is initialized.');
    }
  },
  info: (title: string, description?: string) => {
    if (toastContext) {
      toastContext.info(title, description);
    } else {
      console.warn('Toast context not available. Make sure ToastProvider is initialized.');
    }
  },
};

// Export toast functions as default
export default toast;
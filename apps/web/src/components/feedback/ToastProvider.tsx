import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Toast, ToastType } from './Toast';
import { v4 as uuidv4 } from 'uuid';

export type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
};

type ToastContextType = {
  toasts: ToastMessage[];
  addToast: (message: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, message: Partial<ToastMessage>) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);
const DEFAULT_DURATION = 5000; // 5 seconds

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: Omit<ToastMessage, 'id'>): string => {
    const id = uuidv4();
    const toast: ToastMessage = {
      ...message,
      id,
      duration: message.duration ?? DEFAULT_DURATION,
    };

    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<ToastMessage>) => {
    setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, ...updates } : toast)));
  }, []);

  // Auto-dismiss effect
  useEffect(() => {
    toasts.forEach((toast) => {
      if (toast.duration !== Infinity) {
        const timer = setTimeout(() => removeToast(toast.id), toast.duration);
        return () => clearTimeout(timer);
      }
      return undefined;
    });
  }, [toasts, removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}
      <div className="fixed top-4 right-4 z-toast flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            title={toast.title}
            description={toast.description}
            type={toast.type}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');

  const { addToast, removeToast, updateToast } = context;

  const toast = useCallback(
    (message: Omit<ToastMessage, 'id'>) => addToast(message),
    [addToast]
  );

  const success = useCallback(
    (title: string, description?: string) => addToast({ title, description, type: 'success' }),
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string) => addToast({ title, description, type: 'error' }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, description?: string) => addToast({ title, description, type: 'warning' }),
    [addToast]
  );

  const info = useCallback(
    (title: string, description?: string) => addToast({ title, description, type: 'info' }),
    [addToast]
  );

  return { toast, success, error, warning, info, removeToast, updateToast };
};
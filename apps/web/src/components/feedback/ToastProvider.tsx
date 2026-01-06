import React, { createContext, useContext, useState, useCallback } from 'react';
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

  const addToast = useCallback((message: Omit<ToastMessage, 'id'>): string => {
    const id = uuidv4();
    const toast: ToastMessage = {
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

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<ToastMessage>) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, ...updates } : toast
      )
    );
  }, []);

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
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  const { addToast, removeToast, updateToast } = context;
  
  const toast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    return addToast(message);
  }, [addToast]);
  
  const success = useCallback((title: string, description?: string) => {
    return addToast({ title, description, type: 'success' });
  }, [addToast]);
  
  const error = useCallback((title: string, description?: string) => {
    return addToast({ title, description, type: 'error' });
  }, [addToast]);
  
  const warning = useCallback((title: string, description?: string) => {
    return addToast({ title, description, type: 'warning' });
  }, [addToast]);
  
  const info = useCallback((title: string, description?: string) => {
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
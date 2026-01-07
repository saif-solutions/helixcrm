/**
 * Toast Provider Wrapper
 * Wraps the ToastProvider around the app
 */
import React from 'react';
import { ToastProvider } from './ui/Toast';

interface ToastProviderWrapperProps {
  children: React.ReactNode;
}

export const ToastProviderWrapper: React.FC<ToastProviderWrapperProps> = ({ children }) => {
  return <ToastProvider>{children}</ToastProvider>;
};
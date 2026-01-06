import React, { useEffect, useState } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastProps = {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  onDismiss: () => void;
};

const typeConfig = {
  success: {
    icon: CheckCircleIcon,
    iconColor: 'text-success-600',
    bgColor: 'bg-success-50',
    borderColor: 'border-success-200',
    textColor: 'text-success-900',
  },
  error: {
    icon: ExclamationCircleIcon,
    iconColor: 'text-error-600',
    bgColor: 'bg-error-50',
    borderColor: 'border-error-200',
    textColor: 'text-error-900',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-warning-600',
    bgColor: 'bg-warning-50',
    borderColor: 'border-warning-200',
    textColor: 'text-warning-900',
  },
  info: {
    icon: InformationCircleIcon,
    iconColor: 'text-info-600',
    bgColor: 'bg-info-50',
    borderColor: 'border-info-200',
    textColor: 'text-info-900',
  },
};

export const Toast: React.FC<ToastProps> = ({ 
  id, 
  title, 
  description, 
  type, 
  onDismiss 
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const config = typeConfig[type];
  const Icon = config.icon;

  const handleDismiss = () => {
    setIsExiting(true);
    // Wait for exit animation to complete
    setTimeout(() => {
      onDismiss();
    }, 150);
  };

  // Auto-dismiss on mouse leave if user hasn't hovered
  const [hasHovered, setHasHovered] = useState(false);
  
  useEffect(() => {
    if (!hasHovered) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000); // Auto-dismiss after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [hasHovered]);

  return (
    <div
      data-testid={`toast-${id}`}
      className={`
        relative p-4 rounded-lg border shadow-lg transform transition-all duration-150
        ${config.bgColor} ${config.borderColor}
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        hover:shadow-xl transition-shadow
      `}
      onMouseEnter={() => setHasHovered(true)}
      onMouseLeave={() => setHasHovered(false)}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${config.textColor}`}>
            {title}
          </h3>
          {description && (
            <div className={`mt-1 text-sm ${config.textColor}`}>
              <p>{description}</p>
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            type="button"
            className={`inline-flex rounded-md ${config.textColor} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
            onClick={handleDismiss}
            aria-label="Dismiss notification"
          >
            <span className="sr-only">Close</span>
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      
      {/* Progress bar for auto-dismiss */}
      {!hasHovered && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-current opacity-20">
          <div 
            className="h-full bg-current transition-all duration-5000 ease-linear"
            style={{ width: isExiting ? '0%' : '100%' }}
          />
        </div>
      )}
    </div>
  );
};
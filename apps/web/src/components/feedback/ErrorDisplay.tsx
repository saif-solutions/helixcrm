import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

export type ErrorDisplayProps = {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Something went wrong',
  message,
  details,
  onRetry,
  retryLabel = 'Try again',
  className = '',
}) => {
  return (
    <div 
      data-testid="error-display"
      className={`bg-error-50 border border-error-200 rounded-lg p-4 ${className}`}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationCircleIcon className="h-5 w-5 text-error-600" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-error-900">{title}</h3>
          <div className="mt-2 text-sm text-error-800">
            <p>{message}</p>
          </div>
          
          {details && (
            <details className="mt-2">
              <summary className="text-sm font-medium text-error-700 cursor-pointer hover:text-error-900">
                View details
              </summary>
              <pre className="mt-2 text-xs font-mono text-error-700 whitespace-pre-wrap bg-error-100 p-2 rounded">
                {details}
              </pre>
            </details>
          )}
          
          {onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-error-600 hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error-500"
              >
                {retryLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
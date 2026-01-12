// D:\Projects-In-Hand\helixcrm\apps\web\src\components\organisms\DataGrid\DataGrid.components.tsx
import * as React from 'react';
import { cn } from '../../../lib/utils';
import { getCheckboxClasses } from './DataGrid.styles';
import type { CheckboxProps } from './DataGrid.types';

/**
 * Internal Checkbox component for selection with indeterminate support
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null);
    
    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = !!indeterminate;
      }
    }, [indeterminate]);
    
    return (
      <input
        ref={(node) => {
          // Handle both refs
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
          internalRef.current = node;
        }}
        type="checkbox"
        className={getCheckboxClasses(className)}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';

/**
 * Sort icon component for sortable columns
 */
export interface SortIconProps {
  isSorted: boolean;
  direction: 'asc' | 'desc' | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const SortIcon: React.FC<SortIconProps> = ({ 
  isSorted, 
  direction, 
  size = 'xs',
  className 
}) => (
  <span className="flex flex-col">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn(
        '-mb-1',
        size === 'xs' && 'w-3 h-3',
        size === 'sm' && 'w-4 h-4',
        size === 'md' && 'w-5 h-5',
        isSorted && direction === 'asc' ? 'text-primary-600' : 'text-gray-400',
        className
      )}
    >
      <path
        fillRule="evenodd"
        d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
        clipRule="evenodd"
      />
    </svg>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn(
        size === 'xs' && 'w-3 h-3',
        size === 'sm' && 'w-4 h-4',
        size === 'md' && 'w-5 h-5',
        isSorted && direction === 'desc' ? 'text-primary-600' : 'text-gray-400',
        className
      )}
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  </span>
);

/**
 * Empty state component
 */
export interface EmptyStateProps {
  message: string;
  isLoading?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, isLoading = false }) => (
  <div className="px-4 py-12 text-center">
    <div className="flex flex-col items-center justify-center text-gray-500">
      <div className="text-4xl mb-4">📊</div>
      <p className="text-lg font-medium">{message}</p>
      {isLoading && <p className="mt-2 text-sm">Loading data...</p>}
    </div>
  </div>
);

/**
 * Loading state component
 */
export interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading data...' }) => (
  <div className="px-4 py-12 text-center">
    <div className="flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-500">{message}</p>
    </div>
  </div>
);
import React from 'react';

export type LoadingOverlayProps = {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
  transparent?: boolean;
};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isLoading, 
  message = 'Loading...',
  fullScreen = false,
  transparent = false,
}) => {
  if (!isLoading) return null;

  const overlayClasses = [
    'fixed inset-0 z-overlay',
    'flex items-center justify-center',
    'backdrop-blur-sm transition-opacity duration-200',
    transparent ? 'bg-white/50' : 'bg-white/90',
    fullScreen ? '' : 'bg-opacity-90',
  ].join(' ');

  const contentClasses = [
    'flex flex-col items-center justify-center',
    'p-8 rounded-lg',
    fullScreen ? '' : 'bg-white shadow-xl border border-neutral-200',
  ].join(' ');

  return (
    <div 
      data-testid="loading-overlay"
      className={overlayClasses}
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      <div className={contentClasses}>
        <div className="relative">
          {/* Spinner */}
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-primary-500 animate-spin" />
          
          {/* Optional inner spinner for dual ring effect */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border-2 border-transparent border-t-primary-300 animate-spin" />
        </div>
        
        {message && (
          <p className="mt-4 text-sm font-medium text-neutral-700">
            {message}
          </p>
        )}
        
        {/* Optional progress indication dots */}
        <div className="mt-2 flex space-x-1">
          <div className="h-2 w-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
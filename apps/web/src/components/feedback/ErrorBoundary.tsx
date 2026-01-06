import { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });
    
    // Log error to error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Log reset action
    console.log('ErrorBoundary was reset by user');
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div 
          data-testid="error-boundary"
          className="min-h-screen flex items-center justify-center bg-neutral-50 p-4"
        >
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg border border-neutral-200 p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-100">
                <ExclamationCircleIcon className="h-6 w-6 text-error-600" aria-hidden="true" />
              </div>
              
              <h2 className="mt-4 text-lg font-semibold text-neutral-900">
                Something went wrong
              </h2>
              
              <p className="mt-2 text-sm text-neutral-600">
                We apologize for the inconvenience. An error occurred while rendering this page.
              </p>

              {/* Error details (collapsed by default) */}
              <details className="mt-4 text-left">
                <summary className="text-sm font-medium text-neutral-700 cursor-pointer hover:text-neutral-900">
                  Error Details
                </summary>
                <div className="mt-2 p-3 bg-neutral-50 rounded border border-neutral-200">
                  <code className="text-xs font-mono text-neutral-700 break-all">
                    {this.state.error?.toString()}
                  </code>
                  {this.state.errorInfo && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-neutral-600">Component Stack:</p>
                      <pre className="text-xs font-mono text-neutral-700 mt-1 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>

              {/* Action buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Try Again
                </button>
                
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Reload Page
                </button>
              </div>

              {/* Support contact */}
              <p className="mt-6 text-xs text-neutral-500">
                If the problem persists, please contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
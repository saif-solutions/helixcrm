import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorDisplay } from '../ErrorDisplay';

// Component that throws an error
const ErrorComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console error for expected error throwing
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Normal content')).toBeInTheDocument();
    expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
  });

  it('should catch error and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('We apologize for the inconvenience.')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ErrorComponent />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should use custom fallback when provided', () => {
    const fallback = <div>Custom fallback UI</div>;
    
    render(
      <ErrorBoundary fallback={fallback}>
        <ErrorComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should reset error state when Try Again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    // Error should be shown
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    
    // Click Try Again
    fireEvent.click(screen.getByText('Try Again'));
    
    // Error boundary should be gone
    expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    
    // Re-render without error
    rerender(
      <ErrorBoundary>
        <ErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    // Normal content should be shown
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should reload page when Reload Page is clicked', () => {
    const reloadMock = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });
    
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );
    
    fireEvent.click(screen.getByText('Reload Page'));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('should show error details when expanded', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );
    
    // Details should be collapsed by default
    expect(screen.queryByText('Test error')).not.toBeVisible();
    
    // Expand details
    fireEvent.click(screen.getByText('Error Details'));
    
    // Error message should be visible
    expect(screen.getByText('Test error')).toBeVisible();
  });
});

describe('ErrorDisplay', () => {
  it('should render error message', () => {
    render(
      <ErrorDisplay message="Test error message" />
    );
    
    expect(screen.getByTestId('error-display')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should render custom title', () => {
    render(
      <ErrorDisplay 
        title="Custom error title" 
        message="Test error message" 
      />
    );
    
    expect(screen.getByText('Custom error title')).toBeInTheDocument();
  });

  it('should render details when provided', () => {
    render(
      <ErrorDisplay 
        message="Test error message"
        details="Detailed error information"
      />
    );
    
    expect(screen.getByText('View details')).toBeInTheDocument();
    fireEvent.click(screen.getByText('View details'));
    expect(screen.getByText('Detailed error information')).toBeVisible();
  });

  it('should render retry button when onRetry provided', () => {
    const onRetry = jest.fn();
    
    render(
      <ErrorDisplay 
        message="Test error message"
        onRetry={onRetry}
      />
    );
    
    const retryButton = screen.getByText('Try again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should render custom retry label', () => {
    const onRetry = jest.fn();
    
    render(
      <ErrorDisplay 
        message="Test error message"
        onRetry={onRetry}
        retryLabel="Retry operation"
      />
    );
    
    expect(screen.getByText('Retry operation')).toBeInTheDocument();
  });
});
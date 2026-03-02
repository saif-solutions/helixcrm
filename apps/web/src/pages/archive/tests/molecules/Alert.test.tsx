import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest'; // Use vitest instead of jest
import { Alert, InfoAlert, SuccessAlert, ErrorAlert, WarningAlert } from './Alert';
import { Button } from '../../atoms/Button';

describe('Alert Component', () => {
  test('renders alert with message', () => {
    render(<Alert message="Test message" />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Default role is 'status'
  });

  test('renders alert with children', () => {
    render(<Alert>Child content</Alert>);
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  test('renders with info variant by default', () => {
    render(<Alert message="Test" />);
    const alert = screen.getByRole('status');
    expect(alert).toHaveClass('bg-info-50', 'border-info-200', 'text-info-800');
  });

  test('renders with success variant', () => {
    render(<Alert variant="success" message="Test" />);
    const alert = screen.getByRole('status');
    expect(alert).toHaveClass('bg-success-50', 'border-success-200', 'text-success-800');
  });

  test('renders with error variant', () => {
    render(<Alert variant="error" message="Test" />);
    const alert = screen.getByRole('alert'); // Error uses 'alert' role
    expect(alert).toHaveClass('bg-error-50', 'border-error-200', 'text-error-800');
  });

  test('renders with warning variant', () => {
    render(<Alert variant="warning" message="Test" />);
    const alert = screen.getByRole('status'); // Warning uses 'status' role (not 'alert')
    expect(alert).toHaveClass('bg-warning-50', 'border-warning-200', 'text-warning-800');
  });

  test('renders with different sizes', () => {
    const { rerender } = render(<Alert size="sm" message="Small" />);
    expect(screen.getByRole('status')).toHaveClass('px-3', 'py-2', 'text-xs');

    rerender(<Alert size="md" message="Medium" />);
    expect(screen.getByRole('status')).toHaveClass('px-4', 'py-3', 'text-sm');

    rerender(<Alert size="lg" message="Large" />);
    expect(screen.getByRole('status')).toHaveClass('px-4', 'py-4', 'text-base');
  });

  test('renders with title', () => {
    render(<Alert title="Alert Title" message="Message" />);
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Alert Title').tagName).toBe('H4');
    expect(screen.getByText('Alert Title')).toHaveClass('font-semibold', 'mb-1');
  });

  test('renders dismiss button when dismissible is true', () => {
    render(<Alert dismissible message="Test" />);
    const dismissButton = screen.getByLabelText('Dismiss alert');
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton.tagName).toBe('BUTTON');
  });

  test('does not render dismiss button when dismissible is false', () => {
    render(<Alert dismissible={false} message="Test" />);
    expect(screen.queryByLabelText('Dismiss alert')).not.toBeInTheDocument();
  });

  test('calls onDismiss when dismiss button is clicked', () => {
    const handleDismiss = vi.fn(); // Use vi.fn() instead of jest.fn()
    render(<Alert dismissible onDismiss={handleDismiss} message="Test" />);
    
    const dismissButton = screen.getByLabelText('Dismiss alert');
    fireEvent.click(dismissButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  test('hides alert after dismissal', () => {
    render(<Alert dismissible message="Test" />);
    
    // Initially visible
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    // Click dismiss
    const dismissButton = screen.getByLabelText('Dismiss alert');
    fireEvent.click(dismissButton);
    
    // Should be removed from DOM
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('renders with custom icon', () => {
    render(
      <Alert
        icon={<span data-testid="custom-icon">🔔</span>}
        message="Test"
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  test('renders with actions', () => {
    render(
      <Alert
        message="Test"
        actions={<Button data-testid="action-button">Action</Button>}
      />
    );
    expect(screen.getByTestId('action-button')).toBeInTheDocument();
    expect(screen.getByTestId('action-button')).toHaveTextContent('Action');
  });

  test('renders InfoAlert component', () => {
    render(<InfoAlert message="Info" />);
    const alert = screen.getByRole('status');
    expect(alert).toHaveClass('bg-info-50', 'border-info-200');
  });

  test('renders SuccessAlert component', () => {
    render(<SuccessAlert message="Success" />);
    const alert = screen.getByRole('status');
    expect(alert).toHaveClass('bg-success-50', 'border-success-200');
  });

  test('renders ErrorAlert component', () => {
    render(<ErrorAlert message="Error" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-error-50', 'border-error-200');
  });

  test('renders WarningAlert component', () => {
    render(<WarningAlert message="Warning" />);
    const alert = screen.getByRole('status'); // Warning uses 'status' role
    expect(alert).toHaveClass('bg-warning-50', 'border-warning-200');
  });

  test('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Alert ref={ref} message="Test" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  test('applies custom className', () => {
    render(<Alert className="custom-class" message="Test" />);
    const alert = screen.getByRole('status');
    expect(alert).toHaveClass('custom-class');
  });

  test('applies iconClassName to icon', () => {
    render(
      <Alert
        iconClassName="icon-class"
        message="Test"
      />
    );
    const iconContainer = screen.getByRole('status').querySelector('[aria-hidden="true"]');
    expect(iconContainer).toHaveClass('icon-class');
  });

  test('applies contentClassName to content', () => {
    render(
      <Alert
        contentClassName="content-class"
        message="Test"
      />
    );
    const content = screen.getByRole('status').querySelector('.flex-1');
    expect(content).toHaveClass('content-class');
  });

  test('applies actionsClassName to actions', () => {
    render(
      <Alert
        actions={<Button>Action</Button>}
        actionsClassName="actions-class"
        message="Test"
      />
    );
    const actionsContainer = screen.getByText('Action').parentElement;
    expect(actionsContainer).toHaveClass('actions-class');
  });

  test('renders string message as paragraph', () => {
    render(<Alert message="String message" />);
    const message = screen.getByText('String message');
    expect(message.tagName).toBe('P');
  });

  test('renders complex children content', () => {
    render(
      <Alert>
        <div data-testid="complex-content">
          <h5>Heading</h5>
          <p>Paragraph</p>
        </div>
      </Alert>
    );
    expect(screen.getByTestId('complex-content')).toBeInTheDocument();
  });

  test('sets appropriate ARIA role based on variant', () => {
    const { rerender } = render(<Alert variant="info" message="Test" />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<Alert variant="success" message="Test" />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<Alert variant="error" message="Test" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(<Alert variant="warning" message="Test" />);
    expect(screen.getByRole('status')).toBeInTheDocument(); // Warning uses 'status'
  });

  test('sets appropriate ARIA live region', () => {
    const { rerender } = render(<Alert variant="info" message="Test" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');

    rerender(<Alert variant="error" message="Test" />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    
    rerender(<Alert variant="warning" message="Test" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive');
  });

  test('sets data attributes for debugging', () => {
    render(<Alert variant="success" size="lg" dismissible message="Test" />);
    const alert = screen.getByRole('status');
    expect(alert).toHaveAttribute('data-variant', 'success');
    expect(alert).toHaveAttribute('data-size', 'lg');
    expect(alert).toHaveAttribute('data-dismissible', 'true');
  });
});
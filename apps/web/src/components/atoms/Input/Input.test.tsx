import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Input, TextInput, EmailInput, PasswordInput } from './Input';

describe('Input Component', () => {
  test('renders input with default props', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  test('renders with default variant', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-gray-300');
  });

  test('renders with success variant', () => {
    render(<Input variant="success" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-success-300');
  });

  test('renders with error variant', () => {
    render(<Input variant="error" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-error-300');
  });

  test('renders with error message (auto-error variant)', () => {
    render(<Input label="Field" error="This field is required" />);
    const input = screen.getByRole('textbox');
    const error = screen.getByText('This field is required');
    expect(input).toHaveClass('border-error-300');
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass('text-error-600');
  });

  test('renders with different sizes', () => {
    const { rerender } = render(<Input size="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<Input size="md" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-4', 'py-2.5', 'text-sm', 'rounded-md');

    rerender(<Input size="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-4', 'py-3', 'text-base', 'rounded-md');
  });

  test('renders full width input', () => {
    render(<Input fullWidth />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('w-full');
  });

  test('renders with left icon', () => {
    render(<Input leftIcon={<span data-testid="left-icon">🔍</span>} />);
    const icon = screen.getByTestId('left-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.parentElement?.parentElement).toHaveClass('left-0', 'pl-3');
  });

  test('renders with right icon', () => {
    render(<Input rightIcon={<span data-testid="right-icon">$</span>} />);
    const icon = screen.getByTestId('right-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.parentElement?.parentElement).toHaveClass('right-0', 'pr-3');
  });

  test('renders with label', () => {
    render(<Input label="Username" />);
    const input = screen.getByRole('textbox');
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Username').tagName).toBe('LABEL');
    expect(screen.getByText('Username')).toHaveAttribute('for', input.id);
  });

  test('renders required indicator with label', () => {
    render(<Input label="Email" required />);
    const required = screen.getByText('*');
    expect(required).toBeInTheDocument();
    expect(required).toHaveClass('text-error-500');
  });

  test('renders helper text', () => {
    render(<Input label="Field" helperText="This is helper text" />);
    const helper = screen.getByText('This is helper text');
    expect(helper).toBeInTheDocument();
    expect(helper).toHaveClass('text-gray-500');
  });

  test('renders disabled state', () => {
    render(<Input disabled placeholder="Disabled" />);
    const input = screen.getByPlaceholderText('Disabled');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  test('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  test('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  test('renders TextInput component', () => {
    render(<TextInput placeholder="Text input" />);
    const input = screen.getByPlaceholderText('Text input');
    expect(input).toHaveAttribute('type', 'text');
  });

  test('renders EmailInput component', () => {
    render(<EmailInput placeholder="Email input" />);
    const input = screen.getByPlaceholderText('Email input');
    expect(input).toHaveAttribute('type', 'email');
  });

  test('renders PasswordInput component', () => {
    render(<PasswordInput placeholder="Password input" />);
    const input = screen.getByPlaceholderText('Password input');
    expect(input).toHaveAttribute('type', 'password');
  });

  test('passes through additional HTML attributes', () => {
    render(
      <Input 
        data-testid="custom-input" 
        type="tel" 
        aria-label="Phone number"
        maxLength={10}
      />
    );
    const input = screen.getByTestId('custom-input');
    expect(input).toHaveAttribute('type', 'tel');
    expect(input).toHaveAttribute('aria-label', 'Phone number');
    expect(input).toHaveAttribute('maxLength', '10');
  });

test('has proper accessibility attributes when error exists', () => {
  render(<Input label="Field" error="Invalid input" aria-describedby="custom-desc" />);
  const input = screen.getByRole('textbox');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAttribute('aria-describedby', 'custom-desc');
  
  // Also verify error message is rendered
  const error = screen.getByText('Invalid input');
  expect(error).toBeInTheDocument();
  expect(error).toHaveAttribute('id'); // Error should have an ID
});
});
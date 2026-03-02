// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Button\Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Button, PrimaryButton, SecondaryButton, GhostButton, DangerButton } from './Button';

describe('Button Component', () => {
  test('renders button with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveClass('bg-primary-600');
  });

  test('renders with primary variant', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByRole('button', { name: /primary button/i });
    expect(button).toHaveClass('bg-primary-600', 'text-white');
  });

  test('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByRole('button', { name: /secondary button/i });
    expect(button).toHaveClass('bg-white', 'text-gray-700', 'border-gray-300');
  });

  test('renders with ghost variant', () => {
    render(<Button variant="ghost">Ghost Button</Button>);
    const button = screen.getByRole('button', { name: /ghost button/i });
    expect(button).toHaveClass('bg-transparent', 'text-gray-700');
  });

  test('renders with danger variant', () => {
    render(<Button variant="danger">Danger Button</Button>);
    const button = screen.getByRole('button', { name: /danger button/i });
    expect(button).toHaveClass('bg-error-600', 'text-white');
  });

  test('renders with different sizes', () => {
    const { rerender } = render(<Button size="xs">Extra Small</Button>);
    let button = screen.getByRole('button', { name: /extra small/i });
    expect(button).toHaveClass('px-2.5', 'py-1.5', 'text-xs');

    rerender(<Button size="sm">Small</Button>);
    button = screen.getByRole('button', { name: /small/i });
    expect(button).toHaveClass('px-3', 'py-2', 'text-sm');

    rerender(<Button size="md">Medium</Button>);
    button = screen.getByRole('button', { name: /medium/i });
    expect(button).toHaveClass('px-4', 'py-2.5', 'text-sm', 'rounded-md');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button', { name: /large/i });
    expect(button).toHaveClass('px-5', 'py-3', 'text-base', 'rounded-md');
  });

  test('renders full width button', () => {
    render(<Button fullWidth>Full Width</Button>);
    const button = screen.getByRole('button', { name: /full width/i });
    expect(button).toHaveClass('w-full');
  });

  test('renders loading state', () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    const spinner = screen.getByTestId('button-loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  test('renders disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  test('renders with left icon', () => {
    render(<Button leftIcon={<span data-testid="left-icon">←</span>}>Back</Button>);
    const icon = screen.getByTestId('left-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.parentElement).toHaveClass('mr-2');
  });

  test('renders with right icon', () => {
    render(<Button rightIcon={<span data-testid="right-icon">→</span>}>Next</Button>);
    const icon = screen.getByTestId('right-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.parentElement).toHaveClass('ml-2');
  });

  test('renders icon-only button', () => {
    render(
      <Button iconOnly aria-label="Settings">
        <span data-testid="icon">⚙</span>
      </Button>
    );
    const button = screen.getByRole('button', { name: /settings/i });
    const icon = screen.getByTestId('icon');
    expect(icon).toBeInTheDocument();
    expect(button).toHaveClass('p-2'); // Default md size for icon-only
  });

  test('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    const button = screen.getByRole('button', { name: /clickable/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('does not trigger click when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    );
    const button = screen.getByRole('button', { name: /disabled button/i });
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('does not trigger click when loading', () => {
    const handleClick = vi.fn();
    render(
      <Button loading onClick={handleClick}>
        Loading Button
      </Button>
    );
    const button = screen.getByRole('button', { name: /loading button/i });
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('renders PrimaryButton component', () => {
    render(<PrimaryButton>Primary</PrimaryButton>);
    const button = screen.getByRole('button', { name: /primary/i });
    expect(button).toHaveClass('bg-primary-600', 'text-white');
  });

  test('renders SecondaryButton component', () => {
    render(<SecondaryButton>Secondary</SecondaryButton>);
    const button = screen.getByRole('button', { name: /secondary/i });
    expect(button).toHaveClass('bg-white', 'text-gray-700');
  });

  test('renders GhostButton component', () => {
    render(<GhostButton>Ghost</GhostButton>);
    const button = screen.getByRole('button', { name: /ghost/i });
    expect(button).toHaveClass('bg-transparent', 'text-gray-700');
  });

  test('renders DangerButton component', () => {
    render(<DangerButton>Danger</DangerButton>);
    const button = screen.getByRole('button', { name: /danger/i });
    expect(button).toHaveClass('bg-error-600', 'text-white');
  });

  test('passes through additional HTML attributes', () => {
    render(
      <Button data-testid="custom-button" type="submit" aria-label="Submit form">
        Submit
      </Button>
    );
    const button = screen.getByRole('button', { name: /submit form/i });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('aria-label', 'Submit form');
  });
});
// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Badge\Badge.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import {
  Badge,
  PrimaryBadge,
  SuccessBadge,
  ErrorBadge,
  WarningBadge,
} from './Badge';

const getBadge = () => screen.getByTestId('badge');

describe('Badge Component', () => {
  test('renders badge with text', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  test('renders with default variant', () => {
    render(<Badge>Default</Badge>);
    const badge = getBadge();
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  test('renders with primary variant', () => {
    render(<Badge variant="primary">Primary</Badge>);
    const badge = getBadge();
    expect(badge).toHaveClass('bg-primary-100', 'text-primary-800');
  });

  test('renders with success variant', () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = getBadge();
    expect(badge).toHaveClass('bg-success-100', 'text-success-800');
  });

  test('renders with error variant', () => {
    render(<Badge variant="error">Error</Badge>);
    const badge = getBadge();
    expect(badge).toHaveClass('bg-error-100', 'text-error-800');
  });

  test('renders with warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = getBadge();
    expect(badge).toHaveClass('bg-warning-100', 'text-warning-800');
  });

  test('renders with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = getBadge();
    expect(badge).toHaveClass('bg-transparent', 'border', 'border-gray-300');
  });

  test('renders with different sizes', () => {
    const { rerender } = render(<Badge size="xs">XS</Badge>);
    expect(getBadge()).toHaveClass('px-1.5', 'py-0.5', 'text-xs');

    rerender(<Badge size="sm">SM</Badge>);
    expect(getBadge()).toHaveClass('px-2', 'py-0.5', 'text-xs');

    rerender(<Badge size="md">MD</Badge>);
    expect(getBadge()).toHaveClass('px-2.5', 'py-0.5', 'text-sm');

    rerender(<Badge size="lg">LG</Badge>);
    expect(getBadge()).toHaveClass('px-3', 'py-1', 'text-sm');
  });

  test('renders with different shapes', () => {
    const { rerender } = render(<Badge shape="square">Square</Badge>);
    expect(getBadge()).toHaveClass('rounded');

    rerender(<Badge shape="rounded">Rounded</Badge>);
    expect(getBadge()).toHaveClass('rounded-md');

    rerender(<Badge shape="pill">Pill</Badge>);
    expect(getBadge()).toHaveClass('rounded-full');
  });

  test('renders with left icon', () => {
    render(
      <Badge leftIcon={<span data-testid="left-icon">✓</span>}>
        With Icon
      </Badge>
    );
    const icon = screen.getByTestId('left-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.parentElement).toHaveClass('mr-1.5');
  });

  test('renders with right icon', () => {
    render(
      <Badge rightIcon={<span data-testid="right-icon">×</span>}>
        With Icon
      </Badge>
    );
    const icon = screen.getByTestId('right-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.parentElement).toHaveClass('ml-1.5');
  });

  test('renders clickable badge with role and tabindex', () => {
    render(<Badge clickable>Clickable</Badge>);
    const badge = getBadge();

    expect(badge).toHaveAttribute('role', 'button');
    expect(badge).toHaveAttribute('tabindex', '0');
    expect(badge).toHaveClass('cursor-pointer');
  });

  test('handles click events on clickable badge', () => {
    const handleClick = vi.fn();

    render(
      <Badge clickable onClick={handleClick}>
        Click Me
      </Badge>
    );

    const badge = getBadge();
    fireEvent.click(badge);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('handles keyboard events on clickable badge', () => {
    const handleClick = vi.fn();

    render(
      <Badge clickable onClick={handleClick}>
        Press Me
      </Badge>
    );

    const badge = getBadge();

    fireEvent.keyDown(badge, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(badge, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  test('renders PrimaryBadge component', () => {
    render(<PrimaryBadge>Primary</PrimaryBadge>);
    const badge = getBadge();
    expect(badge).toHaveClass('bg-primary-100', 'text-primary-800');
  });

  test('renders SuccessBadge component', () => {
    render(<SuccessBadge>Success</SuccessBadge>);
    const badge = getBadge();
    expect(badge).toHaveClass('bg-success-100', 'text-success-800');
  });

  test('renders ErrorBadge component', () => {
    render(<ErrorBadge>Error</ErrorBadge>);
    const badge = getBadge();
    expect(badge).toHaveClass('bg-error-100', 'text-error-800');
  });

  test('renders WarningBadge component', () => {
    render(<WarningBadge>Warning</WarningBadge>);
    const badge = getBadge();
    expect(badge).toHaveClass('bg-warning-100', 'text-warning-800');
  });

  test('forwards ref correctly', () => {
    const ref = { current: null as HTMLSpanElement | null };
    render(<Badge ref={ref}>Test</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  test('applies custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>);
    const badge = getBadge();
    expect(badge).toHaveClass('custom-class');
  });

  test('passes through additional HTML attributes', () => {
    render(
      <Badge
        data-testid="badge"
        data-analytics="badge-click"
        data-cy="test-badge"
        aria-label="Test badge"
        title="Badge title"
      >
        Test
      </Badge>
    );

    const badge = getBadge();

    expect(badge).toHaveAttribute('aria-label', 'Test badge');
    expect(badge).toHaveAttribute('title', 'Badge title');
    expect(badge).toHaveAttribute('data-analytics', 'badge-click');
    expect(badge).toHaveAttribute('data-cy', 'test-badge');
  });

  test('supports data attributes for testing/analytics', () => {
    render(
      <Badge
        data-testid="badge"
        data-analytics="badge-event"
        data-cy="badge-element"
      >
        Analytics
      </Badge>
    );

    const badge = getBadge();

    expect(badge).toHaveAttribute('data-analytics', 'badge-event');
    expect(badge).toHaveAttribute('data-cy', 'badge-element');
  });
});

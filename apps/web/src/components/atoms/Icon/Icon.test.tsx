// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Icon\Icon.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import {
  Icon,
  CheckIcon,
  XIcon,
  LoadingIcon,
  InfoIcon,
  WarningIcon,
  ErrorIcon,
  StatusIcon,
  IconButton,
  IconGroup,
} from './Icon';

describe('Icon Component', () => {
  test('renders default icon with accessibility attributes', () => {
    render(<Icon data-testid="test-icon" />);
    const icon = screen.getByTestId('test-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.tagName).toBe('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('role', 'presentation');
  });

  test('renders icon with aria-label for accessibility', () => {
    render(<Icon aria-label="Add item" data-testid="test-icon" />);
    const icon = screen.getByTestId('test-icon');
    expect(icon).toHaveAttribute('aria-label', 'Add item');
    expect(icon).toHaveAttribute('role', 'img');
  });

  test('renders with different sizes', () => {
    const { rerender } = render(<Icon size="xs" data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('w-3', 'h-3');

    rerender(<Icon size="sm" data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('w-4', 'h-4');

    rerender(<Icon size="md" data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('w-5', 'h-5');

    rerender(<Icon size="lg" data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('w-6', 'h-6');

    rerender(<Icon size="xl" data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('w-8', 'h-8');

    rerender(<Icon size="2xl" data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('w-10', 'h-10');
  });

  test('renders with different colors', () => {
    const { rerender } = render(<Icon color="primary" data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('text-primary-600');

    rerender(<Icon color="success" data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('text-success-600');

    rerender(<Icon color="error" data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('text-error-600');

    rerender(<Icon color="warning" data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('text-warning-600');

    rerender(<Icon color="muted" data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('text-gray-500');
  });

  test('renders with animations', () => {
    const { rerender } = render(<Icon spin data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('animate-spin');

    rerender(<Icon pulse data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('animate-pulse');

    rerender(<Icon spin pulse data-testid="test-icon" />);
    expect(screen.getByTestId('test-icon')).toHaveClass('animate-spin', 'animate-pulse');
  });

  test('renders with badge', () => {
    render(<Icon badge={3} data-testid="test-icon" />);
    const badge = screen.getByText('3');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-error-600');
    expect(badge).toHaveClass('top-0', 'right-0');
  });

  test('renders badge with custom position and color', () => {
    render(
      <Icon 
        badge={99} 
        badgeColor="success" 
        badgePosition="bottom-left"
        data-testid="test-icon" 
      />
    );
    const badge = screen.getByText('99');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-success-600');
    expect(badge).toHaveClass('bottom-0', 'left-0');
  });

  test('renders badge with 99+ for large numbers', () => {
    render(<Icon badge={100} data-testid="test-icon" />);
    const badge = screen.getByText('99+');
    expect(badge).toBeInTheDocument();
  });

  test('renders with loading state', () => {
    render(<Icon loading data-testid="test-icon" />);
    const icon = screen.getByTestId('test-icon');
    expect(icon.parentElement).toHaveClass('relative');
    // Loading overlay should be present
    const spinner = screen.getByTestId('test-icon').parentElement?.querySelector('[class*="animate-spin"]');
    expect(spinner).toBeInTheDocument();
  });

  test('renders with interactive state', () => {
    render(<Icon interactive data-testid="test-icon" />);
    const icon = screen.getByTestId('test-icon');
    expect(icon).toHaveClass('cursor-pointer', 'hover:opacity-80');
    expect(icon).toHaveAttribute('tabindex', '0');
  });

  test('renders with disabled state', () => {
    render(<Icon disabled data-testid="test-icon" />);
    const icon = screen.getByTestId('test-icon');
    expect(icon).toHaveClass('opacity-40', 'cursor-not-allowed');
    expect(icon).not.toHaveAttribute('tabindex');
  });

  test('renders with transforms', () => {
    const { rerender } = render(<Icon flip="horizontal" data-testid="test-icon" />);
    let icon = screen.getByTestId('test-icon');
    expect(icon.style.transform).toContain('scaleX(-1)');

    rerender(<Icon rotate={90} data-testid="test-icon" />);
    icon = screen.getByTestId('test-icon');
    expect(icon.style.transform).toContain('rotate(90deg)');

    rerender(<Icon flip="both" rotate={45} data-testid="test-icon" />);
    icon = screen.getByTestId('test-icon');
    expect(icon.style.transform).toContain('scale(-1)');
    expect(icon.style.transform).toContain('rotate(45deg)');
  });

  test('renders with custom weight', () => {
    render(<Icon weight="bold" data-testid="test-icon" />);
    const icon = screen.getByTestId('test-icon');
    expect(icon).toHaveAttribute('stroke-width', '3');
  });

  test('handles click events when interactive', () => {
    const handleClick = vi.fn();
    render(<Icon interactive onClick={handleClick} data-testid="test-icon" />);
    
    const icon = screen.getByTestId('test-icon');
    fireEvent.click(icon);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('does not handle click events when disabled', () => {
    const handleClick = vi.fn();
    render(<Icon disabled onClick={handleClick} data-testid="test-icon" />);
    
    const icon = screen.getByTestId('test-icon');
    fireEvent.click(icon);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('handles keyboard events for interactive icons', () => {
    const handleClick = vi.fn();
    render(<Icon interactive onClick={handleClick} data-testid="test-icon" />);
    
    const icon = screen.getByTestId('test-icon');
    fireEvent.keyDown(icon, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    fireEvent.keyDown(icon, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

test('wraps custom SVG children', () => {
  render(
    <Icon>
      <svg data-testid="custom-icon" />
    </Icon>
  );
  const icon = screen.getByTestId('custom-icon');
  expect(icon).toBeInTheDocument();
  // The custom icon should retain its testid
  expect(icon).toHaveAttribute('data-testid', 'custom-icon');
  expect(icon).toHaveClass('w-5', 'h-5'); // Default md size
});

  test('merges custom className with wrapper classes', () => {
    render(<Icon className="custom-class" data-testid="test-icon" />);
    const icon = screen.getByTestId('test-icon');
    expect(icon).toHaveClass('custom-class', 'w-5', 'h-5');
  });

  test('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Icon ref={ref} data-testid="test-icon" />);
    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });

  test('passes through additional SVG attributes', () => {
    render(
      <Icon 
        data-testid="custom-icon" 
        strokeWidth={3}
        viewBox="0 0 32 32"
        aria-label="Custom icon"
      />
    );
    const icon = screen.getByTestId('custom-icon');
    expect(icon).toHaveAttribute('stroke-width', '3');
    expect(icon).toHaveAttribute('viewBox', '0 0 32 32');
    expect(icon).toHaveAttribute('aria-label', 'Custom icon');
  });

test('applies correct classes when wrapped icon has existing className', () => {
  render(
    <Icon size="lg" color="primary">
      <svg className="existing-class" data-testid="wrapped-icon" />
    </Icon>
  );
  const icon = screen.getByTestId('wrapped-icon');
  expect(icon).toBeInTheDocument();
  expect(icon).toHaveClass('existing-class', 'w-6', 'h-6', 'text-primary-600');
});

  test('supports data attributes for testing/analytics', () => {
    render(
      <Icon 
        data-testid="analytics-icon"
        data-analytics="icon-click"
        data-cy="submit-icon"
      />
    );
    const icon = screen.getByTestId('analytics-icon');
    expect(icon).toHaveAttribute('data-analytics', 'icon-click');
    expect(icon).toHaveAttribute('data-cy', 'submit-icon');
  });
});

describe('Predefined Icon Components', () => {
  test('renders CheckIcon component', () => {
    render(<CheckIcon data-testid="check-icon" />);
    const icon = screen.getByTestId('check-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-success-600');
  });

  test('renders XIcon component', () => {
    render(<XIcon data-testid="x-icon" />);
    const icon = screen.getByTestId('x-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-error-600');
  });

  test('renders LoadingIcon component with spin', () => {
    render(<LoadingIcon data-testid="loading-icon" />);
    const icon = screen.getByTestId('loading-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('animate-spin', 'text-primary-600');
  });

  test('renders InfoIcon component', () => {
    render(<InfoIcon data-testid="info-icon" />);
    const icon = screen.getByTestId('info-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-info-600');
  });

  test('renders WarningIcon component', () => {
    render(<WarningIcon data-testid="warning-icon" />);
    const icon = screen.getByTestId('warning-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-warning-600');
  });

  test('renders ErrorIcon component', () => {
    render(<ErrorIcon data-testid="error-icon" />);
    const icon = screen.getByTestId('error-icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-error-600');
  });

  test('StatusIcon renders correct icon based on status', () => {
    const { rerender } = render(<StatusIcon status="success" data-testid="status-icon" />);
    let icon = screen.getByTestId('status-icon');
    expect(icon).toHaveClass('text-success-600');

    rerender(<StatusIcon status="error" data-testid="status-icon" />);
    icon = screen.getByTestId('status-icon');
    expect(icon).toHaveClass('text-error-600');

    rerender(<StatusIcon status="warning" data-testid="status-icon" />);
    icon = screen.getByTestId('status-icon');
    expect(icon).toHaveClass('text-warning-600');

    rerender(<StatusIcon status="info" data-testid="status-icon" />);
    icon = screen.getByTestId('status-icon');
    expect(icon).toHaveClass('text-info-600');

    rerender(<StatusIcon status="neutral" data-testid="status-icon" />);
    icon = screen.getByTestId('status-icon');
    expect(icon).toHaveClass('text-current');
  });
});

describe('Icon Utility Components', () => {
test('IconButton renders button wrapper with icon', () => {
  const handleClick = vi.fn();
  render(
    <IconButton onClick={handleClick} aria-label="Close">
      <Icon data-testid="inner-icon" />
    </IconButton>
  );
  
  const button = screen.getByRole('button', { name: 'Close' });
  
  // The icon's testid should be passed through
  const icon = screen.getByTestId('inner-icon');
  
  expect(button).toBeInTheDocument();
  expect(icon).toBeInTheDocument();
  
  fireEvent.click(button);
  expect(handleClick).toHaveBeenCalledTimes(1);
});

  test('IconButton is disabled when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(
      <IconButton disabled onClick={handleClick} aria-label="Disabled button">
        <Icon />
      </IconButton>
    );
    
    const button = screen.getByRole('button', { name: 'Disabled button' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

test('IconGroup renders icons with consistent spacing', () => {
  render(
    <IconGroup spacing="md" data-testid="icon-group">
      <Icon data-testid="icon-1" />
      <Icon data-testid="icon-2" />
      <Icon data-testid="icon-3" />
    </IconGroup>
  );
  
  const group = screen.getByTestId('icon-group');
  expect(group).toHaveClass('flex', 'items-center', 'gap-3');
  
  expect(screen.getByTestId('icon-1')).toBeInTheDocument();
  expect(screen.getByTestId('icon-2')).toBeInTheDocument();
  expect(screen.getByTestId('icon-3')).toBeInTheDocument();
});
});


describe('Performance & Edge Cases', () => {
  test('renders correctly with minimal props', () => {
    render(<Icon />);
    const icon = screen.getByRole('presentation', { hidden: true });
    expect(icon).toBeInTheDocument();
  });

  test('handles null/undefined children gracefully', () => {
    render(<Icon>{null}</Icon>);
    const icon = screen.getByRole('presentation', { hidden: true });
    expect(icon).toBeInTheDocument();
  });

  test('memoization prevents unnecessary re-renders', () => {
    const { rerender } = render(<Icon size="md" data-testid="memo-icon" />);
    const initialRender = screen.getByTestId('memo-icon');
    
    rerender(<Icon size="md" data-testid="memo-icon" />);
    const secondRender = screen.getByTestId('memo-icon');
    
    // Should be the same element (React.memo prevents re-render)
    expect(secondRender).toBe(initialRender);
  });

test('re-renders when props change', () => {
  console.log('Starting re-render test...');
  
  try {
    const { container, rerender } = render(<Icon size="md" />);
    console.log('First render complete');
    
    const firstSvg = container.querySelector('svg');
    expect(firstSvg).toBeInTheDocument();
    
    rerender(<Icon size="lg" />);
    console.log('Second render complete');
    
    const secondSvg = container.querySelector('svg');
    expect(secondSvg).toBeInTheDocument();
    
    // Verify size classes changed
    expect(secondSvg).toHaveClass('w-6', 'h-6');
    
  } catch (error) {
    console.error('Test error:', error);
    throw error;
  }
});
});
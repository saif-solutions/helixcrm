// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Avatar\Avatar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar, AvatarXS, AvatarSM, AvatarMD, AvatarLG } from './Avatar';

// Helper function to get avatar elements consistently
const getAvatar = () => screen.getByTestId('avatar');
const getFallback = () => screen.getByTestId('avatar-fallback');
const getStatus = () => screen.getByTestId('avatar-status');

describe('Avatar Component', () => {
  test('renders avatar with fallback', () => {
    render(<Avatar fallback="John Doe" />);
    expect(getFallback()).toBeInTheDocument();
    expect(getFallback()).toHaveTextContent('JD');
  });

  test('renders with image when src is provided', () => {
    render(<Avatar src="test.jpg" alt="Test User" />);
    const image = screen.getByTestId('avatar-image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'test.jpg');
    expect(image).toHaveAttribute('alt', 'Test User');
  });

  test('shows fallback when image fails to load', () => {
    render(<Avatar src="invalid.jpg" fallback="Fallback" />);
    
    // Initially shows image
    const image = screen.getByTestId('avatar-image');
    expect(image).toBeInTheDocument();
    
    // When image errors, shows fallback
    fireEvent.error(image);
    expect(getFallback()).toBeInTheDocument();
    expect(getFallback()).toHaveTextContent('F');
  });

  test('renders with different sizes', () => {
    const { rerender } = render(<Avatar size="xs" fallback="Test" />);
    expect(getAvatar()).toHaveClass('w-6', 'h-6', 'text-xs');

    rerender(<Avatar size="sm" fallback="Test" />);
    expect(getAvatar()).toHaveClass('w-8', 'h-8', 'text-sm');

    rerender(<Avatar size="md" fallback="Test" />);
    expect(getAvatar()).toHaveClass('w-10', 'h-10', 'text-base');

    rerender(<Avatar size="lg" fallback="Test" />);
    expect(getAvatar()).toHaveClass('w-12', 'h-12', 'text-lg');

    rerender(<Avatar size="xl" fallback="Test" />);
    expect(getAvatar()).toHaveClass('w-16', 'h-16', 'text-xl');
  });

  test('renders with different shapes', () => {
    const { rerender } = render(<Avatar shape="circle" fallback="Test" />);
    expect(getAvatar()).toHaveClass('rounded-full');

    rerender(<Avatar shape="square" fallback="Test" />);
    expect(getAvatar()).toHaveClass('rounded');

    rerender(<Avatar shape="rounded" fallback="Test" />);
    expect(getAvatar()).toHaveClass('rounded-lg');
  });

  test('renders with different colors', () => {
    const { rerender } = render(<Avatar color="primary" fallback="Test" />);
    expect(getAvatar()).toHaveClass('bg-primary-100', 'text-primary-800');

    rerender(<Avatar color="success" fallback="Test" />);
    expect(getAvatar()).toHaveClass('bg-success-100', 'text-success-800');

    rerender(<Avatar color="error" fallback="Test" />);
    expect(getAvatar()).toHaveClass('bg-error-100', 'text-error-800');
  });

  test('renders with status indicators', () => {
    const { rerender } = render(<Avatar status="online" fallback="Test" />);
    expect(getStatus()).toHaveClass('bg-success-500');
    expect(getStatus()).toHaveAttribute('aria-label', 'Status: Online');

    rerender(<Avatar status="offline" fallback="Test" />);
    expect(getStatus()).toHaveClass('bg-gray-400');
    expect(getStatus()).toHaveAttribute('aria-label', 'Status: Offline');

    rerender(<Avatar status="away" fallback="Test" />);
    expect(getStatus()).toHaveClass('bg-warning-500');
    expect(getStatus()).toHaveAttribute('aria-label', 'Status: Away');

    rerender(<Avatar status="busy" fallback="Test" />);
    expect(getStatus()).toHaveClass('bg-error-500');
    expect(getStatus()).toHaveAttribute('aria-label', 'Status: Busy');
  });

  test('does not render status when status is none', () => {
    render(<Avatar status="none" fallback="Test" />);
    expect(screen.queryByTestId('avatar-status')).not.toBeInTheDocument();
  });

  test('extracts initials from fallback text', () => {
    const { rerender } = render(<Avatar fallback="John Doe" />);
    expect(getFallback()).toHaveTextContent('JD');
    expect(getFallback()).toHaveAttribute('data-initials', 'JD');

    rerender(<Avatar fallback="Jane" />);
    expect(getFallback()).toHaveTextContent('J');
    expect(getFallback()).toHaveAttribute('data-initials', 'J');

    rerender(<Avatar fallback="A" />);
    expect(getFallback()).toHaveTextContent('A');
    expect(getFallback()).toHaveAttribute('data-initials', 'A');

    rerender(<Avatar fallback="" />);
    expect(getFallback()).toHaveTextContent('?');
    expect(getFallback()).toHaveAttribute('data-initials', '?');

    rerender(<Avatar fallback="Alice Bob Charlie" />);
    expect(getFallback()).toHaveTextContent('AC');
    expect(getFallback()).toHaveAttribute('data-initials', 'AC');
  });

  test('renders AvatarXS component', () => {
    render(<AvatarXS fallback="Test" />);
    expect(getAvatar()).toHaveClass('w-6', 'h-6');
  });

  test('renders AvatarSM component', () => {
    render(<AvatarSM fallback="Test" />);
    expect(getAvatar()).toHaveClass('w-8', 'h-8');
  });

  test('renders AvatarMD component', () => {
    render(<AvatarMD fallback="Test" />);
    expect(getAvatar()).toHaveClass('w-10', 'h-10');
  });

  test('renders AvatarLG component', () => {
    render(<AvatarLG fallback="Test" />);
    expect(getAvatar()).toHaveClass('w-12', 'h-12');
  });

  test('forwards ref correctly', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Avatar ref={ref} fallback="Test" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  test('applies custom className', () => {
    render(<Avatar className="custom-class" fallback="Test" />);
    expect(getAvatar()).toHaveClass('custom-class');
  });

  test('applies imageClassName to image', () => {
    render(<Avatar src="test.jpg" imageClassName="image-class" />);
    const image = screen.getByTestId('avatar-image');
    expect(image).toHaveClass('image-class');
  });

  test('applies fallbackClassName to fallback', () => {
    render(<Avatar fallback="Test" fallbackClassName="fallback-class" />);
    expect(getFallback()).toHaveClass('fallback-class');
  });

  test('applies statusClassName to status', () => {
    render(<Avatar status="online" statusClassName="status-class" fallback="Test" />);
    expect(getStatus()).toHaveClass('status-class');
  });

  test('passes through data attributes', () => {
    render(
      <Avatar 
        data-testid="custom-avatar"
        data-analytics="avatar-click"
        data-cy="user-avatar"
        fallback="Test"
      />
    );
    
    const avatar = screen.getByTestId('custom-avatar');
    expect(avatar).toHaveAttribute('data-analytics', 'avatar-click');
    expect(avatar).toHaveAttribute('data-cy', 'user-avatar');
  });

  test('renders with status in different positions', () => {
    const { rerender } = render(
      <Avatar status="online" statusPosition="top-left" fallback="Test" />
    );
    expect(getStatus()).toHaveClass('top-0', 'left-0');

    rerender(<Avatar status="online" statusPosition="top-right" fallback="Test" />);
    expect(getStatus()).toHaveClass('top-0', 'right-0');

    rerender(<Avatar status="online" statusPosition="bottom-left" fallback="Test" />);
    expect(getStatus()).toHaveClass('bottom-0', 'left-0');

    rerender(<Avatar status="online" statusPosition="bottom-right" fallback="Test" />);
    expect(getStatus()).toHaveClass('bottom-0', 'right-0');
  });

  test('sets appropriate aria-label for accessibility', () => {
    render(<Avatar src="user.jpg" alt="User Profile" fallback="Test" />);
    expect(getAvatar()).toHaveAttribute('aria-label', 'User Profile');
    expect(getAvatar()).toHaveAttribute('role', 'img');
  });
});
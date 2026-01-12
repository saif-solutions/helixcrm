// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Card\Card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardSubtitle, 
  CardContent, 
  CardFooter, 
  CardActions 
} from './Card';
import { Button } from '../../atoms/Button';

describe('Card Component', () => {
  test('renders card with children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  test('renders with default variant', () => {
    render(<Card>Test</Card>);
    const card = screen.getByText('Test').parentElement;
    expect(card).toHaveClass('bg-white', 'border', 'border-gray-200');
  });

  test('renders with outline variant', () => {
    render(<Card variant="outline">Test</Card>);
    const card = screen.getByText('Test').parentElement;
    expect(card).toHaveClass('bg-transparent', 'border', 'border-gray-300');
  });

  test('renders with ghost variant', () => {
    render(<Card variant="ghost">Test</Card>);
    const card = screen.getByText('Test').parentElement;
    expect(card).toHaveClass('bg-transparent', 'border-0', 'shadow-none');
  });

  test('renders with elevated variant', () => {
    render(<Card variant="elevated">Test</Card>);
    const card = screen.getByText('Test').parentElement;
    expect(card).toHaveClass('bg-white', 'border', 'border-gray-200', 'shadow-lg');
  });

  test('renders with different sizes', () => {
    const { rerender } = render(<Card size="sm">Small</Card>);
    expect(screen.getByText('Small').parentElement).toHaveClass('p-4');

    rerender(<Card size="md">Medium</Card>);
    expect(screen.getByText('Medium').parentElement).toHaveClass('p-6');

    rerender(<Card size="lg">Large</Card>);
    expect(screen.getByText('Large').parentElement).toHaveClass('p-8');
  });

  test('renders hoverable card', () => {
    render(<Card hoverable>Hover me</Card>);
    const card = screen.getByText('Hover me').parentElement;
    expect(card).toHaveClass('hover:shadow-md', 'hover:border-gray-300');
  });

  test('renders clickable card with role and tabindex', () => {
    render(<Card clickable hoverable>Click me</Card>);
    const card = screen.getByText('Click me').parentElement;
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');
    expect(card).toHaveClass('cursor-pointer');
    expect(card).toHaveClass('hover:shadow-md'); // Now includes hover effect
  });

  test('handles click events on clickable card', () => {
    const handleClick = vi.fn(); // Use vi.fn() instead of jest.fn()
    render(
      <Card clickable onClick={handleClick}>
        Click me
      </Card>
    );
    const card = screen.getByText('Click me').parentElement;
    fireEvent.click(card!);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('renders with title prop', () => {
    render(<Card title="Card Title">Content</Card>);
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card Title').tagName).toBe('H3');
  });

  test('renders with subtitle prop', () => {
    render(<Card subtitle="Card Subtitle">Content</Card>);
    expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
  });

  test('renders with both title and subtitle props', () => {
    render(
      <Card title="Title" subtitle="Subtitle">
        Content
      </Card>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });

  test('renders with custom header', () => {
    render(
      <Card header={<div data-testid="custom-header">Custom Header</div>}>
        Content
      </Card>
    );
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
  });

  test('renders with image', () => {
    render(
      <Card
        image={{
          src: 'test.jpg',
          alt: 'Test image',
        }}
      >
        Content
      </Card>
    );
    const image = screen.getByAltText('Test image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'test.jpg');
  });

  test('renders with footer prop', () => {
    render(<Card footer="Footer content">Content</Card>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  test('renders with actions prop', () => {
    render(
      <Card actions={<Button>Action</Button>}>
        Content
      </Card>
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  test('renders CardHeader sub-component', () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Header')).toHaveClass('mb-4');
  });

  test('renders CardTitle sub-component', () => {
    render(
      <Card>
        <CardTitle>Title</CardTitle>
        <CardContent>Content</CardContent>
      </Card>
    );
    const title = screen.getByText('Title');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H3');
    expect(title).toHaveClass('text-lg', 'font-semibold', 'text-gray-900');
  });

  test('renders CardSubtitle sub-component', () => {
    render(
      <Card>
        <CardSubtitle>Subtitle</CardSubtitle>
        <CardContent>Content</CardContent>
      </Card>
    );
    const subtitle = screen.getByText('Subtitle');
    expect(subtitle).toBeInTheDocument();
    expect(subtitle.tagName).toBe('P');
    expect(subtitle).toHaveClass('mt-1', 'text-sm', 'text-gray-500');
  });

  test('renders CardContent sub-component', () => {
    render(
      <Card>
        <CardContent>Content</CardContent>
      </Card>
    );
    const content = screen.getByText('Content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('flex-1');
  });

  test('renders CardFooter sub-component', () => {
    render(
      <Card>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    const footer = screen.getByText('Footer');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('mt-6', 'pt-4', 'border-t', 'border-gray-100');
  });

  test('renders CardActions sub-component', () => {
    render(
      <Card>
        <CardContent>Content</CardContent>
        <CardFooter>
          <CardActions>Actions</CardActions>
        </CardFooter>
      </Card>
    );
    const actions = screen.getByText('Actions');
    expect(actions).toBeInTheDocument();
    expect(actions).toHaveClass('flex', 'items-center', 'gap-2');
  });

  test('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Card ref={ref}>Test</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  test('applies custom className', () => {
    render(<Card className="custom-class">Test</Card>);
    const card = screen.getByText('Test').parentElement;
    expect(card).toHaveClass('custom-class');
  });

  test('applies contentClassName to content area', () => {
    const { container } = render(
      <Card contentClassName="content-class">
        Test
      </Card>
    );
    
    // Find the content wrapper div (has flex-1 class)
    const contentWrapper = container.querySelector('.flex-1');
    expect(contentWrapper).toHaveClass('content-class');
  });

  test('sets data attributes for debugging', () => {
    render(<Card variant="elevated" size="lg" hoverable clickable>Test</Card>);
    const card = screen.getByText('Test').parentElement;
    expect(card).toHaveAttribute('data-variant', 'elevated');
    expect(card).toHaveAttribute('data-size', 'lg');
    expect(card).toHaveAttribute('data-hoverable', 'true');
    expect(card).toHaveAttribute('data-clickable', 'true');
  });
});
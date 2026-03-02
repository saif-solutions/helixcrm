// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Typography\Typography.test.tsx
import { render, screen } from '@testing-library/react';
import { 
  Typography, 
  Display, 
  H1, 
  H2, 
  H3, 
  H4, 
  H5, 
  H6, 
  Body, 
  BodySmall, 
  Caption, 
  Label, 
  Code,
  TypographyLink,
  InlineCode,
  Highlight,
  TypographyProvider,
  TypographyWithContext
} from './Typography';

describe('Typography Component', () => {
  test('renders default Typography component', () => {
    render(<Typography>Test text</Typography>);
    expect(screen.getByText('Test text')).toBeInTheDocument();
  });

  test('renders with custom variant', () => {
    render(<Typography variant="h1">Heading 1</Typography>);
    const element = screen.getByText('Heading 1');
    // Updated to match responsive classes
    expect(element).toHaveClass('text-3xl', 'md:text-4xl', 'lg:text-5xl', 'font-bold', 'tracking-tight', 'leading-tight');
  });

  test('renders with custom color', () => {
    render(<Typography color="primary">Primary text</Typography>);
    const element = screen.getByText('Primary text');
    expect(element).toHaveClass('text-gray-900', 'dark:text-gray-100');
  });

  test('renders H1 component', () => {
    render(<H1>Test Heading</H1>);
    const element = screen.getByText('Test Heading');
    expect(element.tagName).toBe('H1');
    expect(element).toHaveClass('text-3xl', 'md:text-4xl', 'lg:text-5xl', 'font-bold', 'tracking-tight', 'leading-tight');
  });

  test('renders H2 component', () => {
    render(<H2>Test Subheading</H2>);
    const element = screen.getByText('Test Subheading');
    expect(element.tagName).toBe('H2');
    expect(element).toHaveClass('text-2xl', 'md:text-3xl', 'lg:text-4xl', 'font-semibold', 'tracking-tight', 'leading-snug');
  });

  test('renders Body component', () => {
    render(<Body>Test paragraph</Body>);
    const element = screen.getByText('Test paragraph');
    expect(element.tagName).toBe('P');
    expect(element).toHaveClass('text-base', 'md:text-lg', 'lg:text-base', 'font-normal', 'tracking-normal', 'leading-relaxed');
  });

  test('renders Caption component', () => {
    render(<Caption>Test caption</Caption>);
    const element = screen.getByText('Test caption');
    expect(element.tagName).toBe('SPAN');
    expect(element).toHaveClass('text-xs', 'md:text-sm', 'lg:text-xs', 'font-normal', 'tracking-normal', 'leading-normal');
  });

  test('applies truncate class when truncate prop is true', () => {
    render(<Typography truncate>Truncated text</Typography>);
    const element = screen.getByText('Truncated text');
    expect(element).toHaveClass('truncate');
  });

  test('applies uppercase class when uppercase prop is true', () => {
    render(<Typography uppercase>Uppercase text</Typography>);
    const element = screen.getByText('Uppercase text');
    expect(element).toHaveClass('uppercase');
  });

  test('applies italic class when italic prop is true', () => {
    render(<Typography italic>Italic text</Typography>);
    const element = screen.getByText('Italic text');
    expect(element).toHaveClass('italic');
  });

  test('applies underline class when underline prop is true', () => {
    render(<Typography underline>Underlined text</Typography>);
    const element = screen.getByText('Underlined text');
    expect(element).toHaveClass('underline', 'underline-offset-2');
  });

  test('applies custom className', () => {
    render(<Typography className="custom-class">Custom styled</Typography>);
    const element = screen.getByText('Custom styled');
    expect(element).toHaveClass('custom-class');
  });

  test('renders with different HTML element using as prop', () => {
    render(<Typography as="div">Div element</Typography>);
    const element = screen.getByText('Div element');
    expect(element.tagName).toBe('DIV');
  });

  test('renders Display component', () => {
    render(<Display>Display Text</Display>);
    const element = screen.getByText('Display Text');
    expect(element.tagName).toBe('H1');
    expect(element).toHaveClass('text-4xl', 'md:text-5xl', 'lg:text-6xl', 'font-bold', 'tracking-tighter', 'leading-tight');
  });

  test('renders Label component', () => {
    render(<Label>Form Label</Label>);
    const element = screen.getByText('Form Label');
    expect(element.tagName).toBe('LABEL');
    expect(element).toHaveClass('text-sm', 'md:text-base', 'lg:text-sm', 'font-medium', 'tracking-wide', 'leading-normal', 'uppercase');
  });

  test('renders Code component', () => {
    render(<Code>const x = 42;</Code>);
    const element = screen.getByText('const x = 42;');
    expect(element.tagName).toBe('CODE');
    expect(element).toHaveClass('text-sm', 'md:text-base', 'lg:text-sm', 'font-mono', 'font-normal', 'tracking-normal', 'leading-normal', 'bg-gray-100', 'dark:bg-gray-800', 'px-1', 'py-0.5', 'rounded');
  });

  test('applies lineClamp style when lineClamp prop is provided', () => {
    render(<Typography lineClamp={2}>Multi-line text that should be clamped</Typography>);
    const element = screen.getByText('Multi-line text that should be clamped');
    
    // Check that specific styles are applied for line clamping
    expect(element.style.display).toBe('-webkit-box');
    expect(element.style.overflow).toBe('hidden');
    // webkitLineClamp might be set as a number (2) not string ('2')
    expect(parseInt(element.style.webkitLineClamp)).toBe(2);
  });

  test('applies custom weight when weight prop is provided', () => {
    render(<Typography weight="semibold">Semibold text</Typography>);
    const element = screen.getByText('Semibold text');
    expect(element).toHaveClass('font-semibold');
  });

  test('applies custom alignment when align prop is provided', () => {
    render(<Typography align="center">Centered text</Typography>);
    const element = screen.getByText('Centered text');
    expect(element).toHaveClass('text-center');
  });

  test('Label component accepts htmlFor prop', () => {
    render(<Label htmlFor="input-id">Field Label</Label>);
    const element = screen.getByText('Field Label');
    expect(element).toHaveAttribute('for', 'input-id');
  });

  test('renders BodySmall component', () => {
    render(<BodySmall>Small body text</BodySmall>);
    const element = screen.getByText('Small body text');
    expect(element.tagName).toBe('P');
    expect(element).toHaveClass('text-sm', 'md:text-base', 'lg:text-sm', 'font-normal', 'tracking-normal', 'leading-normal');
  });

  test('renders H3 component', () => {
    render(<H3>Heading 3</H3>);
    const element = screen.getByText('Heading 3');
    expect(element.tagName).toBe('H3');
    expect(element).toHaveClass('text-xl', 'md:text-2xl', 'lg:text-3xl', 'font-semibold', 'tracking-normal', 'leading-snug');
  });

  test('renders H4 component', () => {
    render(<H4>Heading 4</H4>);
    const element = screen.getByText('Heading 4');
    expect(element.tagName).toBe('H4');
    expect(element).toHaveClass('text-lg', 'md:text-xl', 'lg:text-2xl', 'font-semibold', 'tracking-normal', 'leading-normal');
  });

  test('renders H5 component', () => {
    render(<H5>Heading 5</H5>);
    const element = screen.getByText('Heading 5');
    expect(element.tagName).toBe('H5');
    expect(element).toHaveClass('text-base', 'md:text-lg', 'lg:text-xl', 'font-medium', 'tracking-normal', 'leading-normal');
  });

  test('renders H6 component', () => {
    render(<H6>Heading 6</H6>);
    const element = screen.getByText('Heading 6');
    expect(element.tagName).toBe('H6');
    expect(element).toHaveClass('text-sm', 'md:text-base', 'lg:text-lg', 'font-medium', 'tracking-normal', 'leading-normal');
  });

  // Edge case tests
  test('does not apply lineClamp styles when lineClamp is not provided', () => {
    render(<Typography>Regular text without line clamp</Typography>);
    const element = screen.getByText('Regular text without line clamp');
    expect(element.style.display).toBe('');
    expect(element.style.overflow).toBe('');
  });

  test('applies multiple style props together', () => {
    render(
      <Typography 
        uppercase 
        italic 
        underline 
        align="right"
        className="custom"
      >
        Styled text
      </Typography>
    );
    const element = screen.getByText('Styled text');
    expect(element).toHaveClass('uppercase', 'italic', 'underline', 'underline-offset-2', 'text-right', 'custom');
  });

  test('Typography with variant="lead" applies lead styling', () => {
    render(<Typography variant="lead">Lead paragraph text</Typography>);
    const element = screen.getByText('Lead paragraph text');
    expect(element).toHaveClass('text-lg', 'md:text-xl', 'lg:text-2xl', 'font-normal', 'tracking-normal', 'leading-relaxed', 'text-gray-600', 'dark:text-gray-400');
  });

  test('Typography with variant="subtitle" applies subtitle styling', () => {
    render(<Typography variant="subtitle">Subtitle text</Typography>);
    const element = screen.getByText('Subtitle text');
    expect(element).toHaveClass('text-base', 'md:text-lg', 'lg:text-base', 'font-medium', 'tracking-wider', 'leading-normal', 'text-gray-500', 'dark:text-gray-500', 'uppercase');
  });

  // New component tests
  test('TypographyLink renders as anchor with proper styling', () => {
    render(<TypographyLink href="/test">Test Link</TypographyLink>);
    const element = screen.getByText('Test Link');
    expect(element.tagName).toBe('A');
    expect(element).toHaveAttribute('href', '/test');
    expect(element).toHaveClass('text-blue-600', 'hover:text-blue-800', 'dark:text-blue-400', 'dark:hover:text-blue-300', 'underline', 'underline-offset-2');
  });

  test('InlineCode renders inline code snippet', () => {
    render(<InlineCode>const x = 42</InlineCode>);
    const element = screen.getByText('const x = 42');
    expect(element.tagName).toBe('CODE');
    expect(element).toHaveClass('inline-block', 'px-1.5', 'py-0.5');
  });

  test('Highlight component applies highlight styling', () => {
    render(<Highlight>Important text</Highlight>);
    const element = screen.getByText('Important text');
    expect(element).toHaveClass('bg-yellow-100', 'dark:bg-yellow-900', 'px-1', 'py-0.5', 'rounded');
  });

  test('TypographyProvider provides default values', () => {
    render(
      <TypographyProvider defaultVariant="h3" defaultColor="primary">
        <TypographyWithContext>Context text</TypographyWithContext>
      </TypographyProvider>
    );
    const element = screen.getByText('Context text');
    expect(element).toHaveClass('text-xl', 'md:text-2xl', 'lg:text-3xl', 'font-semibold', 'tracking-normal', 'leading-snug');
    expect(element).toHaveClass('text-gray-900', 'dark:text-gray-100');
  });
});
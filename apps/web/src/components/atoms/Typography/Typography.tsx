// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Typography\Typography.tsx
import * as React from 'react';
import { cn } from '../../../lib/utils';
import {
  TypographyProps,
  TypographyRef,
  DisplayProps,
  H1Props,
  H2Props,
  H3Props,
  H4Props,
  H5Props,
  H6Props,
  BodyProps,
  BodySmallProps,
  CaptionProps,
  LabelProps,
  CodeProps,
  getTypographyElement,
  getTypographyRole,
  getTypographyAriaLevel,
  isTypographyHeading,
  TypographyVariant,
  TypographyColor,
  TypographyWeight,
} from './Typography.types';
import {
  getTypographyClasses,
  getLineClampStyles,
} from './Typography.styles';

/**
 * Typography component for consistent text rendering throughout the application.
 * 
 * Features:
 * - All heading variants (display, h1-h6)
 * - Body text variants (body, bodySmall, lead, subtitle)
 * - Special variants (caption, label, code)
 * - Full color, weight, alignment, and transformation support
 * - Line clamping and truncation
 * - Semantic HTML elements with proper accessibility
 * - Forward ref support
 * 
 * @example
 * ```tsx
 * <Typography variant="h1">Main Heading</Typography>
 * <Typography variant="body" color="muted">Body text</Typography>
 * <H2>Subheading</H2>
 * <Body>Paragraph text</Body>
 * ```
 */
export const Typography = React.forwardRef<TypographyRef, TypographyProps>(
  (
    {
      as,
      variant = 'body',
      color = 'inherit',
      weight,
      align = 'left',
      truncate = false,
      lineClamp,
      uppercase = false,
      italic = false,
      underline = false,
      selectable = true,
      disabled = false,
      className,
      children,
      ...props
    }: TypographyProps,
    ref: React.Ref<TypographyRef>
  ) => {
    // Determine which HTML element to use
    const Element = as || getTypographyElement(variant);
    
    // Get accessibility props for headings
    const isHeading = isTypographyHeading(variant);
    const accessibilityProps = {
      role: getTypographyRole(variant),
      'aria-level': isHeading ? getTypographyAriaLevel(variant) : undefined,
    };
    
    // Build CSS classes using utility functions
    const typographyClassName = getTypographyClasses(
      variant,
      color,
      weight,
      align,
      truncate,
      uppercase,
      italic,
      underline,
      selectable,
      className,
      disabled
    );
    
    // Get line clamp styles if needed
    const lineClampStyle = getLineClampStyles(lineClamp);
    const combinedStyle = lineClampStyle 
      ? { ...lineClampStyle, ...props.style }
      : props.style;

    return React.createElement(
      Element,
      {
        className: typographyClassName,
        style: combinedStyle,
        ref,
        ...accessibilityProps,
        ...props,
      },
      children
    );
  }
);

Typography.displayName = 'Typography';

// ============================================================================
// Predefined Typography Components (for convenience and semantic usage)
// ============================================================================

/**
 * Display - Largest heading for page titles
 * @example
 * ```tsx
 * <Display>Page Title</Display>
 * ```
 */
export const Display = React.forwardRef<HTMLHeadingElement, DisplayProps>(
  (props: DisplayProps, ref: React.Ref<HTMLHeadingElement>) => (
    <Typography ref={ref} as="h1" variant="display" {...props} />
  )
);
Display.displayName = 'Display';

/**
 * H1 - Main page heading
 * @example
 * ```tsx
 * <H1>Main Section</H1>
 * ```
 */
export const H1 = React.forwardRef<HTMLHeadingElement, H1Props>(
  (props: H1Props, ref: React.Ref<HTMLHeadingElement>) => (
    <Typography ref={ref} as="h1" variant="h1" {...props} />
  )
);
H1.displayName = 'H1';

/**
 * H2 - Section heading
 * @example
 * ```tsx
 * <H2>Subsection</H2>
 * ```
 */
export const H2 = React.forwardRef<HTMLHeadingElement, H2Props>(
  (props: H2Props, ref: React.Ref<HTMLHeadingElement>) => (
    <Typography ref={ref} as="h2" variant="h2" {...props} />
  )
);
H2.displayName = 'H2';

/**
 * H3 - Subsection heading
 * @example
 * ```tsx
 * <H3>Content Heading</H3>
 * ```
 */
export const H3 = React.forwardRef<HTMLHeadingElement, H3Props>(
  (props: H3Props, ref: React.Ref<HTMLHeadingElement>) => (
    <Typography ref={ref} as="h3" variant="h3" {...props} />
  )
);
H3.displayName = 'H3';

/**
 * H4 - Minor heading
 * @example
 * ```tsx
 * <H4>Minor Section</H4>
 * ```
 */
export const H4 = React.forwardRef<HTMLHeadingElement, H4Props>(
  (props: H4Props, ref: React.Ref<HTMLHeadingElement>) => (
    <Typography ref={ref} as="h4" variant="h4" {...props} />
  )
);
H4.displayName = 'H4';

/**
 * H5 - Small heading
 * @example
 * ```tsx
 * <H5>Small Heading</H5>
 * ```
 */
export const H5 = React.forwardRef<HTMLHeadingElement, H5Props>(
  (props: H5Props, ref: React.Ref<HTMLHeadingElement>) => (
    <Typography ref={ref} as="h5" variant="h5" {...props} />
  )
);
H5.displayName = 'H5';

/**
 * H6 - Smallest heading
 * @example
 * ```tsx
 * <H6>Tiny Heading</H6>
 * ```
 */
export const H6 = React.forwardRef<HTMLHeadingElement, H6Props>(
  (props: H6Props, ref: React.Ref<HTMLHeadingElement>) => (
    <Typography ref={ref} as="h6" variant="h6" {...props} />
  )
);
H6.displayName = 'H6';

/**
 * Body - Standard paragraph text
 * @example
 * ```tsx
 * <Body>Paragraph of text...</Body>
 * ```
 */
export const Body = React.forwardRef<HTMLParagraphElement, BodyProps>(
  (props: BodyProps, ref: React.Ref<HTMLParagraphElement>) => (
    <Typography ref={ref} as="p" variant="body" {...props} />
  )
);
Body.displayName = 'Body';

/**
 * BodySmall - Smaller paragraph text
 * @example
 * ```tsx
 * <BodySmall>Secondary text...</BodySmall>
 * ```
 */
export const BodySmall = React.forwardRef<HTMLParagraphElement, BodySmallProps>(
  (props: BodySmallProps, ref: React.Ref<HTMLParagraphElement>) => (
    <Typography ref={ref} as="p" variant="bodySmall" {...props} />
  )
);
BodySmall.displayName = 'BodySmall';

/**
 * Caption - Caption text for images, tables, etc.
 * @example
 * ```tsx
 * <Caption>Figure 1: Chart showing data</Caption>
 * ```
 */
export const Caption = React.forwardRef<HTMLSpanElement, CaptionProps>(
  (props: CaptionProps, ref: React.Ref<HTMLSpanElement>) => (
    <Typography ref={ref} as="span" variant="caption" {...props} />
  )
);
Caption.displayName = 'Caption';

/**
 * Label - Form label or inline label
 * @example
 * ```tsx
 * <Label htmlFor="input-field">Field Label</Label>
 * ```
 */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  (props: LabelProps, ref: React.Ref<HTMLLabelElement>) => (
    <Typography ref={ref} as="label" variant="label" {...props} />
  )
);
Label.displayName = 'Label';

/**
 * Code - Inline code snippet
 * @example
 * ```tsx
 * <Code>const x = 42;</Code>
 * ```
 */
export const Code = React.forwardRef<HTMLElement, CodeProps>(
  (props: CodeProps, ref: React.Ref<HTMLElement>) => (
    <Typography ref={ref} as="code" variant="code" {...props} />
  )
);
Code.displayName = 'Code';

// ============================================================================
// Additional Utility Components (Optional enhancements)
// ============================================================================

/**
 * Link component with typography styling
 * @example
 * ```tsx
 * <TypographyLink href="/about">About Us</TypographyLink>
 * ```
 */
export const TypographyLink = React.forwardRef<HTMLAnchorElement, 
  Omit<TypographyProps, 'as'> & React.AnchorHTMLAttributes<HTMLAnchorElement>
>(
  ({ href, className, children, ...props }, ref) => (
    <a
      ref={ref}
      href={href}
      className={cn(
        getTypographyClasses(
          props.variant || 'body',
          props.color || 'primary',
          props.weight,
          props.align || 'left',
          props.truncate || false,
          props.uppercase || false,
          props.italic || false,
          props.underline || false,
          props.selectable !== false,
          // props.disabled || false,
          className
        ),
        'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300',
        'underline underline-offset-2',
        'transition-colors duration-200'
      )}
      {...props}
    >
      {children}
    </a>
  )
);
TypographyLink.displayName = 'TypographyLink';

/**
 * Inline code component (alternative to Code for inline use)
 */
export const InlineCode = React.forwardRef<HTMLElement, CodeProps>(
  (props: CodeProps, ref: React.Ref<HTMLElement>) => (
    <Code
      ref={ref}
      className={cn(
        'inline-block',
        'px-1.5 py-0.5',
        'text-sm',
        props.className
      )}
      {...props}
    />
  )
);
InlineCode.displayName = 'InlineCode';

/**
 * Text highlight component
 */
export const Highlight = React.forwardRef<HTMLSpanElement, 
  Omit<TypographyProps, 'variant'>
>(
  ({ className, children, ...props }, ref) => (
    <Typography
      ref={ref as React.Ref<HTMLElement>}
      as="span"
      variant="body"
      className={cn(
        'bg-yellow-100 dark:bg-yellow-900',
        'px-1 py-0.5',
        'rounded',
        className
      )}
      {...props}
    >
      {children}
    </Typography>
  )
);
Highlight.displayName = 'Highlight';

/**
 * Typography component context for theming
 */
export const TypographyContext = React.createContext<{
  defaultVariant?: TypographyVariant;
  defaultColor?: TypographyColor;
  defaultWeight?: TypographyWeight;
}>({});

/**
 * TypographyProvider for setting defaults
 */
export const TypographyProvider: React.FC<{
  children: React.ReactNode;
  defaultVariant?: TypographyVariant;
  defaultColor?: TypographyColor;
  defaultWeight?: TypographyWeight;
}> = ({ children, defaultVariant, defaultColor, defaultWeight }) => {
  return (
    <TypographyContext.Provider value={{ defaultVariant, defaultColor, defaultWeight }}>
      {children}
    </TypographyContext.Provider>
  );
};

/**
 * Typography component with context support
 */
export const TypographyWithContext = React.forwardRef<TypographyRef, TypographyProps>(
  (props, ref) => {
    const context = React.useContext(TypographyContext);
    
    // Merge context defaults with props
    const mergedProps = {
      variant: props.variant || context.defaultVariant || 'body',
      color: props.color || context.defaultColor || 'inherit',
      weight: props.weight || context.defaultWeight,
      ...props,
    };
    
    return <Typography ref={ref} {...mergedProps} />;
  }
);
TypographyWithContext.displayName = 'TypographyWithContext';
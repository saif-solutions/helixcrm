// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Typography\Typography.types.ts
import * as React from 'react';

/**
 * Main Typography component props with comprehensive JSDoc
 */
export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  /** 
   * The HTML element to render
   * @default 'p' (or based on variant)
   */
  as?: TypographyElement;
  
  /** 
   * The variant of typography (size, weight, line height)
   * @default 'body'
   */
  variant?: TypographyVariant;
  
  /** 
   * Text color
   * @default 'inherit'
   */
  color?: TypographyColor;
  
  /** 
   * Font weight (overrides variant default if specified)
   */
  weight?: TypographyWeight;
  
  /** 
   * Text alignment
   * @default 'left'
   */
  align?: TypographyAlign;
  
  /** 
   * Whether the text should truncate with ellipsis
   * @default false
   */
  truncate?: boolean;
  
  /** 
   * Number of lines to show before truncating (requires webkit-line-clamp)
   */
  lineClamp?: number;
  
  /** 
   * Whether the text should be uppercase
   * @default false
   */
  uppercase?: boolean;
  
  /** 
   * Whether the text should be italic
   * @default false
   */
  italic?: boolean;
  
  /** 
   * Whether the text should be underlined
   * @default false
   */
  underline?: boolean;
  
  /** 
   * Whether text should be user-selectable
   * @default true
   */
  selectable?: boolean;
  
  /** 
   * Whether the typography is disabled (affects color and opacity)
   * @default false
   */
  disabled?: boolean;
  
  /** 
   * Custom CSS class name
   */
  className?: string;
  
  /** 
   * Child elements (text content)
   */
  children: React.ReactNode;
}

/**
 * HTML elements that can be used for typography
 */
export type TypographyElement = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'h5' 
  | 'h6' 
  | 'p' 
  | 'span' 
  | 'div' 
  | 'label' 
  | 'caption' 
  | 'code' 
  | 'blockquote'
  | 'pre'
  | 'small'
  | 'strong'
  | 'em'
  | 'a'; // ADDED: Support for anchor elements

/**
 * Typography variants (size, weight, line height presets)
 */
export type TypographyVariant = 
  | 'display' 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'h5' 
  | 'h6' 
  | 'body' 
  | 'bodySmall' 
  | 'caption' 
  | 'label' 
  | 'code'
  | 'lead'  // Larger body text
  | 'subtitle';

/**
 * Typography color variants
 */
export type TypographyColor = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'muted' 
  | 'white' 
  | 'inherit'
  | 'current';

/**
 * Typography weight variants
 */
export type TypographyWeight = 
  | 'light' 
  | 'normal' 
  | 'medium' 
  | 'semibold' 
  | 'bold' 
  | 'extrabold'
  | 'black';

/**
 * Typography alignment variants
 */
export type TypographyAlign = 
  | 'left' 
  | 'center' 
  | 'right' 
  | 'justify'
  | 'start'
  | 'end';

/**
 * Typography ref type for forwardRef
 */
export type TypographyRef = HTMLElement;

/**
 * Props for predefined typography components
 */
export type DisplayProps = Omit<TypographyProps, 'variant' | 'as'>;
export type H1Props = Omit<TypographyProps, 'variant' | 'as'>;
export type H2Props = Omit<TypographyProps, 'variant' | 'as'>;
export type H3Props = Omit<TypographyProps, 'variant' | 'as'>;
export type H4Props = Omit<TypographyProps, 'variant' | 'as'>;
export type H5Props = Omit<TypographyProps, 'variant' | 'as'>;
export type H6Props = Omit<TypographyProps, 'variant' | 'as'>;
export type BodyProps = Omit<TypographyProps, 'variant' | 'as'>;
export type BodySmallProps = Omit<TypographyProps, 'variant' | 'as'>;
export type CaptionProps = Omit<TypographyProps, 'variant' | 'as'>;
export type LabelProps = Omit<TypographyProps, 'variant' | 'as'> & { htmlFor?: string };
export type CodeProps = Omit<TypographyProps, 'variant' | 'as'>;

/**
 * Accessibility props for Typography
 */
export interface TypographyAccessibilityProps {
  /** ARIA role for the text element */
  role?: 'heading' | 'paragraph' | 'definition' | 'term';
  
  /** ARIA level for headings (1-6) */
  'aria-level'?: 1 | 2 | 3 | 4 | 5 | 6;
  
  /** ARIA label for screen readers */
  'aria-label'?: string;
  
  /** ARIA description for additional context */
  'aria-describedby'?: string;
  
  /** ARIA live region for dynamic content */
  'aria-live'?: 'polite' | 'assertive' | 'off';
}

/**
 * Utility to get appropriate HTML element for variant
 */
export function getTypographyElement(variant: TypographyVariant): TypographyElement {
  const elementMap: Record<TypographyVariant, TypographyElement> = {
    display: 'h1',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    body: 'p',
    bodySmall: 'p',
    caption: 'span',
    label: 'label',
    code: 'code',
    lead: 'p',
    subtitle: 'p',
  };
  
  return elementMap[variant] || 'p';
}

/**
 * Utility to get appropriate ARIA role for variant
 */
export function getTypographyRole(variant: TypographyVariant): TypographyAccessibilityProps['role'] {
  if (variant.startsWith('h') || variant === 'display') {
    return 'heading';
  }
  
  if (variant === 'body' || variant === 'bodySmall' || variant === 'lead' || variant === 'subtitle') {
    return 'paragraph';
  }
  
  return undefined;
}

/**
 * Utility to get appropriate ARIA level for heading variants
 */
export function getTypographyAriaLevel(variant: TypographyVariant): 1 | 2 | 3 | 4 | 5 | 6 | undefined {
  const levelMap: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
    display: 1,
    h1: 1,
    h2: 2,
    h3: 3,
    h4: 4,
    h5: 5,
    h6: 6,
  };
  
  return levelMap[variant];
}

/**
 * Type guard to check if typography is a heading variant
 */
export function isTypographyHeading(variant: TypographyVariant): boolean {
  return variant === 'display' || variant.startsWith('h');
}

/**
 * Type guard to check if typography should be inline
 */
export function isTypographyInline(variant: TypographyVariant): boolean {
  return variant === 'caption' || variant === 'label' || variant === 'code';
}
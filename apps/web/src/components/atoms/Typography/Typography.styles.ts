// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Typography\Typography.styles.ts
import { 
  TypographyVariant, 
  TypographyColor, 
  TypographyWeight, 
  TypographyAlign 
} from './Typography.types';

/**
 * Design tokens for Typography component
 * Enhanced with more comprehensive design system support
 */
export const typographyTokens = {
  // Font families
  fontFamily: {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  },
  
  // Font sizes (in rem units) - with responsive variants
  fontSize: {
    display: 'text-4xl md:text-5xl lg:text-6xl',     // Responsive display
    h1: 'text-3xl md:text-4xl lg:text-5xl',         // Responsive h1
    h2: 'text-2xl md:text-3xl lg:text-4xl',         // Responsive h2
    h3: 'text-xl md:text-2xl lg:text-3xl',          // Responsive h3
    h4: 'text-lg md:text-xl lg:text-2xl',           // Responsive h4
    h5: 'text-base md:text-lg lg:text-xl',          // Responsive h5
    h6: 'text-sm md:text-base lg:text-lg',          // Responsive h6
    body: 'text-base md:text-lg lg:text-base',      // Responsive body
    bodySmall: 'text-sm md:text-base lg:text-sm',   // Responsive bodySmall
    caption: 'text-xs md:text-sm lg:text-xs',       // Responsive caption
    label: 'text-sm md:text-base lg:text-sm',       // Responsive label
    code: 'text-sm md:text-base lg:text-sm',        // Responsive code
    lead: 'text-lg md:text-xl lg:text-2xl',         // Responsive lead
    subtitle: 'text-base md:text-lg lg:text-base',  // Responsive subtitle
  },
  
  // Line heights
  lineHeight: {
    none: 'leading-none',     // 1
    tight: 'leading-tight',   // 1.25
    snug: 'leading-snug',     // 1.375
    normal: 'leading-normal', // 1.5
    relaxed: 'leading-relaxed', // 1.625
    loose: 'leading-loose',   // 2
  },
  
  // Letter spacing
  letterSpacing: {
    tighter: 'tracking-tighter', // -0.05em
    tight: 'tracking-tight',     // -0.025em
    normal: 'tracking-normal',   // 0
    wide: 'tracking-wide',       // 0.025em
    wider: 'tracking-wider',     // 0.05em
    widest: 'tracking-widest',   // 0.1em
  },
  
  // Font weights
  fontWeight: {
    thin: 'font-thin',       // 100
    extralight: 'font-extralight', // 200
    light: 'font-light',     // 300
    normal: 'font-normal',   // 400
    medium: 'font-medium',   // 500
    semibold: 'font-semibold', // 600
    bold: 'font-bold',       // 700
    extrabold: 'font-extrabold', // 800
    black: 'font-black',     // 900
  },
};

/**
 * Variant configurations with responsive design support
 */
export const typographyVariants: Record<TypographyVariant, string[]> = {
  display: [
    typographyTokens.fontSize.display,
    typographyTokens.fontWeight.bold,
    typographyTokens.letterSpacing.tighter,
    typographyTokens.lineHeight.tight,
  ],
  
  h1: [
    typographyTokens.fontSize.h1,
    typographyTokens.fontWeight.bold,
    typographyTokens.letterSpacing.tight,
    typographyTokens.lineHeight.tight,
  ],
  
  h2: [
    typographyTokens.fontSize.h2,
    typographyTokens.fontWeight.semibold,
    typographyTokens.letterSpacing.tight,
    typographyTokens.lineHeight.snug,
  ],
  
  h3: [
    typographyTokens.fontSize.h3,
    typographyTokens.fontWeight.semibold,
    typographyTokens.letterSpacing.normal,
    typographyTokens.lineHeight.snug,
  ],
  
  h4: [
    typographyTokens.fontSize.h4,
    typographyTokens.fontWeight.semibold,
    typographyTokens.letterSpacing.normal,
    typographyTokens.lineHeight.normal,
  ],
  
  h5: [
    typographyTokens.fontSize.h5,
    typographyTokens.fontWeight.medium,
    typographyTokens.letterSpacing.normal,
    typographyTokens.lineHeight.normal,
  ],
  
  h6: [
    typographyTokens.fontSize.h6,
    typographyTokens.fontWeight.medium,
    typographyTokens.letterSpacing.normal,
    typographyTokens.lineHeight.normal,
  ],
  
  body: [
    typographyTokens.fontSize.body,
    typographyTokens.fontWeight.normal,
    typographyTokens.letterSpacing.normal,
    typographyTokens.lineHeight.relaxed,
  ],
  
  bodySmall: [
    typographyTokens.fontSize.bodySmall,
    typographyTokens.fontWeight.normal,
    typographyTokens.letterSpacing.normal,
    typographyTokens.lineHeight.normal,
  ],
  
  caption: [
    typographyTokens.fontSize.caption,
    typographyTokens.fontWeight.normal,
    typographyTokens.letterSpacing.normal,
    typographyTokens.lineHeight.normal,
  ],
  
  label: [
    typographyTokens.fontSize.label,
    typographyTokens.fontWeight.medium,
    typographyTokens.letterSpacing.wide,
    typographyTokens.lineHeight.normal,
    'uppercase',
  ],
  
  code: [
    typographyTokens.fontSize.code,
    typographyTokens.fontFamily.mono,
    typographyTokens.fontWeight.normal,
    typographyTokens.letterSpacing.normal,
    typographyTokens.lineHeight.normal,
    'bg-gray-100',
    'dark:bg-gray-800',
    'px-1',
    'py-0.5',
    'rounded',
  ],
  
  lead: [
    typographyTokens.fontSize.lead,
    typographyTokens.fontWeight.normal,
    typographyTokens.letterSpacing.normal,
    typographyTokens.lineHeight.relaxed,
    'text-gray-600',
    'dark:text-gray-400',
  ],
  
  subtitle: [
    typographyTokens.fontSize.subtitle,
    typographyTokens.fontWeight.medium,
    typographyTokens.letterSpacing.wider,
    typographyTokens.lineHeight.normal,
    'text-gray-500',
    'dark:text-gray-500',
    'uppercase',
  ],
};

/**
 * Color configurations with dark mode support
 */
export const typographyColors: Record<TypographyColor, string[]> = {
  primary: ['text-gray-900', 'dark:text-gray-100'],
  secondary: ['text-gray-600', 'dark:text-gray-400'],
  success: ['text-green-600', 'dark:text-green-500'],
  error: ['text-red-600', 'dark:text-red-500'],
  warning: ['text-yellow-600', 'dark:text-yellow-500'],
  info: ['text-blue-600', 'dark:text-blue-500'],
  muted: ['text-gray-500', 'dark:text-gray-500'],
  white: ['text-white', 'dark:text-white'],
  inherit: ['text-inherit'],
  current: ['text-current'],
};

/**
 * Alignment configurations
 */
export const typographyAlignments: Record<TypographyAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
  start: 'text-start',
  end: 'text-end',
};

/**
 * Weight configurations
 */
export const typographyWeights: Record<TypographyWeight, string> = {
  light: typographyTokens.fontWeight.light,
  normal: typographyTokens.fontWeight.normal,
  medium: typographyTokens.fontWeight.medium,
  semibold: typographyTokens.fontWeight.semibold,
  bold: typographyTokens.fontWeight.bold,
  extrabold: typographyTokens.fontWeight.extrabold,
  black: typographyTokens.fontWeight.black,
};

/**
 * CSS class definitions for Typography component
 * Enhanced with dark mode support and better organization
 */
export const typographyClasses = {
  // Base classes (applied to all typography)
  base: '',
  
  // Variant classes (now using the variant configurations)
  variant: Object.fromEntries(
    Object.entries(typographyVariants).map(([key, classes]) => [key, classes.join(' ')])
  ) as Record<TypographyVariant, string>,
  
  // Color classes with dark mode
  color: Object.fromEntries(
    Object.entries(typographyColors).map(([key, classes]) => [key, classes.join(' ')])
  ) as Record<TypographyColor, string>,
  
  // Alignment classes
  align: typographyAlignments,
  
  // Weight classes
  weight: typographyWeights,
  
  // Text transformation classes
  transform: {
    uppercase: 'uppercase',
    lowercase: 'lowercase',
    capitalize: 'capitalize',
    normalCase: 'normal-case',
  },
  
  // Text decoration classes
  decoration: {
    underline: 'underline underline-offset-2',
    lineThrough: 'line-through',
    noUnderline: 'no-underline',
  },
  
  // Font style classes
  style: {
    italic: 'italic',
    notItalic: 'not-italic',
  },
  
  // State classes
  state: {
    truncate: 'truncate',
    disabled: 'opacity-50 cursor-not-allowed',
    interactive: 'cursor-pointer hover:opacity-80 transition-opacity',
    selectable: 'select-text',
    nonSelectable: 'select-none',
  },
};

/**
 * Utility function to build Typography CSS classes
 * Enhanced with better type safety and customization
 */
export function getTypographyClasses(
  variant: TypographyVariant = 'body',
  color: TypographyColor = 'inherit',
  weight?: TypographyWeight,
  align: TypographyAlign = 'left',
  truncate?: boolean,
  uppercase?: boolean,
  italic?: boolean,
  underline?: boolean,
  selectable?: boolean,
  className?: string,
  isDisabled?: boolean
): string {
  const classes = [
    // Base classes
    typographyClasses.base,
    
    // Variant (includes size, weight, line height, letter spacing)
    typographyClasses.variant[variant],
    
    // Color with dark mode support
    typographyClasses.color[color],
    
    // Weight (if specified, overrides variant default)
    weight ? typographyClasses.weight[weight] : '',
    
    // Alignment
    typographyClasses.align[align],
    
    // Text transformations
    uppercase ? typographyClasses.transform.uppercase : '',
    italic ? typographyClasses.style.italic : '',
    underline ? typographyClasses.decoration.underline : '',
    
    // State classes
    truncate ? typographyClasses.state.truncate : '',
    selectable ? typographyClasses.state.selectable : typographyClasses.state.nonSelectable,
    isDisabled ? typographyClasses.state.disabled : '',
    
    // Custom classes (always last to allow overrides)
    className || '',
  ];
  
  // Filter out empty strings and join with single spaces
  return classes.filter(Boolean).join(' ');
}

/**
 * Enhanced line clamp utility with fallback for older browsers
 */
export function getLineClampStyles(lineClamp?: number): React.CSSProperties | undefined {
  if (!lineClamp) return undefined;
  
  return {
    display: '-webkit-box',
    WebkitLineClamp: lineClamp,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    // Fallback for browsers that don't support line-clamp
    maxHeight: `calc(${lineClamp} * 1.5em)`,
    lineHeight: '1.5em',
  };
}

/**
 * Get appropriate HTML element for variant
 */
export function getTypographyElement(variant: TypographyVariant): keyof React.JSX.IntrinsicElements {
  const elementMap: Record<TypographyVariant, keyof React.JSX.IntrinsicElements> = {
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
 * Default typography props
 */
export const defaultTypographyProps = {
  variant: 'body' as TypographyVariant,
  color: 'inherit' as TypographyColor,
  align: 'left' as TypographyAlign,
  truncate: false,
  uppercase: false,
  italic: false,
  underline: false,
  selectable: true,
};

/**
 * Check if variant uses monospace font
 */
export function isMonospaceVariant(variant: TypographyVariant): boolean {
  return variant === 'code';
}

/**
 * Get font family for variant
 */
export function getTypographyFontFamily(variant: TypographyVariant): string {
  return isMonospaceVariant(variant) 
    ? typographyTokens.fontFamily.mono 
    : typographyTokens.fontFamily.sans;
}

/**
 * Helper to check if variant is a heading
 */
export function isHeadingVariant(variant: TypographyVariant): boolean {
  return ['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(variant);
}

/**
 * Helper to check if variant is inline
 */
export function isInlineVariant(variant: TypographyVariant): boolean {
  return ['caption', 'label', 'code'].includes(variant);
}

/**
 * Get responsive font size classes for a variant
 */
export function getResponsiveFontSize(variant: TypographyVariant): string {
  return typographyTokens.fontSize[variant] || typographyTokens.fontSize.body;
}
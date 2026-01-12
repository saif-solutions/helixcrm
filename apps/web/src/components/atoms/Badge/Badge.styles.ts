// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Badge\Badge.styles.ts
import { BadgeVariant, BadgeSize, BadgeShape } from './Badge.types';

/**
 * Design tokens for Badge component (following Tailwind CSS system)
 * Enterprise-grade with dark mode support and accessibility
 */
export const badgeTokens = {
  // Size tokens (padding in rem units)
  padding: {
    xs: { x: '0.375rem', y: '0.125rem' },  // px-1.5 py-0.5
    sm: { x: '0.5rem', y: '0.125rem' },    // px-2 py-0.5
    md: { x: '0.625rem', y: '0.125rem' },  // px-2.5 py-0.5
    lg: { x: '0.75rem', y: '0.25rem' },    // px-3 py-1
  },
  
  // Font size tokens
  fontSize: {
    xs: '0.75rem',    // text-xs
    sm: '0.75rem',    // text-xs
    md: '0.875rem',   // text-sm
    lg: '0.875rem',   // text-sm
  },
  
  // Border radius tokens
  borderRadius: {
    square: '0.25rem',     // rounded
    rounded: '0.375rem',   // rounded-md
    pill: '9999px',        // rounded-full
  },
  
  // Icon size tokens
  iconSize: {
    xs: '0.75rem',  // w-3 h-3
    sm: '0.75rem',  // w-3 h-3
    md: '1rem',     // w-4 h-4
    lg: '1rem',     // w-4 h-4
  },
  
  // Transition tokens
  transition: {
    fast: 'duration-150',
    normal: 'duration-200',
    slow: 'duration-300',
  },
};

/**
 * CSS class definitions for Badge component
 * Enterprise-grade with accessibility, dark mode, and performance considerations
 */
export const badgeClasses = {
  // Base classes (applied to all badges)
  base: [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'whitespace-nowrap',
    'transition-colors',
    'motion-reduce:transition-none', // Reduced motion support
  ].join(' '),
  
  // Variant classes (background and text colors with dark mode)
  variant: {
    default: [
      'bg-gray-100',
      'dark:bg-gray-800',
      'text-gray-800',
      'dark:text-gray-200',
    ].join(' '),
    
    primary: [
      'bg-primary-100',
      'dark:bg-primary-900',
      'text-primary-800',
      'dark:text-primary-200',
    ].join(' '),
    
    success: [
      'bg-success-100',
      'dark:bg-success-900',
      'text-success-800',
      'dark:text-success-200',
    ].join(' '),
    
    error: [
      'bg-error-100',
      'dark:bg-error-900',
      'text-error-800',
      'dark:text-error-200',
    ].join(' '),
    
    warning: [
      'bg-warning-100',
      'dark:bg-warning-900',
      'text-warning-800',
      'dark:text-warning-200',
    ].join(' '),
    
    info: [
      'bg-info-100',
      'dark:bg-info-900',
      'text-info-800',
      'dark:text-info-200',
    ].join(' '),
    
    outline: [
      'bg-transparent',
      'border',
      'border-gray-300',
      'dark:border-gray-600',
      'text-gray-700',
      'dark:text-gray-300',
      'hover:bg-gray-50',
      'dark:hover:bg-gray-800',
    ].join(' '),
  },
  
  // Size classes (padding, font size)
  size: {
    xs: [
      'px-1.5',
      'py-0.5',
      'text-xs',
      'leading-tight',
    ].join(' '),
    
    sm: [
      'px-2',
      'py-0.5',
      'text-xs',
      'leading-tight',
    ].join(' '),
    
    md: [
      'px-2.5',
      'py-0.5',
      'text-sm',
      'leading-normal',
    ].join(' '),
    
    lg: [
      'px-3',
      'py-1',
      'text-sm',
      'leading-normal',
    ].join(' '),
  },
  
  // Shape classes (border radius)
  shape: {
    square: 'rounded',
    rounded: 'rounded-md',
    pill: 'rounded-full',
  },
  
  // State classes
  state: {
    clickable: [
      'cursor-pointer',
      'hover:opacity-90',
      'active:opacity-80',
      'transition-opacity',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-1',
      'focus-visible:ring-2', // Enhanced focus for accessibility
      'focus-visible:ring-offset-1',
    ].join(' '),
    disabled: 'opacity-50 cursor-not-allowed',
    truncate: 'truncate max-w-full',
  },
  
  // Icon classes
  icon: {
    container: {
      base: 'flex items-center shrink-0',
      left: 'mr-1.5',
      right: 'ml-1.5',
    },
    size: {
      xs: 'w-3 h-3',
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-4 h-4',
    },
  },
  
  // Accessibility classes
  accessibility: {
    focus: 'focus:outline-none focus:ring-2 focus:ring-offset-1',
    reducedMotion: 'motion-reduce:transition-none',
  },
};

/**
 * Utility function to build Badge CSS classes
 * Enterprise standard: centralized logic, no inline styles
 */
export function getBadgeClasses(
  variant: BadgeVariant = 'default',
  size: BadgeSize = 'md',
  shape: BadgeShape = 'rounded',
  clickable?: boolean,
  truncate?: boolean,
  className?: string
): string {
  const classes = [
    // Base classes
    badgeClasses.base,
    
    // Variant
    badgeClasses.variant[variant],
    
    // Size
    badgeClasses.size[size],
    
    // Shape
    badgeClasses.shape[shape],
    
    // State
    clickable ? badgeClasses.state.clickable : '',
    truncate ? badgeClasses.state.truncate : '',
    
    // Accessibility
    clickable ? badgeClasses.accessibility.focus : '',
    badgeClasses.accessibility.reducedMotion,
    
    // Custom classes
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get icon container classes
 */
export function getIconContainerClasses(
  position: 'left' | 'right',
  size: BadgeSize = 'md'
): string {
  const classes = [
    badgeClasses.icon.container.base,
    position === 'left' 
      ? badgeClasses.icon.container.left 
      : badgeClasses.icon.container.right,
    badgeClasses.icon.size[size],
  ];
  
  return classes.join(' ');
}

/**
 * Utility function to get clickable badge accessibility props
 */
export function getClickableBadgeProps(clickable?: boolean) {
  if (!clickable) return {};
  
  return {
    role: 'button' as const,
    tabIndex: 0 as const,
    'aria-pressed': false as const,
  };
}

/**
 * Get appropriate ARIA role for badge
 */
export function getBadgeAriaRole(clickable?: boolean): 'button' | 'presentation' {
  return clickable ? 'button' : 'presentation';
}

/**
 * Get tab index for badge
 */
export function getBadgeTabIndex(clickable?: boolean): 0 | undefined {
  return clickable ? 0 : undefined;
}

/**
 * Default style props for Badge (for consistency)
 */
export const defaultBadgeStyleProps = {
  borderWidth: '1px',
  transition: 'all 0.2s ease',
  maxWidth: '200px',
};
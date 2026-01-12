// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Button\Button.styles.ts
import { ButtonVariant, ButtonSize } from './Button.types';

/**
 * Design tokens for Button component (following Tailwind CSS system)
 * Aligned with enterprise design system standards
 */
export const buttonTokens = {
  // Spacing tokens (4px grid system)
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
  },
  
  // Border radius tokens
  borderRadius: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  },
  
  // Animation durations
  transition: {
    fast: 'duration-150',
    normal: 'duration-200',
    slow: 'duration-300',
  },
};

/**
 * CSS class definitions for Button component
 * Enterprise-grade with accessibility and performance considerations
 */
export const buttonClasses = {
  // Base classes (applied to all buttons)
  base: [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'border',
    'shadow-sm',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'transition-colors',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'focus-visible:ring-2', // Enhanced focus for accessibility
    'focus-visible:ring-offset-2',
  ].join(' '),
  
  // Variant classes (colors, borders, backgrounds)
  variant: {
    primary: [
      'bg-primary-600',
      'text-white',
      'hover:bg-primary-700',
      'active:bg-primary-800',
      'focus:ring-primary-500',
      'border-transparent',
    ].join(' '),
    
    secondary: [
      'bg-white',
      'text-gray-700',
      'hover:bg-gray-50',
      'active:bg-gray-100',
      'focus:ring-gray-500',
      'border-gray-300',
    ].join(' '),
    
    ghost: [
      'bg-transparent',
      'text-gray-700',
      'hover:bg-gray-100',
      'active:bg-gray-200',
      'focus:ring-gray-500',
      'border-transparent',
    ].join(' '),
    
    danger: [
      'bg-error-600',
      'text-white',
      'hover:bg-error-700',
      'active:bg-error-800',
      'focus:ring-error-500',
      'border-transparent',
    ].join(' '),
    
    success: [
      'bg-success-600',
      'text-white',
      'hover:bg-success-700',
      'active:bg-success-800',
      'focus:ring-success-500',
      'border-transparent',
    ].join(' '),
    
    warning: [
      'bg-warning-600',
      'text-white',
      'hover:bg-warning-700',
      'active:bg-warning-800',
      'focus:ring-warning-500',
      'border-transparent',
    ].join(' '),
    
    outline: [
      'bg-transparent',
      'text-primary-600',
      'border-primary-600',
      'hover:bg-primary-50',
      'active:bg-primary-100',
      'focus:ring-primary-500',
    ].join(' '),
    
    link: [
      'bg-transparent',
      'text-primary-600',
      'hover:underline',
      'active:text-primary-800',
      'border-transparent',
      'shadow-none',
      'hover:bg-transparent',
    ].join(' '),
  },
  
  // Size classes (padding, font size, border radius)
  size: {
    xs: [
      'px-2.5',
      'py-1.5',
      'text-xs',
      'rounded',
    ].join(' '),
    
    sm: [
      'px-3',
      'py-2',
      'text-sm',
      'rounded',
    ].join(' '),
    
    md: [
      'px-4',
      'py-2.5',
      'text-sm',
      'rounded-md',
    ].join(' '),
    
    lg: [
      'px-5',
      'py-3',
      'text-base',
      'rounded-md',
    ].join(' '),
    
    xl: [
      'px-6',
      'py-3.5',
      'text-base',
      'rounded-md',
    ].join(' '),
  },
  
  // Icon-only size classes (square buttons)
  iconSize: {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3',
  },
  
  // State classes
  state: {
    disabled: 'opacity-50 cursor-not-allowed',
    loading: 'cursor-wait',
    fullWidth: 'w-full',
  },
  
  // Accessibility classes
  accessibility: {
    focus: 'focus:outline-none focus:ring-2 focus:ring-offset-2',
    reducedMotion: 'motion-reduce:transition-none',
  },
  
  // Spacing for icons
  iconSpacing: {
    left: 'mr-2',
    right: 'ml-2',
  },
};

/**
 * Loading spinner styles (accessible, reduced motion support)
 */
export const loadingSpinnerClasses = {
  base: 'animate-spin motion-reduce:animate-none',
  size: {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-5 w-5',
  },
  spacing: {
    withText: '-ml-1 mr-2',
    iconOnly: 'm-0',
  },
};

/**
 * Utility function to build Button CSS classes
 * Enterprise standard: centralized logic, no inline styles
 */
export function getButtonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  options?: {
    fullWidth?: boolean;
    disabled?: boolean;
    loading?: boolean;
    iconOnly?: boolean;
    className?: string;
  }
): string {
  const { fullWidth, disabled, loading, iconOnly, className } = options || {};
  
  const classes = [
    // Base classes
    buttonClasses.base,
    
    // Variant
    buttonClasses.variant[variant],
    
    // Size (regular or icon-only)
    iconOnly ? buttonClasses.iconSize[size] : buttonClasses.size[size],
    
    // States
    fullWidth ? buttonClasses.state.fullWidth : '',
    disabled ? buttonClasses.state.disabled : '',
    loading ? buttonClasses.state.loading : '',
    
    // Accessibility
    buttonClasses.accessibility.focus,
    buttonClasses.accessibility.reducedMotion,
    
    // Custom classes
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get icon spacing classes
 */
export function getIconSpacingClasses(
  position: 'left' | 'right',
  iconOnly?: boolean
): string {
  if (iconOnly) return '';
  return position === 'left' 
    ? buttonClasses.iconSpacing.left 
    : buttonClasses.iconSpacing.right;
}

/**
 * Utility function to get loading spinner classes
 */
export function getLoadingSpinnerClasses(
  size: ButtonSize = 'md',
  iconOnly?: boolean
): string {
  const classes = [
    loadingSpinnerClasses.base,
    loadingSpinnerClasses.size[size],
    iconOnly 
      ? loadingSpinnerClasses.spacing.iconOnly 
      : loadingSpinnerClasses.spacing.withText,
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Default style props for Button (for consistency)
 */
export const defaultButtonStyleProps = {
  borderRadius: buttonTokens.borderRadius.md,
  transition: buttonTokens.transition.normal,
};
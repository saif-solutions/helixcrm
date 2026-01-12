// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Input\Input.styles.ts

/**
 * Design tokens for Input component (following Tailwind CSS system)
 */
export const inputTokens = {
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
  
  // Icon sizes
  iconSize: {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  },
};

/**
 * CSS class definitions for Input component
 */
export const inputClasses = {
  // Base classes (applied to all inputs)
  base: [
    'block',
    'w-full',
    'border',
    'shadow-sm',
    'bg-white',
    'text-gray-900',
    'placeholder:text-gray-500',
    'focus:outline-none',
    'focus:ring-1',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'transition-colors',
  ].join(' '),
  
  // Variant classes (border and focus colors)
  variant: {
    default: [
      'border-gray-300',
      'focus:border-primary-500',
      'focus:ring-primary-500',
    ].join(' '),
    
    success: [
      'border-success-300',
      'focus:border-success-500',
      'focus:ring-success-500',
    ].join(' '),
    
    error: [
      'border-error-300',
      'focus:border-error-500',
      'focus:ring-error-500',
    ].join(' '),
    
    warning: [
      'border-warning-300',
      'focus:border-warning-500',
      'focus:ring-warning-500',
    ].join(' '),
  },
  
  // Size classes (padding, font size, border radius)
  size: {
    sm: [
      'px-3',
      'py-1.5',
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
      'px-4',
      'py-3',
      'text-base',
      'rounded-md',
    ].join(' '),
  },
  
  // Wrapper classes
  wrapper: {
    base: 'relative',
    fullWidth: 'w-full',
  },
  
  // Icon container classes
  iconContainer: {
    base: 'absolute inset-y-0 flex items-center pointer-events-none',
    left: 'left-0 pl-3',
    right: 'right-0 pr-3',
  },
  
  // Label classes
  label: {
    base: 'block text-sm font-medium text-gray-700',
  },
  
  // Helper text classes
  helper: {
    base: 'text-sm text-gray-500',
    error: 'text-sm text-error-600',
  },
};

// Type aliases for internal use
type InputVariant = 'default' | 'success' | 'error' | 'warning';
type InputSize = 'sm' | 'md' | 'lg';
type IconPosition = 'left' | 'right';

interface InputClassOptions {
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  hasLeftIcon?: boolean;
  hasRightIcon?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Utility function to build Input CSS classes
 */
export function getInputClasses(
  variant: InputVariant = 'default',
  size: InputSize = 'md',
  options?: InputClassOptions
): string {
  const {
    disabled,
    readonly,
    hasLeftIcon,
    hasRightIcon,
    className,
  } = options || {};
  
  const classes = [
    // Base classes
    inputClasses.base,
    
    // Variant
    inputClasses.variant[variant],
    
    // Size
    inputClasses.size[size],
    
    // States
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    readonly ? 'bg-gray-50' : '',
    
    // Padding adjustments for icons
    hasLeftIcon ? 'pl-10' : '',
    hasRightIcon ? 'pr-10' : '',
    
    // Custom classes
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get icon container classes
 */
export function getIconContainerClasses(position: IconPosition): string {
  const classes = [
    inputClasses.iconContainer.base,
    position === 'left' 
      ? inputClasses.iconContainer.left 
      : inputClasses.iconContainer.right,
  ];
  
  return classes.join(' ');
}

/**
 * Utility function to get wrapper classes
 */
export function getWrapperClasses(fullWidth?: boolean, className?: string): string {
  const classes = [
    inputClasses.wrapper.base,
    fullWidth ? inputClasses.wrapper.fullWidth : '',
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get label classes
 */
export function getLabelClasses(): string {
  return inputClasses.label.base;
}

/**
 * Utility function to get helper text classes
 */
export function getHelperClasses(isError?: boolean): string {
  return isError 
    ? inputClasses.helper.error 
    : inputClasses.helper.base;
}

/**
 * Generate a unique ID for input if not provided
 */
export function generateInputId(name?: string): string {
  const prefix = name ? `input-${name}` : 'input';
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${random}`;
}

/**
 * Generate ARIA describedby attribute from helper and error IDs
 */
export function getAriaDescribedBy(helperId?: string, errorId?: string): string | undefined {
  const ids = [helperId, errorId].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}
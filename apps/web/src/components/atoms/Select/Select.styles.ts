// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Select\Select.styles.ts
import { SelectVariant, SelectSize } from './Select.types';

/**
 * Design tokens for Select component
 * Consistent with HELIX CRM design system
 */
export const selectTokens = {
  // Spacing tokens (in rem units - 4px base)
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '0.75rem', // 12px
    lg: '1rem', // 16px
    xl: '1.5rem', // 24px
    '2xl': '2rem', // 32px
  },

  // Component dimensions - aligned with Tailwind spacing
  dimensions: {
    // Container heights (aligned with Tailwind h-* classes)
    height: {
      xs: '1.75rem', // 28px - h-7
      sm: '2rem', // 32px - h-8
      md: '2.5rem', // 40px - h-10
      lg: '3rem', // 48px - h-12
      xl: '3.5rem', // 56px - h-14
    },

    // Container widths
    width: {
      min: '160px',
      max: '400px',
      full: '100%',
    },

    // Icon sizes (aligned with Tailwind w-* classes)
    icon: {
      xs: '0.75rem', // 12px - w-3
      sm: '1rem', // 16px - w-4
      md: '1.25rem', // 20px - w-5
      lg: '1.5rem', // 24px - w-6
      xl: '1.75rem', // 28px - w-7
    },

    // Dropdown menu
    menu: {
      maxHeight: '250px',
      minWidth: '100%',
      borderRadius: '0.375rem', // 6px
      padding: '0.25rem', // 4px - p-1
    },

    // Padding tokens (aligned with Tailwind p-* classes)
    padding: {
      xs: '0.25rem', // 4px - px-1
      sm: '0.5rem', // 8px - px-2
      md: '0.75rem', // 12px - px-3
      lg: '1rem', // 16px - px-4
      xl: '1.5rem', // 24px - px-6
    },
  },

  // Color tokens (Tailwind palette)
  colors: {
    // Background colors
    background: {
      primary: 'bg-white dark:bg-gray-800',
      disabled: 'bg-gray-100 dark:bg-gray-900',
      error: 'bg-error-50 dark:bg-error-900/20',
      loading: 'bg-gray-50 dark:bg-gray-800/50',
    },

    // Text colors
    text: {
      primary: 'text-gray-900 dark:text-gray-100',
      secondary: 'text-gray-600 dark:text-gray-400',
      placeholder: 'text-gray-500 dark:text-gray-500',
      disabled: 'text-gray-400 dark:text-gray-600',
      error: 'text-error-600 dark:text-error-400',
      success: 'text-success-600 dark:text-success-400',
    },

    // Border colors
    border: {
      primary: 'border-gray-300 dark:border-gray-600',
      hover: 'border-gray-400 dark:border-gray-500',
      focus: 'border-primary-500 dark:border-primary-400',
      error: 'border-error-500 dark:border-error-400',
      disabled: 'border-gray-200 dark:border-gray-700',
    },

    // Variant-specific colors
    variant: {
      primary: {
        background: 'bg-white dark:bg-gray-800',
        border: 'border-gray-300 dark:border-gray-600',
        text: 'text-gray-900 dark:text-gray-100',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700',
        focus:
          'focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400',
      },
      secondary: {
        background: 'bg-gray-50 dark:bg-gray-800',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-800 dark:text-gray-200',
        hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
        focus:
          'focus:border-gray-500 focus:ring-gray-500 dark:focus:border-gray-400 dark:focus:ring-gray-400',
      },
      outline: {
        background: 'bg-transparent',
        border: 'border-primary-500 dark:border-primary-400',
        text: 'text-primary-600 dark:text-primary-400',
        hover: 'hover:bg-primary-50 dark:hover:bg-primary-900/20',
        focus:
          'focus:border-primary-600 focus:ring-primary-600 dark:focus:border-primary-500 dark:focus:ring-primary-500',
      },
      ghost: {
        background: 'bg-transparent',
        border: 'border-transparent',
        text: 'text-gray-700 dark:text-gray-300',
        hover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
        focus:
          'focus:border-gray-300 focus:ring-gray-300 dark:focus:border-gray-600 dark:focus:ring-gray-600',
      },
      filled: {
        background: 'bg-gray-100 dark:bg-gray-800',
        border: 'border-transparent',
        text: 'text-gray-800 dark:text-gray-200',
        hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
        focus:
          'focus:bg-white focus:border-primary-500 focus:ring-primary-500 dark:focus:bg-gray-800 dark:focus:border-primary-400 dark:focus:ring-primary-400',
      },
      minimal: {
        background: 'bg-transparent',
        border: 'border-transparent',
        text: 'text-gray-700 dark:text-gray-300',
        hover: 'hover:text-gray-900 dark:hover:text-gray-100',
        focus: 'focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600',
      },
    },

    // Option states
    option: {
      default: {
        background: 'bg-white dark:bg-gray-800',
        text: 'text-gray-900 dark:text-gray-100',
        hover: 'hover:bg-gray-50 dark:hover:bg-gray-700',
        active: 'active:bg-gray-100 dark:active:bg-gray-600',
      },
      selected: {
        background: 'bg-primary-50 dark:bg-primary-900/30',
        text: 'text-primary-700 dark:text-primary-300',
        hover: 'hover:bg-primary-100 dark:hover:bg-primary-900/40',
      },
      focused: {
        background: 'bg-gray-100 dark:bg-gray-700',
        text: 'text-gray-900 dark:text-gray-100',
        ring: 'ring-1 ring-primary-500 dark:ring-primary-400',
      },
      disabled: {
        background: 'bg-gray-50 dark:bg-gray-900',
        text: 'text-gray-400 dark:text-gray-600',
        cursor: 'cursor-not-allowed',
      },
      group: {
        background: 'bg-gray-50 dark:bg-gray-900',
        text: 'text-gray-700 dark:text-gray-400',
        border: 'border-t border-gray-200 dark:border-gray-700',
      },
    },
  },

  // Typography tokens
  typography: {
    fontFamily: 'font-sans',
    fontWeight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
    fontSize: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    lineHeight: {
      xs: 'leading-4',
      sm: 'leading-5',
      md: 'leading-6',
      lg: 'leading-7',
      xl: 'leading-8',
    },
  },

  // Border radius tokens
  borderRadius: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  },

  // Shadow tokens
  shadow: {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    inner: 'shadow-inner',
  },

  // Animation durations
  animation: {
    fast: 'duration-100',
    normal: 'duration-200',
    slow: 'duration-300',
    verySlow: 'duration-500',
  },

  // Transition tokens
  transition: {
    all: 'transition-all',
    colors: 'transition-colors',
    opacity: 'transition-opacity',
    transform: 'transition-transform',
  },

  // Z-index layers
  zIndex: {
    base: 'z-0',
    dropdown: 'z-10',
    overlay: 'z-50',
    modal: 'z-100',
  },
};

/**
 * CSS class definitions for Select component
 * Tailwind-compatible with dark mode support
 */
export const selectClasses = {
  // Base container classes
  base: [
    'relative',
    'inline-flex',
    'items-center',
    'justify-between',
    'w-full',
    'font-sans',
    'font-normal',
    'text-left',
    'cursor-pointer',
    'outline-none',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-1',
    'focus:ring-primary-500',
    'dark:focus:ring-primary-400',
    'focus:ring-offset-white',
    'dark:focus:ring-offset-gray-800',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
  ].join(' '),

  // Size variants - using token-aligned classes
  size: {
    xs: [
      'h-7', // 1.75rem
      'px-2', // 0.5rem
      'py-1', // 0.25rem
      'text-xs',
      'gap-1',
      'min-w-[160px]',
    ].join(' '),
    sm: [
      'h-8', // 2rem
      'px-3', // 0.75rem
      'py-1.5', // 0.375rem
      'text-sm',
      'gap-1.5',
      'min-w-[180px]',
    ].join(' '),
    md: [
      'h-10', // 2.5rem
      'px-4', // 1rem
      'py-2', // 0.5rem
      'text-base',
      'gap-2',
      'min-w-[200px]',
    ].join(' '),
    lg: [
      'h-12', // 3rem
      'px-5', // 1.25rem
      'py-2.5', // 0.625rem
      'text-lg',
      'gap-2.5',
      'min-w-[220px]',
    ].join(' '),
    xl: [
      'h-14', // 3.5rem
      'px-6', // 1.5rem
      'py-3', // 0.75rem
      'text-xl',
      'gap-3',
      'min-w-[240px]',
    ].join(' '),
  },

  // Visual variants with type-safe access
  variant: {
    primary: [
      'bg-white',
      'dark:bg-gray-800',
      'border',
      'border-gray-300',
      'dark:border-gray-600',
      'text-gray-900',
      'dark:text-gray-100',
      'hover:border-gray-400',
      'dark:hover:border-gray-500',
      'hover:bg-gray-50',
      'dark:hover:bg-gray-700',
      'rounded-md',
    ].join(' '),
    secondary: [
      'bg-gray-50',
      'dark:bg-gray-800',
      'border',
      'border-gray-200',
      'dark:border-gray-700',
      'text-gray-800',
      'dark:text-gray-200',
      'hover:border-gray-300',
      'dark:hover:border-gray-600',
      'hover:bg-gray-100',
      'dark:hover:bg-gray-700',
      'rounded-md',
    ].join(' '),
    outline: [
      'bg-transparent',
      'border',
      'border-primary-500',
      'dark:border-primary-400',
      'text-primary-600',
      'dark:text-primary-400',
      'hover:border-primary-600',
      'dark:hover:border-primary-500',
      'hover:bg-primary-50',
      'dark:hover:bg-primary-900/20',
      'rounded-md',
    ].join(' '),
    ghost: [
      'bg-transparent',
      'border',
      'border-transparent',
      'text-gray-700',
      'dark:text-gray-300',
      'hover:bg-gray-100',
      'dark:hover:bg-gray-800',
      'hover:text-gray-900',
      'dark:hover:text-gray-100',
      'rounded-md',
    ].join(' '),
    filled: [
      'bg-gray-100',
      'dark:bg-gray-800',
      'border',
      'border-transparent',
      'text-gray-800',
      'dark:text-gray-200',
      'hover:bg-gray-200',
      'dark:hover:bg-gray-700',
      'focus:bg-white',
      'dark:focus:bg-gray-800',
      'rounded-md',
    ].join(' '),
    minimal: [
      'bg-transparent',
      'border',
      'border-transparent',
      'text-gray-700',
      'dark:text-gray-300',
      'hover:text-gray-900',
      'dark:hover:text-gray-100',
      'focus:ring-1',
      'focus:ring-gray-300',
      'dark:focus:ring-gray-600',
    ].join(' '),
  },

  // State classes
  state: {
    disabled: ['opacity-60', 'cursor-not-allowed', 'pointer-events-none', 'select-none'].join(' '),
    loading: ['cursor-wait', 'opacity-70', 'select-none'].join(' '),
    error: [
      'border-error-500',
      'dark:border-error-400',
      'text-error-600',
      'dark:text-error-400',
      'focus:border-error-500',
      'dark:focus:border-error-400',
      'focus:ring-error-500',
      'dark:focus:ring-error-500',
      'bg-error-50',
      'dark:bg-error-900/20',
    ].join(' '),
    open: [
      'ring-2',
      'ring-primary-500',
      'dark:ring-primary-400',
      'ring-offset-1',
      'ring-offset-white',
      'dark:ring-offset-gray-800',
    ].join(' '),
  },

  // Dropdown menu classes
  menu: {
    base: [
      'absolute',
      'z-10',
      'mt-1',
      'w-full',
      'overflow-auto',
      'rounded-md',
      'bg-white',
      'dark:bg-gray-800',
      'shadow-lg',
      'border',
      'border-gray-200',
      'dark:border-gray-700',
      'py-1',
      'focus:outline-none',
    ].join(' '),
    position: {
      top: 'bottom-full mb-1',
      bottom: 'top-full mt-1',
      auto: 'mt-1',
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
  },

  // Option classes
  option: {
    base: [
      'relative',
      'cursor-pointer',
      'select-none',
      'px-4',
      'py-2',
      'transition-colors',
      'duration-150',
      'focus:outline-none',
    ].join(' '),
    state: {
      default: ['text-gray-900', 'dark:text-gray-100', 'bg-white', 'dark:bg-gray-800'].join(' '),
      selected: [
        'bg-primary-50',
        'dark:bg-primary-900/30',
        'text-primary-700',
        'dark:text-primary-300',
        'font-medium',
      ].join(' '),
      focused: ['bg-gray-100', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-gray-100'].join(' '),
      disabled: [
        'opacity-50',
        'cursor-not-allowed',
        'text-gray-400',
        'dark:text-gray-600',
        'pointer-events-none',
      ].join(' '),
    },
    // Option parts
    content: ['flex', 'items-center', 'justify-between', 'gap-2'].join(' '),
    label: ['block', 'truncate'].join(' '),
    description: ['block', 'text-xs', 'text-gray-500', 'dark:text-gray-400', 'truncate'].join(' '),
    icon: ['flex-shrink-0', 'w-4', 'h-4'].join(' '),
    check: ['flex-shrink-0', 'w-5', 'h-5', 'text-primary-600', 'dark:text-primary-400'].join(' '),
  },

  // Option group classes
  optionGroup: {
    base: [
      'px-4',
      'py-2',
      'text-xs',
      'font-semibold',
      'text-gray-500',
      'dark:text-gray-400',
      'uppercase',
      'tracking-wide',
      'bg-gray-50',
      'dark:bg-gray-900',
      'border-t',
      'border-gray-200',
      'dark:border-gray-700',
      'first:border-t-0',
      'cursor-default',
    ].join(' '),
    disabled: ['opacity-50', 'cursor-not-allowed'].join(' '),
  },

  // Loading indicator
  loading: {
    base: [
      'absolute',
      'inset-0',
      'flex',
      'items-center',
      'justify-center',
      'bg-white/50',
      'dark:bg-gray-800/50',
      'backdrop-blur-sm',
      'z-10',
    ].join(' '),
    spinner: ['animate-spin', 'w-5', 'h-5', 'text-primary-600', 'dark:text-primary-400'].join(' '),
  },

  // Icon classes
  icon: {
    base: [
      'flex-shrink-0',
      'text-gray-400',
      'dark:text-gray-500',
      'transition-transform',
      'duration-200',
    ].join(' '),
    open: 'rotate-180',
    size: {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-7 h-7',
    },
  },

  // Clear button
  clear: {
    base: [
      'flex-shrink-0',
      'p-1',
      'rounded',
      'text-gray-400',
      'dark:text-gray-500',
      'hover:text-gray-600',
      'dark:hover:text-gray-400',
      'hover:bg-gray-100',
      'dark:hover:bg-gray-700',
      'focus:outline-none',
      'focus:ring-1',
      'focus:ring-gray-300',
      'dark:focus:ring-gray-600',
      'transition-colors',
      'duration-150',
    ].join(' '),
    icon: ['w-4', 'h-4'].join(' '),
  },

  // Search input (for searchable select)
  search: {
    base: [
      'w-full',
      'px-4',
      'py-2',
      'border-b',
      'border-gray-200',
      'dark:border-gray-700',
      'bg-transparent',
      'focus:outline-none',
      'focus:ring-0',
      'text-sm',
    ].join(' '),
    input: [
      'w-full',
      'bg-transparent',
      'border-none',
      'focus:outline-none',
      'focus:ring-0',
      'placeholder:text-gray-400',
      'dark:placeholder:text-gray-500',
    ].join(' '),
  },

  // Multi-select tags
  tags: {
    container: ['flex', 'flex-wrap', 'gap-1', 'flex-1', 'min-w-0'].join(' '),
    tag: {
      base: [
        'inline-flex',
        'items-center',
        'gap-1',
        'px-2',
        'py-0.5',
        'text-xs',
        'font-medium',
        'rounded',
        'bg-primary-100',
        'dark:bg-primary-900/30',
        'text-primary-700',
        'dark:text-primary-300',
      ].join(' '),
      remove: [
        'flex-shrink-0',
        'w-3',
        'h-3',
        'rounded-full',
        'hover:bg-primary-200',
        'dark:hover:bg-primary-800',
        'focus:outline-none',
        'focus:ring-1',
        'focus:ring-primary-500',
        'dark:focus:ring-primary-400',
      ].join(' '),
    },
  },

  // Accessibility
  accessibility: {
    screenReaderOnly: ['sr-only'].join(' '),
    focusIndicator: [
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-primary-500',
      'dark:focus:ring-primary-400',
      'focus:ring-offset-2',
    ].join(' '),
    reducedMotion: ['motion-reduce:transition-none', 'motion-reduce:transform-none'].join(' '),
  },

  // Utility classes
  utility: {
    truncate: ['truncate', 'overflow-hidden', 'text-ellipsis', 'whitespace-nowrap'].join(' '),
    scrollbar: [
      'scrollbar-thin',
      'scrollbar-thumb-gray-300',
      'dark:scrollbar-thumb-gray-600',
      'scrollbar-track-transparent',
    ].join(' '),
  },
};

/**
 * Type-safe access to class maps
 */
const getSizeClass = (size: SelectSize): string => {
  return selectClasses.size[size] || selectClasses.size.md;
};

const getVariantClass = (variant: SelectVariant): string => {
  return selectClasses.variant[variant] || selectClasses.variant.primary;
};

const getMenuSizeClass = (size: SelectSize): string => {
  return selectClasses.menu.size[size] || selectClasses.menu.size.md;
};

const getOptionStateClass = (state: keyof typeof selectClasses.option.state): string => {
  return selectClasses.option.state[state] || selectClasses.option.state.default;
};

const getIconSizeClass = (size: SelectSize): string => {
  return selectClasses.icon.size[size] || selectClasses.icon.size.md;
};

/**
 * Utility function to build Select container classes
 */
export function getSelectClasses(
  variant: SelectVariant = 'primary',
  size: SelectSize = 'md',
  error?: boolean,
  disabled?: boolean,
  loading?: boolean,
  isOpen?: boolean,
  className?: string
): string {
  const classes = [
    selectClasses.base,
    getSizeClass(size),
    getVariantClass(variant),
    error ? (selectClasses.state.error ?? '') : '',
    disabled ? (selectClasses.state.disabled ?? '') : '',
    loading ? (selectClasses.state.loading ?? '') : '',
    isOpen ? (selectClasses.state.open ?? '') : '',
    className || '',
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build menu classes
 */
export function getMenuClasses(
  size: SelectSize = 'md',
  position: 'top' | 'bottom' | 'auto' = 'bottom',
  className?: string
): string {
  const positionClass = selectClasses.menu.position[position] ?? selectClasses.menu.position.bottom;

  const classes = [
    selectClasses.menu.base,
    positionClass,
    getMenuSizeClass(size),
    selectClasses.utility.scrollbar,
    className || '',
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build option classes
 */
export function getOptionClasses(
  size: SelectSize = 'md',
  isSelected: boolean = false,
  isFocused: boolean = false,
  isDisabled: boolean = false,
  className?: string
): string {
  const stateClass = isSelected ? getOptionStateClass('selected') : getOptionStateClass('default');

  const sizePadding = getSizeClass(size);

  const classes = [
    selectClasses.option.base,
    // Add size-specific classes
    sizePadding.includes('px-') ? '' : '', // This was causing issue
    stateClass,
    isFocused && !isSelected ? getOptionStateClass('focused') : '',
    isDisabled ? getOptionStateClass('disabled') : '',
    className || '',
  ];

  return classes.filter((cls) => cls && cls.trim()).join(' ');
}

/**
 * Utility function to build option group classes
 */
export function getOptionGroupClasses(isDisabled: boolean = false, className?: string): string {
  const classes = [
    selectClasses.optionGroup.base,
    isDisabled ? (selectClasses.optionGroup.disabled ?? '') : '',
    className || '',
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build icon classes
 */
export function getIconClasses(
  size: SelectSize = 'md',
  isOpen: boolean = false,
  className?: string
): string {
  const classes = [
    selectClasses.icon.base,
    getIconSizeClass(size),
    isOpen ? (selectClasses.icon.open ?? '') : '',
    className || '',
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build loading spinner classes
 */
export function getLoadingClasses(className?: string): string {
  const classes = [selectClasses.loading.base, className || ''];

  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build multi-select tag classes
 */
export function getTagClasses(isRemovable: boolean = true, className?: string): string {
  const classes = [selectClasses.tags.tag.base, isRemovable ? '' : 'pr-2', className || ''];

  return classes.filter(Boolean).join(' ');
}

/**
 * Memoized version of getSelectClasses for performance
 */
export function memoizedGetSelectClasses(
  variant: SelectVariant = 'primary',
  size: SelectSize = 'md',
  error?: boolean,
  disabled?: boolean,
  loading?: boolean,
  isOpen?: boolean
): () => string {
  let cache: string | null = null;
  let cacheKey = `${variant}-${size}-${error}-${disabled}-${loading}-${isOpen}`;

  return () => {
    const newKey = `${variant}-${size}-${error}-${disabled}-${loading}-${isOpen}`;
    if (cache && cacheKey === newKey) {
      return cache;
    }

    cache = getSelectClasses(variant, size, error, disabled, loading, isOpen);
    cacheKey = newKey;
    return cache;
  };
}

/**
 * Default style props
 */
export const defaultSelectStyleProps = {
  minWidth: selectTokens.dimensions.width.min,
  maxWidth: selectTokens.dimensions.width.max,
  maxMenuHeight: selectTokens.dimensions.menu.maxHeight,
  minMenuWidth: selectTokens.dimensions.menu.minWidth,
  borderRadius: selectTokens.borderRadius.md,
  transition: 'all 0.2s ease',
  zIndex: selectTokens.zIndex.dropdown,
};

/**
 * Get appropriate ARIA labels for accessibility
 */
export function getSelectAriaLabel(
  label?: string,
  placeholder?: string,
  selectedCount: number = 0,
  multiple: boolean = false
): string {
  if (label) return label;

  if (multiple && selectedCount > 0) {
    return `${selectedCount} option${selectedCount > 1 ? 's' : ''} selected`;
  }

  return placeholder || 'Select an option';
}

/**
 * Generate test ID for select elements
 */
export function getSelectTestId(
  testId?: string,
  element: 'container' | 'menu' | 'option' | 'trigger' = 'container',
  value?: string | number
): string {
  const base = testId || 'select';

  switch (element) {
    case 'menu':
      return `${base}-menu`;
    case 'option':
      return value !== undefined
        ? `${base}-option-${String(value).replace(/\s+/g, '-').toLowerCase()}`
        : `${base}-option`;
    case 'trigger':
      return `${base}-trigger`;
    default:
      return base;
  }
}

/**
 * Style utility for virtualization wrapper
 */
export function getVirtualizedStyles(
  itemHeight: number = 40,
  overscan: number = 5,
  containerHeight: string = '100%'
): React.CSSProperties {
  return {
    position: 'relative',
    height: containerHeight,
    width: '100%',
    overflow: 'auto',
    willChange: 'transform',
    '--item-height': `${itemHeight}px`,
    '--overscan': overscan,
  } as React.CSSProperties;
}

/**
 * Style utility for virtualized item
 */
export function getVirtualizedItemStyles(
  index: number,
  itemHeight: number = 40
): React.CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: `${itemHeight}px`,
    transform: `translateY(${index * itemHeight}px)`,
    willChange: 'transform',
  } as React.CSSProperties;
}

/**
 * Get item height based on size
 */
export function getItemHeightBySize(size: SelectSize = 'md'): number {
  const heightMap: Record<SelectSize, number> = {
    xs: 32,
    sm: 36,
    md: 40,
    lg: 44,
    xl: 48,
  };

  return heightMap[size] || heightMap.md;
}

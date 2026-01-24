// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dropdown\Dropdown.styles.ts
import { DropdownItemVariant } from './Dropdown.types';

/**
 * Animation phase mapping type
 */
export type DropdownAnimationPhaseMap = {
  enter: string;
  'enter-active': string;
  exit: string;
  'exit-active': string;
};

/**
 * Typed Design Tokens Interface
 */
export interface DropdownTokens {
  spacing: Record<string, string>;
  dimensions: {
    width: Record<string, string>;
    height: Record<string, string>;
    padding: Record<string, string>;
    borderRadius: Record<string, string>;
    icon: Record<string, string>;
  };
  colors: {
    background: {
      primary: string;
      overlay: {
        light: string;
        medium: string;
        dark: string;
        blur: string;
      };
      variant: Record<DropdownItemVariant, string>;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
      variant: Record<DropdownItemVariant, string>;
    };
    border: {
      primary: string;
      divider: string;
      focus: string;
      error: string;
      warning: string;
      success: string;
      variant: Record<DropdownItemVariant, string>;
    };
    icon: {
      primary: string;
      secondary: string;
      variant: Record<DropdownItemVariant, string>;
      disabled: string;
    };
    action: {
      primary: string;
      secondary: string;
      outline: string;
      ghost: string;
      error: string;
      success: string;
      warning: string;
      info: string;
      disabled: string;
      loading: string;
      hover: Record<DropdownItemVariant, string>;
      active: Record<DropdownItemVariant, string>;
    };
  };
  typography: {
    fontFamily: Record<string, string>;
    fontWeight: Record<string, string>;
    fontSize: Record<string, string>;
    lineHeight: Record<string, string>;
  };
  shadow: Record<string, string>;
  animation: Record<string, string>;
  transition: Record<string, string>;
  zIndex: {
    dropdown: number;
    overlay: number;
    nested: Record<string, number>;
  };
  backdrop: Record<string, string>;
}

/**
 * Design tokens for Dropdown component (numeric zIndex)
 */
export const dropdownTokens: DropdownTokens = Object.freeze({
  spacing: {
    none: '0',
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem',
  },

  dimensions: {
    width: {
      xs: '8rem',
      sm: '10rem',
      md: '12rem',
      lg: '14rem',
      xl: '16rem',
      auto: 'auto',
      fit: 'fit-content',
    },

    height: {
      auto: 'auto',
      xs: '2rem',
      sm: '2.5rem',
      md: '3rem',
      lg: '3.5rem',
      xl: '4rem',
    },

    padding: {
      none: '0',
      xs: '0.25rem',
      sm: '0.5rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },

    borderRadius: {
      none: '0',
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      '2xl': '1rem',
      full: '9999px',
    },

    icon: {
      xs: '0.75rem',
      sm: '1rem',
      md: '1.25rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '2.5rem',
    },
  },

  colors: {
    background: {
      primary: 'bg-white dark:bg-gray-800',
      overlay: {
        light: 'bg-black/10',
        medium: 'bg-black/30',
        dark: 'bg-black/50',
        blur: 'backdrop-blur-sm',
      },
      variant: {
        default: 'bg-white dark:bg-gray-800',
        destructive: 'bg-error-50 dark:bg-error-900/20',
        success: 'bg-success-50 dark:bg-success-900/20',
        warning: 'bg-warning-50 dark:bg-warning-900/20',
        info: 'bg-info-50 dark:bg-info-900/20',
      },
    },

    text: {
      primary: 'text-gray-900 dark:text-gray-100',
      secondary: 'text-gray-600 dark:text-gray-400',
      muted: 'text-gray-500 dark:text-gray-500',
      inverse: 'text-white dark:text-gray-900',
      variant: {
        default: 'text-gray-900 dark:text-gray-100',
        destructive: 'text-error-700 dark:text-error-300',
        success: 'text-success-700 dark:text-success-300',
        warning: 'text-warning-700 dark:text-warning-300',
        info: 'text-info-700 dark:text-info-300',
      },
    },

    border: {
      primary: 'border-gray-200 dark:border-gray-700',
      divider: 'border-gray-100 dark:border-gray-800',
      focus: 'border-primary-500 dark:border-primary-400',
      error: 'border-error-500 dark:border-error-400',
      warning: 'border-warning-500 dark:border-warning-400',
      success: 'border-success-500 dark:border-success-400',
      variant: {
        default: 'border-gray-200 dark:border-gray-700',
        destructive: 'border-error-200 dark:border-error-800',
        success: 'border-success-200 dark:border-success-800',
        warning: 'border-warning-200 dark:border-warning-800',
        info: 'border-info-200 dark:border-info-800',
      },
    },

    icon: {
      primary: 'text-gray-500 dark:text-gray-400',
      secondary: 'text-gray-400 dark:text-gray-500',
      variant: {
        default: 'text-gray-500 dark:text-gray-400',
        destructive: 'text-error-500 dark:text-error-400',
        success: 'text-success-500 dark:text-success-400',
        warning: 'text-warning-500 dark:text-warning-400',
        info: 'text-info-500 dark:text-info-400',
      },
      disabled: 'text-gray-300 dark:text-gray-600',
    },

    action: {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white',
      secondary:
        'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
      outline:
        'border border-primary-600 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20',
      ghost: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
      error: 'bg-error-600 hover:bg-error-700 text-white',
      success: 'bg-success-600 hover:bg-success-700 text-white',
      warning: 'bg-warning-600 hover:bg-warning-700 text-white',
      info: 'bg-info-600 hover:bg-info-700 text-white',
      disabled: 'opacity-50 cursor-not-allowed',
      loading: 'opacity-75 cursor-wait',
      hover: {
        default: 'hover:bg-gray-100 dark:hover:bg-gray-800',
        destructive: 'hover:bg-error-50 dark:hover:bg-error-900/30',
        success: 'hover:bg-success-50 dark:hover:bg-success-900/30',
        warning: 'hover:bg-warning-50 dark:hover:bg-warning-900/30',
        info: 'hover:bg-info-50 dark:hover:bg-info-900/30',
      },
      active: {
        default: 'bg-gray-100 dark:bg-gray-800',
        destructive: 'bg-error-100 dark:bg-error-900/40',
        success: 'bg-success-100 dark:bg-success-900/40',
        warning: 'bg-warning-100 dark:bg-warning-900/40',
        info: 'bg-info-100 dark:bg-info-900/40',
      },
    },
  },

  typography: {
    fontFamily: {
      sans: 'font-sans',
      mono: 'font-mono',
    },
    fontWeight: {
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    fontSize: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
    },
    lineHeight: {
      none: 'leading-none',
      tight: 'leading-tight',
      snug: 'leading-snug',
      normal: 'leading-normal',
      relaxed: 'leading-relaxed',
      loose: 'leading-loose',
    },
  },

  shadow: {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
    inner: 'shadow-inner',
    dropdown: 'shadow-[0_10px_38px_-10px_rgba(22,23,24,0.35),0_10px_20px_-15px_rgba(22,23,24,0.2)]',
  },

  animation: {
    fast: 'duration-100',
    normal: 'duration-200',
    slow: 'duration-300',
    verySlow: 'duration-500',
    dropdown: 'duration-200',
  },

  transition: {
    all: 'transition-all',
    colors: 'transition-colors',
    opacity: 'transition-opacity',
    transform: 'transition-transform',
    shadow: 'transition-shadow',
  },

  // CHANGED: Numeric zIndex tokens
  zIndex: {
    dropdown: 50,
    overlay: 40,
    nested: {
      '1': 60,
      '2': 70,
      '3': 80,
      '4': 90,
      '5': 100,
    },
  },

  backdrop: {
    none: 'backdrop-blur-none',
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
  },
});

/**
 * Map numeric zIndex tokens to Tailwind classes
 */
export const dropdownZIndexClasses = Object.freeze({
  dropdown: 'z-50',
  overlay: 'z-40',
  nested: {
    '1': 'z-50', // ✅ Valid
    '2': 'z-50', // ✅ Valid
    '3': 'z-50', // ✅ Valid
    '4': 'z-50', // ✅ Valid
    '5': 'z-50', // ✅ Valid
  },
});

/**
 * CSS class definitions for Dropdown component
 */
export const dropdownClasses = Object.freeze({
  // Root container
  root: 'dropdown-root inline-block',

  // Trigger classes
  trigger: {
    base: 'dropdown-trigger inline-flex items-center justify-center',
    disabled: 'opacity-50 cursor-not-allowed',
  },

  // Portal container
  portal: {
    base: 'dropdown-portal',
  },

  // Content wrapper
  content: {
    base: [
      'dropdown-content',
      'relative',
      'overflow-hidden',
      'rounded-md',
      dropdownTokens.shadow.dropdown,
      dropdownTokens.colors.background.primary,
      'border',
      dropdownTokens.colors.border.primary,
      'focus:outline-none',
      'max-h-[var(--helix-dropdown-content-available-height)]',
      'motion-safe:transition-all', // Added motion-safe
    ].join(' '),
    size: {
      xs: 'min-w-[8rem]',
      sm: 'min-w-[10rem]',
      md: 'min-w-[12rem]',
      lg: 'min-w-[14rem]',
      xl: 'min-w-[16rem]',
      auto: 'min-w-0',
    },
  },

  // Item classes
  item: {
    base: [
      'dropdown-item',
      'relative',
      'flex',
      'items-center',
      'rounded-sm',
      'px-2',
      'py-1.5',
      'text-sm',
      'outline-none',
      'cursor-default',
      'select-none',
      dropdownTokens.transition.colors,
      'data-[disabled]:pointer-events-none',
      'data-[disabled]:opacity-50',
    ].join(' '),
    variant: {
      default: dropdownTokens.colors.text.primary,
      destructive: [
        dropdownTokens.colors.text.variant.destructive,
        'data-[highlighted]:bg-error-50', // Using token values
        'data-[highlighted]:dark:bg-error-900/20',
      ].join(' '),
      success: [
        dropdownTokens.colors.text.variant.success,
        'data-[highlighted]:bg-success-50',
        'data-[highlighted]:dark:bg-success-900/20',
      ].join(' '),
      warning: [
        dropdownTokens.colors.text.variant.warning,
        'data-[highlighted]:bg-warning-50',
        'data-[highlighted]:dark:bg-warning-900/20',
      ].join(' '),
      info: [
        dropdownTokens.colors.text.variant.info,
        'data-[highlighted]:bg-info-50',
        'data-[highlighted]:dark:bg-info-900/20',
      ].join(' '),
    },
    // Use token-based highlight colors
    highlighted: (variant: DropdownItemVariant = 'default') =>
      `data-[highlighted]:${dropdownTokens.colors.action.hover[variant]}`,
    icon: {
      base: 'dropdown-item-icon mr-2 h-4 w-4',
      position: {
        left: 'mr-2',
        right: 'ml-2 order-last',
      },
    },
    label: 'dropdown-item-label flex-1',
    shortcut: 'dropdown-item-shortcut ml-auto text-xs text-gray-500 dark:text-gray-400',
    check: 'dropdown-item-check absolute left-2 flex h-3.5 w-3.5 items-center justify-center',
    indicator: 'dropdown-item-indicator',
  },

  // Group classes
  group: {
    base: 'dropdown-group',
    label: [
      'dropdown-group-label',
      'px-2',
      'py-1.5',
      'text-xs',
      dropdownTokens.colors.text.muted,
      'font-semibold',
    ].join(' '),
  },

  // Separator classes
  separator: {
    base: [
      'dropdown-separator',
      '-mx-1',
      'my-1',
      'h-px',
      dropdownTokens.colors.border.divider,
    ].join(' '),
  },

  // Label classes
  label: {
    base: [
      'dropdown-label',
      'px-2',
      'py-1.5',
      'text-sm',
      dropdownTokens.colors.text.secondary,
      'font-semibold',
    ].join(' '),
  },

  // Checkbox item classes
  checkboxItem: {
    base: [
      'dropdown-checkbox-item',
      'relative',
      'flex',
      'items-center',
      'rounded-sm',
      'py-1.5',
      'pl-8',
      'pr-2',
      'text-sm',
      'outline-none',
      'cursor-default',
      'select-none',
      dropdownTokens.transition.colors,
      'data-[disabled]:pointer-events-none',
      'data-[disabled]:opacity-50',
    ].join(' '),
    indicator: [
      'dropdown-checkbox-indicator',
      'absolute',
      'left-2',
      'flex',
      'h-3.5',
      'w-3.5',
      'items-center',
      'justify-center',
    ].join(' '),
  },

  // Radio item classes
  radioItem: {
    base: [
      'dropdown-radio-item',
      'relative',
      'flex',
      'items-center',
      'rounded-sm',
      'py-1.5',
      'pl-8',
      'pr-2',
      'text-sm',
      'outline-none',
      'cursor-default',
      'select-none',
      dropdownTokens.transition.colors,
      'data-[disabled]:pointer-events-none',
      'data-[disabled]:opacity-50',
    ].join(' '),
    indicator: [
      'dropdown-radio-indicator',
      'absolute',
      'left-2',
      'flex',
      'h-3.5',
      'w-3.5',
      'items-center',
      'justify-center',
    ].join(' '),
  },

  // Sub menu classes
  subMenu: {
    base: 'dropdown-sub-menu',
    trigger: [
      'dropdown-sub-menu-trigger',
      'relative',
      'flex',
      'items-center',
      'rounded-sm',
      'px-2',
      'py-1.5',
      'text-sm',
      'outline-none',
      'cursor-default',
      'select-none',
      dropdownTokens.transition.colors,
      'data-[state=open]:bg-gray-100',
      'data-[state=open]:dark:bg-gray-800',
      'data-[disabled]:pointer-events-none',
      'data-[disabled]:opacity-50',
    ].join(' '),
    icon: 'dropdown-sub-menu-icon absolute right-2 h-4 w-4',
  },

  // Arrow classes
  arrow: {
    base: ['dropdown-arrow', 'fill-white', 'dark:fill-gray-800'].join(' '),
  },

  // Animation classes (CHANGED: Consistent with Dialog's hyphenated phase names)
  animation: {
    fade: {
      enter: 'opacity-0',
      'enter-active': 'opacity-100', // Hyphenated
      exit: 'opacity-100',
      'exit-active': 'opacity-0', // Hyphenated
    },
    scale: {
      enter: 'opacity-0 scale-95',
      'enter-active': 'opacity-100 scale-100',
      exit: 'opacity-100 scale-100',
      'exit-active': 'opacity-0 scale-95',
    },
    'slide-up': {
      enter: 'opacity-0 translate-y-2',
      'enter-active': 'opacity-100 translate-y-0',
      exit: 'opacity-100 translate-y-0',
      'exit-active': 'opacity-0 translate-y-2',
    },
    'slide-down': {
      enter: 'opacity-0 -translate-y-2',
      'enter-active': 'opacity-100 translate-y-0',
      exit: 'opacity-100 translate-y-0',
      'exit-active': 'opacity-0 -translate-y-2',
    },
    'slide-left': {
      enter: 'opacity-0 translate-x-2',
      'enter-active': 'opacity-100 translate-x-0',
      exit: 'opacity-100 translate-x-0',
      'exit-active': 'opacity-0 translate-x-2',
    },
    'slide-right': {
      enter: 'opacity-0 -translate-x-2',
      'enter-active': 'opacity-100 translate-x-0',
      exit: 'opacity-100 translate-x-0',
      'exit-active': 'opacity-0 -translate-x-2',
    },
    none: {
      enter: '',
      'enter-active': '',
      exit: '',
      'exit-active': '',
    },
  },

  // Accessibility classes
  accessibility: {
    screenReaderOnly: 'sr-only',
    focusRing: [
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-primary-500',
      'focus:ring-offset-2',
    ].join(' '),
    reducedMotion: ['motion-reduce:transition-none', 'motion-reduce:transform-none'].join(' '),
  },
});

/**
 * Default style props
 */
export const defaultDropdownStyleProps = Object.freeze({
  offset: 8,
  skidding: 0,
  boundaryPadding: 8,
  collisionPadding: 8,
  transitionDuration: 200,
  maxHeight: 'var(--helix-dropdown-content-available-height, 300px)',
  minWidth: 'var(--helix-dropdown-trigger-width, 120px)',
  zIndex: dropdownTokens.zIndex.dropdown,
  zIndexClassName: dropdownZIndexClasses.dropdown,
});

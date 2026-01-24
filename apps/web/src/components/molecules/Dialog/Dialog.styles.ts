// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dialog\Dialog.styles.ts
import {
  DialogSize,
  DialogVariant,
  DialogPosition,
  DialogAnimation,
  DialogAction,
} from './Dialog.types';

/**
 * Typed Design Tokens Interface
 * Provides compile-time safety and theme swapping capabilities
 */
export interface DialogTokens {
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
      variant: Record<DialogVariant, string>;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
      variant: Record<DialogVariant, string>;
    };
    border: {
      primary: string;
      divider: string;
      focus: string;
      error: string;
      warning: string;
      success: string;
      variantAccent: Record<DialogVariant, string>;
    };
    icon: {
      primary: string;
      secondary: string;
      variant: Record<DialogVariant, string>;
      close: string;
    };
    action: {
      primary: string;
      secondary: string;
      outline: string;
      ghost: string;
      error: string;
      success: string;
      warning: string;
      disabled: string;
      loading: string;
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
    overlay: string;
    dialog: string;
    nested: Record<string, string>;
  };
  backdrop: Record<string, string>;
}

/**
 * Design tokens for Dialog component
 * Consistent with HELIX CRM design system
 */
export const dialogTokens: DialogTokens = {
  // ... (all existing token definitions remain the same)
  // Keeping the same content but now properly typed
  spacing: {
    none: '0',
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem',
    '4xl': '4rem',
  },

  dimensions: {
    width: {
      xs: '20rem',
      sm: '24rem',
      md: '28rem',
      lg: '32rem',
      xl: '36rem',
      '2xl': '42rem',
      '3xl': '48rem',
      '4xl': '56rem',
      '5xl': '64rem',
      fullscreen: '95vw',
    },

    height: {
      auto: 'auto',
      xs: '16rem',
      sm: '20rem',
      md: '24rem',
      lg: '28rem',
      xl: '32rem',
      fullscreen: '95vh',
    },

    padding: {
      none: '0',
      xs: '0.5rem',
      sm: '0.75rem',
      md: '1rem',
      lg: '1.25rem',
      xl: '1.5rem',
      '2xl': '2rem',
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
        light: 'bg-black/20',
        medium: 'bg-black/50',
        dark: 'bg-black/75',
        blur: 'backdrop-blur-sm',
      },
      variant: {
        default: 'bg-white dark:bg-gray-800',
        alert: 'bg-white dark:bg-gray-800',
        confirm: 'bg-white dark:bg-gray-800',
        form: 'bg-white dark:bg-gray-800',
        success: 'bg-white dark:bg-gray-800',
        error: 'bg-white dark:bg-gray-800',
        warning: 'bg-white dark:bg-gray-800',
      },
    },

    text: {
      primary: 'text-gray-900 dark:text-gray-100',
      secondary: 'text-gray-600 dark:text-gray-400',
      muted: 'text-gray-500 dark:text-gray-500',
      inverse: 'text-white dark:text-gray-900',
      variant: {
        default: 'text-gray-900 dark:text-gray-100',
        alert: 'text-error-700 dark:text-error-300',
        confirm: 'text-warning-700 dark:text-warning-300',
        form: 'text-gray-900 dark:text-gray-100',
        success: 'text-success-700 dark:text-success-300',
        error: 'text-error-700 dark:text-error-300',
        warning: 'text-warning-700 dark:text-warning-300',
      },
    },

    border: {
      primary: 'border-gray-200 dark:border-gray-700',
      divider: 'border-gray-100 dark:border-gray-800',
      focus: 'border-primary-500 dark:border-primary-400',
      error: 'border-error-500 dark:border-error-400',
      warning: 'border-warning-500 dark:border-warning-400',
      success: 'border-success-500 dark:border-success-400',
      variantAccent: {
        default: 'border-l-primary-500 dark:border-l-primary-400',
        alert: 'border-l-error-500 dark:border-l-error-400',
        confirm: 'border-l-warning-500 dark:border-l-warning-400',
        form: 'border-l-primary-500 dark:border-l-primary-400',
        success: 'border-l-success-500 dark:border-l-success-400',
        error: 'border-l-error-500 dark:border-l-error-400',
        warning: 'border-l-warning-500 dark:border-l-warning-400',
      },
    },

    icon: {
      primary: 'text-gray-500 dark:text-gray-400',
      secondary: 'text-gray-400 dark:text-gray-500',
      variant: {
        default: 'text-primary-600 dark:text-primary-400',
        alert: 'text-error-600 dark:text-error-400',
        confirm: 'text-warning-600 dark:text-warning-400',
        form: 'text-primary-600 dark:text-primary-400',
        success: 'text-success-600 dark:text-success-400',
        error: 'text-error-600 dark:text-error-400',
        warning: 'text-warning-600 dark:text-warning-400',
      },
      close: 'text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400',
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
      disabled: 'opacity-50 cursor-not-allowed',
      loading: 'opacity-75 cursor-wait',
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
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
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
    overlay: 'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]',
  },

  animation: {
    fast: 'duration-100',
    normal: 'duration-200',
    slow: 'duration-300',
    verySlow: 'duration-500',
    overlay: 'duration-300',
    dialog: 'duration-200',
  },

  transition: {
    all: 'transition-all',
    colors: 'transition-colors',
    opacity: 'transition-opacity',
    transform: 'transition-transform',
    shadow: 'transition-shadow',
    backdrop: 'transition-backdrop-filter',
  },

  zIndex: {
    overlay: 'z-40',
    dialog: 'z-50',
    nested: {
      '1': 'z-60',
      '2': 'z-70',
      '3': 'z-80',
      '4': 'z-90',
      '5': 'z-100',
    },
  },

  backdrop: {
    none: 'backdrop-blur-none',
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
  },
};

/**
 * CSS class definitions for Dialog component
 * Tailwind-compatible with dark mode support
 */
export const dialogClasses = {
  // Base overlay classes
  overlay: {
    base: ['fixed', 'inset-0', 'transition-opacity', 'duration-300', 'ease-in-out'].join(' '),
    visible: 'opacity-100',
    hidden: 'opacity-0 pointer-events-none',
    blur: dialogTokens.backdrop.sm,
  },

  // Base dialog container classes - UPDATED: Flex layout
  container: {
    base: [
      'relative',
      'transform',
      'transition-all',
      'duration-200',
      'ease-in-out',
      'outline-none',
      'focus:outline-none',
      'overflow-hidden',
      'flex',
      'flex-col',
      'max-h-[95vh]', // UPDATED: Flex-based height constraint
    ].join(' '),
    centered: 'mx-auto my-8',
    nested: 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]',
  },

  // Size variants - UPDATED: Mobile-safe widths
  size: {
    xs: [
      'max-w-xs',
      'w-[calc(100%-2rem)]', // UPDATED: Mobile-safe width
      'mx-4', // UPDATED: Mobile-safe margins
      'p-4',
    ].join(' '),
    sm: [
      'max-w-sm',
      'w-[calc(100%-2rem)]', // UPDATED: Mobile-safe width
      'mx-4', // UPDATED: Mobile-safe margins
      'p-5',
    ].join(' '),
    md: [
      'max-w-md',
      'w-[calc(100%-2rem)]', // UPDATED: Mobile-safe width
      'mx-4', // UPDATED: Mobile-safe margins
      'p-6',
    ].join(' '),
    lg: [
      'max-w-lg',
      'w-[calc(100%-2rem)]', // UPDATED: Mobile-safe width
      'mx-4', // UPDATED: Mobile-safe margins
      'p-7',
    ].join(' '),
    xl: [
      'max-w-xl',
      'w-[calc(100%-2rem)]', // UPDATED: Mobile-safe width
      'mx-4', // UPDATED: Mobile-safe margins
      'p-8',
    ].join(' '),
    fullscreen: ['max-w-[95vw]', 'max-h-[95vh]', 'w-[95vw]', 'h-[95vh]', 'p-8'].join(' '),
  },

  // Position classes
  position: {
    center: ['fixed', 'top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2'].join(' '),
    top: ['fixed', 'top-4', 'left-1/2', '-translate-x-1/2'].join(' '),
    bottom: ['fixed', 'bottom-4', 'left-1/2', '-translate-x-1/2'].join(' '),
    left: ['fixed', 'top-1/2', 'left-4', '-translate-y-1/2'].join(' '),
    right: ['fixed', 'top-1/2', 'right-4', '-translate-y-1/2'].join(' '),
    'top-left': ['fixed', 'top-4', 'left-4'].join(' '),
    'top-right': ['fixed', 'top-4', 'right-4'].join(' '),
    'bottom-left': ['fixed', 'bottom-4', 'left-4'].join(' '),
    'bottom-right': ['fixed', 'bottom-4', 'right-4'].join(' '),
  },

  // Variant classes
  variant: {
    default: [
      dialogTokens.colors.background.variant.default,
      dialogTokens.colors.text.variant.default,
      'border',
      dialogTokens.colors.border.primary,
      dialogTokens.shadow.xl,
      'rounded-lg',
    ].join(' '),
    alert: [
      dialogTokens.colors.background.variant.alert,
      dialogTokens.colors.text.variant.alert,
      'border-l-4',
      dialogTokens.colors.border.variantAccent.alert,
      dialogTokens.shadow.xl,
      'rounded-lg',
    ].join(' '),
    confirm: [
      dialogTokens.colors.background.variant.confirm,
      dialogTokens.colors.text.variant.confirm,
      'border-l-4',
      dialogTokens.colors.border.variantAccent.confirm,
      dialogTokens.shadow.xl,
      'rounded-lg',
    ].join(' '),
    form: [
      dialogTokens.colors.background.variant.form,
      dialogTokens.colors.text.variant.form,
      'border',
      dialogTokens.colors.border.primary,
      dialogTokens.shadow.xl,
      'rounded-lg',
    ].join(' '),
    success: [
      dialogTokens.colors.background.variant.success,
      dialogTokens.colors.text.variant.success,
      'border-l-4',
      dialogTokens.colors.border.variantAccent.success,
      dialogTokens.shadow.xl,
      'rounded-lg',
    ].join(' '),
    error: [
      dialogTokens.colors.background.variant.error,
      dialogTokens.colors.text.variant.error,
      'border-l-4',
      dialogTokens.colors.border.variantAccent.error,
      dialogTokens.shadow.xl,
      'rounded-lg',
    ].join(' '),
    warning: [
      dialogTokens.colors.background.variant.warning,
      dialogTokens.colors.text.variant.warning,
      'border-l-4',
      dialogTokens.colors.border.variantAccent.warning,
      dialogTokens.shadow.xl,
      'rounded-lg',
    ].join(' '),
  },

  // Header classes
  header: {
    base: [
      'flex',
      'items-start',
      'justify-between',
      'p-6',
      'pb-4',
      'border-b',
      dialogTokens.colors.border.divider,
      'flex-shrink-0', // UPDATED: Prevent header from shrinking
    ].join(' '),
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
    title: [
      dialogTokens.typography.fontSize.xl,
      dialogTokens.typography.fontWeight.semibold,
      'leading-6',
      'flex-1',
    ].join(' '),
    description: [
      dialogTokens.typography.fontSize.sm,
      dialogTokens.colors.text.secondary,
      'mt-1',
    ].join(' '),
    iconContainer: ['flex-shrink-0', 'mr-3', 'mt-1'].join(' '),
    closeButton: [
      'ml-4',
      'flex-shrink-0',
      'rounded-md',
      dialogTokens.colors.icon.close,
      'hover:bg-gray-100',
      'dark:hover:bg-gray-800',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-primary-500',
      'focus:ring-offset-2',
      'focus:ring-offset-white',
      'dark:focus:ring-offset-gray-800',
      'transition-colors',
      'duration-150',
      'p-1',
    ].join(' '),
    closeIcon: ['h-5', 'w-5'].join(' '),
  },

  // Body classes - UPDATED: Flex-based scrollable layout
  body: {
    base: [
      'px-6',
      'py-4',
      'flex-1', // UPDATED: Take available space
      'overflow-y-auto', // UPDATED: Scroll within flex container
      'min-h-0', // UPDATED: Allow shrinking
    ].join(' '),
    scrollable: [
      'scrollbar-thin',
      'scrollbar-thumb-gray-300',
      'dark:scrollbar-thumb-gray-600',
      'scrollbar-track-transparent',
    ].join(' '),
    padding: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
      xl: 'p-6',
    },
  },

  // Footer classes
  footer: {
    base: [
      'flex',
      'items-center',
      'px-6',
      'py-4',
      'border-t',
      dialogTokens.colors.border.divider,
      'bg-gray-50',
      'dark:bg-gray-900/50',
      'flex-shrink-0', // UPDATED: Prevent footer from shrinking
    ].join(' '),
    align: {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
    },
    actions: ['flex', 'gap-3'].join(' '),
    actionButton: {
      base: [
        'inline-flex',
        'items-center',
        'justify-center',
        'px-4',
        'py-2',
        'text-sm',
        'font-medium',
        'rounded-md',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-offset-2',
        'focus:ring-primary-500',
        'focus:ring-offset-white',
        'dark:focus:ring-offset-gray-800',
        'transition-colors',
        'duration-150',
        'disabled:opacity-50',
        'disabled:cursor-not-allowed',
      ].join(' '),
      variant: {
        primary: dialogTokens.colors.action.primary,
        secondary: dialogTokens.colors.action.secondary,
        outline: dialogTokens.colors.action.outline,
        ghost: dialogTokens.colors.action.ghost,
        error: dialogTokens.colors.action.error,
        success: dialogTokens.colors.action.success,
        warning: dialogTokens.colors.action.warning,
      },
      size: {
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-5 py-2.5 text-lg',
        xl: 'px-6 py-3 text-xl',
      },
      loading: ['relative', 'opacity-75', 'cursor-wait'].join(' '),
      loadingSpinner: ['absolute', 'inset-0', 'flex', 'items-center', 'justify-center'].join(' '),
    },
    divider: 'border-t border-gray-200 dark:border-gray-800',
  },

  // Animation classes
  animation: {
    fade: {
      enter: 'opacity-0',
      enterActive: 'opacity-100',
      exit: 'opacity-100',
      exitActive: 'opacity-0',
    },
    slide: {
      enter: 'opacity-0 translate-y-4',
      enterActive: 'opacity-100 translate-y-0',
      exit: 'opacity-100 translate-y-0',
      exitActive: 'opacity-0 translate-y-4',
    },
    scale: {
      enter: 'opacity-0 scale-95',
      enterActive: 'opacity-100 scale-100',
      exit: 'opacity-100 scale-100',
      exitActive: 'opacity-0 scale-95',
    },
    'slide-up': {
      enter: 'opacity-0 translate-y-full',
      enterActive: 'opacity-100 translate-y-0',
      exit: 'opacity-100 translate-y-0',
      exitActive: 'opacity-0 translate-y-full',
    },
    'slide-down': {
      enter: 'opacity-0 -translate-y-full',
      enterActive: 'opacity-100 translate-y-0',
      exit: 'opacity-100 translate-y-0',
      exitActive: 'opacity-0 -translate-y-full',
    },
    'slide-left': {
      enter: 'opacity-0 translate-x-full',
      enterActive: 'opacity-100 translate-x-0',
      exit: 'opacity-100 translate-x-0',
      exitActive: 'opacity-0 translate-x-full',
    },
    'slide-right': {
      enter: 'opacity-0 -translate-x-full',
      enterActive: 'opacity-100 translate-x-0',
      exit: 'opacity-100 translate-x-0',
      exitActive: 'opacity-0 -translate-x-full',
    },
    shake: {
      enter: '',
      enterActive: '',
      exit: '',
      exitActive: 'animate-shake',
    },
    none: {
      enter: '',
      enterActive: '',
      exit: '',
      exitActive: '',
    },
  },

  // Accessibility classes
  accessibility: {
    screenReaderOnly: ['sr-only'].join(' '),
    focusRing: [
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-primary-500',
      'focus:ring-offset-2',
    ].join(' '),
    reducedMotion: ['motion-reduce:transition-none', 'motion-reduce:transform-none'].join(' '),
  },

  // Utility classes
  utility: {
    scrollbar: [
      'scrollbar-thin',
      'scrollbar-thumb-gray-300',
      'dark:scrollbar-thumb-gray-600',
      'scrollbar-track-transparent',
    ].join(' '),
    truncate: ['truncate', 'overflow-hidden', 'text-ellipsis', 'whitespace-nowrap'].join(' '),
    backdropBlur: ['backdrop-blur-sm', 'bg-black/20'].join(' '),
    glass: [
      'bg-white/80',
      'dark:bg-gray-800/80',
      'backdrop-blur-md',
      'border',
      'border-white/20',
      'dark:border-gray-700/20',
    ].join(' '),
  },

  // Persistent dialog classes
  persistent: {
    overlay: 'cursor-not-allowed',
    dialog: 'animate-shake',
  },
};

/**
 * Type-safe access to class maps with safe defaults
 */
const getSizeClass = (size?: DialogSize): string => {
  const safeSize = size ?? 'md';
  return dialogClasses.size[safeSize] ?? dialogClasses.size.md;
};

const getVariantClass = (variant?: DialogVariant): string => {
  const safeVariant = variant ?? 'default';
  return dialogClasses.variant[safeVariant] ?? dialogClasses.variant.default;
};

const getPositionClass = (position?: DialogPosition): string => {
  const safePosition = position ?? 'center';
  return dialogClasses.position[safePosition] ?? dialogClasses.position.center;
};

const getHeaderAlignClass = (align?: 'left' | 'center' | 'right'): string => {
  const safeAlign = align ?? 'left';
  return dialogClasses.header.align[safeAlign] ?? dialogClasses.header.align.left;
};

const getFooterAlignClass = (align?: 'left' | 'center' | 'right'): string => {
  const safeAlign = align ?? 'right';
  return dialogClasses.footer.align[safeAlign] ?? dialogClasses.footer.align.right;
};

const getActionVariantClass = (variant?: DialogAction['variant']): string => {
  const safeVariant = variant ?? 'primary';
  return (
    dialogClasses.footer.actionButton.variant[safeVariant] ??
    dialogClasses.footer.actionButton.variant.primary
  );
};

/**
 * Safe animation lookup with fallback
 */
const getAnimationMap = (animation?: DialogAnimation) => {
  const safeAnimation = animation ?? 'fade';
  return dialogClasses.animation[safeAnimation] ?? dialogClasses.animation.fade;
};

/**
 * Utility function to build overlay classes
 */
export function getOverlayClasses(
  isVisible: boolean,
  blur: boolean = false,
  className?: string
): string {
  const classes = [
    dialogClasses.overlay.base,
    isVisible ? dialogClasses.overlay.visible : dialogClasses.overlay.hidden,
    blur ? dialogClasses.overlay.blur : '',
    className || '',
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build dialog container classes - IMPROVED: Safe animation lookup
 */
export function getDialogClasses(
  variant?: DialogVariant,
  size?: DialogSize,
  position?: DialogPosition,
  isVisible: boolean = true,
  animation?: DialogAnimation,
  isAnimating: boolean = false,
  isPersistent: boolean = false,
  className?: string
): string {
  const safeVariant = variant ?? 'default';
  const safeSize = size ?? 'md';
  const safePosition = position ?? 'center';
  const safeAnimation = animation ?? 'fade';

  const animationMap = getAnimationMap(safeAnimation);
  const animationState = isVisible ? 'enterActive' : 'exitActive';
  const animationClass = animationMap[animationState] ?? '';

  const classes = [
    dialogClasses.container.base,
    getPositionClass(safePosition),
    getSizeClass(safeSize),
    getVariantClass(safeVariant),
    dialogClasses.accessibility.focusRing,
    dialogClasses.accessibility.reducedMotion,
    isAnimating ? animationClass : '',
    isPersistent && !isVisible ? dialogClasses.persistent.dialog : '',
    className || '',
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build header classes
 */
export function getHeaderClasses(
  align?: 'left' | 'center' | 'right',
  hasDescription: boolean = false,
  className?: string
): string {
  const classes = [
    dialogClasses.header.base,
    getHeaderAlignClass(align),
    hasDescription ? 'items-start' : 'items-center',
    className || '',
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build body classes
 */
export function getBodyClasses(
  scrollable: boolean = false,
  padding: 'none' | 'sm' | 'md' | 'lg' | 'xl' = 'md',
  className?: string
): string {
  const classes = [
    dialogClasses.body.base,
    scrollable ? dialogClasses.body.scrollable : '',
    dialogClasses.body.padding[padding] ?? dialogClasses.body.padding.md,
    className || '',
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build footer classes
 */
export function getFooterClasses(
  align?: 'left' | 'center' | 'right',
  showDivider: boolean = true,
  className?: string
): string {
  const classes = [
    dialogClasses.footer.base,
    getFooterAlignClass(align),
    showDivider ? dialogClasses.footer.divider : '',
    className || '',
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build action button classes
 */
export function getActionButtonClasses(
  variant?: DialogAction['variant'],
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md',
  disabled: boolean = false,
  loading: boolean = false,
  className?: string
): string {
  const safeVariant = variant ?? 'primary';
  const safeSize = size ?? 'md';

  const classes = [
    dialogClasses.footer.actionButton.base,
    getActionVariantClass(safeVariant),
    dialogClasses.footer.actionButton.size[safeSize] ?? dialogClasses.footer.actionButton.size.md,
    disabled ? dialogTokens.colors.action.disabled : '',
    loading ? dialogClasses.footer.actionButton.loading : '',
    className || '',
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build close button classes
 */
export function getCloseButtonClasses(size: 'sm' | 'md' | 'lg' = 'md', className?: string): string {
  const sizeClasses = {
    sm: 'h-4 w-4 p-0.5',
    md: 'h-5 w-5 p-1',
    lg: 'h-6 w-6 p-1.5',
  };

  const safeSize = size ?? 'md';

  const classes = [
    dialogClasses.header.closeButton,
    sizeClasses[safeSize] ?? sizeClasses.md,
    className || '',
  ];

  return classes.filter(Boolean).join(' ');
}

/**
 * Get animation classes for specific phase with safe defaults
 */
export function getAnimationClassesForPhase(
  animation?: DialogAnimation,
  phase: 'enter' | 'enterActive' | 'exit' | 'exitActive' = 'enter'
): string {
  const animationMap = getAnimationMap(animation);
  return animationMap[phase] ?? '';
}

/**
 * Get z-index for nested dialogs with safe defaults
 */
export function getNestedZIndex(nestedLevel: number = 0): string {
  if (nestedLevel <= 0) {
    return dialogTokens.zIndex.dialog;
  }

  const nestedIndex = Math.min(
    nestedLevel,
    5
  ).toString() as keyof typeof dialogTokens.zIndex.nested;
  return dialogTokens.zIndex.nested[nestedIndex] ?? dialogTokens.zIndex.dialog;
}

/**
 * Get appropriate overlay opacity based on variant and nested level
 */
export function getOverlayOpacity(variant?: DialogVariant, nestedLevel: number = 0): number {
  const safeVariant = variant ?? 'default';

  const baseOpacity: Record<DialogVariant, number> = {
    default: 0.5,
    alert: 0.7,
    confirm: 0.6,
    form: 0.5,
    success: 0.5,
    error: 0.7,
    warning: 0.6,
  };

  // Reduce opacity for nested dialogs
  const reduction = nestedLevel * 0.1;
  const opacity = baseOpacity[safeVariant] ?? baseOpacity.default;
  return Math.max(0.3, opacity - reduction);
}

/**
 * Get overlay classes for persistent dialogs
 */
export function getPersistentOverlayClasses(
  isVisible: boolean,
  blur: boolean = false,
  className?: string
): string {
  const classes = [getOverlayClasses(isVisible, blur, className), dialogClasses.persistent.overlay];

  return classes.filter(Boolean).join(' ');
}

/**
 * Memoized version of getDialogClasses for performance
 */
export function memoizedGetDialogClasses(
  variant: DialogVariant = 'default',
  size: DialogSize = 'md',
  position: DialogPosition = 'center',
  isVisible: boolean = true,
  animation: DialogAnimation = 'fade'
): () => string {
  let cache: string | null = null;
  let cacheKey = `${variant}-${size}-${position}-${isVisible}-${animation}`;

  return () => {
    const newKey = `${variant}-${size}-${position}-${isVisible}-${animation}`;
    if (cache && cacheKey === newKey) {
      return cache;
    }

    cache = getDialogClasses(variant, size, position, isVisible, animation);
    cacheKey = newKey;
    return cache;
  };
}

/**
 * Default style props
 */
export const defaultDialogStyleProps = {
  maxWidth: dialogTokens.dimensions.width.md,
  minWidth: '20rem',
  maxHeight: '90vh',
  overlayOpacity: 0.5,
  overlayBlur: false,
  transitionDuration: 200,
  borderRadius: dialogTokens.dimensions.borderRadius.lg,
  zIndex: dialogTokens.zIndex.dialog,
  nestedZIndexIncrement: 10,
  portalContainer: typeof document !== 'undefined' ? document.body : null,
};

/**
 * Get CSS properties for dialog positioning
 */
export function getDialogPositionStyles(
  position?: DialogPosition,
  offset: number = 0
): React.CSSProperties {
  const safePosition = position ?? 'center';

  const styles: React.CSSProperties = {
    position: 'fixed' as const,
  };

  switch (safePosition) {
    case 'center':
      styles.top = '50%';
      styles.left = '50%';
      styles.transform = `translate(-50%, -50%)`;
      break;
    case 'top':
      styles.top = `${offset}px`;
      styles.left = '50%';
      styles.transform = `translateX(-50%)`;
      break;
    case 'bottom':
      styles.bottom = `${offset}px`;
      styles.left = '50%';
      styles.transform = `translateX(-50%)`;
      break;
    case 'left':
      styles.top = '50%';
      styles.left = `${offset}px`;
      styles.transform = `translateY(-50%)`;
      break;
    case 'right':
      styles.top = '50%';
      styles.right = `${offset}px`;
      styles.transform = `translateY(-50%)`;
      break;
    case 'top-left':
      styles.top = `${offset}px`;
      styles.left = `${offset}px`;
      break;
    case 'top-right':
      styles.top = `${offset}px`;
      styles.right = `${offset}px`;
      break;
    case 'bottom-left':
      styles.bottom = `${offset}px`;
      styles.left = `${offset}px`;
      break;
    case 'bottom-right':
      styles.bottom = `${offset}px`;
      styles.right = `${offset}px`;
      break;
  }

  return styles;
}

/**
 * Get responsive width based on size - IMPROVED: Mobile-safe
 */
export function getResponsiveWidth(size?: DialogSize): string {
  const safeSize = size ?? 'md';

  const widthMap: Record<DialogSize, string> = {
    xs: '90vw',
    sm: '85vw',
    md: '80vw',
    lg: '75vw',
    xl: '70vw',
    fullscreen: '95vw',
  };

  const mobileWidth = widthMap[safeSize] ?? widthMap.md;
  const maxWidth = dialogTokens.dimensions.width[safeSize] ?? dialogTokens.dimensions.width.md;

  return `min(${mobileWidth}, ${maxWidth})`;
}

/**
 * Get appropriate padding based on size with safe defaults
 */
export function getSizePadding(size?: DialogSize): {
  header: string;
  body: string;
  footer: string;
} {
  const safeSize = size ?? 'md';

  const paddingMap: Record<DialogSize, { header: string; body: string; footer: string }> = {
    xs: { header: 'p-3', body: 'p-3', footer: 'p-3' },
    sm: { header: 'p-4', body: 'p-4', footer: 'p-4' },
    md: { header: 'p-6', body: 'p-4', footer: 'p-6' },
    lg: { header: 'p-7', body: 'p-5', footer: 'p-7' },
    xl: { header: 'p-8', body: 'p-6', footer: 'p-8' },
    fullscreen: { header: 'p-8', body: 'p-6', footer: 'p-8' },
  };

  return paddingMap[safeSize] ?? paddingMap.md;
}

/**
 * Generate test ID for dialog elements
 */
export function getDialogTestId(
  testId?: string,
  element:
    | 'container'
    | 'overlay'
    | 'header'
    | 'body'
    | 'footer'
    | 'close-button'
    | 'action' = 'container',
  nestedLevel: number = 0,
  actionId?: string
): string {
  const base = testId || 'dialog';
  const nestedSuffix = nestedLevel > 0 ? `-nested-${nestedLevel}` : '';

  switch (element) {
    case 'overlay':
      return `${base}${nestedSuffix}-overlay`;
    case 'header':
      return `${base}${nestedSuffix}-header`;
    case 'body':
      return `${base}${nestedSuffix}-body`;
    case 'footer':
      return `${base}${nestedSuffix}-footer`;
    case 'close-button':
      return `${base}${nestedSuffix}-close-button`;
    case 'action':
      return actionId
        ? `${base}${nestedSuffix}-action-${actionId}`
        : `${base}${nestedSuffix}-action`;
    default:
      return `${base}${nestedSuffix}`;
  }
}

/**
 * Style utility for scroll lock compensation
 */
export function getScrollLockStyles(scrollbarWidth: number): React.CSSProperties {
  return {
    paddingRight: `${scrollbarWidth}px`,
  };
}

/**
 * Style utility for glass morphism effect
 */
export function getGlassStyles(
  intensity: 'light' | 'medium' | 'heavy' = 'medium'
): React.CSSProperties {
  const intensities = {
    light: {
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(4px)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    medium: {
      background: 'rgba(255, 255, 255, 0.5)',
      backdropFilter: 'blur(8px)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    heavy: {
      background: 'rgba(255, 255, 255, 0.3)',
      backdropFilter: 'blur(12px)',
      borderColor: 'rgba(255, 255, 255, 0.4)',
    },
  };

  const darkIntensities = {
    light: {
      background: 'rgba(31, 41, 55, 0.7)',
      backdropFilter: 'blur(4px)',
      borderColor: 'rgba(31, 41, 55, 0.2)',
    },
    medium: {
      background: 'rgba(31, 41, 55, 0.5)',
      backdropFilter: 'blur(8px)',
      borderColor: 'rgba(31, 41, 55, 0.3)',
    },
    heavy: {
      background: 'rgba(31, 41, 55, 0.3)',
      backdropFilter: 'blur(12px)',
      borderColor: 'rgba(31, 41, 55, 0.4)',
    },
  };

  const safeIntensity = intensity ?? 'medium';

  // Return both light and dark variants
  return {
    '--glass-light': intensities[safeIntensity].background,
    '--glass-dark': darkIntensities[safeIntensity].background,
    '--glass-blur': intensities[safeIntensity].backdropFilter,
    '--glass-border-light': intensities[safeIntensity].borderColor,
    '--glass-border-dark': darkIntensities[safeIntensity].borderColor,
  } as React.CSSProperties;
}

/**
 * Check if portal usage is recommended
 * Returns warning message if not using portal for critical features
 */
export function getPortalUsageWarning(
  portal: boolean = true,
  nested: boolean = false
): string | null {
  if (!portal) {
    if (nested) {
      return '⚠️ Nested dialogs require portal usage for proper z-index stacking and focus isolation.';
    }
    return '⚠️ Dialog without portal may have issues with overlay layering and screen reader isolation.';
  }
  return null;
}

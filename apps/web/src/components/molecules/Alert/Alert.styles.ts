// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Alert\Alert.styles.ts
import { AlertVariant, AlertSize } from './Alert.types';

/**
 * Design tokens for Alert component
 */
export const alertTokens = {
  // Spacing tokens (in rem units)
  spacing: {
    sm: '0.5rem',    // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
  },
  
  // Color tokens for each variant (Tailwind color palette)
  colors: {
    info: {
      bg: 'bg-info-50',
      border: 'border-info-200',
      text: 'text-info-800',
      icon: 'text-info-600',
      hover: 'hover:bg-info-100',
    },
    success: {
      bg: 'bg-success-50',
      border: 'border-success-200',
      text: 'text-success-800',
      icon: 'text-success-600',
      hover: 'hover:bg-success-100',
    },
    error: {
      bg: 'bg-error-50',
      border: 'border-error-200',
      text: 'text-error-800',
      icon: 'text-error-600',
      hover: 'hover:bg-error-100',
    },
    warning: {
      bg: 'bg-warning-50',
      border: 'border-warning-200',
      text: 'text-warning-800',
      icon: 'text-warning-600',
      hover: 'hover:bg-warning-100',
    },
  },
  
  // Typography tokens
  typography: {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  },
  
  // Border radius tokens
  borderRadius: 'rounded-lg',
  
  // Border width tokens
  borderWidth: 'border',
  
  // Transition tokens
  transition: 'transition-all duration-200',
  
  // Icon size tokens (matches Icon component)
  iconSizes: {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  },
};

/**
 * CSS class definitions for Alert component
 */
export const alertClasses = {
  // Base classes (always applied)
  base: 'relative flex items-start gap-3',
  
  // Size classes
  size: {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-4 py-4',
  },
  
  // Variant classes
  variant: {
    info: `${alertTokens.colors.info.bg} ${alertTokens.colors.info.border} ${alertTokens.colors.info.text}`,
    success: `${alertTokens.colors.success.bg} ${alertTokens.colors.success.border} ${alertTokens.colors.success.text}`,
    error: `${alertTokens.colors.error.bg} ${alertTokens.colors.error.border} ${alertTokens.colors.error.text}`,
    warning: `${alertTokens.colors.warning.bg} ${alertTokens.colors.warning.border} ${alertTokens.colors.warning.text}`,
  },
  
  // Icon classes
  icon: {
    base: 'flex-shrink-0 mt-0.5',
    variant: {
      info: alertTokens.colors.info.icon,
      success: alertTokens.colors.success.icon,
      error: alertTokens.colors.error.icon,
      warning: alertTokens.colors.warning.icon,
    },
  },
  
  // Content classes
  content: 'flex-1 min-w-0',
  
  // Title classes
  title: 'font-semibold mb-1',
  
  // Message classes
  message: '',
  
  // Actions classes
  actions: 'mt-3 flex flex-wrap gap-2',
  
  // Dismiss button classes
  dismissButton: {
    base: 'flex-shrink-0 ml-2 -mr-1 p-1 rounded transition-colors',
    hover: 'hover:bg-black/5 hover:bg-opacity-10',
    focus: 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current',
  },
  
  // Animation classes
  animation: {
    enter: 'animate-fade-in',
    exit: 'animate-fade-out',
  },
  
  // Accessibility classes
  accessibility: {
    focus: 'focus:outline-none focus:ring-2 focus:ring-offset-2',
    reducedMotion: 'motion-reduce:transition-none',
  },
};

/**
 * Utility function to build alert container classes
 */
export function getAlertContainerClasses(
  variant: AlertVariant = 'info',
  size: AlertSize = 'md',
  className?: string
): string {
  const classes = [
    // Base classes
    alertClasses.base,
    alertTokens.borderRadius,
    alertTokens.borderWidth,
    alertTokens.transition,
    
    // Variant classes
    alertClasses.variant[variant],
    
    // Size classes
    alertClasses.size[size],
    alertTokens.typography[size],
    
    // Accessibility
    alertClasses.accessibility.focus,
    alertClasses.accessibility.reducedMotion,
    
    // Custom classes
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build icon classes
 */
export function getAlertIconClasses(
  variant: AlertVariant = 'info',
  size: AlertSize = 'md',
  className?: string
): string {
  const classes = [
    // Base icon classes
    alertClasses.icon.base,
    
    // Variant-specific icon color
    alertClasses.icon.variant[variant],
    
    // Size-specific icon dimensions
    alertTokens.iconSizes[size],
    
    // Custom classes
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get variant color classes
 */
export function getVariantColorClasses(variant: AlertVariant): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  return {
    bg: alertTokens.colors[variant].bg,
    border: alertTokens.colors[variant].border,
    text: alertTokens.colors[variant].text,
    icon: alertTokens.colors[variant].icon,
  };
}

/**
 * Utility function to get size dimensions
 */
export function getAlertSizeDimensions(size: AlertSize): {
  paddingX: string;
  paddingY: string;
  fontSize: string;
  iconSize: string;
} {
  const sizeMap = {
    sm: {
      paddingX: 'px-3',
      paddingY: 'py-2',
      fontSize: 'text-xs',
      iconSize: 'w-4 h-4',
    },
    md: {
      paddingX: 'px-4',
      paddingY: 'py-3',
      fontSize: 'text-sm',
      iconSize: 'w-5 h-5',
    },
    lg: {
      paddingX: 'px-4',
      paddingY: 'py-4',
      fontSize: 'text-base',
      iconSize: 'w-6 h-6',
    },
  };
  
  return sizeMap[size];
}

/**
 * Utility function to get dismiss button classes
 */
export function getDismissButtonClasses(): string {
  return [
    alertClasses.dismissButton.base,
    alertClasses.dismissButton.hover,
    alertClasses.dismissButton.focus,
  ].join(' ');
}

/**
 * Utility function to check if alert has content
 */
export function hasAlertContent(
  title?: string,
  message?: string,
  children?: React.ReactNode
): boolean {
  return !!(title || message || children);
}

/**
 * Default style props for Alert
 */
export const defaultAlertProps = {
  spacing: alertTokens.spacing.md,
  borderRadius: alertTokens.borderRadius,
  transition: alertTokens.transition,
};

export type AlertStyleProps = typeof defaultAlertProps;
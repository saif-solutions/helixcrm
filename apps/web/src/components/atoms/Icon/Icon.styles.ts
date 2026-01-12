// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Icon\Icon.styles.ts
import { IconSize, IconColor } from './Icon.types';

/**
 * Design tokens for Icon component (following Tailwind CSS system)
 */
export const iconTokens = {
  // Size tokens (width/height in pixels)
  size: {
    xs: 12,   // w-3 h-3
    sm: 16,   // w-4 h-4
    md: 20,   // w-5 h-5
    lg: 24,   // w-6 h-6
    xl: 32,   // w-8 h-8
    '2xl': 40, // w-10 h-10
    '3xl': 48, // w-12 h-12
    '4xl': 64, // w-16 h-16
  },
  
  // Stroke width tokens
  strokeWidth: {
    thin: 1,
    light: 1.5,
    regular: 2,
    medium: 2.5,
    bold: 3,
  },
  
  // Animation duration tokens
  animation: {
    spin: '1s linear infinite',
    pulse: '2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    ping: '1s cubic-bezier(0, 0, 0.2, 1) infinite',
    bounce: '1s infinite',
  },
  
  // Border radius tokens
  borderRadius: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  },
  
  // Spacing tokens for icon groups
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
  },
};

/**
 * CSS class definitions for Icon component
 */
export const iconClasses = {
  // Base classes (applied to all icons)
  base: [
    'inline-block',
    'transition-all',
    'duration-200',
  ].join(' '),
  
  // Size classes (width and height)
  size: {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-10 h-10',
    '3xl': 'w-12 h-12',
    '4xl': 'w-16 h-16',
  },
  
  // Color classes (text colors with dark mode support)
  color: {
    current: 'text-current',
    primary: 'text-primary-600 dark:text-primary-400',
    secondary: 'text-secondary-600 dark:text-secondary-400',
    success: 'text-success-600 dark:text-success-400',
    error: 'text-error-600 dark:text-error-400',
    warning: 'text-warning-600 dark:text-warning-400',
    info: 'text-info-600 dark:text-info-400',
    muted: 'text-gray-500 dark:text-gray-400',
    white: 'text-white',
    black: 'text-black',
    gray: 'text-gray-600 dark:text-gray-300',
    red: 'text-red-600 dark:text-red-400',
    orange: 'text-orange-600 dark:text-orange-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    purple: 'text-purple-600 dark:text-purple-400',
    pink: 'text-pink-600 dark:text-pink-400',
  },
  
  // Animation classes
  animation: {
    spin: 'animate-spin',
    pulse: 'animate-pulse',
    ping: 'animate-ping',
    bounce: 'animate-bounce',
  },
  
  // State classes
  state: {
    disabled: 'opacity-40 cursor-not-allowed',
    interactive: 'cursor-pointer hover:opacity-80 active:opacity-70',
    loading: 'relative',
  },
  
  // Variant classes
  variant: {
    outline: 'fill-none',
    solid: 'fill-current',
    duotone: 'fill-current opacity-50',
    twotone: 'fill-current',
  },
  
  // Transform classes
  transform: {
    flipHorizontal: 'scale-x[-1]',
    flipVertical: 'scale-y[-1]',
    flipBoth: 'scale-[-1]',
  },
  
  // SVG-specific classes
  svg: {
    base: 'stroke-current',
    thin: 'stroke-1',
    light: 'stroke-[1.5]',
    regular: 'stroke-2',
    medium: 'stroke-[2.5]',
    bold: 'stroke-[3]',
  },
  
  // Badge classes
  badge: {
    base: 'absolute flex items-center justify-center min-w-[1rem] h-4 px-1 text-xs font-semibold text-white rounded-full',
    primary: 'bg-primary-600',
    error: 'bg-error-600',
    success: 'bg-success-600',
    warning: 'bg-warning-600',
    info: 'bg-info-600',
    muted: 'bg-gray-600',
    current: 'bg-current',
  },
  
  // Tooltip classes
  tooltip: {
    base: 'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap',
    arrow: 'absolute w-2 h-2 bg-gray-900 transform rotate-45',
  },
};

/**
 * Utility function to build Icon CSS classes (Legacy compatibility)
 */
export function getIconClasses(
  size: IconSize = 'md',
  color: IconColor = 'current',
  spin?: boolean,
  className?: string
): string {
  const classes = [
    // Base classes
    iconClasses.base,
    
    // Size
    iconClasses.size[size],
    
    // Color
    iconClasses.color[color],
    
    // Animation
    spin ? iconClasses.animation.spin : '',
    
    // Custom classes
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get SVG-specific classes
 */
export function getSvgClasses(weight?: 'thin' | 'light' | 'regular' | 'medium' | 'bold', className?: string): string {
  const weightClasses = {
    thin: iconClasses.svg.thin,
    light: iconClasses.svg.light,
    regular: iconClasses.svg.regular,
    medium: iconClasses.svg.medium,
    bold: iconClasses.svg.bold,
  };
  
  const classes = [
    iconClasses.svg.base,
    weight ? weightClasses[weight] : '',
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Get badge position classes
 */
export function getBadgePositionClasses(position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'): string {
  const positionClasses = {
    'top-right': 'top-0 right-0 transform translate-x-1/2 -translate-y-1/2',
    'top-left': 'top-0 left-0 transform -translate-x-1/2 -translate-y-1/2',
    'bottom-right': 'bottom-0 right-0 transform translate-x-1/2 translate-y-1/2',
    'bottom-left': 'bottom-0 left-0 transform -translate-x-1/2 translate-y-1/2',
  };
  
  return positionClasses[position];
}

/**
 * Get tooltip position classes
 */
export function getTooltipPositionClasses(position: 'top' | 'right' | 'bottom' | 'left'): {
  container: string;
  arrow: string;
} {
  const containerClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-1',
    right: 'top-1/2 left-full transform -translate-y-1/2 ml-1',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-1',
    left: 'top-1/2 right-full transform -translate-y-1/2 mr-1',
  };
  
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
    right: 'top-1/2 left-0 -translate-y-1/2 -ml-1',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
    left: 'top-1/2 right-0 -translate-y-1/2 -mr-1',
  };
  
  return {
    container: containerClasses[position],
    arrow: arrowClasses[position],
  };
}

/**
 * Default icon props
 */
export const defaultIconProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  'aria-hidden': 'true',
} as const;

/**
 * Default fallback icon (plus icon) path data
 */
export const defaultFallbackIconPath = {
  d: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2,
};

/**
 * Predefined icon paths for common icons
 */
export const iconPaths = {
  check: {
    d: 'M5 13l4 4L19 7',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  x: {
    d: 'M6 18L18 6M6 6l12 12',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  loading: {
    d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  info: {
    d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  warning: {
    d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  error: {
    d: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  arrowRight: {
    d: 'M14 5l7 7m0 0l-7 7m7-7H3',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  arrowLeft: {
    d: 'M10 19l-7-7m0 0l7-7m-7 7h18',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  arrowUp: {
    d: 'M5 10l7-7m0 0l7 7m-7-7v18',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  arrowDown: {
    d: 'M19 14l-7 7m0 0l-7-7m7 7V3',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  search: {
    d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  user: {
    d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  calendar: {
    d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
  },
  // Add more icons as needed
} as const;

/**
 * Get appropriate stroke width for icon size (Legacy compatibility)
 */
export function getStrokeWidth(size: IconSize = 'md'): number {
  const strokeWidths: Record<IconSize, number> = {
    xs: 1.5,
    sm: 1.5,
    md: 2,
    lg: 2,
    xl: 2.5,
    '2xl': 2.5,
    '3xl': 3,
    '4xl': 3,
  };
  
  return strokeWidths[size];
}

/**
 * Create SVG element from path data (for server-side rendering)
 */
export function createIconSvg(
  pathData: typeof iconPaths[keyof typeof iconPaths],
  size: IconSize = 'md',
  color: IconColor = 'current',
  className?: string
): string {
  const sizePx = iconTokens.size[size];
  const strokeWidth = getStrokeWidth(size);
  
  return `
    <svg 
      class="${getIconClasses(size, color, false, className)}" 
      width="${sizePx}" 
      height="${sizePx}" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="${strokeWidth}" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="${pathData.d}" />
    </svg>
  `.trim();
}
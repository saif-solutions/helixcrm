// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Icon\Icon.types.ts
import * as React from 'react';

/**
 * Main Icon component props with comprehensive JSDoc
 */
export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'color' | 'size'> {
  /** 
   * Icon size
   * @default 'md'
   */
  size?: IconSize;
  
  /** 
   * Icon color (Tailwind text color classes)
   * @default 'current'
   */
  color?: IconColor;
  
  /** 
   * Whether the icon should spin (for loading states)
   * @default false
   */
  spin?: boolean;
  
  /** 
   * Whether the icon should pulse (for attention)
   * @default false
   */
  pulse?: boolean;
  
  /** 
   * Custom CSS class name
   */
  className?: string;
  
  /** 
   * Icon SVG element (children). If provided, wraps the SVG with styling.
   */
  children?: React.ReactNode;
  
  /** 
   * Accessibility label for screen readers
   * If not provided, aria-hidden="true" will be added
   */
  'aria-label'?: string;
  
  /** 
   * Icon library name (for theming/system integration)
   */
  library?: 'heroicons' | 'lucide' | 'material' | 'custom';
  
  /** 
   * Icon variant (filled, outline, dual-tone, etc.)
   */
  variant?: 'outline' | 'solid' | 'duotone' | 'twotone';
  
  /** 
   * Icon weight (stroke width)
   */
  weight?: 'thin' | 'light' | 'regular' | 'medium' | 'bold';
  
  /** 
   * Interactive icon (adds hover/focus states)
   */
  interactive?: boolean;
  
  /** 
   * Badge count to display on icon (e.g., notification count)
   */
  badge?: number | string;
  
  /** 
   * Badge color
   */
  badgeColor?: IconColor;
  
  /** 
   * Badge position
   */
  badgePosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  
  /** 
   * Tooltip text
   */
  tooltip?: string;
  
  /** 
   * Tooltip position
   */
  tooltipPosition?: 'top' | 'right' | 'bottom' | 'left';
  
  /** 
   * Loading state (shows spinner overlay)
   */
  loading?: boolean;
  
  /** 
   * Disabled state
   */
  disabled?: boolean;
  
  /** 
   * Flip direction
   */
  flip?: 'horizontal' | 'vertical' | 'both';
  
  /** 
   * Rotate degrees
   */
  rotate?: 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
  
  /** 
   * Data attributes for testing/analytics
   */
  'data-testid'?: string;
  'data-analytics'?: string;
  'data-cy'?: string;
}

/**
 * Icon size variants
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

/**
 * Icon color variants
 */
export type IconColor = 
  | 'current' 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'muted' 
  | 'white'
  | 'black'
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink';

/**
 * Icon ref type for forwardRef
 */
export type IconRef = SVGSVGElement;

/**
 * Props for predefined icon components
 */
export type CheckIconProps = Omit<IconProps, 'children'>;
export type XIconProps = Omit<IconProps, 'children'>;
export type LoadingIconProps = Omit<IconProps, 'children' | 'spin'>;
export type InfoIconProps = Omit<IconProps, 'children'>;
export type WarningIconProps = Omit<IconProps, 'children'>;
export type ErrorIconProps = Omit<IconProps, 'children'>;

/**
 * Utility type for icons with specific purposes
 */
export interface StatusIconProps extends Omit<IconProps, 'color'> {
  /** Status type determines color */
  status: 'success' | 'error' | 'warning' | 'info' | 'neutral';
}

/**
 * Icon pack configuration
 */
export interface IconPackConfig {
  /** Library name */
  name: string;
  /** Base URL for icon CDN */
  cdn?: string;
  /** Icon prefix */
  prefix?: string;
  /** Default size */
  defaultSize?: IconSize;
  /** Default variant */
  defaultVariant?: 'outline' | 'solid';
}

/**
 * Icon dimensions (in pixels)
 */
export interface IconDimensions {
  width: number;
  height: number;
  strokeWidth: number;
}

/**
 * Icon animation configuration
 */
export interface IconAnimation {
  type: 'spin' | 'pulse' | 'ping' | 'bounce' | 'none';
  duration: string;
  timing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/**
 * Icon metadata for search/categorization
 */
export interface IconMetadata {
  /** Icon name */
  name: string;
  /** Tags for search */
  tags: string[];
  /** Category */
  category: string;
  /** Keywords */
  keywords: string[];
  /** Author/creator */
  author?: string;
  /** License */
  license?: string;
  /** Version */
  version?: string;
}

// ============================================================================
// Type Guards & Utility Functions
// ============================================================================

/**
 * Type guard to check if icon should spin
 */
export function shouldIconSpin(props: Pick<IconProps, 'spin'>): boolean {
  return !!props.spin;
}

/**
 * Type guard to check if icon has custom children
 */
export function hasIconChildren(props: Pick<IconProps, 'children'>): boolean {
  return !!props.children && React.isValidElement(props.children);
}

/**
 * Get color based on status
 */
export function getStatusIconColor(status: StatusIconProps['status']): IconColor {
  const colorMap: Record<StatusIconProps['status'], IconColor> = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
    neutral: 'muted',
  };
  
  return colorMap[status];
}

/**
 * Get pixel dimensions for icon size
 */
export function getIconDimensions(size: IconSize = 'md'): IconDimensions {
  const dimensions: Record<IconSize, IconDimensions> = {
    xs: { width: 12, height: 12, strokeWidth: 1.5 },
    sm: { width: 16, height: 16, strokeWidth: 1.5 },
    md: { width: 20, height: 20, strokeWidth: 2 },
    lg: { width: 24, height: 24, strokeWidth: 2 },
    xl: { width: 32, height: 32, strokeWidth: 2.5 },
    '2xl': { width: 40, height: 40, strokeWidth: 2.5 },
    '3xl': { width: 48, height: 48, strokeWidth: 3 },
    '4xl': { width: 64, height: 64, strokeWidth: 3 },
  };
  
  return dimensions[size];
}

/**
 * Accessibility props for Icon
 */
export interface IconAccessibilityProps {
  /** ARIA role for the icon */
  role?: 'img' | 'presentation';
  
  /** ARIA label for screen readers (required for decorative icons) */
  'aria-label'?: string;
  
  /** ARIA hidden for purely decorative icons */
  'aria-hidden'?: boolean | 'true' | 'false';
  
  /** ARIA live region for dynamic icons */
  'aria-live'?: 'polite' | 'assertive' | 'off';
  
  /** ARIA busy for loading states */
  'aria-busy'?: boolean;
}

/**
 * Check if icon is decorative (no meaningful information)
 */
export function isIconDecorative(props: Pick<IconProps, 'aria-label'>): boolean {
  return !props['aria-label'];
}

/**
 * Get appropriate ARIA attributes for icon
 */
export function getIconAccessibilityProps(
  label?: string,
  loading?: boolean
): IconAccessibilityProps {
  if (label) {
    return {
      role: 'img',
      'aria-label': label,
      'aria-hidden': false,
      'aria-busy': loading,
      'aria-live': loading ? 'polite' : 'off',
    };
  }
  
  return {
    role: 'presentation',
    'aria-hidden': true,
  };
}

/**
 * Generate transform string for flip/rotate
 */
export function getIconTransform(flip?: IconProps['flip'], rotate?: IconProps['rotate']): string {
  const transforms: string[] = [];
  
  if (flip) {
    if (flip === 'horizontal') transforms.push('scaleX(-1)');
    if (flip === 'vertical') transforms.push('scaleY(-1)');
    if (flip === 'both') transforms.push('scale(-1)');
  }
  
  if (rotate !== undefined) {
    transforms.push(`rotate(${rotate}deg)`);
  }
  
  return transforms.join(' ') || 'none';
}

/**
 * Get CSS classes for icon based on props
 */
// In Icon.types.ts, update getIconClassNames function:
export function getIconClassNames(
  size: IconSize = 'md',
  color: IconColor = 'current',
  spin?: boolean,
  pulse?: boolean,
  interactive?: boolean,
  disabled?: boolean,
  variant?: IconProps['variant'] // This can be undefined
): string[] {
  const classes: string[] = [];
  
  // Size classes
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-10 h-10',
    '3xl': 'w-12 h-12',
    '4xl': 'w-16 h-16',
  };
  classes.push(sizeClasses[size]);
  
  // Color classes - FIX: Add fallback for undefined color
  const colorClasses: Record<IconColor, string> = {
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
    gray: 'text-gray-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
    indigo: 'text-indigo-600',
    purple: 'text-purple-600',
    pink: 'text-pink-600',
  };
  
  // FIX: Handle undefined color
  const colorClass = colorClasses[color] || colorClasses.current;
  classes.push(colorClass);
  
  // Animation classes
  if (spin) classes.push('animate-spin');
  if (pulse) classes.push('animate-pulse');
  
  // State classes
  if (interactive) {
    classes.push('cursor-pointer', 'hover:opacity-80', 'active:opacity-70');
  }
  if (disabled) {
    classes.push('opacity-40', 'cursor-not-allowed');
  }
  
  // Variant-specific classes - FIX: Handle undefined variant
  if (variant === 'solid') {
    classes.push('fill-current');
  } else if (variant === 'outline' || !variant) {
    // Default to outline if variant is undefined
    classes.push('fill-none');
  } else if (variant === 'duotone' || variant === 'twotone') {
    classes.push('fill-current');
    if (variant === 'duotone') {
      classes.push('opacity-50');
    }
  }
  
  return classes;
}

/**
 * Validate badge value
 */
export function isValidBadge(badge: IconProps['badge']): boolean {
  if (typeof badge === 'number') return badge > 0;
  if (typeof badge === 'string') return badge.trim().length > 0;
  return false;
}


export interface IconContextValue {
  defaultSize?: IconSize;
  defaultColor?: IconColor;
  defaultLibrary?: IconProps['library'];
  defaultVariant?: IconProps['variant'];
  iconPackUrl?: string;
}
// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Badge\Badge.types.ts
import * as React from 'react';

/**
 * Enterprise Badge component props with comprehensive JSDoc
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** 
   * Badge visual variant
   * @default 'default'
   */
  variant?: BadgeVariant;
  
  /** 
   * Badge size
   * @default 'md'
   */
  size?: BadgeSize;
  
  /** 
   * Badge shape (border radius)
   * @default 'rounded'
   */
  shape?: BadgeShape;
  
  /** 
   * Whether the badge is interactive/clickable
   * @default false
   */
  clickable?: boolean;
  
  /** 
   * Icon element to display before text
   */
  leftIcon?: React.ReactNode;
  
  /** 
   * Icon element to display after text
   */
  rightIcon?: React.ReactNode;
  
  /** 
   * Custom CSS class name
   */
  className?: string;
  
  /** 
   * Badge content (text or elements)
   */
  children: React.ReactNode;
  
  /** 
   * Data attribute for testing (testing-library)
   */
  'data-testid'?: string;
  
  /** 
   * Data attribute for analytics tracking
   */
  'data-analytics'?: string;
  
  /** 
   * Data attribute for Cypress testing
   */
  'data-cy'?: string;
  
  /** 
   * Optional tooltip text for badges with limited space
   */
  tooltip?: string;
  
  /** 
   * Maximum width before truncating text
   */
  maxWidth?: string | number;
}

/**
 * Badge visual variants
 */
export type BadgeVariant = 
  | 'default' 
  | 'primary' 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'outline';

/**
 * Badge size variants
 */
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Badge shape variants
 */
export type BadgeShape = 'square' | 'rounded' | 'pill';

/**
 * Badge ref type for forwardRef
 */
export type BadgeRef = HTMLSpanElement;

/**
 * Props for predefined badge variant components
 */
export type PrimaryBadgeProps = Omit<BadgeProps, 'variant'>;
export type SuccessBadgeProps = Omit<BadgeProps, 'variant'>;
export type ErrorBadgeProps = Omit<BadgeProps, 'variant'>;
export type WarningBadgeProps = Omit<BadgeProps, 'variant'>;

/**
 * Utility type for clickable badges
 */
export type ClickableBadgeProps = BadgeProps & {
  /** Required when badge is clickable */
  clickable: true;
  /** Optional click handler */
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
  /** Optional keyboard handler */
  onKeyDown?: React.KeyboardEventHandler<HTMLSpanElement>;
};

/**
 * Utility type for badges with icons
 */
export type IconBadgeProps = BadgeProps & {
  /** Icon position */
  iconPosition: 'left' | 'right';
  /** Icon element */
  icon: React.ReactNode;
};

/**
 * Type guard to check if badge is clickable
 */
export function isBadgeClickable(props: Pick<BadgeProps, 'clickable'>): boolean {
  return !!props.clickable;
}

/**
 * Type guard to check if badge has icon
 */
export function hasBadgeIcon(props: Pick<BadgeProps, 'leftIcon' | 'rightIcon'>): boolean {
  return !!(props.leftIcon || props.rightIcon);
}

/**
 * Accessibility props for Badge
 */
export interface BadgeAccessibilityProps {
  /** ARIA role (button for clickable badges) */
  role?: 'button' | 'status' | 'presentation';
  
  /** ARIA label for screen readers */
  'aria-label'?: string;
  
  /** ARIA live region for dynamic content */
  'aria-live'?: 'polite' | 'assertive' | 'off';
  
  /** Tab index for clickable badges */
  tabIndex?: 0 | -1;
  
  /** ARIA pressed state for toggle badges */
  'aria-pressed'?: boolean | 'mixed';
}

/**
 * Get appropriate role for badge based on props
 */
export function getBadgeRole(clickable?: boolean): 'button' | 'presentation' {
  return clickable ? 'button' : 'presentation';
}

/**
 * Get tab index for badge based on clickable state
 */
export function getBadgeTabIndex(clickable?: boolean): 0 | -1 | undefined {
  return clickable ? 0 : undefined;
}

/**
 * Badge theme configuration for theming support
 */
export interface BadgeTheme {
  /** Primary color variants */
  primary: string;
  /** Success color variants */
  success: string;
  /** Error color variants */
  error: string;
  /** Warning color variants */
  warning: string;
  /** Info color variants */
  info: string;
  /** Default color variants */
  default: string;
  /** Outline color variants */
  outline: string;
}

/**
 * Badge state management for complex interactive badges
 */
export interface BadgeState {
  /** Whether badge is hovered */
  isHovered: boolean;
  /** Whether badge is focused */
  isFocused: boolean;
  /** Whether badge is active/pressed */
  isActive: boolean;
  /** Whether badge is disabled */
  isDisabled: boolean;
}


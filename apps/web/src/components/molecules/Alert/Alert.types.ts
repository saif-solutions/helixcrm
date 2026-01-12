// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Alert\Alert.types.ts
import * as React from 'react';

/**
 * Main Alert component props with comprehensive JSDoc
 */
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 
   * Alert variant (determines color and icon)
   * @default 'info'
   */
  variant?: AlertVariant;
  
  /** 
   * Alert size (affects padding and font size)
   * @default 'md'
   */
  size?: AlertSize;
  
  /** 
   * Alert title (displayed prominently above message)
   */
  title?: string;
  
  /** 
   * Alert message content (alternative to children)
   */
  message?: string;
  
  /** 
   * Whether alert can be dismissed by user
   * @default false
   */
  dismissible?: boolean;
  
  /** 
   * Callback function when alert is dismissed
   */
  onDismiss?: () => void;
  
  /** 
   * Custom icon element (overrides default variant icon)
   */
  icon?: React.ReactNode;
  
  /** 
   * Action buttons or elements displayed below message
   */
  actions?: React.ReactNode;
  
  /** 
   * Custom CSS class name for icon container
   */
  iconClassName?: string;
  
  /** 
   * Custom CSS class name for content area
   */
  contentClassName?: string;
  
  /** 
   * Custom CSS class name for actions container
   */
  actionsClassName?: string;
}

/**
 * Alert visual variants
 */
export type AlertVariant = 'info' | 'success' | 'error' | 'warning';

/**
 * Alert size variants
 */
export type AlertSize = 'sm' | 'md' | 'lg';

/**
 * Alert ref type for forwardRef
 */
export type AlertRef = HTMLDivElement;

/**
 * Props for predefined alert variant components
 */
export type InfoAlertProps = Omit<AlertProps, 'variant'>;
export type SuccessAlertProps = Omit<AlertProps, 'variant'>;
export type ErrorAlertProps = Omit<AlertProps, 'variant'>;
export type WarningAlertProps = Omit<AlertProps, 'variant'>;

/**
 * Alert state for internal management
 */
export interface AlertState {
  /** Whether alert is currently visible (not dismissed) */
  isVisible: boolean;
  /** Whether alert is currently animating in/out */
  isAnimating: boolean;
}

/**
 * Alert dismissal options
 */
export interface AlertDismissOptions {
  /** Whether to animate dismissal */
  animated?: boolean;
  /** Duration of animation in milliseconds */
  animationDuration?: number;
  /** Callback after dismissal completes */
  onComplete?: () => void;
}

/**
 * Accessibility props for Alert
 */
export interface AlertAccessibilityProps {
  /** ARIA role for the alert */
  role?: 'alert' | 'status' | 'alertdialog';
  
  /** ARIA label for screen readers */
  'aria-label'?: string;
  
  /** ARIA live region priority */
  'aria-live'?: 'polite' | 'assertive' | 'off';
  
  /** ARIA atomic for screen reader announcements */
  'aria-atomic'?: boolean;
  
  /** ARIA description for additional context */
  'aria-describedby'?: string;
}

/**
 * Type guard to check if alert has title
 */
export function hasAlertTitle(props: Pick<AlertProps, 'title'>): boolean {
  return !!props.title;
}

/**
 * Type guard to check if alert has actions
 */
export function hasAlertActions(props: Pick<AlertProps, 'actions'>): boolean {
  return !!props.actions;
}

/**
 * Type guard to check if alert is dismissible
 */
export function isAlertDismissible(props: Pick<AlertProps, 'dismissible'>): boolean {
  return !!props.dismissible;
}

/**
 * Get appropriate ARIA role for alert variant
 */
export function getAlertRole(variant: AlertVariant): AlertAccessibilityProps['role'] {
  // Error alerts should be more assertive
  if (variant === 'error') {
    return 'alert';
  }
  
  // Other alerts can be status updates
  return 'status';
}

/**
 * Get appropriate ARIA live region setting
 */
export function getAlertAriaLive(variant: AlertVariant): AlertAccessibilityProps['aria-live'] {
  // Error and warning alerts should be more assertive
  if (variant === 'error' || variant === 'warning') {
    return 'assertive';
  }
  
  // Info and success alerts can be polite
  return 'polite';
}

/**
 * Get appropriate icon size based on alert size
 */
export function getAlertIconSize(size: AlertSize): 'xs' | 'sm' | 'md' {
  const sizeMap: Record<AlertSize, 'xs' | 'sm' | 'md'> = {
    sm: 'xs',
    md: 'sm',
    lg: 'md',
  };
  
  return sizeMap[size];
}

/**
 * Check if alert should be announced to screen readers
 */
export function shouldAlertAnnounce(variant: AlertVariant): boolean {
  // Error and warning alerts should always be announced
  return variant === 'error' || variant === 'warning';
}
// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Button\Button.types.ts
import * as React from 'react';

/**
 * Main Button component props with comprehensive JSDoc
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 
   * Button visual variant
   * @default 'primary'
   */
  variant?: ButtonVariant;
  
  /** 
   * Button size
   * @default 'md'
   */
  size?: ButtonSize;
  
  /** 
   * Display button as full width (100% of container)
   * @default false
   */
  fullWidth?: boolean;
  
  /** 
   * Display loading state with spinner
   * @default false
   */
  loading?: boolean;
  
  /** 
   * Icon element to display before text
   */
  leftIcon?: React.ReactNode;
  
  /** 
   * Icon element to display after text
   */
  rightIcon?: React.ReactNode;
  
  /** 
   * Display only icon (button becomes square, hides text)
   * @default false
   */
  iconOnly?: boolean;
  
  /** 
   * Custom CSS class name
   */
  className?: string;
  
  /** 
   * Button content (text or elements)
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
}

/**
 * Button visual variants
 */
export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'ghost' 
  | 'danger' 
  | 'success' 
  | 'warning'
  | 'outline'
  | 'link';

/**
 * Button size variants
 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Accessibility props for Button
 */
export interface ButtonAccessibilityProps {
  /** ARIA label for screen readers (alternative to visible text) */
  'aria-label'?: string;
  
  /** ARIA description for additional context */
  'aria-describedby'?: string;
  
  /** ARIA live region for dynamic content */
  'aria-live'?: 'polite' | 'assertive' | 'off';
  
  /** ARIA busy state for loading */
  'aria-busy'?: boolean;
}

/**
 * Button state for internal use (if needed for complex logic)
 */
export interface ButtonState {
  /** Whether button is currently pressed */
  isPressed: boolean;
  
  /** Whether button is focused */
  isFocused: boolean;
  
  /** Whether button is hovered */
  isHovered: boolean;
}

/**
 * Button ref type for forwardRef
 */
export type ButtonRef = HTMLButtonElement;

/**
 * Props for predefined button components
 */
export type PrimaryButtonProps = Omit<ButtonProps, 'variant'>;
export type SecondaryButtonProps = Omit<ButtonProps, 'variant'>;
export type GhostButtonProps = Omit<ButtonProps, 'variant'>;
export type DangerButtonProps = Omit<ButtonProps, 'variant'>;

/**
 * Utility type: Extract button props without children for icon-only usage
 */
export type ButtonWithoutChildren = Omit<ButtonProps, 'children'> & {
  /** Accessible label required for icon-only buttons */
  'aria-label': string;
};

/**
 * Type guard to check if button is in loading state
 */
export function isButtonLoading(props: ButtonProps): boolean {
  return !!props.loading;
}

/**
 * Type guard to check if button is disabled
 */
export function isButtonDisabled(props: ButtonProps): boolean {
  return !!props.disabled || !!props.loading;
}
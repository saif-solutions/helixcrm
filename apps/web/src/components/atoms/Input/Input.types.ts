// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Input\Input.types.ts
import * as React from 'react';

/**
 * Main Input component props with comprehensive JSDoc
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** 
   * Input visual variant (affects border color)
   * @default 'default'
   */
  variant?: InputVariant;
  
  /** 
   * Input size (affects padding and font size)
   * @default 'md'
   */
  size?: InputSize;
  
  /** 
   * Display input as full width (100% of container)
   * @default false
   */
  fullWidth?: boolean;
  
  /** 
   * Icon element to display on the left side
   */
  leftIcon?: React.ReactNode;
  
  /** 
   * Icon element to display on the right side
   */
  rightIcon?: React.ReactNode;
  
  /** 
   * Label text displayed above the input
   */
  label?: string;
  
  /** 
   * Helper text displayed below the input
   */
  helperText?: string;
  
  /** 
   * Error message (overrides variant to 'error' if provided)
   */
  error?: string;
  
  /** 
   * Required field indicator (adds asterisk to label)
   * @default false
   */
  required?: boolean;
  
  /** 
   * Custom CSS class name for the wrapper element
   */
  wrapperClassName?: string;
  
  /** 
   * Custom CSS class name for the input element
   */
  className?: string;
}

/**
 * Input visual variants
 */
export type InputVariant = 'default' | 'success' | 'error' | 'warning';

/**
 * Input size variants
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Accessibility props for Input
 */
export interface InputAccessibilityProps {
  /** ARIA label for screen readers (alternative to visible label) */
  'aria-label'?: string;
  
  /** ARIA description for additional context */
  'aria-describedby'?: string;
  
  /** ARIA invalid state for validation errors */
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  
  /** ARIA required state */
  'aria-required'?: boolean;
  
  /** ARIA disabled state */
  'aria-disabled'?: boolean;
}

/**
 * Input state for internal use (if needed for complex logic)
 */
export interface InputState {
  /** Whether input is currently focused */
  isFocused: boolean;
  
  /** Whether input has content */
  hasContent: boolean;
  
  /** Whether input is in error state */
  isError: boolean;
}

/**
 * Input ref type for forwardRef
 */
export type InputRef = HTMLInputElement;

/**
 * Props for predefined input type components
 */
export type TextInputProps = Omit<InputProps, 'type'>;
export type EmailInputProps = Omit<InputProps, 'type'>;
export type PasswordInputProps = Omit<InputProps, 'type'>;
export type NumberInputProps = Omit<InputProps, 'type'>;

/**
 * Utility type for input with label
 */
export type LabeledInputProps = InputProps & {
  /** Required when using label */
  id: string;
  label: string;
};

/**
 * Utility type for icon positions
 */
export type IconPosition = 'left' | 'right';

/**
 * Type guard to check if input has validation error
 */
export function hasInputError(props: Pick<InputProps, 'error' | 'variant'>): boolean {
  return !!props.error || props.variant === 'error';
}

/**
 * Type guard to check if input is required
 */
export function isInputRequired(props: Pick<InputProps, 'required'>): boolean {
  return !!props.required;
}

/**
 * Utility to get input's accessibility attributes
 */
export function getInputAccessibilityProps(
  props: Pick<InputProps, 'error' | 'required' | 'disabled' | 'id' | 'helperText'>
): InputAccessibilityProps {
  const errorId = props.error ? `${props.id}-error` : undefined;
  const helperId = props.helperText ? `${props.id}-helper` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

  return {
    'aria-invalid': !!props.error,
    'aria-required': props.required,
    'aria-disabled': props.disabled,
    'aria-describedby': describedBy,
  };
}

// ============================================================================
// Enhanced Input Types (for enterprise features)
// ============================================================================

/**
 * Validation rule for input validation
 */
export interface InputValidationRule {
  /** Validation function that returns true if valid */
  validate: (value: string) => boolean;
  /** Error message if validation fails */
  message: string;
  /** Optional custom error type */
  type?: string;
}

/**
 * Enhanced Input Props for enterprise features
 */
export interface EnhancedInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  /** Custom validation rules */
  validationRules?: InputValidationRule[];
  
  /** Mask pattern (e.g., "###-##-####" for SSN) */
  mask?: string;
  
  /** Auto-complete suggestions */
  suggestions?: string[];
  
  /** Character counter */
  showCounter?: boolean;
  
  /** Clear button */
  showClearButton?: boolean;
  
  /** Controlled value with formatting */
  value?: string;
  /** On change handler with formatted value */
  onChange?: (value: string, event?: React.ChangeEvent<HTMLInputElement>) => void;
}
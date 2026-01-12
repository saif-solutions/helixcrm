import * as React from 'react';
import { InputProps } from '../../atoms/Input/Input.types';

/**
 * Main FormField component props
 */
export interface FormFieldProps extends Omit<InputProps, 'label' | 'error' | 'helperText'> {
  /**
   * Field label
   */
  label?: string;
  
  /**
   * Field name for form submission
   */
  name: string;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Helper text
   */
  helperText?: string;
  
  /**
   * Whether field is required
   */
  required?: boolean;
  
  /**
   * Custom class name for wrapper
   */
  wrapperClassName?: string;
  
  /**
   * Custom class name for label
   */
  labelClassName?: string;
  
  /**
   * Custom class name for error
   */
  errorClassName?: string;
  
  /**
   * Custom class name for helper text
   */
  helperClassName?: string;
  
  /**
   * Layout direction
   * @default 'vertical'
   */
  layout?: 'vertical' | 'horizontal';
  
  /**
   * Label width for horizontal layout
   */
  labelWidth?: string;
}

/**
 * FormFieldGroup component props - groups related form fields
 */
export interface FormFieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Group title
   */
  title?: string;
  
  /**
   * Group description
   */
  description?: string;
}

/**
 * FormActions component props - container for form action buttons
 */
export interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Common form field types for convenience
 */
export type FormFieldTypeProps = Omit<FormFieldProps, 'type'>;

/**
 * Textarea-specific props for TextareaFormField
 */
export interface TextareaFormFieldProps extends Omit<FormFieldProps, 'type'> {
  /**
   * Number of rows for textarea
   */
  rows?: number;
}

/**
 * Form field variant types
 */
export type FormFieldVariant = 'default' | 'error' | 'success' | 'warning';

/**
 * Layout configuration for form fields
 */
export interface FormFieldLayoutConfig {
  /**
   * Layout type
   */
  type: 'vertical' | 'horizontal';
  
  /**
   * Label width for horizontal layout
   */
  labelWidth?: string;
  
  /**
   * Gap between elements
   */
  gap?: string;
}

/**
 * Accessibility props for form fields
 */
export interface FormFieldAccessibilityProps {
  /**
   * ID for the field (auto-generated if not provided)
   */
  id?: string;
  
  /**
   * ARIA described by IDs
   */
  ariaDescribedBy?: string;
  
  /**
   * ARIA invalid state
   */
  ariaInvalid?: boolean;
  
  /**
   * ARIA label (for screen readers)
   */
  ariaLabel?: string;
}

/**
 * Form field state management
 */
export interface FormFieldState {
  /**
   * Whether the field has been touched
   */
  touched: boolean;
  
  /**
   * Whether the field is currently focused
   */
  focused: boolean;
  
  /**
   * Current field value
   */
  value: string;
  
  /**
   * Validation status
   */
  isValid: boolean;
}

/**
 * Form field validation rules
 */
export interface FormFieldValidation {
  /**
   * Whether field is required
   */
  required?: boolean;
  
  /**
   * Minimum length
   */
  minLength?: number;
  
  /**
   * Maximum length
   */
  maxLength?: number;
  
  /**
   * Pattern to match (regex)
   */
  pattern?: RegExp;
  
  /**
   * Custom validation function
   */
  validate?: (value: string) => string | undefined;
}

/**
 * Form field context for complex form scenarios
 */
export interface FormFieldContextValue {
  /**
   * Field ID
   */
  id: string;
  
  /**
   * Field name
   */
  name: string;
  
  /**
   * Field value
   */
  value: string;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Whether field is required
   */
  required: boolean;
  
  /**
   * Whether field is disabled
   */
  disabled: boolean;
  
  /**
   * Field change handler
   */
  onChange: (value: string) => void;
  
  /**
   * Field blur handler
   */
  onBlur: () => void;
}

/**
 * Ref types for form field components
 */
export type FormFieldRef = HTMLInputElement;
export type TextareaFormFieldRef = HTMLTextAreaElement;
export type FormFieldGroupRef = HTMLDivElement;
export type FormActionsRef = HTMLDivElement;
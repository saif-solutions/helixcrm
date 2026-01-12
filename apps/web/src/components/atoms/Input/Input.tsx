// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Input\Input.tsx
import * as React from 'react';
import { cn } from '../../../lib/utils';
import {
  InputProps,
  InputRef,
  TextInputProps,
  EmailInputProps,
  PasswordInputProps,
  NumberInputProps,
  getInputAccessibilityProps,
} from './Input.types';
import {
  getInputClasses,
  getIconContainerClasses,
  getWrapperClasses,
  getLabelClasses,
  getHelperClasses,
  generateInputId,
  getAriaDescribedBy,
} from './Input.styles';

/**
 * Input component for text input fields.
 * 
 * Features:
 * - Multiple variants (default, success, error, warning)
 * - Multiple sizes (sm, md, lg)
 * - Icon support (left, right)
 * - Labels and helper text
 * - Validation states with error messages
 * - Full accessibility support
 * - Forward ref support
 * 
 * @example
 * ```tsx
 * <Input placeholder="Enter text..." />
 * <Input label="Email" variant="error" error="Invalid email" />
 * <Input leftIcon={<Icon />} rightIcon={<Icon />} />
 * ```
 */
export const Input = React.forwardRef<InputRef, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      fullWidth = false,
      leftIcon,
      rightIcon,
      label,
      helperText,
      error,
      required = false,
      wrapperClassName,
      className,
      disabled,
      id,
      ...props
    }: InputProps,
    ref: React.Ref<InputRef>
  ) => {
    // Use error variant if error message is provided
    const finalVariant = error ? 'error' : variant;
    
    // Generate ID if not provided
    const inputId = id || generateInputId();
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    
    // Get accessibility attributes
    const accessibilityProps = getInputAccessibilityProps({
      error,
      required,
      disabled,
      id: inputId,
      helperText,
    });
    
    // Build CSS classes using utility functions
    const inputClassName = getInputClasses(finalVariant, size, {
      disabled,
      readonly: props.readOnly,
      required,
      hasLeftIcon: !!leftIcon,
      hasRightIcon: !!rightIcon,
      fullWidth,
      className,
    });

    // Create the input element with icon wrappers
    const inputElement = (
      <div className={getWrapperClasses(fullWidth, wrapperClassName)}>
        {/* Left Icon */}
        {leftIcon && (
          <div className={getIconContainerClasses('left')}>
            <span className="text-gray-400">
              {leftIcon}
            </span>
          </div>
        )}
        
        {/* Input Field */}
        <input
          ref={ref}
          id={inputId}
          className={inputClassName}
          disabled={disabled}
          required={required}
          aria-describedby={getAriaDescribedBy(helperId, errorId)}
          {...accessibilityProps}
          {...props}
        />
        
        {/* Right Icon */}
        {rightIcon && (
          <div className={getIconContainerClasses('right')}>
            <span className="text-gray-400">
              {rightIcon}
            </span>
          </div>
        )}
      </div>
    );

    // If no label, return just the input
    if (!label) {
      return inputElement;
    }

    // Wrap with label if label is provided
    return (
      <div className={cn('space-y-1', fullWidth ? 'w-full' : undefined)}>
        {/* Label */}
        <label
          htmlFor={inputId}
          className={getLabelClasses()}
        >
          {label}
          {required && (
            <span className="text-error-500 ml-1">*</span>
          )}
        </label>
        
        {/* Input Element */}
        {inputElement}
        
        {/* Helper Text or Error Message */}
        {(helperText || error) && (
          <div className="space-y-1">
            {helperText && !error && (
              <p
                id={helperId}
                className={getHelperClasses(false)}
              >
                {helperText}
              </p>
            )}
            
            {error && (
              <p
                id={errorId}
                className={getHelperClasses(true)}
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================================================
// Predefined Input Types (for convenience and consistent usage)
// ============================================================================

/**
 * Text Input - Standard text input field
 * @example
 * ```tsx
 * <TextInput placeholder="Enter your name" />
 * ```
 */
export const TextInput = React.forwardRef<InputRef, TextInputProps>(
  (props: TextInputProps, ref: React.Ref<InputRef>) => (
    <Input ref={ref} type="text" {...props} />
  )
);
TextInput.displayName = 'TextInput';

/**
 * Email Input - Email address input with proper type
 * @example
 * ```tsx
 * <EmailInput placeholder="email@example.com" />
 * ```
 */
export const EmailInput = React.forwardRef<InputRef, EmailInputProps>(
  (props: EmailInputProps, ref: React.Ref<InputRef>) => (
    <Input ref={ref} type="email" {...props} />
  )
);
EmailInput.displayName = 'EmailInput';

/**
 * Password Input - Password input with masking
 * @example
 * ```tsx
 * <PasswordInput placeholder="Enter password" />
 * ```
 */
export const PasswordInput = React.forwardRef<InputRef, PasswordInputProps>(
  (props: PasswordInputProps, ref: React.Ref<InputRef>) => (
    <Input ref={ref} type="password" {...props} />
  )
);
PasswordInput.displayName = 'PasswordInput';

/**
 * Number Input - Numeric input field
 * @example
 * ```tsx
 * <NumberInput placeholder="Enter amount" />
 * ```
 */
export const NumberInput = React.forwardRef<InputRef, NumberInputProps>(
  (props: NumberInputProps, ref: React.Ref<InputRef>) => (
    <Input ref={ref} type="number" {...props} />
  )
);
NumberInput.displayName = 'NumberInput';
import * as React from 'react';
import { cn } from '../../../lib/utils';
import {
  InputProps,
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
} from './Input.styles';

/**
 * Enhanced Input component for text input fields with React Hook Form support.
 *
 * Phase 2A Enhancements:
 * - ✅ Proper forwardRef implementation for React Hook Form
 * - ✅ aria-invalid attribute for accessibility
 * - ✅ Error state styling integration
 * - ✅ Helper text and error message support
 * - ✅ TypeScript strict compliance
 *
 * @example
 * ```tsx
 * // With React Hook Form
 * const { register } = useForm();
 * <Input {...register('email')} />
 *
 * // With error state
 * <Input
 *   error="Email is required"
 *   aria-invalid="true"
 *   {...register('email')}
 * />
 *
 * // With helper text
 * <Input
 *   helperText="Enter a valid email address"
 *   label="Email Address"
 *   required
 *   {...register('email')}
 * />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
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
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      ...props
    }: InputProps,
    ref: React.Ref<HTMLInputElement>
  ) => {
    // Use error variant if error message is provided
    const finalVariant = error ? 'error' : variant;
    const isInvalid = !!error || ariaInvalid === 'true';

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

    // Combine aria-describedby attributes
    const describedByIds =
      [ariaDescribedBy, helperId, errorId].filter(Boolean).join(' ') || undefined;

    // Create the input element with icon wrappers
    const inputElement = (
      <div className={getWrapperClasses(fullWidth, wrapperClassName)} data-testid="input-wrapper">
        {/* Left Icon */}
        {leftIcon && (
          <div className={getIconContainerClasses('left')} data-testid="input-left-icon">
            <span className="text-gray-400 flex items-center justify-center">{leftIcon}</span>
          </div>
        )}

        {/* Input Field */}
        <input
          ref={ref}
          id={inputId}
          className={inputClassName}
          disabled={disabled}
          required={required}
          aria-invalid={isInvalid ? 'true' : 'false'}
          aria-describedby={describedByIds}
          data-invalid={isInvalid}
          data-error={!!error}
          {...accessibilityProps}
          {...props}
        />

        {/* Right Icon */}
        {rightIcon && (
          <div className={getIconContainerClasses('right')} data-testid="input-right-icon">
            <span className="text-gray-400 flex items-center justify-center">{rightIcon}</span>
          </div>
        )}
      </div>
    );

    // If no label, return just the input
    if (!label) {
      return (
        <div className="space-y-1">
          {inputElement}

          {/* Helper Text or Error Message */}
          {(helperText || error) && (
            <div className="space-y-1">
              {helperText && !error && (
                <p
                  id={helperId}
                  className={getHelperClasses(false)}
                  data-testid="input-helper-text"
                >
                  {helperText}
                </p>
              )}

              {error && (
                <p
                  id={errorId}
                  className={getHelperClasses(true)}
                  role="alert"
                  aria-live="assertive"
                  data-testid="input-error-text"
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    // Wrap with label if label is provided
    return (
      <div className={cn('space-y-1', fullWidth ? 'w-full' : undefined)}>
        {/* Label */}
        <label htmlFor={inputId} className={getLabelClasses()} data-testid="input-label">
          {label}
          {required && (
            <span className="text-error-500 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>

        {/* Input Element */}
        {inputElement}

        {/* Helper Text or Error Message */}
        {(helperText || error) && (
          <div className="space-y-1">
            {helperText && !error && (
              <p id={helperId} className={getHelperClasses(false)} data-testid="input-helper-text">
                {helperText}
              </p>
            )}

            {error && (
              <p
                id={errorId}
                className={getHelperClasses(true)}
                role="alert"
                aria-live="assertive"
                data-testid="input-error-text"
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
 * Text Input - Standard text input field with RHF support
 */
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (props: TextInputProps, ref: React.Ref<HTMLInputElement>) => (
    <Input ref={ref} type="text" {...props} />
  )
);
TextInput.displayName = 'TextInput';

/**
 * Email Input - Email address input with proper type and validation support
 */
export const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  (props: EmailInputProps, ref: React.Ref<HTMLInputElement>) => (
    <Input ref={ref} type="email" {...props} />
  )
);
EmailInput.displayName = 'EmailInput';

/**
 * Password Input - Password input with masking and RHF support
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (props: PasswordInputProps, ref: React.Ref<HTMLInputElement>) => (
    <Input ref={ref} type="password" {...props} />
  )
);
PasswordInput.displayName = 'PasswordInput';

/**
 * Number Input - Numeric input field with RHF support
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (props: NumberInputProps, ref: React.Ref<HTMLInputElement>) => (
    <Input ref={ref} type="number" {...props} />
  )
);
NumberInput.displayName = 'NumberInput';

/**
 * FormInput - Convenience component specifically designed for forms
 * with built-in error handling for React Hook Form
 */
export const FormInput = React.forwardRef<
  HTMLInputElement,
  InputProps & {
    fieldError?: string;
  }
>(({ fieldError, error: propError, ...props }, ref) => {
  const error = fieldError || propError;

  return <Input ref={ref} error={error} aria-invalid={error ? 'true' : 'false'} {...props} />;
});
FormInput.displayName = 'FormInput';

import * as React from 'react';
import { cn } from '../../../lib/utils';
import { Input } from '../../atoms/Input/Input';
import { 
  FormFieldProps, 
  FormFieldGroupProps, 
  FormActionsProps,
  FormFieldTypeProps,
  TextareaFormFieldProps,
  FormFieldRef,
  TextareaFormFieldRef,
  FormFieldGroupRef,
  FormActionsRef
} from './FormField.types';
import { 
  formFieldClasses,
  getWrapperClasses,
  getLabelClasses,
  getHelperClasses,
  getInputClasses,
  getTextareaClasses,
  getFieldContainerClasses,
  defaultStyleProps
} from './FormField.styles';

/**
 * Complete form field component with label, input, validation, and helper text.
 * Wraps the Input component with additional form field functionality.
 */
export const FormField = React.forwardRef<FormFieldRef, FormFieldProps>(
  (
    {
      label,
      name,
      error,
      helperText,
      required = false,
      wrapperClassName,
      labelClassName,
      errorClassName,
      helperClassName,
      layout = 'vertical',
      labelWidth = defaultStyleProps.labelWidth,
      className,
      disabled,
      variant,
      ...inputProps
    }: FormFieldProps,
    ref: React.Ref<FormFieldRef>
  ) => {
    const fieldId = `${name}-field`;
    const errorId = error ? `${fieldId}-error` : undefined;
    const helperId = helperText ? `${fieldId}-helper` : undefined;
    const ariaDescribedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

    const isHorizontal = layout === 'horizontal';
    const fieldVariant = error ? 'error' : variant;

    // Build CSS classes using utility functions
    const wrapperClasses = cn(
      getWrapperClasses(layout, disabled, wrapperClassName)
    );

    const labelClasses = cn(
      getLabelClasses(layout, required, disabled, fieldVariant, labelClassName)
    );

    const fieldContainerClasses = cn(
      getFieldContainerClasses(layout)
    );

    const inputClasses = cn(
      getInputClasses(fieldVariant, disabled, className)
    );

    const helperErrorClasses = cn(
      getHelperClasses(fieldVariant, !!error, disabled, error ? errorClassName : helperClassName)
    );

    const labelStyle = isHorizontal ? { width: labelWidth, minWidth: labelWidth } : undefined;

    const renderLabel = () => {
      if (!label) return null;
      
      return (
        <label
          htmlFor={fieldId}
          className={labelClasses}
          style={labelStyle}
        >
          {label}
        </label>
      );
    };

    const renderField = () => (
      <div className={fieldContainerClasses}>
        <Input
          ref={ref}
          id={fieldId}
          name={name}
          label={undefined} // We handle label separately
          error={error}
          helperText={helperText}
          required={required}
          disabled={disabled}
          className={inputClasses}
          aria-describedby={ariaDescribedBy}
          aria-invalid={!!error}
          {...inputProps}
        />
        
        {/* Additional error/helper text for more control */}
        {(error || helperText) && (
          <p 
            id={error ? errorId : helperId} 
            className={helperErrorClasses}
            role={error ? "alert" : undefined}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );

    return (
      <div className={wrapperClasses}>
        {isHorizontal ? (
          <>
            {renderLabel()}
            {renderField()}
          </>
        ) : (
          <>
            {renderLabel()}
            {renderField()}
          </>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// FormField sub-components for building complex forms
export const FormFieldGroup = React.forwardRef<FormFieldGroupRef, FormFieldGroupProps>(
  ({ title, description, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        formFieldClasses.group.wrapper,
        className
      )}
      {...props}
    >
      {(title || description) && (
        <div className={formFieldClasses.group.header}>
          {title && <h3 className={formFieldClasses.group.title}>{title}</h3>}
          {description && <p className={formFieldClasses.group.description}>{description}</p>}
        </div>
      )}
      <div className={formFieldClasses.group.content}>{children}</div>
    </div>
  )
);
FormFieldGroup.displayName = 'FormFieldGroup';

export const FormActions = React.forwardRef<FormActionsRef, FormActionsProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        formFieldClasses.actions.wrapper,
        className
      )}
      {...props}
    />
  )
);
FormActions.displayName = 'FormActions';

// Common form field types for convenience
export const TextFormField = React.forwardRef<FormFieldRef, FormFieldTypeProps>(
  (props: FormFieldTypeProps, ref: React.Ref<FormFieldRef>) => (
    <FormField ref={ref} type="text" {...props} />
  )
);
TextFormField.displayName = 'TextFormField';

export const EmailFormField = React.forwardRef<FormFieldRef, FormFieldTypeProps>(
  (props: FormFieldTypeProps, ref: React.Ref<FormFieldRef>) => (
    <FormField ref={ref} type="email" {...props} />
  )
);
EmailFormField.displayName = 'EmailFormField';

export const PasswordFormField = React.forwardRef<FormFieldRef, FormFieldTypeProps>(
  (props: FormFieldTypeProps, ref: React.Ref<FormFieldRef>) => (
    <FormField ref={ref} type="password" {...props} />
  )
);
PasswordFormField.displayName = 'PasswordFormField';

export const NumberFormField = React.forwardRef<FormFieldRef, FormFieldTypeProps>(
  (props: FormFieldTypeProps, ref: React.Ref<FormFieldRef>) => (
    <FormField ref={ref} type="number" {...props} />
  )
);
NumberFormField.displayName = 'NumberFormField';

export const TextareaFormField = React.forwardRef<TextareaFormFieldRef, TextareaFormFieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => {
    const { 
      wrapperClassName, 
      labelClassName, 
      errorClassName, 
      helperClassName, 
      layout, 
      labelWidth, 
      className, 
      rows = 4,
      error,
      helperText,
      disabled,
      required,
      label,
      name,
      variant,
      ...textareaProps  // Changed from fieldProps to textareaProps for clarity
    } = props;
    
    const fieldId = `${name}-field`;
    const errorId = error ? `${fieldId}-error` : undefined;
    const helperId = helperText ? `${fieldId}-helper` : undefined;
    const ariaDescribedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

    const isHorizontal = layout === 'horizontal';
    const fieldVariant = error ? 'error' : variant;

    // Build CSS classes using utility functions
    const wrapperClasses = cn(
      getWrapperClasses(layout || 'vertical', disabled, wrapperClassName)
    );

    const labelClasses = cn(
      getLabelClasses(layout || 'vertical', required, disabled, fieldVariant, labelClassName)
    );

    const fieldContainerClasses = cn(
      getFieldContainerClasses(layout || 'vertical')
    );

    const textareaClasses = cn(
      getTextareaClasses(fieldVariant, disabled, className)
    );

    const helperErrorClasses = cn(
      getHelperClasses(fieldVariant, !!error, disabled, error ? errorClassName : helperClassName)
    );

    const labelStyle = isHorizontal ? { 
      width: labelWidth || defaultStyleProps.labelWidth, 
      minWidth: labelWidth || defaultStyleProps.labelWidth 
    } : undefined;

    return (
      <div className={wrapperClasses}>
        {label && (
          <label
            htmlFor={fieldId}
            className={labelClasses}
            style={labelStyle}
          >
            {label}
          </label>
        )}
        
        <div className={fieldContainerClasses}>
          <textarea
            ref={ref}
            id={fieldId}
            name={name}
            className={textareaClasses}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={ariaDescribedBy}
            rows={rows}
            {...textareaProps}  // Only spread textarea-specific props
          />
          
          {(error || helperText) && (
            <p 
              id={error ? errorId : helperId} 
              className={helperErrorClasses}
              role={error ? "alert" : undefined}
            >
              {error || helperText}
            </p>
          )}
        </div>
      </div>
    );
  }
);
TextareaFormField.displayName = 'TextareaFormField';
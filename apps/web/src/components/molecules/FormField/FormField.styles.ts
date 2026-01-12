import { FormFieldVariant } from './FormField.types';

/**
 * Design tokens for FormField components
 * These tokens ensure consistency across all form fields
 */
export const formFieldTokens = {
  // Spacing tokens (in rem units)
  spacing: {
    verticalGap: '0.5rem',      // 8px - gap between label and field in vertical layout
    horizontalGap: '1rem',      // 16px - gap between label and field in horizontal layout
    labelMarginBottom: '0.25rem', // 4px - margin below label in vertical layout
    helperMarginTop: '0.25rem',   // 4px - margin above helper/error text
    groupGap: '1.5rem',         // 24px - gap between form field groups
    fieldGap: '1rem',           // 16px - gap between form fields within a group
    actionsGap: '0.75rem',      // 12px - gap between action buttons
  },

  // Sizing tokens
  sizing: {
    labelWidth: '7.5rem',       // 120px - default label width for horizontal layout
    labelWidthCompact: '6rem',  // 96px - compact label width
    labelWidthWide: '10rem',    // 160px - wide label width
    inputHeight: '2.5rem',      // 40px - standard input height
    textareaMinHeight: '6rem',  // 96px - minimum textarea height
  },

  // Typography tokens
  typography: {
    label: {
      fontSize: '0.875rem',     // 14px
      fontWeight: '500',
      lineHeight: '1.25rem',
    },
    helper: {
      fontSize: '0.75rem',      // 12px
      lineHeight: '1rem',
    },
    error: {
      fontSize: '0.75rem',      // 12px
      lineHeight: '1rem',
    },
    groupTitle: {
      fontSize: '1rem',         // 16px
      fontWeight: '600',
      lineHeight: '1.5rem',
    },
    groupDescription: {
      fontSize: '0.875rem',     // 14px
      lineHeight: '1.25rem',
    },
  },

  // Color tokens (using Tailwind CSS color palette)
  colors: {
    label: {
      default: 'text-gray-700',
      disabled: 'text-gray-400',
      error: 'text-red-600',
      success: 'text-emerald-600',
      warning: 'text-amber-600',
    },
    helper: {
      default: 'text-gray-500',
      error: 'text-red-600',
      success: 'text-emerald-600',
      warning: 'text-amber-600',
    },
    border: {
      default: 'border-gray-300',
      focus: 'border-blue-500',
      error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
      success: 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500',
      warning: 'border-amber-300 focus:border-amber-500 focus:ring-amber-500',
      disabled: 'border-gray-200',
    },
    background: {
      default: 'bg-white',
      disabled: 'bg-gray-50',
      group: 'bg-gray-50',
    },
  },

  // Border radius tokens
  borderRadius: {
    default: 'rounded-md',
    lg: 'rounded-lg',
  },

  // Shadow tokens
  shadows: {
    default: 'shadow-sm',
    focus: 'focus:ring-1 focus:ring-blue-500',
    error: 'focus:ring-1 focus:ring-red-500',
    success: 'focus:ring-1 focus:ring-emerald-500',
    warning: 'focus:ring-1 focus:ring-amber-500',
  },
};

/**
 * CSS class utilities for FormField components
 * These classes follow Tailwind CSS naming conventions
 */
export const formFieldClasses = {
  // Wrapper classes
  wrapper: {
    base: 'form-field',
    vertical: 'space-y-2',
    horizontal: 'flex items-start gap-4',
    disabled: 'opacity-60 cursor-not-allowed',
  },

  // Label classes
  label: {
    base: 'block text-sm font-medium',
    disabled: 'text-gray-400',
    default: 'text-gray-700',
    error: 'text-red-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    required: "after:content-['*'] after:ml-0.5 after:text-red-500",
    horizontal: 'pt-2',
  },

  // Field container classes
  fieldContainer: {
    base: '',
    horizontal: 'flex-1 min-w-0',
  },

  // Helper text classes
  helper: {
    base: 'text-sm',
    default: 'text-gray-500',
    error: 'text-red-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
  },

  // Error text classes (specific for error messages)
  error: {
    base: 'text-sm text-red-600',
    icon: "before:content-['⚠'] before:mr-1",
  },

  // Input/Textarea classes
  input: {
    base: 'block w-full rounded-md border shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-sm',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
    success: 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500',
    warning: 'border-amber-300 focus:border-amber-500 focus:ring-amber-500',
    disabled: 'bg-gray-50',
  },

  // Textarea specific classes
  textarea: {
    base: 'block w-full rounded-md border shadow-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-sm min-h-[6rem]',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
    success: 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500',
    warning: 'border-amber-300 focus:border-amber-500 focus:ring-amber-500',
  },

  // FormFieldGroup classes
  group: {
    wrapper: 'space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200',
    header: 'mb-2',
    title: 'text-lg font-semibold text-gray-900',
    description: 'mt-1 text-sm text-gray-500',
    content: 'space-y-4',
  },

  // FormActions classes
  actions: {
    wrapper: 'flex items-center justify-end gap-3 pt-6 border-t border-gray-200 mt-6',
  },

  // Layout utilities
  layout: {
    vertical: 'flex flex-col',
    horizontal: 'flex items-start',
    grid: {
      twoColumn: 'grid grid-cols-1 md:grid-cols-2 gap-6',
    },
  },

  // State classes
  state: {
    focus: 'focus:ring-2 focus:ring-offset-2',
    invalid: 'border-red-300 text-red-900 placeholder-red-300',
    valid: 'border-emerald-300 text-emerald-900',
    readOnly: 'bg-gray-50 text-gray-500',
  },
};

/**
 * Utility function to get label color class based on variant and state
 */
export function getLabelColorClass(
  variant?: FormFieldVariant,
  disabled?: boolean
): string {
  if (disabled) return formFieldClasses.label.disabled;
  
  switch (variant) {
    case 'error':
      return formFieldClasses.label.error;
    case 'success':
      return formFieldClasses.label.success;
    case 'warning':
      return formFieldClasses.label.warning;
    default:
      return formFieldClasses.label.default;
  }
}

/**
 * Utility function to get helper text color class based on variant and state
 */
export function getHelperColorClass(
  variant?: FormFieldVariant,
  disabled?: boolean
): string {
  if (disabled) return formFieldClasses.helper.default;
  
  switch (variant) {
    case 'error':
      return formFieldClasses.helper.error;
    case 'success':
      return formFieldClasses.helper.success;
    case 'warning':
      return formFieldClasses.helper.warning;
    default:
      return formFieldClasses.helper.default;
  }
}

/**
 * Utility function to get input border class based on variant
 */
export function getInputBorderClass(variant?: FormFieldVariant): string {
  switch (variant) {
    case 'error':
      return formFieldClasses.input.error;
    case 'success':
      return formFieldClasses.input.success;
    case 'warning':
      return formFieldClasses.input.warning;
    default:
      return '';
  }
}

/**
 * Utility function to get textarea border class based on variant
 */
export function getTextareaBorderClass(variant?: FormFieldVariant): string {
  switch (variant) {
    case 'error':
      return formFieldClasses.textarea.error;
    case 'success':
      return formFieldClasses.textarea.success;
    case 'warning':
      return formFieldClasses.textarea.warning;
    default:
      return '';
  }
}

/**
 * Utility function to build wrapper classes
 */
export function getWrapperClasses(
  layout: 'vertical' | 'horizontal',
  disabled?: boolean,
  className?: string
): string {
  const classes = [
    formFieldClasses.wrapper.base,
    layout === 'horizontal' 
      ? formFieldClasses.wrapper.horizontal 
      : formFieldClasses.wrapper.vertical,
    disabled ? formFieldClasses.wrapper.disabled : '',
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build label classes
 */
export function getLabelClasses(
  layout: 'vertical' | 'horizontal',
  required?: boolean,
  disabled?: boolean,
  variant?: FormFieldVariant,
  className?: string
): string {
  const classes = [
    formFieldClasses.label.base,
    getLabelColorClass(variant, disabled),
    required ? formFieldClasses.label.required : '',
    layout === 'horizontal' ? formFieldClasses.label.horizontal : '',
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build helper text classes
 */
export function getHelperClasses(
  variant?: FormFieldVariant,
  isError?: boolean,
  disabled?: boolean,
  className?: string
): string {
  const classes = [
    formFieldClasses.helper.base,
    isError ? formFieldClasses.error.base : getHelperColorClass(variant, disabled),
    isError ? formFieldClasses.error.icon : '',
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build input classes
 */
export function getInputClasses(
  variant?: FormFieldVariant,
  disabled?: boolean,
  className?: string
): string {
  const classes = [
    formFieldClasses.input.base,
    getInputBorderClass(variant),
    disabled ? formFieldClasses.input.disabled : '',
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to build textarea classes
 */
export function getTextareaClasses(
  variant?: FormFieldVariant,
  disabled?: boolean,
  className?: string
): string {
  const classes = [
    formFieldClasses.textarea.base,
    getTextareaBorderClass(variant),
    disabled ? 'bg-gray-50' : '',
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get field container classes
 */
export function getFieldContainerClasses(
  layout: 'vertical' | 'horizontal',
  className?: string
): string {
  const classes = [
    formFieldClasses.fieldContainer.base,
    layout === 'horizontal' ? formFieldClasses.fieldContainer.horizontal : '',
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Default style props for consistent styling
 */
export const defaultStyleProps = {
  labelWidth: formFieldTokens.sizing.labelWidth,
  horizontalGap: formFieldTokens.spacing.horizontalGap,
  verticalGap: formFieldTokens.spacing.verticalGap,
  helperMarginTop: formFieldTokens.spacing.helperMarginTop,
};
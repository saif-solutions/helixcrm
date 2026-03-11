// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Select\SelectInput.tsx
import * as React from 'react';
import { cn } from '../../../lib/utils';
import { SelectOption } from './Select.types';
import { getSelectClasses, getIconClasses, selectClasses } from './Select.styles';

interface SelectInputProps {
  // Props from main Select
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'filled' | 'minimal';
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  isOpen?: boolean;
  placeholder?: string;
  clearable?: boolean;
  multiple?: boolean;
  selectedOptions?: SelectOption[];
  displayText: React.ReactNode;
  hasCustomRender?: boolean;
  renderValue?: (selected: SelectOption[], displayText: string) => React.ReactNode;
  renderTags?: React.ReactNode;
  className?: string;
  testId?: string;
  selectId: string;
  label?: string;
  required?: boolean;
  helperText?: string;
  errorMessage?: string;
  ariaActiveDescendant?: string;
  ariaControls?: string;

  // Handlers
  onToggle: () => void;
  onClear: (event: React.MouseEvent) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onFocus: (event: React.FocusEvent) => void;
  onBlur: (event: React.FocusEvent) => void;

  // Ref forwarding
  ref: React.Ref<HTMLDivElement>;
}

// ✅ Type-safe interface for React element props
interface ReactElementProps {
  children?: React.ReactNode;
  label?: string;
  title?: string;
  'aria-label'?: string;
  [key: string]: unknown;
}

// ✅ Type guard to check if value is a React element with props
const isReactElementWithProps = (
  value: unknown
): value is React.ReactElement<ReactElementProps> => {
  return React.isValidElement(value) && typeof value === 'object' && 'props' in value;
};

// ✅ Safe text extraction from ReactNode with comprehensive type handling
const extractTextFromReactNode = (node: React.ReactNode): string => {
  // Handle null/undefined
  if (node == null || node === undefined) return '';

  // Handle boolean
  if (node === true || node === false) return '';

  // Handle primitive types
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);

  // Handle React elements with props
  if (isReactElementWithProps(node)) {
    const element = node;
    const props = element.props;

    // Safely check props existence and type
    if (props && typeof props === 'object') {
      // Extract from children prop if it exists
      if (props.children !== undefined) {
        const childrenText = extractTextFromReactNode(props.children);
        if (childrenText) return childrenText;
      }

      // Extract from other common text props
      if (typeof props.label === 'string') return props.label;
      if (typeof props.title === 'string') return props.title;
      if (typeof props['aria-label'] === 'string') return props['aria-label'];
    }

    // If element has toString method, use it
    if (typeof element.toString === 'function') {
      try {
        const stringValue = element.toString();
        if (stringValue !== '[object Object]') {
          return stringValue;
        }
      } catch {
        // Ignore toString errors
      }
    }

    return '';
  }

  // Handle arrays (multiple children or fragments)
  if (Array.isArray(node)) {
    const texts = node.map((child) => extractTextFromReactNode(child)).filter(Boolean);
    return texts.join(' ');
  }

  // Handle React fragments specifically
  if (typeof node === 'object' && node !== null && 'type' in node) {
    const fragmentNode = node as React.ReactElement & { type: typeof React.Fragment };
    if (fragmentNode.type === React.Fragment) {
      // Safely check for props and children
      if (fragmentNode.props && typeof fragmentNode.props === 'object') {
        const props = fragmentNode.props as { children?: React.ReactNode };
        if (props.children !== undefined) {
          return extractTextFromReactNode(props.children);
        }
      }
    }
  }

  // Handle other objects that might have a toString method
  if (typeof node === 'object' && node !== null) {
    if (typeof node.toString === 'function') {
      try {
        const stringValue = node.toString();
        if (stringValue !== '[object Object]') {
          return stringValue;
        }
      } catch {
        // Ignore toString errors
      }
    }
  }

  return '';
};

export const SelectInput = React.memo(
  React.forwardRef<HTMLDivElement, SelectInputProps>(
    (
      {
        variant,
        size,
        disabled = false,
        loading = false,
        error = false,
        isOpen = false,
        placeholder = 'Select an option',
        clearable = false,
        multiple = false,
        selectedOptions = [],
        displayText,
        hasCustomRender = false,
        renderValue,
        renderTags,
        className,
        testId = 'select',
        selectId,
        label,
        required = false,
        helperText,
        errorMessage,
        ariaActiveDescendant,
        ariaControls,
        onToggle,
        onClear,
        onKeyDown,
        onFocus,
        onBlur,
      },
      ref
    ) => {
      // ✅ Memoized computed values for performance
      const selectedCount = React.useMemo(() => {
        return selectedOptions.length;
      }, [selectedOptions]);

      const hasValue = React.useMemo(() => {
        return selectedOptions.length > 0;
      }, [selectedOptions]);

      const ariaLabel = React.useMemo(() => {
        if (label) return label;
        if (multiple && selectedCount > 0) {
          return `${selectedCount} option${selectedCount > 1 ? 's' : ''} selected`;
        }
        return placeholder || 'Select an option';
      }, [label, multiple, selectedCount, placeholder]);

      const displayTextString = React.useMemo(() => {
        const extracted = extractTextFromReactNode(displayText);
        if (extracted && extracted.trim() !== '') {
          return extracted;
        }
        return hasValue ? 'Selected' : placeholder;
      }, [displayText, hasValue, placeholder]);

      // ✅ Memoized classes for performance
      const containerClasses = React.useMemo(
        () => getSelectClasses(variant, size, error, disabled, loading, isOpen, className),
        [variant, size, error, disabled, loading, isOpen, className]
      );

      const iconClasses = React.useMemo(() => getIconClasses(size, isOpen), [size, isOpen]);

      // ✅ Event handlers with proper cleanup
      const handleClearClick = React.useCallback(
        (event: React.MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          onClear(event);
        },
        [onClear]
      );

      const handleKeyDown = React.useCallback(
        (event: React.KeyboardEvent) => {
          if (disabled || loading) return;
          onKeyDown(event);
        },
        [disabled, loading, onKeyDown]
      );

      const handleFocus = React.useCallback(
        (event: React.FocusEvent) => {
          if (disabled || loading) return;
          onFocus(event);
        },
        [disabled, loading, onFocus]
      );

      const handleBlur = React.useCallback(
        (event: React.FocusEvent) => {
          onBlur(event);
        },
        [onBlur]
      );

      const handleClick = React.useCallback(
        (event: React.MouseEvent) => {
          if (disabled || loading) return;
          event.preventDefault();
          event.stopPropagation();
          onToggle();
        },
        [disabled, loading, onToggle]
      );

      // ✅ Accessibility IDs
      const labelId = label ? `${selectId}-label` : undefined;
      const helperId = helperText || errorMessage ? `${selectId}-helper` : undefined;
      const menuId = `${testId}-menu`;

      // ✅ Determine if we should show clear button
      const showClearButton = React.useMemo(() => {
        return clearable && hasValue && !disabled && !loading;
      }, [clearable, hasValue, disabled, loading]);

      // ✅ Determine if combobox is interactive
      const isInteractive = React.useMemo(() => {
        return !disabled && !loading;
      }, [disabled, loading]);

      // ✅ Tab index logic
      const tabIndex = React.useMemo(() => {
        return isInteractive ? 0 : -1;
      }, [isInteractive]);

      return (
        <div className="w-full" data-testid={`${testId}-wrapper`}>
          {/* Label - with proper accessibility */}
          {label && (
            <label
              id={labelId}
              htmlFor={selectId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              data-testid={`${testId}-label`}
              aria-required={required}
            >
              {label}
              {required && <span className="text-error-500 ml-1">*</span>}
            </label>
          )}

          {/* Select Container - with comprehensive ARIA attributes */}
          <div
            ref={ref}
            id={selectId}
            className={containerClasses}
            tabIndex={tabIndex}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={labelId}
            aria-describedby={helperId}
            aria-label={!label ? ariaLabel : undefined}
            aria-activedescendant={ariaActiveDescendant}
            aria-controls={ariaControls || menuId}
            aria-disabled={disabled} // ✅ FIXED: Added aria-disabled
            aria-invalid={error} // ✅ FIXED: Added aria-invalid
            aria-busy={loading}
            data-testid={testId}
            data-has-value={hasValue}
            data-multiple={multiple}
            data-disabled={disabled}
            data-loading={loading}
            data-error={error}
            data-open={isOpen}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            {/* Selected Value Display */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {hasCustomRender && renderValue && selectedOptions && selectedOptions.length > 0 ? (
                // ✅ FIXED: Pass normalized array to renderValue
                renderValue(selectedOptions, displayTextString)
              ) : (
                <>
                  {renderTags || (
                    <span
                      className={cn(
                        selectClasses.utility.truncate,
                        !hasValue
                          ? 'text-gray-500 dark:text-gray-400'
                          : 'text-gray-900 dark:text-gray-100'
                      )}
                      data-testid={`${testId}-display`}
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {displayText}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Icons Container */}
            <div className="flex items-center gap-1">
              {/* Clear Button - with proper accessibility */}
              {showClearButton && (
                <button
                  type="button"
                  className={cn(
                    selectClasses.clear.base,
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                    'transition-colors duration-150',
                    'hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
                  )}
                  onClick={handleClearClick}
                  aria-label="Clear selection"
                  data-testid={`${testId}-clear`}
                  tabIndex={-1}
                  disabled={disabled || loading}
                  aria-disabled={disabled || loading}
                >
                  <svg
                    className={selectClasses.clear.icon}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    width="16"
                    height="16"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}

              {/* Chevron Icon - with proper transitions */}
              <svg
                className={cn(
                  iconClasses,
                  disabled ? 'opacity-50' : '',
                  loading ? 'opacity-30' : '',
                  'transition-transform duration-200 ease-in-out flex-shrink-0'
                )}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                width="20"
                height="20"
                data-testid={`${testId}-chevron`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Loading Overlay - with proper ARIA */}
            {loading && (
              <div
                className={selectClasses.loading.base}
                role="status"
                aria-label="Loading..."
                aria-live="polite"
                aria-busy="true"
                data-testid={`${testId}-loading`}
              >
                <div className={selectClasses.loading.spinner}>
                  <svg
                    className="animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    width="20"
                    height="20"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Helper Text & Error Message - with proper ARIA roles */}
          {(helperText || (error && errorMessage)) && (
            <div
              id={helperId}
              className={cn(
                'mt-1 text-sm transition-opacity duration-200',
                error ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'
              )}
              data-testid={`${testId}-helper`}
              role={error ? 'alert' : 'status'}
              aria-live={error ? 'assertive' : 'polite'}
              aria-atomic="true"
            >
              {error ? errorMessage : helperText}
            </div>
          )}

          {/* ✅ REMOVED: Hidden input generation - Let parent component handle this */}
          {/* No duplicate hidden inputs will be created here */}
        </div>
      );
    }
  )
);

SelectInput.displayName = 'SelectInput';

export type { SelectInputProps };

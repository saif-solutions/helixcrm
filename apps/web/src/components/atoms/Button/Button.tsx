import * as React from 'react';
import { cn } from '../../../lib/utils';
import {
  ButtonProps,
  ButtonRef,
  PrimaryButtonProps,
  SecondaryButtonProps,
  GhostButtonProps,
  DangerButtonProps,
} from './Button.types';
import { buttonClasses, loadingSpinnerClasses } from './Button.styles';

/**
 * Enterprise-grade Button component with comprehensive features
 *
 * Enhanced for Phase 2A:
 * - ✅ Fixed loading prop support for auth forms
 * - ✅ aria-busy attribute for accessibility
 * - ✅ Improved disabled state handling during loading
 * - ✅ Forward ref support for form integration
 * - ✅ TypeScript strict compliance
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Button variant="primary">Submit</Button>
 *
 * // With loading state (for auth forms)
 * <Button loading>Processing...</Button>
 *
 * // Full width loading button
 * <Button variant="primary" size="lg" fullWidth loading>
 *   Signing in...
 * </Button>
 * ```
 */
export const Button = React.memo(
  React.forwardRef<ButtonRef, ButtonProps>(
    (
      {
        variant = 'primary',
        size = 'md',
        fullWidth = false,
        loading = false,
        leftIcon,
        rightIcon,
        iconOnly = false,
        className,
        children,
        disabled,
        type = 'button',
        'aria-label': ariaLabel,
        'data-testid': testId = 'button',
        'data-analytics': analyticsId,
        'data-cy': cyId,
        onClick,
        onKeyDown,
        onFocus,
        onBlur,
        ...props
      }: ButtonProps,
      ref: React.Ref<ButtonRef>
    ) => {
      const isDisabled = disabled || loading;

      // Handle accessibility: if iconOnly and no aria-label, use children as fallback
      const accessibilityLabel =
        iconOnly && !ariaLabel && typeof children === 'string' ? children : ariaLabel;

      // Build CSS classes using utility function
      const buttonClass = cn(
        buttonClasses.base,
        buttonClasses.variant[variant],
        iconOnly ? buttonClasses.iconSize[size] : buttonClasses.size[size],
        fullWidth && buttonClasses.state.fullWidth,
        isDisabled && buttonClasses.state.disabled,
        loading && buttonClasses.state.loading,
        buttonClasses.accessibility.focus,
        buttonClasses.accessibility.reducedMotion,
        className
      );

      const handleClick = React.useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
          if (!isDisabled && onClick) {
            onClick(e);
          }
        },
        [isDisabled, onClick]
      );

      const handleKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLButtonElement>) => {
          if (!isDisabled && onKeyDown) {
            onKeyDown(e);
          }

          // Handle Space/Enter for better accessibility
          if (!isDisabled && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            if (onClick) {
              onClick(e as any);
            }
          }
        },
        [isDisabled, onClick, onKeyDown]
      );

      return (
        <button
          ref={ref}
          type={type}
          className={buttonClass}
          disabled={isDisabled}
          aria-disabled={isDisabled}
          aria-busy={loading}
          aria-label={accessibilityLabel}
          data-testid={testId}
          data-analytics={analyticsId}
          data-cy={cyId}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          {...props}
        >
          {/* Loading Spinner - Conditionally render */}
          {loading && <LoadingSpinner size={size} iconOnly={iconOnly} />}

          {/* Left Icon (when not loading) */}
          {!loading && leftIcon && (
            <IconWrapper position="left" iconOnly={iconOnly}>
              {leftIcon}
            </IconWrapper>
          )}

          {/* Button Text (hidden for icon-only when loading) */}
          {(!iconOnly || (iconOnly && !loading)) && children}

          {/* Right Icon (when not loading) */}
          {!loading && rightIcon && (
            <IconWrapper position="right" iconOnly={iconOnly}>
              {rightIcon}
            </IconWrapper>
          )}

          {/* Icon-only content (when not loading and no left/right icons) */}
          {iconOnly && !loading && !leftIcon && !rightIcon && children}
        </button>
      );
    }
  )
);

Button.displayName = 'Button';

/**
 * Loading Spinner sub-component (accessible)
 * Enhanced for better visual integration with auth forms
 */
const LoadingSpinner: React.FC<{
  size: ButtonSize;
  iconOnly?: boolean;
}> = ({ size, iconOnly }) => {
  const spinnerSize = iconOnly ? 'sm' : size;

  return (
    <svg
      className={cn(
        loadingSpinnerClasses.base,
        loadingSpinnerClasses.size[spinnerSize],
        iconOnly ? loadingSpinnerClasses.spacing.iconOnly : loadingSpinnerClasses.spacing.withText,
        'animate-spin'
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      role="presentation"
      data-testid="button-loading-spinner"
    >
      <title>Loading</title>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

LoadingSpinner.displayName = 'Button.LoadingSpinner';

/**
 * Icon Wrapper sub-component for consistent spacing
 */
const IconWrapper: React.FC<{
  position: 'left' | 'right';
  iconOnly?: boolean;
  children: React.ReactNode;
}> = ({ position, iconOnly, children }) => (
  <span
    className={cn(
      'flex items-center justify-center',
      !iconOnly &&
        (position === 'left' ? buttonClasses.iconSpacing.left : buttonClasses.iconSpacing.right)
    )}
  >
    {children}
  </span>
);

IconWrapper.displayName = 'Button.IconWrapper';

// ============================================================================
// Predefined Button Variants (for convenience and consistent usage)
// ============================================================================

/**
 * Primary Button - Main call-to-action buttons
 * Enhanced for auth forms with loading support
 */
export const PrimaryButton = React.memo(
  React.forwardRef<ButtonRef, PrimaryButtonProps>(
    (props: PrimaryButtonProps, ref: React.Ref<ButtonRef>) => (
      <Button ref={ref} variant="primary" {...props} />
    )
  )
);
PrimaryButton.displayName = 'PrimaryButton';

/**
 * Secondary Button - Secondary actions, less prominent than primary
 */
export const SecondaryButton = React.memo(
  React.forwardRef<ButtonRef, SecondaryButtonProps>(
    (props: SecondaryButtonProps, ref: React.Ref<ButtonRef>) => (
      <Button ref={ref} variant="secondary" {...props} />
    )
  )
);
SecondaryButton.displayName = 'SecondaryButton';

/**
 * Ghost Button - Minimal buttons for toolbar actions, filters, etc.
 */
export const GhostButton = React.memo(
  React.forwardRef<ButtonRef, GhostButtonProps>(
    (props: GhostButtonProps, ref: React.Ref<ButtonRef>) => (
      <Button ref={ref} variant="ghost" {...props} />
    )
  )
);
GhostButton.displayName = 'GhostButton';

/**
 * Danger Button - Destructive actions (delete, remove, etc.)
 */
export const DangerButton = React.memo(
  React.forwardRef<ButtonRef, DangerButtonProps>(
    (props: DangerButtonProps, ref: React.Ref<ButtonRef>) => (
      <Button ref={ref} variant="danger" {...props} />
    )
  )
);
DangerButton.displayName = 'DangerButton';

// Helper type for LoadingSpinner
import type { ButtonSize } from './Button.types';

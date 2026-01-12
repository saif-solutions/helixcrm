// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Badge\Badge.tsx
import * as React from 'react';
import { cn } from '../../../lib/utils';
import {
  BadgeProps,
  BadgeRef,
  PrimaryBadgeProps,
  SuccessBadgeProps,
  ErrorBadgeProps,
  WarningBadgeProps,
} from './Badge.types';
import type { BadgeSize } from './Badge.types';

/**
 * Enterprise Badge component for status indicators, labels, and tags.
 * 
 * Features:
 * - Multiple variants (default, primary, success, error, warning, info, outline)
 * - Multiple sizes (xs, sm, md, lg)
 * - Multiple shapes (square, rounded, pill)
 * - Icon support (left, right)
 * - Clickable/interactive badges with keyboard support
 * - Full accessibility compliance (WCAG 2.1 AA)
 * - Dark mode support
 * - Performance optimized (memoized)
 * - Forward ref support
 * - TypeScript strict mode compliance
 * - Data attributes for testing/analytics
 * - Tooltip support (via native title attribute)
 * - Truncation for long text
 * - Focus management for clickable badges
 * - Reduced motion support
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Badge variant="success">Active</Badge>
 * 
 * // With icons
 * <Badge variant="error" leftIcon={<Icon />}>Error</Badge>
 * 
 * // Clickable with keyboard support
 * <Badge clickable onClick={handleClick}>Clickable</Badge>
 * 
 * // With data attributes for testing
 * <Badge data-testid="status-badge" data-analytics="status-click">
 *   Status
 * </Badge>
 * ```
 */
export const Badge = React.memo(
  React.forwardRef<BadgeRef, BadgeProps>(
    (
      {
        variant = 'default',
        size = 'md',
        shape = 'rounded',
        clickable = false,
        leftIcon,
        rightIcon,
        className,
        children,
        tooltip,
        maxWidth,
        'data-testid': testId = 'badge',
        'data-analytics': analyticsId,
        'data-cy': cyId,
        onClick,
        onKeyDown,
        onFocus,
        onBlur,
        onMouseEnter,
        onMouseLeave,
        style,
        ...props
      }: BadgeProps,
      ref: React.Ref<BadgeRef>
    ) => {
      // Handle click events
      const handleClick = React.useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
        if (clickable && onClick) {
          onClick(e);
        }
      }, [clickable, onClick]);

      // Handle keyboard events (Enter/Space for clickable badges)
      const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLSpanElement>) => {
        if (clickable && onKeyDown) {
          onKeyDown(e);
        }
        
        // Handle Enter/Space for clickable badges
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          if (onClick) {
            onClick(e as any);
          }
        }
      }, [clickable, onClick, onKeyDown]);

      // Determine if text should be truncated
      const shouldTruncate = typeof maxWidth === 'string' || typeof maxWidth === 'number';

      // Build CSS classes directly (not using getBadgeClasses utility to avoid issues)
      const badgeClass = cn(
        // Base classes
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors motion-reduce:transition-none',
        
        // Variant classes
        variant === 'default' && 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
        variant === 'primary' && 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200',
        variant === 'success' && 'bg-success-100 dark:bg-success-900 text-success-800 dark:text-success-200',
        variant === 'error' && 'bg-error-100 dark:bg-error-900 text-error-800 dark:text-error-200',
        variant === 'warning' && 'bg-warning-100 dark:bg-warning-900 text-warning-800 dark:text-warning-200',
        variant === 'info' && 'bg-info-100 dark:bg-info-900 text-info-800 dark:text-info-200',
        variant === 'outline' && 'bg-transparent border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
        
        // Size classes
        size === 'xs' && 'px-1.5 py-0.5 text-xs leading-tight',
        size === 'sm' && 'px-2 py-0.5 text-xs leading-tight',
        size === 'md' && 'px-2.5 py-0.5 text-sm leading-normal',
        size === 'lg' && 'px-3 py-1 text-sm leading-normal',
        
        // Shape classes
        shape === 'square' && 'rounded',
        shape === 'rounded' && 'rounded-md',
        shape === 'pill' && 'rounded-full',
        
        // State classes
        clickable && 'cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-1 focus-visible:ring-2 focus-visible:ring-offset-1',
        shouldTruncate && 'truncate max-w-full',
        
        // Custom classes
        className
      );

      // Combine styles
      const combinedStyle: React.CSSProperties = {
        ...style,
        ...(maxWidth && { maxWidth }),
      };

      // Get accessibility props
      const role = clickable ? 'button' : 'presentation';
      const tabIndex = clickable ? 0 : undefined;

      return (
        <span
          ref={ref}
          className={badgeClass}
          role={role}
          tabIndex={tabIndex}
          title={tooltip}
          style={combinedStyle}
          data-testid={testId}
          data-analytics={analyticsId}
          data-cy={cyId}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          {...props}
        >
          {/* Left Icon */}
          {leftIcon && (
            <IconWrapper position="left" size={size}>
              {leftIcon}
            </IconWrapper>
          )}
          
          {/* Badge Content */}
          <span className={shouldTruncate ? 'truncate' : ''}>
            {children}
          </span>
          
          {/* Right Icon */}
          {rightIcon && (
            <IconWrapper position="right" size={size}>
              {rightIcon}
            </IconWrapper>
          )}
        </span>
      );
    }
  )
);

Badge.displayName = 'Badge';

/**
 * Icon Wrapper sub-component for consistent spacing
 */
const IconWrapper: React.FC<{
  position: 'left' | 'right';
  size: BadgeSize;
  children: React.ReactNode;
}> = ({ position, size, children }) => (
  <span className={cn(
    'flex items-center shrink-0',
    position === 'left' ? 'mr-1.5' : 'ml-1.5',
    size === 'xs' || size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
  )}>
    {children}
  </span>
);

IconWrapper.displayName = 'Badge.IconWrapper';

// ============================================================================
// Predefined Badge Variants (for convenience and consistent usage)
// ============================================================================

/**
 * Primary Badge - Main call-to-action badges
 * @example
 * ```tsx
 * <PrimaryBadge>Primary</PrimaryBadge>
 * ```
 */
export const PrimaryBadge = React.memo(
  React.forwardRef<BadgeRef, PrimaryBadgeProps>(
    (props: PrimaryBadgeProps, ref: React.Ref<BadgeRef>) => (
      <Badge ref={ref} variant="primary" {...props} />
    )
  )
);
PrimaryBadge.displayName = 'PrimaryBadge';

/**
 * Success Badge - Success/positive status badges
 * @example
 * ```tsx
 * <SuccessBadge>Success</SuccessBadge>
 * ```
 */
export const SuccessBadge = React.memo(
  React.forwardRef<BadgeRef, SuccessBadgeProps>(
    (props: SuccessBadgeProps, ref: React.Ref<BadgeRef>) => (
      <Badge ref={ref} variant="success" {...props} />
    )
  )
);
SuccessBadge.displayName = 'SuccessBadge';

/**
 * Error Badge - Error/negative status badges
 * @example
 * ```tsx
 * <ErrorBadge>Error</ErrorBadge>
 * ```
 */
export const ErrorBadge = React.memo(
  React.forwardRef<BadgeRef, ErrorBadgeProps>(
    (props: ErrorBadgeProps, ref: React.Ref<BadgeRef>) => (
      <Badge ref={ref} variant="error" {...props} />
    )
  )
);
ErrorBadge.displayName = 'ErrorBadge';

/**
 * Warning Badge - Warning/caution status badges
 * @example
 * ```tsx
 * <WarningBadge>Warning</WarningBadge>
 * ```
 */
export const WarningBadge = React.memo(
  React.forwardRef<BadgeRef, WarningBadgeProps>(
    (props: WarningBadgeProps, ref: React.Ref<BadgeRef>) => (
      <Badge ref={ref} variant="warning" {...props} />
    )
  )
);
WarningBadge.displayName = 'WarningBadge';
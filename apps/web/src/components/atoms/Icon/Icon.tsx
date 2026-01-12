// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Icon\Icon.tsx
import * as React from 'react';
import { cn } from '../../../lib/utils';
import {
  IconProps,
  IconRef,
  getIconAccessibilityProps,
  getIconTransform,
  getIconClassNames,
  isValidBadge,
} from './Icon.types';

// Import enhanced styles
// import { getIconClasses, getSvgClasses } from './Icon.styles';

/**
 * Enterprise Icon component with comprehensive features
 * 
 * Features:
 * - Multiple sizes (xs to 4xl)
 * - Full color palette support
 * - Animation states (spin, pulse, ping, bounce)
 * - Accessibility compliant (ARIA labels, roles)
 * - Badge support with counts
 * - Tooltip integration
 * - Loading states with overlays
 * - Interactive states (hover, active)
 * - Flip and rotate transforms
 * - Multiple variants (outline, solid, duotone)
 * - Weight/stroke width control
 * - Icon library integration
 * - Dark mode support
 * - Performance optimized (memoized)
 * - Comprehensive event handling
 * - Data attributes for testing/analytics
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Icon />
 * 
 * // With size and color
 * <Icon size="lg" color="primary" />
 * 
 * // With badge
 * <Icon badge={3} badgeColor="error" />
 * 
 * // Interactive with tooltip
 * <Icon interactive tooltip="Click to refresh" />
 * 
 * // Loading state
 * <Icon loading spin />
 * ```
 */
export const Icon = React.memo(
    React.forwardRef<IconRef, IconProps>(
    (
      {
        // Core props with defaults
        size = 'md',
        color = 'current',
        spin = false,
        pulse = false,
        className,
        children,
        'aria-label': ariaLabel,
        
        // Enhanced features with defaults
        library = 'heroicons',
        variant = 'outline', // Ensure default
        weight,
        interactive = false,
        badge,
        badgeColor = 'error',
        badgePosition = 'top-right',
        tooltip,
        tooltipPosition = 'top',
        loading = false,
        disabled = false,
        flip,
        rotate,
        
        // Data attributes
        'data-testid': testId = 'icon',
        'data-analytics': analyticsId,
        'data-cy': cyId,
        
        // SVG props
        style,
        onClick,
        onMouseEnter,
        onMouseLeave,
        onFocus,
        onBlur,
        onKeyDown,
        ...props
      }: IconProps,
      ref: React.Ref<IconRef>
    ) => {
      // Generate class names - ensure variant has a value
      const baseClasses = getIconClassNames(
        size,
        color,
        spin,
        pulse,
        interactive && !disabled,
        disabled,
        variant // This should not be undefined
      );

const iconClasses = cn(
  'inline-block',
  'transition-all duration-200',
  ...baseClasses,
  className
);
      
      // Generate transform
      const transform = getIconTransform(flip, rotate);
      const combinedStyle = {
        ...style,
        transform: transform !== 'none' ? `${style?.transform || ''} ${transform}`.trim() : style?.transform,
      };
      
      // Accessibility
      const accessibilityProps = getIconAccessibilityProps(ariaLabel, loading);
      
      // Handle interactive states
      const handleClick = React.useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (!disabled && onClick) {
          onClick(e);
        }
      }, [disabled, onClick]);
      
      const handleKeyDown = React.useCallback((e: React.KeyboardEvent<SVGSVGElement>) => {
        if (!disabled && onKeyDown) {
          onKeyDown(e);
        }
        
        // Handle Enter/Space for interactive icons
        if (interactive && !disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          if (onClick) {
            onClick(e as any);
          }
        }
      }, [disabled, interactive, onClick, onKeyDown]);
      
      // Render badge if present
      const renderBadge = () => {
        if (!isValidBadge(badge)) return null;
        
const badgeClasses = cn(
  'absolute flex items-center justify-center',
  'min-w-[1rem] h-4 px-1',
  'text-xs font-semibold text-white',
  'rounded-full',
  badgeColor === 'primary' && 'bg-primary-600',
  badgeColor === 'error' && 'bg-error-600',
  badgeColor === 'success' && 'bg-success-600',
  badgeColor === 'warning' && 'bg-warning-600',
  badgeColor === 'info' && 'bg-info-600',
  (badgeColor === 'muted' || badgeColor === 'gray') && 'bg-gray-600',
  badgeColor === 'current' && 'bg-current',
  badgePosition === 'top-right' && 'top-0 right-0 transform translate-x-1/2 -translate-y-1/2',
  badgePosition === 'top-left' && 'top-0 left-0 transform -translate-x-1/2 -translate-y-1/2',
  badgePosition === 'bottom-right' && 'bottom-0 right-0 transform translate-x-1/2 translate-y-1/2',
  badgePosition === 'bottom-left' && 'bottom-0 left-0 transform -translate-x-1/2 translate-y-1/2'
);
        
        return (
          <span className={badgeClasses}>
            {typeof badge === 'number' && badge > 99 ? '99+' : badge}
          </span>
        );
      };
      
      // Render loading overlay
      const renderLoadingOverlay = () => {
        if (!loading) return null;
        
        return (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded">
            <div className="animate-spin rounded-full h-3/4 w-3/4 border-2 border-primary-500 border-t-transparent" />
          </div>
        );
      };
      
      // Render tooltip wrapper
      const renderWithTooltip = (content: React.ReactNode) => {
        if (!tooltip) return content;
        
        return (
          <div className="relative group">
            {content}
            // Replace the tooltip rendering section with:

<div className={cn(
  'absolute z-50 px-2 py-1 text-xs font-medium',
  'text-white bg-gray-900 rounded',
  'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
  'transition-all duration-200',
  'whitespace-nowrap',
  tooltipPosition === 'top' && 'bottom-full left-1/2 transform -translate-x-1/2 mb-1',
  tooltipPosition === 'right' && 'top-1/2 left-full transform -translate-y-1/2 ml-1',
  tooltipPosition === 'bottom' && 'top-full left-1/2 transform -translate-x-1/2 mt-1',
  tooltipPosition === 'left' && 'top-1/2 right-full transform -translate-y-1/2 mr-1'
)}>
  {tooltip}
  <div className={cn(
    'absolute w-2 h-2 bg-gray-900 transform rotate-45',
    tooltipPosition === 'top' && 'top-full left-1/2 -translate-x-1/2 -mt-1',
    tooltipPosition === 'right' && 'top-1/2 left-0 -translate-y-1/2 -ml-1',
    tooltipPosition === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
    tooltipPosition === 'left' && 'top-1/2 right-0 -translate-y-1/2 -mr-1'
  )} />
</div>
          </div>
        );
      };
      
      // If children is provided and it's a valid React element, clone it with new props
// In Icon.tsx, update the childProps section (around line 127-145):
if (children && React.isValidElement(children)) {
  const childProps = {
    ...(children.props as any),
    className: cn(
      iconClasses, 
      'inline-block transition-all duration-200', // Ensure base classes are included
      (children.props as any)?.className
    ),
    style: combinedStyle,
    ref,
    'data-testid': testId, // This was being overridden
    'data-analytics': analyticsId,
    'data-cy': cyId,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    tabIndex: interactive && !disabled ? 0 : undefined,
    ...accessibilityProps,
    ...props,
  };
  
  // Add data-testid from children if it exists
  if ((children.props as any)?.['data-testid']) {
    childProps['data-testid'] = (children.props as any)?.['data-testid'];
  }
  
  const wrappedIcon = (
    <div className="relative inline-block">
      {React.cloneElement(children, childProps)}
      {renderBadge()}
      {renderLoadingOverlay()}
    </div>
  );
  
  return renderWithTooltip(wrappedIcon);
}
      
      // Get stroke width based on weight prop or size
      const getStrokeWidth = () => {
        if (weight) {
          const weightMap = {
            thin: 1,
            light: 1.5,
            regular: 2,
            medium: 2.5,
            bold: 3,
          };
          return weightMap[weight];
        }
        
        // Default stroke width based on size
        const sizeMap = {
          xs: 1.5, sm: 1.5, md: 2, lg: 2, xl: 2.5,
          '2xl': 2.5, '3xl': 3, '4xl': 3,
        };
        return sizeMap[size];
      };
      
      // Default fallback icon if no children provided (Heroicons plus icon)
      const iconContent = (
        <div className="relative inline-block">
          <svg
            ref={ref}
            className={iconClasses}
            style={combinedStyle}
            xmlns="http://www.w3.org/2000/svg"
            fill={variant === 'solid' ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={getStrokeWidth()}
            data-testid={testId}
            data-analytics={analyticsId}
            data-cy={cyId}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={onFocus}
            onBlur={onBlur}
            tabIndex={interactive && !disabled ? 0 : undefined}
            {...accessibilityProps}
            {...props}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          {renderBadge()}
          {renderLoadingOverlay()}
        </div>
      );
      
      return renderWithTooltip(iconContent);
    }
  )
);

Icon.displayName = 'Icon';

// ============================================================================
// Predefined Icon Components (Common Use Cases)
// ============================================================================

/**
 * Check Icon - Success/confirmation state
 */
export const CheckIcon = React.memo(
  React.forwardRef<IconRef, Omit<IconProps, 'children'>>(
    (props: Omit<IconProps, 'children'>, ref: React.Ref<IconRef>) => (
      <Icon ref={ref} color="success" {...props}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </Icon>
    )
  )
);
CheckIcon.displayName = 'CheckIcon';

/**
 * X (Close) Icon - Error/cancel state
 */
export const XIcon = React.memo(
  React.forwardRef<IconRef, Omit<IconProps, 'children'>>(
    (props: Omit<IconProps, 'children'>, ref: React.Ref<IconRef>) => (
      <Icon ref={ref} color="error" {...props}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </Icon>
    )
  )
);
XIcon.displayName = 'XIcon';

/**
 * Loading Icon - Loading/spinner state
 */
export const LoadingIcon = React.memo(
  React.forwardRef<IconRef, Omit<IconProps, 'children' | 'spin'>>(
    (props: Omit<IconProps, 'children' | 'spin'>, ref: React.Ref<IconRef>) => (
      <Icon ref={ref} spin color="primary" {...props}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </Icon>
    )
  )
);
LoadingIcon.displayName = 'LoadingIcon';

/**
 * Info Icon - Information state
 */
export const InfoIcon = React.memo(
  React.forwardRef<IconRef, Omit<IconProps, 'children'>>(
    (props: Omit<IconProps, 'children'>, ref: React.Ref<IconRef>) => (
      <Icon ref={ref} color="info" {...props}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </Icon>
    )
  )
);
InfoIcon.displayName = 'InfoIcon';

/**
 * Warning Icon - Warning/alert state
 */
export const WarningIcon = React.memo(
  React.forwardRef<IconRef, Omit<IconProps, 'children'>>(
    (props: Omit<IconProps, 'children'>, ref: React.Ref<IconRef>) => (
      <Icon ref={ref} color="warning" {...props}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </Icon>
    )
  )
);
WarningIcon.displayName = 'WarningIcon';

/**
 * Error Icon - Error state
 */
export const ErrorIcon = React.memo(
  React.forwardRef<IconRef, Omit<IconProps, 'children'>>(
    (props: Omit<IconProps, 'children'>, ref: React.Ref<IconRef>) => (
      <Icon ref={ref} color="error" {...props}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      </Icon>
    )
  )
);
ErrorIcon.displayName = 'ErrorIcon';

/**
 * Status Icon - Automatically picks color based on status
 */
export const StatusIcon = React.memo(
  React.forwardRef<IconRef, Omit<IconProps, 'color'> & { status: 'success' | 'error' | 'warning' | 'info' | 'neutral' }>(
    ({ status, ...props }, ref: React.Ref<IconRef>) => {
      const iconMap = {
        success: CheckIcon,
        error: XIcon,
        warning: WarningIcon,
        info: InfoIcon,
        neutral: Icon,
      };
      
      const IconComponent = iconMap[status];
      
      return <IconComponent ref={ref} {...props} />;
    }
  )
);
StatusIcon.displayName = 'StatusIcon';

// ============================================================================
// Icon Context & Provider (For Icon Library Configuration)
// ============================================================================

export interface IconContextValue {
  defaultSize?: IconProps['size'];
  defaultColor?: IconProps['color'];
  defaultLibrary?: IconProps['library'];
  defaultVariant?: IconProps['variant'];
  iconPackUrl?: string;
}

export const IconContext = React.createContext<IconContextValue>({});

export const IconProvider: React.FC<{
  children: React.ReactNode;
  config?: IconContextValue;
}> = ({ children, config = {} }) => {
  return (
    <IconContext.Provider value={config}>
      {children}
    </IconContext.Provider>
  );
};

export const useIconConfig = () => {
  return React.useContext(IconContext);
};

// ============================================================================
// Icon Utility Components
// ============================================================================

/**
 * Icon Button - Icon wrapped in a button for better accessibility
 */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  IconProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(
  ({ className, disabled, onClick, ...iconProps }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center',
          'p-1 rounded-md',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          'transition-colors duration-200',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={disabled}
        onClick={onClick}
        aria-label={iconProps['aria-label'] || 'Icon button'}
      >
        <Icon {...iconProps} />
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';

/**
 * Icon Group - Group icons with consistent spacing
 */
// In Icon.tsx, update the IconGroup component:
export const IconGroup: React.FC<{
  children: React.ReactNode;
  className?: string;
  spacing?: 'xs' | 'sm' | 'md' | 'lg';
  'data-testid'?: string;
}> = ({ children, className, spacing = 'sm', 'data-testid': testId }) => {
  const spacingClasses = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  };
  
  return (
    <div 
      className={cn('flex items-center', spacingClasses[spacing], className)}
      data-testid={testId}
    >
      {children}
    </div>
  );
};
IconGroup.displayName = 'IconGroup';
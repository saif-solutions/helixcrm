// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Alert\Alert.tsx
import * as React from 'react';
import { cn } from '../../../lib/utils';
import { XIcon } from '../../atoms/Icon/Icon';
import { 
  AlertProps, 
  AlertRef,
  getAlertRole,
  getAlertAriaLive,
  shouldAlertAnnounce,
  getAlertIconSize
} from './Alert.types';
import { 
  getAlertContainerClasses, 
  getAlertIconClasses, 
  getDismissButtonClasses,
  alertClasses,
  hasAlertContent
} from './Alert.styles';

/**
 * Default icon components for each Alert variant
 */
const variantIcons = {
  info: (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  ),
  success: (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  ),
  error: (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  ),
  warning: (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      aria-hidden="true"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" 
      />
    </svg>
  ),
} as const;

/**
 * Get appropriate icon for variant
 */
function getVariantIcon(variant: keyof typeof variantIcons): React.ReactNode {
  return variantIcons[variant];
}

/**
 * Alert component for displaying important messages to users.
 * Supports multiple variants, dismissible alerts, and actions.
 */
export const Alert = React.forwardRef<AlertRef, AlertProps>(
  (
    {
      variant = 'info',
      size = 'md',
      title,
      message,
      dismissible = false,
      onDismiss,
      icon,
      actions,
      iconClassName,
      contentClassName,
      actionsClassName,
      className,
      children,
      role,
      'aria-label': ariaLabel,
      'aria-live': ariaLive,
      'aria-atomic': ariaAtomic,
      ...props
    }: AlertProps,
    ref: React.Ref<AlertRef>
  ) => {
    const [isDismissed, setIsDismissed] = React.useState(false);

    const handleDismiss = React.useCallback(() => {
      setIsDismissed(true);
      onDismiss?.();
    }, [onDismiss]);

    if (isDismissed) {
      return null;
    }

    // Determine accessibility attributes
    const alertRole = role || getAlertRole(variant);
    const alertAriaLive = ariaLive || getAlertAriaLive(variant);
    const shouldAnnounce = shouldAlertAnnounce(variant);

    // Get container classes
    const containerClasses = getAlertContainerClasses(variant, size, className);
    
    // Get icon classes
    const iconClasses = getAlertIconClasses(variant, size, iconClassName);
    
    // Get default or custom icon
    const defaultIcon = getVariantIcon(variant);
    const alertIcon = icon || defaultIcon;
    
    // Get content
    const alertMessage = message || children;
    const hasContent = hasAlertContent(title, message, children);

    return (
      <div
        ref={ref}
        className={containerClasses}
        role={alertRole}
        aria-label={ariaLabel || title}
        aria-live={alertAriaLive}
        aria-atomic={ariaAtomic ?? shouldAnnounce}
        data-variant={variant}
        data-size={size}
        data-dismissible={dismissible}
        {...props}
      >
        {/* Icon */}
        {alertIcon && (
          <div className={iconClasses} aria-hidden="true">
            {alertIcon}
          </div>
        )}

        {/* Content */}
        <div className={cn(alertClasses.content, contentClassName)}>
          {title && (
            <h4 className={alertClasses.title}>
              {title}
            </h4>
          )}
          
          {hasContent && (
            <div className={title ? '' : 'mt-0.5'}>
              {typeof alertMessage === 'string' ? (
                <p>{alertMessage}</p>
              ) : (
                alertMessage
              )}
            </div>
          )}
          
          {/* Actions */}
          {actions && (
            <div className={cn(alertClasses.actions, actionsClassName)}>
              {actions}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className={getDismissButtonClasses()}
            aria-label="Dismiss alert"
          >
            <XIcon 
              size={getAlertIconSize(size)} 
              className="opacity-60" 
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

// Predefined alert variants for convenience
export const InfoAlert = React.forwardRef<AlertRef, Omit<AlertProps, 'variant'>>(
  (props: Omit<AlertProps, 'variant'>, ref: React.Ref<AlertRef>) => (
    <Alert ref={ref} variant="info" {...props} />
  )
);
InfoAlert.displayName = 'InfoAlert';

export const SuccessAlert = React.forwardRef<AlertRef, Omit<AlertProps, 'variant'>>(
  (props: Omit<AlertProps, 'variant'>, ref: React.Ref<AlertRef>) => (
    <Alert ref={ref} variant="success" {...props} />
  )
);
SuccessAlert.displayName = 'SuccessAlert';

export const ErrorAlert = React.forwardRef<AlertRef, Omit<AlertProps, 'variant'>>(
  (props: Omit<AlertProps, 'variant'>, ref: React.Ref<AlertRef>) => (
    <Alert ref={ref} variant="error" {...props} />
  )
);
ErrorAlert.displayName = 'ErrorAlert';

export const WarningAlert = React.forwardRef<AlertRef, Omit<AlertProps, 'variant'>>(
  (props: Omit<AlertProps, 'variant'>, ref: React.Ref<AlertRef>) => (
    <Alert ref={ref} variant="warning" {...props} />
  )
);
WarningAlert.displayName = 'WarningAlert';
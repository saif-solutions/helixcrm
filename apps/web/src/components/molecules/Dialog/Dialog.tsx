// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dialog\Dialog.tsx
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { cn } from '../../../lib/utils';
import {
  DialogProps,
  DialogRef,
  AnimationPhase,
  DialogAction,
  generateDialogIds,
  validateDialogProps,
  getPortalContainer,
  createDefaultDialogActions,
  DialogEvent,
  normalizeDialogEvent,
} from './Dialog.types';
import {
  dialogClasses,
  getOverlayClasses,
  getDialogClasses,
  getActionButtonClasses,
  getDialogTestId,
  getPortalUsageWarning,
} from './Dialog.styles';
import {
  OptimizedDialogProvider,
  useDialogHeaderContext,
  useDialogBodyContext,
  useDialogFooterContext,
  DialogStateContextType,
  DialogConfigContextType,
  DialogActionsContextType,
  DialogAccessibilityContextType,
  DialogRefsContextType,
  DialogUtilitiesContextType,
} from './DialogSplitContext';
import { lockBodyScroll } from './scrollLockManager';

// ============================================================================
// COMPOUND COMPONENTS
// ============================================================================

/**
 * Dialog Header Component (Compound Component)
 */
const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    showCloseButton?: boolean;
    align?: 'left' | 'center' | 'right';
    'data-testid'?: string;
  }
>(({
  children,
  title,
  description,
  icon,
  showCloseButton = true,
  align = 'left',
  className,
  'data-testid': testId,
  ...props
}, ref) => {
  const context = useDialogHeaderContext();
  const { state, actions, accessibility, utils, hasCloseButton } = context;

  const shouldShowCloseButton = showCloseButton && hasCloseButton;
  const hasTitle = Boolean(title);
  const hasDescription = Boolean(description);
  const hasIcon = Boolean(icon);
  const hasHeaderContent = hasTitle || hasDescription || hasIcon || children;

  if (!hasHeaderContent && !shouldShowCloseButton) {
    return null;
  }

  // FIXED: Use raw event - normalization happens in context
  const handleCloseClick = React.useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (state.persistent) {
      actions.triggerPersistentFeedback();
      return;
    }
    
    // Pass raw React event - context will normalize it
    actions.onClose(event);
  }, [state.persistent, actions]);

  const headerClass = cn(
    dialogClasses.header.base,
    dialogClasses.header.align[align],
    className
  );

  return (
    <div
      ref={ref}
      className={headerClass}
      data-testid={testId || utils.getTestId('header')}
      {...props}
    >
      {hasIcon && (
        <div className={dialogClasses.header.iconContainer}>
          {icon}
        </div>
      )}
      
      <div className="flex-1">
        {title && (
          <h2
            className={dialogClasses.header.title}
            id={accessibility.headerId}
          >
            {title}
          </h2>
        )}
        {description && (
          <p className={dialogClasses.header.description}>
            {description}
          </p>
        )}
        {children && !title && !description && (
          <div className="mt-2">{children}</div>
        )}
      </div>

      {shouldShowCloseButton && (
        <button
          type="button"
          className={cn(
            dialogClasses.header.closeButton,
            'dialog-close-button'
          )}
          onClick={handleCloseClick}
          aria-label="Close dialog"
          data-testid={utils.getTestId('close-button')}
        >
          <svg
            className={dialogClasses.header.closeIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

DialogHeader.displayName = 'DialogHeader';

/**
 * Dialog Body Component (Compound Component)
 */
const DialogBody = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    scrollable?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    'data-testid'?: string;
  }
>(({
  children,
  scrollable = false,
  padding = 'md',
  className,
  'data-testid': testId,
  ...props
}, ref) => {
  const context = useDialogBodyContext();

  if (!children) {
    return null;
  }

  const bodyClass = cn(
    dialogClasses.body.base,
    scrollable ? dialogClasses.body.scrollable : '',
    dialogClasses.body.padding[padding],
    className
  );

  return (
    <div
      ref={ref}
      className={bodyClass}
      data-testid={testId || context.utils.getTestId('body')}
      id={context.accessibility.bodyId}
      {...props}
    >
      {children}
    </div>
  );
});

DialogBody.displayName = 'DialogBody';

/**
 * Dialog Footer Component (Compound Component)
 */
const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    actions?: DialogAction[];
    align?: 'left' | 'center' | 'right';
    showDivider?: boolean;
    'data-testid'?: string;
  }
>(({
  children,
  actions = [],
  align = 'right',
  showDivider = true,
  className,
  'data-testid': testId,
  ...props
}, ref) => {
  const context = useDialogFooterContext();
  const { state, actions: contextActions, utils } = context;

  const handleActionClick = React.useCallback((action: DialogAction, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (action.disabled || action.loading) {
      return;
    }
    
    // Call action's onClick handler
    if (action.onClick) {
      action.onClick(event);
    }
    
    // Handle action through context
    contextActions.handleActionClick(action);
    
    // Close dialog for non-persistent actions (unless action prevents it)
    if (!state.persistent && action.type !== 'reset') {
      contextActions.onClose(event);
    }
  }, [state.persistent, contextActions]);

  // Improved test ID sanitization
  const getActionTestId = React.useCallback((action: DialogAction) => {
    const actionId = action.id || action.label
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\u4e00-\u9fff\-\s]/gi, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return utils.getTestId(`action-${actionId}`);
  }, [utils]);

  const footerActions = actions.length > 0 ? actions : 
    (Array.isArray(children) ? [] : children ? undefined : []);

  const hasFooterContent = Boolean(children) || (footerActions && footerActions.length > 0);

  if (!hasFooterContent) {
    return null;
  }

  const footerClass = cn(
    dialogClasses.footer.base,
    dialogClasses.footer.align[align],
    showDivider ? dialogClasses.footer.divider : '',
    className
  );

  const renderActions = () => {
    if (footerActions && Array.isArray(footerActions) && footerActions.length > 0) {
      return (
        <div className={dialogClasses.footer.actions}>
          {footerActions.map((action, index) => (
            <button
              key={action.id || `action-${index}`}
              type={action.type || 'button'}
              onClick={(e) => handleActionClick(action, e)}
              disabled={action.disabled || action.loading}
              autoFocus={action.autoFocus}
              className={getActionButtonClasses(
                action.variant,
                'md',
                action.disabled,
                action.loading,
                action.icon ? 'pl-3 pr-4' : 'px-4'
              )}
              data-testid={action['data-testid'] || getActionTestId(action)}
              data-analytics={action['data-analytics']}
            >
              {action.loading ? (
                <>
                  <span className="opacity-0">{action.label}</span>
                  <div className={dialogClasses.footer.actionButton.loadingSpinner}>
                    <svg
                      className="animate-spin h-4 w-4 text-current"
                      fill="none"
                      viewBox="0 0 24 24"
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
                </>
              ) : (
                <>
                  {action.icon && (
                    <span className="mr-2">{action.icon}</span>
                  )}
                  {action.label}
                </>
              )}
            </button>
          ))}
        </div>
      );
    }
    return children;
  };

  return (
    <div
      ref={ref}
      className={footerClass}
      data-testid={testId || utils.getTestId('footer')}
      {...props}
    >
      {renderActions()}
    </div>
  );
});

DialogFooter.displayName = 'DialogFooter';

/**
 * Dialog Overlay Component (Internal) - FIXED: Proper event blocking
 */
const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    visible: boolean;
    blur?: boolean;
    onClick?: (event: React.MouseEvent) => void;
    persistent?: boolean;
    closeOnOverlayClick?: boolean;
    onClose?: (event?: React.MouseEvent) => void;
    triggerPersistentFeedback?: () => void;
    getTestId?: (element: 'overlay' | 'header' | 'body' | 'footer' | 'container' | 'close-button' | 'action') => string;
  }
>(({ 
  visible, 
  blur = false, 
  onClick, 
  className, 
  persistent = false,
  closeOnOverlayClick = true,
  onClose,
  triggerPersistentFeedback,
  getTestId = (element: any) => `dialog-${element}`,
  ...props 
}, ref) => {
  
// In DialogOverlay component - REPLACE THE ENTIRE handleOverlayClick function:

// In DialogOverlay component - REPLACE THE ENTIRE handleOverlayClick function:

const handleOverlayClick = React.useCallback((event: React.MouseEvent) => {
  // CRITICAL FIX: Always prevent default for overlay clicks
  event.preventDefault();
  event.stopPropagation();
  
  if (!closeOnOverlayClick) {
    // Don't trigger any close behavior when closeOnOverlayClick is false
    return;
  }
  
  if (persistent) {
    triggerPersistentFeedback?.();
    return;
  }
  
  // Only close if clicking directly on overlay (not bubbled events)
  if (event.target === event.currentTarget) {
    onClose?.(event);
  }
}, [closeOnOverlayClick, persistent, triggerPersistentFeedback, onClose]);

const handleOverlayMouseDown = React.useCallback((event: React.MouseEvent) => {
  // Always prevent default to stop text selection
  event.preventDefault();
  
  // Also stop propagation if closeOnOverlayClick is false
  if (!closeOnOverlayClick) {
    event.stopPropagation();
  }
}, [closeOnOverlayClick]);

  const overlayClass = cn(
    getOverlayClasses(visible, blur, className),
    persistent ? dialogClasses.persistent.overlay : ''
  );

  const handleClick = (event: React.MouseEvent) => {
    if (onClick) {
      onClick(event);
    }
    if (!event.defaultPrevented) {
      handleOverlayClick(event);
    }
  };

  return (
    <div
    ref={ref}
    className={overlayClass}
    onClick={handleClick}
    onMouseDown={handleOverlayMouseDown}
    data-testid={getTestId('overlay')}
    data-dialog-overlay="true" // ADD THIS
    aria-hidden="true"
    {...props}
    />
  );
});

DialogOverlay.displayName = 'DialogOverlay';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get focusable elements within a container
 */
const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), ' +
      '[href]:not([tabindex="-1"]), ' +
      'input:not([disabled]):not([tabindex="-1"]), ' +
      'select:not([disabled]):not([tabindex="-1"]), ' +
      'textarea:not([disabled]):not([tabindex="-1"]), ' +
      '[tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => {
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  });
};

// ============================================================================
// MAIN DIALOG COMPONENT
// ============================================================================

/**
 * Main Dialog Component
 */
export const Dialog = React.forwardRef<DialogRef, DialogProps>(
  (props, forwardedRef) => {
    const {
      // Core properties
      open,
      onClose,
      
      // Content properties
      title,
      description,
      children,
      icon,
      
      // Visual properties
      variant = 'default',
      size = 'md',
      position = 'center',
      animation = 'fade',
      overlay = true,
      overlayClassName,
      overlayOpacity,
      overlayBlur = false,
      overlayColor,
      
      // Header/Footer properties
      header = true,
      footer = true,
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnInteractOutside = true,
      closeOnEscape = true,
      
      // Behavior properties
      preventScroll = true,
      lockFocus = true,
      autoFocus = true,
      initialFocusRef,
      returnFocusRef,
      persistent = false,
      
      // Enhanced features
      nested = false,
      nestedLevel = 0,
      onInteractOutside,
      onDialogAnimationStart,
      onDialogAnimationEnd,
      onOpenComplete,
      onCloseComplete,
      
      // Custom rendering
      renderHeader,
      renderFooter,
      renderOverlay,
      
      // Transition properties
      transitionDuration = 200,
      transitionTimingFunction = 'ease-in-out',
      unmountOnExit = true,
      
      // Portal properties
      portal = true,
      portalContainer,
      portalClassName,
      
      // Styling
      className,
      contentClassName,
      headerClassName,
      bodyClassName,
      footerClassName,
      
      // Testing & analytics
      'data-testid': testId = 'dialog',
      'data-analytics': dataAnalytics,
      'data-cy': dataCy,
      
      // Accessibility
      ariaLabel,
      ariaLabelledby,
      ariaDescribedby,
      role,
      modal = true,
      
      // HTML attributes
      ...restProps
    } = props;

    // ============================================================================
    // 1. VALIDATION & INITIALIZATION
    // ============================================================================

    // Validate props
    const { warnings, errors } = React.useMemo(
      () => validateDialogProps(props),
      [props]
    );

    // Log warnings and errors in development
    React.useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        warnings.forEach(warning => console.warn(`⚠️ Dialog Warning: ${warning}`));
        if (errors.length > 0) {
          errors.forEach(error => console.error(`❌ Dialog Error: ${error}`));
          throw new Error(`Dialog component has validation errors: ${errors.join(', ')}`);
        }
      }
    }, [warnings, errors]);

    // Check portal usage warning
    const portalWarning = React.useMemo(
      () => getPortalUsageWarning(portal, nested),
      [portal, nested]
    );

    React.useEffect(() => {
      if (process.env.NODE_ENV === 'development' && portalWarning) {
        console.warn(portalWarning);
      }
    }, [portalWarning]);

    // ============================================================================
    // 2. STATE MANAGEMENT
    // ============================================================================

    // Animation state
    const [isVisible, setIsVisible] = React.useState(open);
    const [isAnimating, setIsAnimating] = React.useState(false);
    const [animationPhase, setAnimationPhase] = React.useState<AnimationPhase>(
      open ? 'enter' : 'exited'
    );
    
    // Persistent dialog feedback state (timer-driven for testability)
    const [showPersistentFeedback, setShowPersistentFeedback] = React.useState(false);
    
    // Store last active element for focus restoration
    const lastActiveElementRef = React.useRef<HTMLElement | null>(null);

    // Persistent timer ref
    const persistentTimerRef = React.useRef<number | null>(null);

    // Refs
    const dialogRef = React.useRef<DialogRef>(null);
    const overlayRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    
    // Combine forwarded ref with internal ref
    React.useImperativeHandle(forwardedRef, () => dialogRef.current as DialogRef, []);

    // IDs for accessibility
    const dialogIds = React.useMemo(() => generateDialogIds(), []);

    // ============================================================================
    // 3. EVENT HANDLERS
    // ============================================================================

    // Enhanced persistent feedback with timer for testability
const triggerPersistentFeedback = React.useCallback(() => {
  if (!persistent) return;
  
  // Clear any existing timer
  if (persistentTimerRef.current) {
    window.clearTimeout(persistentTimerRef.current);
    persistentTimerRef.current = null;
  }
  
  setShowPersistentFeedback(true);
  
  // Fallback timer ONLY for browsers that don't fire animationend
  persistentTimerRef.current = window.setTimeout(() => {
    setShowPersistentFeedback(false);
    persistentTimerRef.current = null;
  }, 500); // Slightly longer than CSS animation
  
}, [persistent]);

const handleClose = React.useCallback((event?: DialogEvent) => {
  if (persistent) {
    triggerPersistentFeedback();
    
    if (event && onInteractOutside) {
      onInteractOutside(event);
    }
    return;
  }
  
  // Simply pass the original event to onClose
  onClose(event);
  
  // Prevent default/stop propagation for React events
  if (event) {
    const normalized = normalizeDialogEvent(event);
    if (normalized?.isReactEvent) {
      const reactEvent = event as React.MouseEvent | React.KeyboardEvent;
      reactEvent.preventDefault();
      reactEvent.stopPropagation();
    }
  }
}, [onClose, persistent, triggerPersistentFeedback, onInteractOutside]);

    const handleAnimationStart = React.useCallback((phase: AnimationPhase) => {
      setAnimationPhase(phase);
      onDialogAnimationStart?.(phase);
    }, [onDialogAnimationStart]);

    const handleAnimationEnd = React.useCallback((phase: AnimationPhase) => {
      setAnimationPhase(phase);
      onDialogAnimationEnd?.(phase);
    }, [onDialogAnimationEnd]);

    const handleInteractOutside = React.useCallback((event?: DialogEvent) => {
      onInteractOutside?.(event!);
    }, [onInteractOutside]);

    const handleActionClick = React.useCallback((action: DialogAction) => {
      // Analytics tracking
      if (process.env.NODE_ENV === 'development' && dataAnalytics) {
        console.debug('Dialog Action:', {
          action: 'dialog_action_click',
          dialogId: dialogIds.dialogId,
          actionId: action.id,
          actionLabel: action.label,
          variant,
          size,
          nestedLevel,
          timestamp: Date.now(),
        });
      }
    }, [dataAnalytics, dialogIds.dialogId, variant, size, nestedLevel]);

// ============================================================================
// 4. FOCUS MANAGEMENT & TRAP IMPLEMENTATION
// ============================================================================

// Store last active element when dialog opens - FIX 3
React.useEffect(() => {
  if (open) {
    lastActiveElementRef.current = document.activeElement as HTMLElement | null;
  }
}, [open]);

// Focus trap implementation - FIX 2
React.useEffect(() => {
  if (!open || !dialogRef.current || !lockFocus) return;

  const container = dialogRef.current;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Only prevent default when we need to wrap focus
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      event.stopPropagation();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      event.stopPropagation();
      firstElement.focus();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [open, lockFocus]);

const hasAutoFocusedRef = React.useRef(false);

// Auto-focus first focusable element on open
React.useEffect(() => {
  if (!open || !dialogRef.current || !autoFocus) return;
  if (hasAutoFocusedRef.current) return; // Already focused
  
  hasAutoFocusedRef.current = true;
  
  const container = dialogRef.current;
  
  const focusInitialElement = () => {
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else {
      const focusableElements = getFocusableElements(container);
      // Skip close button when auto-focusing
      const focusableWithoutClose = focusableElements.filter(
        el => el.getAttribute('aria-label') !== 'Close dialog'
      );
      
      if (focusableWithoutClose.length > 0) {
        focusableWithoutClose[0].focus();
      } else if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        container.focus();
      }
    }
  };
  
  queueMicrotask(focusInitialElement);
  
  return () => {
    // Cleanup: reset on unmount
  };
}, [open, autoFocus, initialFocusRef]);

React.useEffect(() => {
  if (!open) {
    hasAutoFocusedRef.current = false;
  }
}, [open]);

// Restore focus on close
React.useEffect(() => {
  if (!open && lastActiveElementRef.current) {
    const elementToFocus = returnFocusRef?.current || lastActiveElementRef.current;
    
    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {
      console.debug('Dialog closing, restoring focus to:', {
        element: elementToFocus?.tagName,
        id: elementToFocus?.id,
        className: elementToFocus?.className,
      });
    }
    
    queueMicrotask(() => {
      if (elementToFocus && document.contains(elementToFocus)) {
        elementToFocus.focus();
      }
    });

    return () => {
      // No cleanup needed
    };
  }
}, [open, returnFocusRef]);

    // ============================================================================
    // 5. EFFECTS & LIFECYCLE
    // ============================================================================

    // Cleanup persistent timer on unmount
React.useEffect(() => {
  return () => {
    // Cleanup persistent timer on unmount
    if (persistentTimerRef.current) {
      window.clearTimeout(persistentTimerRef.current);
      persistentTimerRef.current = null;
    }
  };
}, []);

    // Handle open/close transitions
    React.useEffect(() => {
      if (open) {
        // Opening animation
        setIsVisible(true);
        setAnimationPhase('enter');
        setIsAnimating(true);
        
        // Start enter animation
        const enterTimer = setTimeout(() => {
          setAnimationPhase('enter-active');
          handleAnimationStart('enter');
        }, 10);
        
        // Complete enter animation
        const enterActiveTimer = setTimeout(() => {
          setAnimationPhase('entered');
          setIsAnimating(false);
          handleAnimationEnd('enter');
          onOpenComplete?.();
        }, transitionDuration);
        
        return () => {
          clearTimeout(enterTimer);
          clearTimeout(enterActiveTimer);
        };
      } else if (isVisible) {
        // Closing animation
        setAnimationPhase('exit');
        setIsAnimating(true);
        
        // Start exit animation
        const exitTimer = setTimeout(() => {
          setAnimationPhase('exit-active');
          handleAnimationStart('exit');
        }, 10);
        
        // Complete exit animation
        const exitActiveTimer = setTimeout(() => {
          setAnimationPhase('exited');
          setIsVisible(false);
          setIsAnimating(false);
          handleAnimationEnd('exit');
          onCloseComplete?.();
        }, transitionDuration);
        
        return () => {
          clearTimeout(exitTimer);
          clearTimeout(exitActiveTimer);
        };
      }
    }, [open, isVisible, transitionDuration, handleAnimationStart, handleAnimationEnd, onOpenComplete, onCloseComplete]);

    // Prevent body scroll when dialog is open
    React.useEffect(() => {
      if (!preventScroll || !open) return;
      
      const unlockScroll = lockBodyScroll();
      
      return () => {
        unlockScroll();
      };
    }, [open, preventScroll]);

    // Handle escape key press - UPDATED with fix for closeOnEscape=false
React.useEffect(() => {
  if (!open) return;
  
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      
      if (persistent) {
        // For persistent dialogs, trigger shake feedback
        triggerPersistentFeedback();
        onInteractOutside?.(event);
        return;
      }
      
      if (!closeOnEscape) {
        onInteractOutside?.(event);
        return;
      }
      
      handleClose(event);
    }
  };
  
  document.addEventListener('keydown', handleEscape, true);
  
  return () => {
    document.removeEventListener('keydown', handleEscape, true);
  };
}, [open, closeOnEscape, persistent, handleClose, triggerPersistentFeedback, onInteractOutside]);

    // Handle outside clicks
// In Dialog.tsx - UPDATE THE handleOutsideClick EFFECT (around line 700):
React.useEffect(() => {
  if (!open || !closeOnInteractOutside || persistent) return;
  
  const handleOutsideClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Skip clicks on dialog container or overlay
    if (
      target.closest('[data-dialog-container]') ||
      target.closest('[data-dialog-overlay]')
    ) {
      return;
    }
    
    // Only handle clicks outside both dialog and overlay
    if (
      dialogRef.current &&
      !dialogRef.current.contains(event.target as Node)
    ) {
      event.preventDefault();
      event.stopPropagation();
      handleClose(event);
    }
  };
  
  document.addEventListener('mousedown', handleOutsideClick, true);
  
  return () => {
    document.removeEventListener('mousedown', handleOutsideClick, true);
  };
}, [open, closeOnInteractOutside, persistent, handleClose]);
    // ============================================================================
    // 6. CONTEXT VALUES
    // ============================================================================

    const contextState: DialogStateContextType = React.useMemo(() => ({
      isOpen: open,
      isVisible,
      isAnimating,
      animationPhase,
      showPersistentFeedback,
      isNested: nested,
      nestedLevel,
      persistent,
    }), [open, isVisible, isAnimating, animationPhase, showPersistentFeedback, nested, nestedLevel, persistent]);

    const contextConfig: DialogConfigContextType = React.useMemo(() => ({
      variant,
      size,
      position,
      showCloseButton,
      closeOnOverlayClick,
      closeOnEscape,
    }), [variant, size, position, showCloseButton, closeOnOverlayClick, closeOnEscape]);

    const contextActions: DialogActionsContextType = React.useMemo(() => ({
      onClose: handleClose,
      onAnimationStart: handleAnimationStart,
      onAnimationEnd: handleAnimationEnd,
      onInteractOutside: handleInteractOutside,
      handleActionClick,
      triggerPersistentFeedback,
    }), [handleClose, handleAnimationStart, handleAnimationEnd, handleInteractOutside, handleActionClick, triggerPersistentFeedback]);

    const contextAccessibility: DialogAccessibilityContextType = React.useMemo(() => dialogIds, []);

    const contextRefs: DialogRefsContextType = React.useMemo(() => ({
      dialogRef: dialogRef as React.RefObject<DialogRef | null>,
      overlayRef,
      contentRef,
      initialFocusRef: initialFocusRef || null,
      returnFocusRef: returnFocusRef || null,
    }), [initialFocusRef, returnFocusRef]);

    const contextUtils: DialogUtilitiesContextType = React.useMemo(() => ({
      getTestId: (element: string) => getDialogTestId(testId, element as any, nestedLevel),
      portalContainer: portal ? getPortalContainer(portalContainer, nestedLevel) : null,
    }), [testId, nestedLevel, portal, portalContainer]);

    // ============================================================================
    // 7. RENDER LOGIC
    // ============================================================================

    // Get default actions based on variant
    const defaultActions = React.useMemo(() => {
      if (variant === 'alert') return createDefaultDialogActions('alert');
      if (variant === 'confirm') return createDefaultDialogActions('confirm');
      if (variant === 'success') return createDefaultDialogActions('success');
      if (variant === 'error') return createDefaultDialogActions('error');
      if (variant === 'warning') return createDefaultDialogActions('warning');
      return createDefaultDialogActions('default');
    }, [variant]);

    // Determine if we should render header/footer
    const shouldRenderHeader = React.useMemo(() => {
      if (typeof header === 'boolean') {
        return header && (title || description || icon);
      }
      return true;
    }, [header, title, description, icon]);

const shouldRenderFooter = React.useMemo(() => {
  if (typeof footer === 'boolean') {
    return footer; // true = show, false = hide
  }
  
  // If footer is an object, check if it has actions or children
  if (footer && typeof footer === 'object') {
    const hasActions = footer.actions && footer.actions.length > 0;
    return hasActions || true; // Always render if footer object exists
  }
  
  return true;
}, [footer]);

    // Get header props
    const headerProps = React.useMemo(() => {
      if (typeof header === 'object' && header !== null) {
        return {
          title: header.title || title,
          description: header.description || description,
          icon: header.icon || icon,
          showCloseButton: header.showCloseButton ?? showCloseButton,
          align: header.align || 'left',
          className: header.className || headerClassName,
          'data-testid': header['data-testid'],
        };
      }
      return {
        title,
        description,
        icon,
        showCloseButton,
        align: 'left' as const,
        className: headerClassName,
      };
    }, [header, title, description, icon, showCloseButton, headerClassName]);

    // Get footer props
const footerProps = React.useMemo(() => {
  if (typeof footer === 'object' && footer !== null) {
    // CRITICAL FIX: If custom actions are provided, use ONLY those
    // Don't fall back to default actions
    const shouldUseDefaultActions = !footer.actions || footer.actions.length === 0;
    
    return {
      actions: shouldUseDefaultActions ? defaultActions : footer.actions,
      align: footer.align || 'right',
      showDivider: footer.showDivider ?? true,
      className: footer.className || footerClassName,
      'data-testid': footer['data-testid'],
    };
  }
  
  // If footer is true or not specified, use default actions
  if (footer === true || footer === undefined) {
    return {
      actions: defaultActions,
      align: 'right' as const,
      showDivider: true,
      className: footerClassName,
    };
  }
  
  // If footer is false, return null to hide it
  return null;
}, [footer, defaultActions, footerClassName]);

    // Dialog classes
    const dialogClass = React.useMemo(() => 
      cn(
        getDialogClasses(
          variant,
          size,
          position,
          isVisible,
          animation,
          isAnimating,
          persistent
        ),
        showPersistentFeedback ? dialogClasses.persistent.dialog : '',
        className
      ),
      [variant, size, position, isVisible, animation, isAnimating, persistent, showPersistentFeedback, className]
    );

    // Content classes
    const contentClass = React.useMemo(() => 
      cn(
        'dialog-content-wrapper',
        contentClassName
      ),
      [contentClassName]
    );

    // Portal container
    const targetContainer = React.useMemo(() => {
      if (!portal) return null;
      return getPortalContainer(portalContainer, nestedLevel);
    }, [portal, portalContainer, nestedLevel]);

    // ============================================================================
    // 8. RENDER CONTENT
    // ============================================================================

    const renderDialogContent = () => (
      <OptimizedDialogProvider
        state={contextState}
        config={contextConfig}
        actions={contextActions}
        accessibility={contextAccessibility}
        refs={contextRefs}
        utils={contextUtils}
      >
        {overlay && (
          renderOverlay ? (
            renderOverlay({
              ref: overlayRef,
              className: cn(
                getOverlayClasses(isVisible, overlayBlur, overlayClassName),
                persistent ? dialogClasses.persistent.overlay : ''
              ),
              onClick: (event: React.MouseEvent) => {
                if (closeOnOverlayClick && !persistent) {
                  handleClose(event);
                } else if (persistent) {
                  triggerPersistentFeedback();
                }
              },
              'data-testid': getDialogTestId(testId, 'overlay', nestedLevel),
              style: {
                backgroundColor: overlayColor || undefined,
                opacity: overlayOpacity,
              },
            } as React.HTMLAttributes<HTMLDivElement>)
          ) : (
            <DialogOverlay
              ref={overlayRef}
              visible={isVisible}
              blur={overlayBlur}
              className={overlayClassName}
              persistent={persistent}
              closeOnOverlayClick={closeOnOverlayClick}
              onClose={handleClose}
              triggerPersistentFeedback={triggerPersistentFeedback}
              getTestId={(element) => getDialogTestId(testId, element as any, nestedLevel)}
            />
          )
        )}

<div
  ref={dialogRef}
  className={dialogClass}
  role={role || (variant === 'alert' || variant === 'confirm' ? 'alertdialog' : 'dialog')}
  aria-modal={modal}
  aria-labelledby={ariaLabelledby || (title ? dialogIds.headerId : undefined)}
  aria-describedby={ariaDescribedby || (description || children ? dialogIds.bodyId : undefined)}
  aria-label={ariaLabel}
  data-testid={getDialogTestId(testId, 'container', nestedLevel)}
  data-dialog-container="true"
  data-analytics={dataAnalytics}
  data-cy={dataCy}
  // ADD animation end handler
  onAnimationEnd={(e) => {
    if (e.animationName.includes('shake') && showPersistentFeedback) {
      // Clear shake feedback when shake animation completes
      setShowPersistentFeedback(false);
      if (persistentTimerRef.current) {
        window.clearTimeout(persistentTimerRef.current);
        persistentTimerRef.current = null;
      }
    }
  }}
  {...restProps}
>
          <div className={contentClass} ref={contentRef}>
            {shouldRenderHeader && (
              renderHeader ? (
                renderHeader({
                  ...headerProps,
                  onClose: handleClose,
                  id: dialogIds.headerId,
                  'data-testid': getDialogTestId(testId, 'header', nestedLevel),
                })
              ) : (
                <DialogHeader
                  {...headerProps}
                  data-testid={getDialogTestId(testId, 'header', nestedLevel)}
                />
              )
            )}

            <DialogBody
              scrollable={size !== 'fullscreen'}
              padding="md"
              className={bodyClassName}
              data-testid={getDialogTestId(testId, 'body', nestedLevel)}
              id={dialogIds.bodyId}
            >
              {children}
            </DialogBody>

            {shouldRenderFooter && (
              renderFooter ? (
                renderFooter(defaultActions, () => (
                  <DialogFooter
                    {...footerProps}
                    data-testid={getDialogTestId(testId, 'footer', nestedLevel)}
                    id={dialogIds.footerId}
                  />
                ))
              ) : (
                <DialogFooter
                  {...footerProps}
                  data-testid={getDialogTestId(testId, 'footer', nestedLevel)}
                  id={dialogIds.footerId}
                />
              )
            )}
          </div>
        </div>
      </OptimizedDialogProvider>
    );

    // ============================================================================
    // 9. PORTAL RENDERING
    // ============================================================================

    // Early return if not visible and unmountOnExit
    if (!isVisible && unmountOnExit) {
      return null;
    }

    // Render without portal
    if (!portal || !targetContainer) {
      return renderDialogContent();
    }

    // Render with portal
    return ReactDOM.createPortal(renderDialogContent(), targetContainer);
  }
);

// Add display name
Dialog.displayName = 'Dialog';

// Attach compound components
(Dialog as any).Header = DialogHeader;
(Dialog as any).Body = DialogBody;
(Dialog as any).Footer = DialogFooter;

// Export compound components
export { DialogHeader, DialogBody, DialogFooter };
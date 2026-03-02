// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dialog\DialogContext.tsx
/* eslint-disable react-refresh/only-export-components */
import React, { useCallback } from 'react';
// Import from the base types file instead
import {
  DialogVariant,
  DialogSize,
  DialogPosition,
  DialogAction,
  DialogRef,
  AnimationPhase,
  DialogEvent, // Now this comes from a clean import
} from './DialogBaseTypes';

/**
 * Optimized Dialog Context Type Definitions
 * Split into smaller interfaces for better performance
 */
export interface DialogContextState {
  isOpen: boolean;
  isVisible: boolean;
  isAnimating: boolean;
  animationPhase: AnimationPhase;
  showPersistentFeedback: boolean;
  isNested: boolean;
  nestedLevel: number;
  // Moved persistent to state interface
  persistent: boolean;
}

export interface DialogVisualProps {
  variant: DialogVariant;
  size: DialogSize;
  position: DialogPosition;
}

export interface DialogBehaviorProps {
  showCloseButton: boolean;
  closeOnOverlayClick: boolean;
  closeOnEscape: boolean;
  // Persistent moved to state
}

export interface DialogAccessibilityProps {
  dialogId: string;
  headerId: string;
  bodyId: string;
  footerId?: string;
  closeButtonId: string;
}

export interface DialogRefs {
  dialogRef: React.RefObject<DialogRef | null>;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  initialFocusRef: React.RefObject<HTMLElement> | null;
  returnFocusRef: React.RefObject<HTMLElement> | null;
}

/**
 * Dialog event handlers with unified event types
 */
export interface DialogEventHandlers {
  onClose: (event?: DialogEvent) => void;
  onAnimationStart: (phase: AnimationPhase) => void;
  onAnimationEnd: (phase: AnimationPhase) => void;
  onInteractOutside: (event?: DialogEvent) => void;
  handleActionClick: (action: DialogAction) => void;
  triggerPersistentFeedback: () => void;
}

export interface DialogUtilities {
  getTestId: (element: string) => string;
  portalContainer: HTMLElement | null;
}

/**
 * Combined Dialog Context Type
 */
export interface DialogContextType {
  state: DialogContextState;
  visual: DialogVisualProps;
  behavior: DialogBehaviorProps;
  accessibility: DialogAccessibilityProps;
  refs: DialogRefs;
  handlers: DialogEventHandlers;
  utils: DialogUtilities;
}

// Create context with proper default null value
const DialogContext = React.createContext<DialogContextType | null>(null);

// Export context for direct usage if needed
export { DialogContext };

/**
 * Enhanced hook with better error message and debug info
 */
export const useDialogContext = (): DialogContextType => {
  const context = React.useContext(DialogContext);
  if (!context) {
    console.error(
      '❌ useDialogContext must be used within a Dialog component. ' +
        'Make sure your component is wrapped with <DialogProvider> or inside a <Dialog> component.\n' +
        'Stack trace for debugging:',
      new Error().stack
    );
    throw new Error('useDialogContext must be used within a Dialog component');
  }
  return context;
};

/**
 * Dialog Provider Component Props
 */
interface DialogContextProviderProps {
  value: DialogContextType;
  children: React.ReactNode;
}

/**
 * Enhanced Dialog Provider with validation and debugging
 * NOW WITH MEMOIZATION FOR PERFORMANCE
 */
export const DialogContextProvider: React.FC<DialogContextProviderProps> = React.memo(
  ({ value, children }) => {
    // Validation for required context values
    React.useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        const requiredProps = ['state', 'visual', 'accessibility', 'handlers'] as const;

        requiredProps.forEach((prop) => {
          if (!value[prop]) {
            console.warn(`⚠️ DialogProvider: ${prop} is required in context value`);
          }
        });

        // Warn about missing accessibility IDs
        if (!value.accessibility.headerId && !value.accessibility.bodyId) {
          console.warn(
            '⚠️ DialogProvider: Missing accessibility IDs. ' +
              'Consider providing headerId and bodyId for proper screen reader support.'
          );
        }

        // Warn about focus management in nested dialogs
        if (value.state.isNested && !value.refs.initialFocusRef) {
          console.warn(
            '⚠️ DialogProvider: Nested dialog without initialFocusRef may cause focus trap issues.'
          );
        }
      }
    }, [value]);

    // Debug logging for development
    React.useEffect(() => {
      if (process.env.NODE_ENV === 'development' && value.state.isOpen) {
        console.debug('🔍 Dialog Context:', {
          dialogId: value.accessibility.dialogId,
          isOpen: value.state.isOpen,
          isVisible: value.state.isVisible,
          variant: value.visual.variant,
          size: value.visual.size,
          nestedLevel: value.state.nestedLevel,
          animationPhase: value.state.animationPhase,
        });
      }
    }, [
      value.state.isOpen,
      value.state.isVisible,
      value.state.animationPhase,
      value.accessibility.dialogId,
      value.visual.variant,
      value.visual.size,
      value.state.nestedLevel,
    ]);

    return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
  }
);

DialogContextProvider.displayName = 'DialogContextProvider';

/**
 * Helper hook for Dialog Header component
 * Provides header-specific context values and methods
 */
export const useDialogHeaderContext = () => {
  const context = useDialogContext();
  const { accessibility, behavior, handlers, utils } = context;

  const headerProps = React.useMemo(
    () => ({
      id: accessibility.headerId,
      'data-testid': utils.getTestId('header'),
      'aria-labelledby': accessibility.headerId,
      className: 'dialog-header',
    }),
    [accessibility.headerId, utils]
  );

  const closeButtonProps = React.useMemo(
    () => ({
      id: accessibility.closeButtonId,
      'data-testid': utils.getTestId('close-button'),
      'aria-label': 'Close dialog',
      onClick: (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        handlers.onClose(event);
      },
      disabled: context.state.persistent,
      className: 'dialog-close-button',
    }),
    [accessibility.closeButtonId, utils, handlers, context.state.persistent]
  );

  const hasCloseButton = React.useMemo(
    () => behavior.showCloseButton && !context.state.persistent,
    [behavior.showCloseButton, context.state.persistent]
  );

  const handleCloseClick = React.useCallback(
    (event: React.MouseEvent) => {
      if (context.state.persistent) {
        handlers.triggerPersistentFeedback();
        return;
      }
      handlers.onClose(event);
    },
    [context.state.persistent, handlers]
  );

  return {
    ...context,
    headerProps,
    closeButtonProps,
    hasCloseButton,
    handleCloseClick,
  };
};

/**
 * Helper hook for Dialog Body component
 * Provides body-specific context values and methods
 */
export const useDialogBodyContext = () => {
  const context = useDialogContext();
  const { state, accessibility, behavior, refs, utils } = context;

  const bodyProps = React.useMemo(
    () => ({
      id: accessibility.bodyId,
      'data-testid': utils.getTestId('body'),
      'aria-describedby': accessibility.bodyId,
      role: 'region',
      tabIndex: state.isOpen ? 0 : -1,
      className: 'dialog-body',
    }),
    [accessibility.bodyId, state.isOpen, utils]
  );

  // IMPROVED: Use ResizeObserver for dynamic content detection
  const [isScrollable, setIsScrollable] = React.useState(false);

  React.useEffect(() => {
    if (!refs.contentRef.current || !state.isOpen) return;

    const contentElement = refs.contentRef.current;

    const checkScrollability = () => {
      if (contentElement) {
        setIsScrollable(contentElement.scrollHeight > contentElement.clientHeight);
      }
    };

    // Initial check
    checkScrollability();

    // Set up ResizeObserver for dynamic content
    const resizeObserver = new ResizeObserver(checkScrollability);
    resizeObserver.observe(contentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [refs.contentRef, state.isOpen]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      // Prevent default behavior for Escape key if dialog handles it
      if (event.key === 'Escape' && behavior.closeOnEscape) {
        event.stopPropagation();
      }
    },
    [behavior.closeOnEscape]
  );

  return {
    ...context,
    bodyProps,
    isScrollable,
    handleKeyDown,
  };
};

/**
 * Helper hook for Dialog Footer component
 * Provides footer-specific context values and methods
 */
export const useDialogFooterContext = () => {
  const context = useDialogContext();
  const { state, accessibility, handlers, utils } = context;

  const footerProps = React.useMemo(
    () => ({
      id: accessibility.footerId,
      'data-testid': utils.getTestId('footer'),
      className: 'dialog-footer',
    }),
    [accessibility.footerId, utils]
  );

  const handleActionClick = React.useCallback(
    (action: DialogAction, event?: React.MouseEvent) => {
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
      handlers.handleActionClick(action);

      // Close dialog for non-persistent actions (unless action prevents it)
      if (!state.persistent && action.type !== 'reset') {
        handlers.onClose(event);
      }
    },
    [state.persistent, handlers]
  );

  // IMPROVED: Better test ID sanitization
  const getActionTestId = React.useCallback(
    (action: DialogAction) => {
      const actionId =
        action.id ||
        action.label
          .toLowerCase()
          .replace(/[^a-z0-9\u0600-\u06FF\u4e00-\u9fff\-\s]/gi, '') // Allow Arabic, Chinese, etc.
          .replace(/\s+/g, '-')
          .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens

      return utils.getTestId(`action-${actionId}`);
    },
    [utils]
  );

  return {
    ...context,
    footerProps,
    handleActionClick,
    getActionTestId,
  };
};

/**
 * Helper hook for Dialog Overlay component
 * Provides overlay-specific context values and methods
 */
export const useDialogOverlayContext = () => {
  const context = useDialogContext();
  const { state, behavior, handlers, refs, utils } = context;

  const overlayProps = React.useMemo(
    () => ({
      ref: refs.overlayRef,
      'data-testid': utils.getTestId('overlay'),
      'aria-hidden': true,
      tabIndex: -1,
      className: 'dialog-overlay',
    }),
    [refs.overlayRef, utils]
  );

  const handleOverlayClick = React.useCallback(
    (event: React.MouseEvent) => {
      if (!behavior.closeOnOverlayClick) {
        return;
      }

      if (state.persistent) {
        handlers.triggerPersistentFeedback();
        handlers.onInteractOutside?.(event);
        return;
      }

      // Only close if clicking directly on overlay (not through bubbled event)
      if (event.target === event.currentTarget) {
        handlers.onClose(event);
      }
    },
    [behavior.closeOnOverlayClick, state.persistent, handlers]
  );

  const handleOverlayMouseDown = React.useCallback((event: React.MouseEvent) => {
    // Prevent text selection when clicking overlay
    event.preventDefault();
  }, []);

  return {
    ...context,
    overlayProps,
    handleOverlayClick,
    handleOverlayMouseDown,
  };
};

/**
 * Helper hook for Dialog Content component
 * Provides content-specific context values and methods
 */
export const useDialogContentContext = () => {
  const context = useDialogContext();
  const { state, visual, behavior, accessibility, refs, handlers, utils } = context;

  const contentProps = React.useMemo(
    () => ({
      ref: refs.contentRef,
      'data-testid': utils.getTestId('container'),
      role: visual.variant === 'alert' || visual.variant === 'confirm' ? 'alertdialog' : 'dialog',
      'aria-modal': true,
      'aria-labelledby': accessibility.headerId,
      'aria-describedby': accessibility.bodyId,
      tabIndex: -1,
      className: 'dialog-content',
    }),
    [refs.contentRef, utils, visual.variant, accessibility]
  );

  // IMPROVED: Better focus trap that filters visible elements
  const getFocusableElements = React.useCallback(() => {
    if (!refs.contentRef.current) return [];

    const focusableSelectors = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]:not([contenteditable="false"])',
      'details > summary:first-of-type',
      'iframe:not([tabindex="-1"])',
      'audio[controls]:not([tabindex="-1"])',
      'video[controls]:not([tabindex="-1"])',
      '[role="button"]:not([tabindex="-1"])',
    ].join(',');

    const elements = Array.from(
      refs.contentRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    // Filter out hidden and non-visible elements
    return elements.filter((el) => {
      const style = window.getComputedStyle(el);
      const isVisible =
        style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      const isAccessible = el.getAttribute('aria-hidden') !== 'true' && !el.hasAttribute('inert');

      return isVisible && isAccessible;
    });
  }, [refs.contentRef]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      // Handle Escape key
      if (event.key === 'Escape' && behavior.closeOnEscape) {
        if (state.persistent) {
          handlers.triggerPersistentFeedback();
          handlers.onInteractOutside?.(event.nativeEvent as KeyboardEvent);
        } else {
          event.preventDefault();
          event.stopPropagation();
          handlers.onClose(event.nativeEvent as KeyboardEvent);
        }
      }

      // Handle Tab key for focus trapping
      if (event.key === 'Tab' && refs.contentRef.current) {
        const focusableElements = getFocusableElements();

        if (focusableElements.length === 0) {
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [behavior.closeOnEscape, state.persistent, handlers, refs.contentRef, getFocusableElements]
  );

  const animationProps = React.useMemo(
    () => ({
      onAnimationStart: () => handlers.onAnimationStart?.('enter-active'),
      onAnimationEnd: () => handlers.onAnimationEnd?.(state.animationPhase),
      'data-animation-phase': state.animationPhase,
      'data-is-animating': state.isAnimating,
    }),
    [state.animationPhase, state.isAnimating, handlers]
  );

  return {
    ...context,
    contentProps,
    handleKeyDown,
    animationProps,
    getFocusableElements,
  };
};

/**
 * Helper hook for nested dialog management
 */
export const useNestedDialogContext = (level: number = 0) => {
  const parentContext = React.useContext(DialogContext);

  const isNested = React.useMemo(() => parentContext !== null && level > 0, [parentContext, level]);

  const nestedLevel = React.useMemo(
    () => (parentContext ? parentContext.state.nestedLevel + 1 : level),
    [parentContext, level]
  );

  const shouldPreventScroll = React.useMemo(
    () => isNested && nestedLevel === 1, // Only prevent scroll for first-level nested
    [isNested, nestedLevel]
  );

  const zIndex = React.useMemo(() => {
    if (!isNested) return 50;
    return 50 + nestedLevel * 10;
  }, [isNested, nestedLevel]);

  const getNestedTestId = React.useCallback(
    (element: string) => {
      const baseTestId = parentContext?.utils.getTestId('dialog') || 'dialog';
      return `${baseTestId}-nested-${nestedLevel}-${element}`;
    },
    [parentContext, nestedLevel]
  );

  return {
    isNested,
    nestedLevel,
    shouldPreventScroll,
    zIndex,
    getNestedTestId,
    parentDialogId: parentContext?.accessibility.dialogId,
    parentIsOpen: parentContext?.state.isOpen,
  };
};

/**
 * Helper hook for animation state management
 */
export const useDialogAnimationHook = (initialPhase: AnimationPhase = 'exited') => {
  const [animationPhase, setAnimationPhase] = React.useState<AnimationPhase>(initialPhase);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const startAnimation = React.useCallback((phase: AnimationPhase) => {
    setAnimationPhase(phase);
    setIsAnimating(true);
  }, []);

  const endAnimation = React.useCallback((phase: AnimationPhase) => {
    setAnimationPhase(phase);
    setIsAnimating(false);
  }, []);

  const isEntering = React.useMemo(
    () => animationPhase === 'enter' || animationPhase === 'enter-active',
    [animationPhase]
  );

  const isExiting = React.useMemo(
    () => animationPhase === 'exit' || animationPhase === 'exit-active',
    [animationPhase]
  );

  const transitionClasses = React.useMemo(() => {
    const classes: string[] = ['transition-all', 'duration-200', 'ease-in-out'];

    if (isEntering) {
      classes.push('opacity-0', 'scale-95');
    } else if (isExiting) {
      classes.push('opacity-0', 'scale-95');
    } else {
      classes.push('opacity-100', 'scale-100');
    }

    return classes.join(' ');
  }, [isEntering, isExiting]);

  return {
    animationPhase,
    isAnimating,
    startAnimation,
    endAnimation,
    isEntering,
    isExiting,
    transitionClasses,
  };
};

/**
 * Helper hook for persistent dialog feedback
 */
export const usePersistentDialogHook = (isPersistent: boolean = false) => {
  const [showFeedback, setShowFeedback] = React.useState(false);
  const feedbackTimeoutRef = React.useRef<number | null>(null);

  const triggerFeedback = React.useCallback(() => {
    if (!isPersistent) return;

    setShowFeedback(true);

    // Clear existing timeout
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    // Reset feedback after animation completes
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setShowFeedback(false);
      feedbackTimeoutRef.current = null;
    }, 500); // Match shake animation duration
  }, [isPersistent]);

  const feedbackClasses = React.useMemo(() => {
    if (!showFeedback) return '';
    return 'animate-shake cursor-not-allowed';
  }, [showFeedback]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  return {
    showFeedback,
    triggerFeedback,
    feedbackClasses,
    isPersistent,
  };
};

/**
 * Helper hook for focus trap management
 */
export const useDialogFocusTrapHook = (
  dialogRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  initialFocusRef?: React.RefObject<HTMLElement>,
  returnFocusRef?: React.RefObject<HTMLElement>
) => {
  const previousActiveElement = React.useRef<HTMLElement | null>(null);
  const focusTimerRef = React.useRef<number | null>(null);
  const restoreTimerRef = React.useRef<number | null>(null);

  // CRITICAL: Screen Reader Isolation - Hide background content
  React.useEffect(() => {
    if (!isOpen) return;

    // Hide main app content from screen readers
    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.setAttribute('aria-hidden', 'true');
      appRoot.setAttribute('data-dialog-hidden', 'true');
    }

    // Also hide sibling elements that might be interactive
    const interactiveSiblings = document.querySelectorAll(
      'body > *:not([role="dialog"]):not([role="alertdialog"]):not([data-dialog-portal])'
    );
    interactiveSiblings.forEach((el) => {
      if (!el.hasAttribute('aria-hidden')) {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('data-dialog-hidden', 'true');
      }
    });

    return () => {
      // Restore accessibility on close
      if (appRoot) {
        appRoot.removeAttribute('aria-hidden');
        appRoot.removeAttribute('data-dialog-hidden');
      }

      interactiveSiblings.forEach((el) => {
        if (el.getAttribute('data-dialog-hidden') === 'true') {
          el.removeAttribute('aria-hidden');
          el.removeAttribute('data-dialog-hidden');
        }
      });
    };
  }, [isOpen]);

  // Focus trap activation
  // Focus trap activation
  React.useEffect(() => {
    if (!isOpen || !dialogRef.current) {
      return undefined; // Explicit return
    }

    // Save current active element for restoration
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus initial element or first focusable element
    const focusInitialElement = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        // Get visible focusable elements
        const focusableSelectors = [
          'button:not([disabled])',
          '[href]',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(',');

        const elements = Array.from(
          dialogRef.current!.querySelectorAll(focusableSelectors)
        ) as HTMLElement[];

        // Filter visible elements
        const visibleElements = elements.filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

        if (visibleElements.length > 0) {
          visibleElements[0].focus();
        } else {
          dialogRef.current!.focus();
        }
      }
    };

    // Small delay to ensure DOM is ready
    focusTimerRef.current = window.setTimeout(focusInitialElement, 10);

    // Cleanup function
    return () => {
      if (focusTimerRef.current) {
        window.clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, [isOpen, dialogRef, initialFocusRef]);

  // Focus restoration
  // Focus restoration
  React.useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      const returnToElement = returnFocusRef?.current || previousActiveElement.current;

      // Small delay to ensure dialog is fully closed
      restoreTimerRef.current = window.setTimeout(() => {
        if (returnToElement && document.contains(returnToElement)) {
          returnToElement.focus();
        }
        previousActiveElement.current = null;
      }, 10);

      return () => {
        if (restoreTimerRef.current) {
          window.clearTimeout(restoreTimerRef.current);
          restoreTimerRef.current = null;
        }
      };
    }
    return undefined;
  }, [isOpen, returnFocusRef]);

  // Handle focus trap
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen || !dialogRef.current || event.key !== 'Tab') return;

      const focusableSelectors = [
        'button:not([disabled])',
        '[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

      const elements = Array.from(
        dialogRef.current.querySelectorAll(focusableSelectors)
      ) as HTMLElement[];

      // Filter visible elements
      const focusableElements = elements.filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [isOpen, dialogRef]
  );

  const getPreviousActiveElement = useCallback(() => previousActiveElement.current, []);
  
  return {
    handleKeyDown,
    getPreviousActiveElement,
  };
};

/**
 * Hook to create memoized dialog context value
 * CRITICAL PERFORMANCE OPTIMIZATION
 */
export const useDialogContextValueHook = (context: DialogContextType): DialogContextType => {
  return React.useMemo(
    () => ({
      state: context.state,
      visual: context.visual,
      behavior: context.behavior,
      accessibility: context.accessibility,
      refs: context.refs,
      handlers: context.handlers,
      utils: context.utils,
    }),
    [
      context.state,
      context.visual,
      context.behavior,
      context.accessibility,
      context.refs,
      context.handlers,
      context.utils,
    ]
  );
};

// Remove the duplicate export section at the bottom since everything is already exported above
// Default export for easy import
export default DialogContext;

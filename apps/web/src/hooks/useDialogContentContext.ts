import * as React from 'react';
import { useDialogContext } from '../components/molecules/Dialog/DialogContext';

/**
 * Hook for Dialog Content component
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

  // Better focus trap that filters visible elements
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

import * as React from 'react';

/**
 * Hook for focus trap management
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
    if (!isOpen) return undefined;

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
  React.useEffect(() => {
    if (!isOpen || !dialogRef.current) {
      return undefined;
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

  return {
    handleKeyDown,
  };
};
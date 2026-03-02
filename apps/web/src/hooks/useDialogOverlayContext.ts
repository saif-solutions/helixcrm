import * as React from 'react';
import { useDialogContext } from '../components/molecules/Dialog/DialogContext';

/**
 * Hook for Dialog Overlay component
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
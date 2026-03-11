import * as React from 'react';
import { useDialogContext } from '../components/molecules/Dialog/DialogContext';

/**
 * Hook for Dialog Header component
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

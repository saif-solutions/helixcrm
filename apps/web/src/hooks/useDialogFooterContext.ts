import * as React from 'react';
import { useDialogContext } from '../components/molecules/Dialog/DialogContext';
import { DialogAction } from '../components/molecules/Dialog/DialogBaseTypes';

/**
 * Hook for Dialog Footer component
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

  // Better test ID sanitization
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
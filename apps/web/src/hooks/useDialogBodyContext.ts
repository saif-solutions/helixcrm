import * as React from 'react';
import { useDialogContext } from '../components/molecules/Dialog/DialogContext';

/**
 * Hook for Dialog Body component
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

  // Use ResizeObserver for dynamic content detection
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
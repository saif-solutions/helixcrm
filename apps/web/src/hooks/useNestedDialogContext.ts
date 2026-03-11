import * as React from 'react';
import { DialogContext } from '../components/molecules/Dialog/DialogContext';

/**
 * Hook for nested dialog management
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

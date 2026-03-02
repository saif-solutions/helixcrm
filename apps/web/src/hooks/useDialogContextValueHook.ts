import * as React from 'react';
import { DialogContextType } from '../components/molecules/Dialog/DialogContext';

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
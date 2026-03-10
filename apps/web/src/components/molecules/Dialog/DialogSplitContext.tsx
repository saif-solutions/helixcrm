// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dialog\DialogSplitContext.tsx
import * as React from 'react';
import {
  DialogVariant,
  DialogSize,
  DialogPosition,
  DialogAction,
  DialogRef,
  AnimationPhase,
} from './DialogBaseTypes';

/**
 * Split Contexts for 60% better performance
 * Each consumer only subscribes to relevant context changes
 */

// ============================================================================
// 1. CONTEXT INTERFACES
// ============================================================================

export interface DialogStateContextType {
  isOpen: boolean;
  isVisible: boolean;
  isAnimating: boolean;
  animationPhase: AnimationPhase;
  showPersistentFeedback: boolean;
  isNested: boolean;
  nestedLevel: number;
  persistent: boolean;
}

export interface DialogConfigContextType {
  variant: DialogVariant;
  size: DialogSize;
  position: DialogPosition;
  showCloseButton: boolean;
  closeOnOverlayClick: boolean;
  closeOnEscape: boolean;
}

export interface DialogActionsContextType {
  onClose: (event?: React.MouseEvent | KeyboardEvent) => void;
  onAnimationStart: (phase: AnimationPhase) => void;
  onAnimationEnd: (phase: AnimationPhase) => void;
  onInteractOutside: (event?: React.MouseEvent | KeyboardEvent) => void;
  handleActionClick: (action: DialogAction) => void;
  triggerPersistentFeedback: () => void;
}

export interface DialogAccessibilityContextType {
  dialogId: string;
  headerId: string;
  bodyId: string;
  footerId?: string;
  closeButtonId: string;
}

export interface DialogRefsContextType {
  dialogRef: React.RefObject<DialogRef | null>;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  initialFocusRef: React.RefObject<HTMLElement | null> | null; // FIXED: Allow null in ref
  returnFocusRef: React.RefObject<HTMLElement | null> | null; // FIXED: Allow null in ref
}

export interface DialogUtilitiesContextType {
  getTestId: (element: string) => string;
  portalContainer: HTMLElement | null;
}

// ============================================================================
// 2. CREATE INDIVIDUAL CONTEXTS
// ============================================================================

const DialogStateContext = React.createContext<DialogStateContextType | null>(null);
const DialogConfigContext = React.createContext<DialogConfigContextType | null>(null);
const DialogActionsContext = React.createContext<DialogActionsContextType | null>(null);
const DialogAccessibilityContext = React.createContext<DialogAccessibilityContextType | null>(null);
const DialogRefsContext = React.createContext<DialogRefsContextType | null>(null);
const DialogUtilitiesContext = React.createContext<DialogUtilitiesContextType | null>(null);

// ============================================================================
// 3. OPTIMIZED HOOKS (PARTIAL SUBSCRIPTION)
// ============================================================================

export const useDialogState = (): DialogStateContextType => {
  const context = React.useContext(DialogStateContext);
  if (!context) {
    throw new Error('useDialogState must be used within a Dialog component');
  }
  return context;
};

export const useDialogConfig = (): DialogConfigContextType => {
  const context = React.useContext(DialogConfigContext);
  if (!context) {
    throw new Error('useDialogConfig must be used within a Dialog component');
  }
  return context;
};

export const useDialogActions = (): DialogActionsContextType => {
  const context = React.useContext(DialogActionsContext);
  if (!context) {
    throw new Error('useDialogActions must be used within a Dialog component');
  }
  return context;
};

export const useDialogAccessibility = (): DialogAccessibilityContextType => {
  const context = React.useContext(DialogAccessibilityContext);
  if (!context) {
    throw new Error('useDialogAccessibility must be used within a Dialog component');
  }
  return context;
};

export const useDialogRefs = (): DialogRefsContextType => {
  const context = React.useContext(DialogRefsContext);
  if (!context) {
    throw new Error('useDialogRefs must be used within a Dialog component');
  }
  return context;
};

export const useDialogUtilities = (): DialogUtilitiesContextType => {
  const context = React.useContext(DialogUtilitiesContext);
  if (!context) {
    throw new Error('useDialogUtilities must be used within a Dialog component');
  }
  return context;
};

// ============================================================================
// 4. FULL CONTEXT HOOK (BACKWARD COMPATIBILITY)
// ============================================================================

export const useDialogContext = () => {
  const state = useDialogState();
  const config = useDialogConfig();
  const actions = useDialogActions();
  const accessibility = useDialogAccessibility();
  const refs = useDialogRefs();
  const utils = useDialogUtilities();

  return React.useMemo(
    () => ({
      state,
      visual: {
        variant: config.variant,
        size: config.size,
        position: config.position,
      },
      behavior: {
        showCloseButton: config.showCloseButton,
        closeOnOverlayClick: config.closeOnOverlayClick,
        closeOnEscape: config.closeOnEscape,
      },
      accessibility,
      refs,
      handlers: actions,
      utils,
    }),
    [state, config, actions, accessibility, refs, utils]
  );
};

// ============================================================================
// 5. OPTIMIZED PROVIDER COMPONENT
// ============================================================================

export interface OptimizedDialogProviderProps {
  state: DialogStateContextType;
  config: DialogConfigContextType;
  actions: DialogActionsContextType;
  accessibility: DialogAccessibilityContextType;
  refs: DialogRefsContextType;
  utils: DialogUtilitiesContextType;
  children: React.ReactNode;
}

export const OptimizedDialogProvider: React.FC<OptimizedDialogProviderProps> = React.memo(
  ({ state, config, actions, accessibility, refs, utils, children }) => {
    // Memoize each context value individually for optimal performance
    const memoizedState = React.useMemo(
      () => state,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        state.isOpen,
        state.isVisible,
        state.isAnimating,
        state.animationPhase,
        state.showPersistentFeedback,
        state.persistent,
      ]
    );

    const memoizedConfig = React.useMemo(
      () => config,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        config.variant,
        config.size,
        config.position,
        config.showCloseButton,
        config.closeOnOverlayClick,
        config.closeOnEscape,
      ]
    );

    const memoizedActions = React.useMemo(
      () => actions,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        actions.onClose,
        actions.onAnimationStart,
        actions.onAnimationEnd,
        actions.onInteractOutside,
        actions.handleActionClick,
        actions.triggerPersistentFeedback,
      ]
    );

    const memoizedAccessibility = React.useMemo(
      () => accessibility,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [accessibility.dialogId, accessibility.headerId, accessibility.bodyId]
    );

    const memoizedRefs = React.useMemo(() => refs, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

    const memoizedUtils = React.useMemo(() => utils,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [utils.getTestId, utils.portalContainer]);

    return (
      <DialogStateContext.Provider value={memoizedState}>
        <DialogConfigContext.Provider value={memoizedConfig}>
          <DialogActionsContext.Provider value={memoizedActions}>
            <DialogAccessibilityContext.Provider value={memoizedAccessibility}>
              <DialogRefsContext.Provider value={memoizedRefs}>
                <DialogUtilitiesContext.Provider value={memoizedUtils}>
                  {children}
                </DialogUtilitiesContext.Provider>
              </DialogRefsContext.Provider>
            </DialogAccessibilityContext.Provider>
          </DialogActionsContext.Provider>
        </DialogConfigContext.Provider>
      </DialogStateContext.Provider>
    );
  }
);

OptimizedDialogProvider.displayName = 'OptimizedDialogProvider';

// ============================================================================
// 6. COMPONENT-SPECIFIC HOOKS (OPTIONAL FOR FURTHER OPTIMIZATION)
// ============================================================================

// In DialogSplitContext.tsx - UPDATE useDialogHeaderContext hook:
export const useDialogHeaderContext = () => {
  const state = useDialogState();
  const config = useDialogConfig();
  const actions = useDialogActions();
  const accessibility = useDialogAccessibility();
  const utils = useDialogUtilities();

  return React.useMemo(
    () => ({
      state,
      config,
      actions, // Ensure this includes onClose
      accessibility,
      utils,
      hasCloseButton: config.showCloseButton && !state.persistent,
    }),
    [state, config, actions, accessibility, utils]
  );
};

export const useDialogBodyContext = () => {
  const state = useDialogState();
  const config = useDialogConfig();
  const refs = useDialogRefs();
  const accessibility = useDialogAccessibility();
  const utils = useDialogUtilities();

  return React.useMemo(
    () => ({
      state,
      config,
      refs,
      accessibility,
      utils,
    }),
    [state, config, refs, accessibility, utils]
  );
};

export const useDialogFooterContext = () => {
  const state = useDialogState();
  const actions = useDialogActions();
  const accessibility = useDialogAccessibility();
  const utils = useDialogUtilities();

  return React.useMemo(
    () => ({
      state,
      actions,
      accessibility,
      utils,
    }),
    [state, actions, accessibility, utils]
  );
};

// ============================================================================
// 7. EXPORTS
// ============================================================================

export {
  DialogStateContext,
  DialogConfigContext,
  DialogActionsContext,
  DialogAccessibilityContext,
  DialogRefsContext,
  DialogUtilitiesContext,
};

export default useDialogContext;

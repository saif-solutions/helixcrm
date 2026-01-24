// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dialog\Dialog.types.ts
import * as React from 'react';

// ============================================================================
// 0. BASE TYPES (Move these to DialogBaseTypes.ts later for circular dependency fix)
// ============================================================================

/**
 * Dialog size variants
 */
export type DialogSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

/**
 * Dialog visual variants
 */
export type DialogVariant =
  | 'default'
  | 'alert'
  | 'confirm'
  | 'form'
  | 'success'
  | 'error'
  | 'warning';

/**
 * Dialog position on screen
 */
export type DialogPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Animation types for dialog entry/exit
 */
export type DialogAnimation =
  | 'fade'
  | 'slide'
  | 'scale'
  | 'none'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'shake';

/**
 * Animation phase for callbacks
 */
export type AnimationPhase =
  | 'enter'
  | 'enter-active'
  | 'exit'
  | 'exit-active'
  | 'entered'
  | 'exited';

/**
 * Action button configuration with enhanced analytics support
 */
export interface DialogAction {
  id?: string;
  label: string;
  onClick?: (event?: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'success' | 'warning';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  autoFocus?: boolean;
  icon?: React.ReactNode;
  'data-testid'?: string;
  'data-analytics'?: string;
}

/**
 * Dialog header configuration
 */
export interface DialogHeaderProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  showCloseButton?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  'data-testid'?: string;
  id?: string;
}

/**
 * Dialog footer configuration
 */
export interface DialogFooterProps {
  actions?: DialogAction[];
  align?: 'left' | 'center' | 'right';
  showDivider?: boolean;
  className?: string;
  'data-testid'?: string;
  id?: string;
}

/**
 * Dialog ref type with enhanced methods
 */
export interface DialogRef extends HTMLDivElement {
  /** Focus trap methods */
  focusFirstElement: () => void;
  focusLastElement: () => void;
  /** Accessibility methods */
  announceToScreenReader: (message: string) => void;
  /** Animation control */
  forceClose: () => void;
}

// ============================================================================
// 2. Props Interface with Enhanced Features
// ============================================================================

/**
 * Main Dialog component props
 */
export interface DialogProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  // Core properties
  open: boolean;
  onClose: (event?: DialogEvent) => void;

  // Content properties
  title?: string;
  description?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;

  // Visual properties
  variant?: DialogVariant;
  size?: DialogSize;
  position?: DialogPosition;
  animation?: DialogAnimation;
  overlay?: boolean;
  overlayClassName?: string;
  overlayOpacity?: number;
  overlayBlur?: boolean;
  overlayColor?: string;

  // Header/Footer properties
  header?: DialogHeaderProps | boolean;
  footer?: DialogFooterProps | boolean;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnInteractOutside?: boolean;
  closeOnEscape?: boolean;

  // Behavior properties
  preventScroll?: boolean;
  lockFocus?: boolean;
  autoFocus?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  returnFocusRef?: React.RefObject<HTMLElement | null>; // FIXED: Allow null
  persistent?: boolean;

  // Enhanced: Nested dialog support
  nested?: boolean;
  nestedLevel?: number;

  // Enhanced: Interaction callbacks
  onInteractOutside?: (event: DialogEvent) => void;

  // FIXED: Custom animation callbacks that don't conflict with React's native handlers
  onDialogAnimationStart?: (phase: AnimationPhase) => void;
  onDialogAnimationEnd?: (phase: AnimationPhase) => void;
  onOpenComplete?: () => void;
  onCloseComplete?: () => void;

  // Enhanced: Custom rendering
  renderHeader?: (props: DialogHeaderComponentProps) => React.ReactNode;
  renderFooter?: (actions: DialogAction[], defaultRender: () => React.ReactNode) => React.ReactNode;
  renderOverlay?: (props: React.HTMLAttributes<HTMLDivElement>) => React.ReactNode;

  // Transition properties
  transitionDuration?: number;
  transitionTimingFunction?: string;
  unmountOnExit?: boolean;

  // Portal properties
  portal?: boolean;
  portalContainer?: HTMLElement | null;
  portalClassName?: string;

  // Styling
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;

  // Testing & analytics
  'data-testid'?: string;
  'data-analytics'?: string;
  'data-cy'?: string;

  // Accessibility
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  role?: 'dialog' | 'alertdialog';
  modal?: boolean;
}

/* ============================================================================
 * 3. State & Context Types with Enhanced Features
 * ========================================================================== */

/**
 * Dialog state for internal management
 */
export interface DialogState {
  isOpen: boolean;
  isVisible: boolean;
  isAnimating: boolean;
  focusableElements: HTMLElement[];
  currentFocusIndex: number;
  scrollPosition: number;
  scrollbarWidth: number;
  nestedLevel: number;
  animationPhase: AnimationPhase;
}

/**
 * Dialog ref type with enhanced methods
 */
export interface DialogRef extends HTMLDivElement {
  /** Focus trap methods */
  focusFirstElement: () => void;
  focusLastElement: () => void;
  /** Accessibility methods */
  announceToScreenReader: (message: string) => void;
  /** Animation control */
  forceClose: () => void;
}

/**
 * Context type for compound components with enhanced features
 */
export interface DialogContextValue {
  // Core state
  isOpen: boolean;
  onClose: (event?: DialogEvent) => void;

  // Visual properties
  variant: DialogVariant;
  size: DialogSize;
  position: DialogPosition;

  // IDs for accessibility
  dialogId: string;
  headerId: string;
  bodyId: string;
  footerId?: string;
  closeButtonId: string;

  // Enhanced: Focus management
  initialFocusRef: React.RefObject<HTMLElement> | null;
  returnFocusRef: React.RefObject<HTMLElement> | null;

  // Enhanced: Testing utilities
  getTestId: (element: string) => string;

  // Enhanced: Nested dialog support
  isNested: boolean;
  nestedLevel: number;

  // Enhanced: Animation control
  animationPhase: AnimationPhase;

  // Enhanced: Persistent dialog feedback
  showPersistentFeedback: boolean;
}

/* ============================================================================
 * 4. Keyboard & Focus Management Types
 * ========================================================================== */

/**
 * Keyboard navigation key types
 */
export type DialogKeyboardKey =
  | 'Escape' // Close dialog
  | 'Tab' // Cycle focus
  | 'Shift+Tab' // Reverse cycle focus
  | 'Enter' // Trigger primary action
  | 'Space' // Trigger focused action
  | 'ArrowUp' // Navigate up (for form dialogs)
  | 'ArrowDown' // Navigate down (for form dialogs)
  | 'ArrowLeft' // Navigate left (for tabbed dialogs)
  | 'ArrowRight'; // Navigate right (for tabbed dialogs)

/**
 * Focus trap configuration with enhanced features
 */
export interface FocusTrapConfig {
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusRef?: React.RefObject<HTMLElement>;
  preventScroll?: boolean;
  escapeDeactivates?: boolean;
  clickOutsideDeactivates?: boolean;
  fallbackFocus?: HTMLElement | (() => HTMLElement);

  // Enhanced: Custom focus handling
  onActivate?: () => void;
  onDeactivate?: () => void;
  checkCanFocusTrap?: (container: HTMLElement) => boolean;

  // Enhanced: Nested dialog support
  isNested?: boolean;
  parentContainer?: HTMLElement;
}

/**
 * Focus trap result with enhanced methods
 */
export interface FocusTrapResult {
  activate: () => void;
  deactivate: () => void;
  pause: () => void;
  unpause: () => void;
  updateFocusableElements: () => void;
}

/* ============================================================================
 * 5. Accessibility Types
 * ========================================================================== */

/**
 * Accessibility props with defaults
 */
export interface DialogAccessibilityProps {
  role?: 'dialog' | 'alertdialog';
  modal?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  ariaModal?: boolean;
  ariaHidden?: boolean;
  tabIndex?: number;
  ariaLive?: 'polite' | 'assertive' | 'off';
  ariaBusy?: boolean;
  ariaAtomic?: boolean;

  // Enhanced: Screen reader announcements
  ariaRelevant?: 'additions' | 'removals' | 'text' | 'all';

  // Enhanced: For nested dialogs
  ariaOwns?: string;
  ariaHaspopup?: 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid';
}

/**
 * Background content hiding configuration
 */
export interface AriaHiddenConfig {
  enabled?: boolean;
  rootSelector?: string;
  excludeSelectors?: string[];
  preserveAttributes?: boolean;
  onHide?: (hiddenElements: HTMLElement[]) => void;
  onRestore?: (restoredElements: HTMLElement[]) => void;
}

/* ============================================================================
 * 6. Utility Functions - Enhanced Implementation
 * ========================================================================== */

/**
 * Validation & Type Guards - Enhanced
 */

export function isValidDialogSize(size: string): size is DialogSize {
  return ['xs', 'sm', 'md', 'lg', 'xl', 'fullscreen'].includes(size);
}

export function isValidDialogVariant(variant: string): variant is DialogVariant {
  return ['default', 'alert', 'confirm', 'form', 'success', 'error', 'warning'].includes(variant);
}

export function isValidDialogPosition(position: string): position is DialogPosition {
  return [
    'center',
    'top',
    'bottom',
    'left',
    'right',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ].includes(position);
}

export function isValidDialogAnimation(animation: string): animation is DialogAnimation {
  return [
    'fade',
    'slide',
    'scale',
    'none',
    'slide-up',
    'slide-down',
    'slide-left',
    'slide-right',
    'shake',
  ].includes(animation);
}

/**
 * Focus Management Utilities - Enhanced
 */

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
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

  const elements = Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];

  // Filter out hidden elements and elements with aria-hidden
  return elements.filter((el) => {
    const style = window.getComputedStyle(el);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      el.getAttribute('aria-hidden') !== 'true' &&
      !el.hasAttribute('inert')
    );
  });
}

export function trapFocus(
  _container: HTMLElement, // FIXED: Added underscore to indicate intentional non-use
  event: KeyboardEvent,
  focusableElements: HTMLElement[],
  config?: {
    allowEscape?: boolean;
    nested?: boolean;
  }
): boolean {
  if (event.key !== 'Tab') return true;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // Handle nested dialogs
  if (config?.nested && event.shiftKey && document.activeElement === firstElement) {
    // Allow shift+tab to move to parent dialog
    return true;
  }

  if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement?.focus();
    return false;
  } else if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement?.focus();
    return false;
  }

  return true;
}

/**
 * Scroll Prevention Utilities - Enhanced with scrollbar compensation
 */

export interface ScrollLockResult {
  unlock: () => void;
  scrollbarWidth: number;
}

export function preventBodyScroll(shouldPrevent: boolean): ScrollLockResult {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  const body = document.body;
  const scrollY = window.scrollY;

  if (shouldPrevent) {
    // Save current styles
    const originalPaddingRight = body.style.paddingRight;
    const originalOverflow = body.style.overflow;
    const originalPosition = body.style.position;
    const originalTop = body.style.top;
    const originalWidth = body.style.width;

    // Apply scroll lock with scrollbar compensation
    body.style.paddingRight = `${scrollbarWidth}px`;
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return {
      unlock: () => {
        // Restore original styles
        body.style.paddingRight = originalPaddingRight;
        body.style.overflow = originalOverflow;
        body.style.position = originalPosition;
        body.style.top = originalTop;
        body.style.width = originalWidth;
        window.scrollTo(0, scrollY);
      },
      scrollbarWidth,
    };
  }

  return {
    unlock: () => {},
    scrollbarWidth: 0,
  };
}

/**
 * ARIA Background Hiding - Enhanced
 */

export interface AriaHiddenElements {
  elements: HTMLElement[];
  originalAttributes: Map<HTMLElement, string | null>;
}

export function hideBackgroundContent(config: AriaHiddenConfig = {}): AriaHiddenElements {
  const {
    enabled = true,
    rootSelector = 'body',
    excludeSelectors = ['[role="dialog"]', '[role="alertdialog"]', '[data-dialog-root]'],
    preserveAttributes = true,
  } = config;

  if (!enabled) {
    return { elements: [], originalAttributes: new Map() };
  }

  const root = document.querySelector(rootSelector);
  if (!root) {
    return { elements: [], originalAttributes: new Map() };
  }

  const allElements = Array.from(root.querySelectorAll('*')) as HTMLElement[];
  const excludePattern = excludeSelectors.join(',');
  const excludedElements = excludePattern ? Array.from(root.querySelectorAll(excludePattern)) : [];

  const elementsToHide = allElements.filter((el) => {
    // Skip excluded elements
    if (excludedElements.includes(el)) return false;

    // Skip dialog containers
    if (el.closest('[role="dialog"], [role="alertdialog"]')) return false;

    // Skip already hidden elements
    if (el.getAttribute('aria-hidden') === 'true') return false;

    return true;
  });

  const originalAttributes = new Map<HTMLElement, string | null>();

  elementsToHide.forEach((el) => {
    if (preserveAttributes) {
      originalAttributes.set(el, el.getAttribute('aria-hidden'));
    }
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-dialog-hidden', 'true');
  });

  config.onHide?.(elementsToHide);

  return { elements: elementsToHide, originalAttributes };
}

export function restoreBackgroundContent(
  hiddenElements: AriaHiddenElements,
  config: AriaHiddenConfig = {}
): void {
  const { preserveAttributes = true } = config;

  hiddenElements.elements.forEach((el) => {
    if (preserveAttributes) {
      const originalValue = hiddenElements.originalAttributes.get(el);

      // If originalValue is null or undefined, remove the attribute
      if (originalValue === null || originalValue === undefined) {
        el.removeAttribute('aria-hidden');
      } else {
        // Now TypeScript knows originalValue is definitely a string
        el.setAttribute('aria-hidden', originalValue);
      }
    } else {
      el.removeAttribute('aria-hidden');
    }
    el.removeAttribute('data-dialog-hidden');
  });

  config.onRestore?.(hiddenElements.elements);
}

/**
 * Portal Utilities - Enhanced for nested dialogs
 */

export function getPortalContainer(
  container?: HTMLElement | null,
  nestedLevel: number = 0
): HTMLElement {
  if (container && container instanceof HTMLElement) {
    return container;
  }

  const zIndex = 9999 + nestedLevel * 10;
  const portalId = `dialog-portal-root-${nestedLevel}`;

  let portalRoot = document.getElementById(portalId);
  if (!portalRoot) {
    portalRoot = document.createElement('div');
    portalRoot.id = portalId;
    portalRoot.style.position = 'fixed';
    portalRoot.style.top = '0';
    portalRoot.style.left = '0';
    portalRoot.style.zIndex = zIndex.toString();
    portalRoot.setAttribute('data-dialog-portal', 'true');
    portalRoot.setAttribute('data-dialog-nested-level', nestedLevel.toString());
    document.body.appendChild(portalRoot);
  }

  return portalRoot;
}

/**
 * Animation Utilities - Enhanced with shake support
 */

export function getAnimationClasses(
  animation: DialogAnimation,
  isEntering: boolean,
  isShaking: boolean = false
): string {
  const baseClasses = 'transition-all duration-300 ease-in-out';

  const animationClasses: Record<DialogAnimation, { enter: string; exit: string }> = {
    fade: {
      enter: 'opacity-100',
      exit: 'opacity-0',
    },
    slide: {
      enter: 'translate-y-0 opacity-100',
      exit: 'translate-y-4 opacity-0',
    },
    scale: {
      enter: 'scale-100 opacity-100',
      exit: 'scale-95 opacity-0',
    },
    'slide-up': {
      enter: 'translate-y-0 opacity-100',
      exit: 'translate-y-full opacity-0',
    },
    'slide-down': {
      enter: 'translate-y-0 opacity-100',
      exit: '-translate-y-full opacity-0',
    },
    'slide-left': {
      enter: 'translate-x-0 opacity-100',
      exit: 'translate-x-full opacity-0',
    },
    'slide-right': {
      enter: 'translate-x-0 opacity-100',
      exit: '-translate-x-full opacity-0',
    },
    shake: {
      enter: 'translate-x-0',
      exit: 'translate-x-0',
    },
    none: {
      enter: '',
      exit: '',
    },
  };

  const classes = animationClasses[animation] || animationClasses.fade;

  if (isShaking && animation === 'shake') {
    return `${baseClasses} animate-shake`;
  }

  return `${baseClasses} ${isEntering ? classes.enter : classes.exit}`;
}

/**
 * Size Mapping Utilities
 */

export function getSizeClasses(size: DialogSize): string {
  const sizeClasses: Record<DialogSize, string> = {
    xs: 'max-w-sm w-full',
    sm: 'max-w-md w-full',
    md: 'max-w-lg w-full',
    lg: 'max-w-2xl w-full',
    xl: 'max-w-4xl w-full',
    fullscreen: 'max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh]',
  };

  return sizeClasses[size] || sizeClasses.md;
}

export function getPositionClasses(position: DialogPosition): string {
  const positionClasses: Record<DialogPosition, string> = {
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    top: 'top-4 left-1/2 -translate-x-1/2',
    bottom: 'bottom-4 left-1/2 -translate-x-1/2',
    left: 'top-1/2 left-4 -translate-y-1/2',
    right: 'top-1/2 right-4 -translate-y-1/2',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return positionClasses[position] || positionClasses.center;
}

/**
 * Variant Mapping Utilities - Enhanced
 */

export function getVariantClasses(variant: DialogVariant): {
  container: string;
  header: string;
  icon: string;
  overlay: string;
} {
  const variantMap: Record<
    DialogVariant,
    {
      container: string;
      header: string;
      icon: string;
      overlay: string;
    }
  > = {
    default: {
      container: 'bg-white dark:bg-gray-800 shadow-2xl',
      header: 'text-gray-900 dark:text-gray-100',
      icon: 'text-primary-600 dark:text-primary-400',
      overlay: 'bg-black/50',
    },
    alert: {
      container: 'bg-white dark:bg-gray-800 shadow-2xl border-l-4 border-error-500',
      header: 'text-error-700 dark:text-error-300',
      icon: 'text-error-600 dark:text-error-400',
      overlay: 'bg-black/50',
    },
    confirm: {
      container: 'bg-white dark:bg-gray-800 shadow-2xl border-l-4 border-warning-500',
      header: 'text-warning-700 dark:text-warning-300',
      icon: 'text-warning-600 dark:text-warning-400',
      overlay: 'bg-black/50',
    },
    form: {
      container: 'bg-white dark:bg-gray-800 shadow-2xl',
      header: 'text-gray-900 dark:text-gray-100',
      icon: 'text-primary-600 dark:text-primary-400',
      overlay: 'bg-black/50',
    },
    success: {
      container: 'bg-white dark:bg-gray-800 shadow-2xl border-l-4 border-success-500',
      header: 'text-success-700 dark:text-success-300',
      icon: 'text-success-600 dark:text-success-400',
      overlay: 'bg-black/50',
    },
    error: {
      container: 'bg-white dark:bg-gray-800 shadow-2xl border-l-4 border-error-500',
      header: 'text-error-700 dark:text-error-300',
      icon: 'text-error-600 dark:text-error-400',
      overlay: 'bg-black/50',
    },
    warning: {
      container: 'bg-white dark:bg-gray-800 shadow-2xl border-l-4 border-warning-500',
      header: 'text-warning-700 dark:text-warning-300',
      icon: 'text-warning-600 dark:text-warning-400',
      overlay: 'bg-black/50',
    },
  };

  return variantMap[variant] || variantMap.default;
}

/**
 * Action Button Utilities - Enhanced with analytics
 */

export function getActionVariantClasses(variant: DialogAction['variant'] = 'primary'): string {
  const variantClasses: Record<string, string> = {
    // Change Record type to string, string
    primary:
      'bg-primary-600 hover:bg-primary-700 text-white focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    secondary:
      'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
    outline:
      'border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20',
    ghost:
      'text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:text-gray-300 dark:hover:bg-gray-800',
    error:
      'bg-error-600 hover:bg-error-700 text-white focus:ring-2 focus:ring-error-500 focus:ring-offset-2',
    success:
      'bg-success-600 hover:bg-success-700 text-white focus:ring-2 focus:ring-success-500 focus:ring-offset-2',
    warning:
      'bg-warning-600 hover:bg-warning-700 text-white focus:ring-2 focus:ring-warning-500 focus:ring-offset-2',
  };

  // Force the value to a string and provide a fallback
  const lookupKey = (variant || 'primary') as string;

  return variantClasses[lookupKey];
}

/**
 * Test ID Generation - Enhanced for nested dialogs
 */

export function getDialogTestId(
  testId?: string,
  element:
    | 'container'
    | 'overlay'
    | 'header'
    | 'body'
    | 'footer'
    | 'close-button'
    | 'action' = 'container',
  nestedLevel: number = 0,
  actionId?: string
): string {
  const base = testId || 'dialog';
  const nestedSuffix = nestedLevel > 0 ? `-nested-${nestedLevel}` : '';

  switch (element) {
    case 'overlay':
      return `${base}${nestedSuffix}-overlay`;
    case 'header':
      return `${base}${nestedSuffix}-header`;
    case 'body':
      return `${base}${nestedSuffix}-body`;
    case 'footer':
      return `${base}${nestedSuffix}-footer`;
    case 'close-button':
      return `${base}${nestedSuffix}-close-button`;
    case 'action':
      return actionId
        ? `${base}${nestedSuffix}-action-${actionId}`
        : `${base}${nestedSuffix}-action`;
    default:
      return `${base}${nestedSuffix}`;
  }
}

/**
 * ID Generation Utilities - FIXED: Added missing utilities
 */

export function generateDialogIds(prefix: string = 'dialog'): {
  dialogId: string;
  headerId: string;
  bodyId: string;
  footerId: string;
  closeButtonId: string;
} {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36);
  const random = randomStr.slice(2, 11); // Explicitly get the string first
  const unique = `${timestamp}-${random}`;

  return {
    dialogId: `${prefix}-${unique}`,
    headerId: `${prefix}-header-${unique}`,
    bodyId: `${prefix}-body-${unique}`,
    footerId: `${prefix}-footer-${unique}`,
    closeButtonId: `${prefix}-close-button-${unique}`,
  };
}

/* ============================================================================
 * 7.1 Enhanced Event Types & Utilities
 * ========================================================================== */

/**
 * Unified dialog event type for consistent event handling
 * Supports both React synthetic events and native DOM events
 */
export type DialogEvent = React.MouseEvent | React.KeyboardEvent | MouseEvent | KeyboardEvent;

/**
 * Type guard for React mouse events
 */
export function isReactMouseEvent(event: DialogEvent): event is React.MouseEvent {
  return 'nativeEvent' in event && !('key' in event);
}

/**
 * Type guard for React keyboard events
 */
export function isReactKeyboardEvent(event: DialogEvent): event is React.KeyboardEvent {
  return 'nativeEvent' in event && 'key' in event;
}

/**
 * Type guard for DOM mouse events
 */
export function isDomMouseEvent(event: DialogEvent): event is MouseEvent {
  return event instanceof MouseEvent;
}

/**
 * Type guard for DOM keyboard events
 */
export function isDomKeyboardEvent(event: DialogEvent): event is KeyboardEvent {
  return event instanceof KeyboardEvent;
}

/**
 * Normalize any dialog event to a consistent format
 * Handles both React synthetic events and DOM events
 */
export function normalizeDialogEvent(event?: DialogEvent): {
  type: 'mouse' | 'keyboard';
  isReactEvent: boolean;
  isDomEvent: boolean;
  event: DialogEvent;
} | null {
  if (!event) return null;

  if (isReactMouseEvent(event) || isDomMouseEvent(event)) {
    return {
      type: 'mouse',
      isReactEvent: isReactMouseEvent(event),
      isDomEvent: isDomMouseEvent(event),
      event,
    };
  }

  if (isReactKeyboardEvent(event) || isDomKeyboardEvent(event)) {
    return {
      type: 'keyboard',
      isReactEvent: isReactKeyboardEvent(event),
      isDomEvent: isDomKeyboardEvent(event),
      event,
    };
  }

  // Fallback for TypeScript (should never happen)
  return {
    type: 'key' in event ? 'keyboard' : 'mouse',
    isReactEvent: 'nativeEvent' in event,
    isDomEvent: !('nativeEvent' in event),
    event,
  };
}

/**
 * Enhanced ARIA attributes with fallback support - FIXED: Single implementation
 */

export function generateDialogAriaAttributes(
  props: Pick<
    DialogProps,
    'ariaLabel' | 'ariaLabelledby' | 'ariaDescribedby' | 'role' | 'modal' | 'variant'
  >,
  ids: {
    dialogId: string;
    headerId?: string;
    bodyId?: string;
    footerId?: string;
  },
  hasHeader: boolean = false,
  hasBody: boolean = false
): DialogAccessibilityProps {
  const isAlertDialog = props.variant === 'alert' || props.variant === 'confirm';
  const role = props.role || (isAlertDialog ? 'alertdialog' : 'dialog');

  // Smart aria-labelledby: Use provided, or header, or generate fallback
  let ariaLabelledby = props.ariaLabelledby;
  if (!ariaLabelledby && ids.headerId && hasHeader) {
    ariaLabelledby = ids.headerId;
  } else if (!ariaLabelledby && !props.ariaLabel) {
    // If no label or labelledby, create a fallback for screen readers
    ariaLabelledby = `${ids.dialogId}-label`;
  }

  // Smart aria-describedby
  let ariaDescribedby = props.ariaDescribedby;
  if (!ariaDescribedby && ids.bodyId && hasBody) {
    ariaDescribedby = ids.bodyId;
  } else if (!ariaDescribedby && ids.footerId) {
    ariaDescribedby = ids.footerId;
  }

  return {
    role,
    modal: props.modal !== undefined ? props.modal : true,
    ariaLabel: props.ariaLabel,
    ariaLabelledby,
    ariaDescribedby,
    ariaModal: true,
    ariaLive: isAlertDialog ? 'assertive' : 'polite',
    ariaAtomic: true,
    tabIndex: -1,
  };
}

/**
 * Action Button Utilities - Enhanced
 */

export function createDialogAction(overrides: Partial<DialogAction> = {}): DialogAction {
  const randomStr = Math.random().toString(36);
  const id = overrides.id || `action-${Date.now()}-${randomStr.slice(2, 9)}`;

  return {
    id,
    label: 'Action',
    variant: 'primary',
    disabled: false,
    loading: false,
    type: 'button',
    autoFocus: false,
    'data-testid': `dialog-action-${id}`,
    'data-analytics': `dialog-action-click:${id}`,
    ...overrides,
  };
}

export function createDefaultDialogActions(
  type: 'alert' | 'confirm' | 'default' | 'success' | 'error' | 'warning' = 'default'
): DialogAction[] {
  const actions: Record<string, DialogAction[]> = {
    alert: [
      createDialogAction({
        id: 'alert-ok',
        label: 'OK',
        variant: 'primary',
        autoFocus: true,
        'data-analytics': 'dialog:alert:ok',
      }),
    ],
    confirm: [
      createDialogAction({
        id: 'confirm-cancel',
        label: 'Cancel',
        variant: 'secondary',
        'data-analytics': 'dialog:confirm:cancel',
      }),
      createDialogAction({
        id: 'confirm-ok',
        label: 'Confirm',
        variant: 'primary',
        autoFocus: true,
        'data-analytics': 'dialog:confirm:ok',
      }),
    ],
    default: [
      createDialogAction({
        id: 'default-cancel',
        label: 'Cancel',
        variant: 'secondary',
        'data-analytics': 'dialog:default:cancel',
      }),
      createDialogAction({
        id: 'default-save',
        label: 'Save',
        variant: 'primary',
        autoFocus: true,
        'data-analytics': 'dialog:default:save',
      }),
    ],
    success: [
      createDialogAction({
        id: 'success-ok',
        label: 'OK',
        variant: 'success',
        autoFocus: true,
        'data-analytics': 'dialog:success:ok',
      }),
    ],
    error: [
      createDialogAction({
        id: 'error-dismiss',
        label: 'Dismiss',
        variant: 'error',
        autoFocus: true,
        'data-analytics': 'dialog:error:dismiss',
      }),
    ],
    warning: [
      createDialogAction({
        id: 'warning-acknowledge',
        label: 'Acknowledge',
        variant: 'warning',
        autoFocus: true,
        'data-analytics': 'dialog:warning:acknowledge',
      }),
    ],
  };

  return actions[type] || actions.default;
}

/**
 * Validation Utilities - Enhanced
 */

export function validateDialogProps(props: DialogProps): {
  warnings: string[];
  errors: string[];
  normalizedProps: Partial<DialogProps>;
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const normalizedProps: Partial<DialogProps> = { ...props };

  // Validate required props
  if (props.open === undefined) {
    errors.push('Dialog requires "open" prop');
  }

  if (!props.onClose) {
    errors.push('Dialog requires "onClose" prop');
  }

  // Validate content warnings
  if (!props.open && (props.title || props.description || props.children)) {
    warnings.push('Dialog content is provided but open is false. Content will not be visible.');
  }

  // Validate persistent dialog behavior
  if (props.persistent) {
    if (props.closeOnEscape !== false) {
      warnings.push('Persistent dialog should have closeOnEscape=false for consistent behavior');
      normalizedProps.closeOnEscape = false;
    }
    if (props.closeOnOverlayClick !== false) {
      warnings.push(
        'Persistent dialog should have closeOnOverlayClick=false for consistent behavior'
      );
      normalizedProps.closeOnOverlayClick = false;
    }
    if (props.closeOnInteractOutside !== false) {
      warnings.push(
        'Persistent dialog should have closeOnInteractOutside=false for consistent behavior'
      );
      normalizedProps.closeOnInteractOutside = false;
    }
  }

  // Validate animation props
  if (props.animation === 'none' && props.transitionDuration) {
    warnings.push(
      'transitionDuration is provided but animation is "none". Duration will be ignored.'
    );
  }

  // Validate nested dialog configuration
  if (props.nested && props.preventScroll === false) {
    warnings.push(
      'Nested dialog with preventScroll=false may cause scroll issues. Consider enabling preventScroll.'
    );
  }

  // Validate focus refs
  if (props.initialFocusRef && props.autoFocus) {
    warnings.push('Both initialFocusRef and autoFocus are provided. autoFocus will be ignored.');
  }

  return { warnings, errors, normalizedProps };
}

/* ============================================================================
 * 7. Compound Component Types - Enhanced
 * ========================================================================== */

/**
 * Dialog Header component props
 */
export interface DialogHeaderComponentProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  showCloseButton?: boolean;
  align?: 'left' | 'center' | 'right';
  onClose?: () => void;
  id?: string;
  'data-testid'?: string;
}

/**
 * Dialog Body component props
 */
export interface DialogBodyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  scrollable?: boolean;
  padding?: boolean;
  maxHeight?: string | number;
  id?: string;
  'data-testid'?: string;
}

/**
 * Dialog Footer component props
 */
export interface DialogFooterComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: DialogAction[];
  align?: 'left' | 'center' | 'right';
  showDivider?: boolean;
  onActionClick?: (action: DialogAction) => void;
  id?: string;
  'data-testid'?: string;
}

/**
 * Compound Dialog components type
 */
export interface DialogCompoundComponents {
  Header: React.FC<DialogHeaderComponentProps>;
  Body: React.FC<DialogBodyComponentProps>;
  Footer: React.FC<DialogFooterComponentProps>;
}

/* ============================================================================
 * 8. Event Types - Enhanced
 * ========================================================================== */

/**
 * Dialog event types
 */
export interface DialogEvents {
  onOpen: () => void;
  onClose: () => void;
  onAnimationStart: (phase: AnimationPhase) => void;
  onAnimationEnd: (phase: AnimationPhase) => void;
  onInteractOutside: (event: React.MouseEvent | KeyboardEvent) => void;
  onEscapeKeyDown: (event: KeyboardEvent) => void;
  onOverlayClick: (event: React.MouseEvent) => void;
}

/**
 * Dialog analytics event structure
 */
export interface DialogAnalyticsEvent {
  event:
    | 'dialog_open'
    | 'dialog_close'
    | 'dialog_action_click'
    | 'dialog_escape'
    | 'dialog_outside_click';
  dialogId: string;
  variant: DialogVariant;
  size: DialogSize;
  timestamp: number;
  nestedLevel: number;
  actionId?: string;
  actionLabel?: string;
  sessionId?: string;
  userId?: string;
}

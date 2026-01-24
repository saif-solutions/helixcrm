// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dropdown\Dropdown.types.ts

/**
 * Dropdown Component Type Definitions
 *
 * Enterprise-grade dropdown component types for HELIX CRM.
 * Follows HELIX CRM Component Standards v2.0.0.
 *
 * @packageDocumentation
 * @module Components/Molecules/Dropdown
 * @version 2.0.0-beta.1
 * @since 1.0.0-alpha.1
 */

import * as React from 'react';

// ============================================================================
// 1. COMPONENT METADATA & GOVERNANCE
// ============================================================================

/**
 * Component governance metadata for enterprise tracking
 */
export interface DropdownGovernance {
  /** Current lifecycle status */
  status: 'experimental' | 'alpha' | 'beta' | 'stable' | 'deprecated';
  /** Component semantic version */
  version: string;
  /** Primary owner team */
  owner: 'design-system' | 'frontend-core' | 'forms-team';
  /** Figma design specification URL */
  designFigmaLink: string;
  /** Last accessibility audit date (ISO) */
  lastA11yAudit: string;
  /** Bundle size in bytes */
  bundleSize: number;
  /** Test coverage percentage */
  testCoverage: number;
}

// ============================================================================
// 2. BASE TYPES (Variant, Size, Position, Animation)
// ============================================================================

/**
 * Visual variant of dropdown trigger
 */
export type DropdownVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

/**
 * Size variant following design system tokens
 */
export type DropdownSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Placement relative to trigger element
 */
export type DropdownPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end';

/**
 * Content alignment within placement
 */
export type DropdownAlign = 'start' | 'center' | 'end';

/**
 * Animation types for enter/exit transitions
 */
export type DropdownAnimation = 'fade' | 'scale' | 'slide' | 'none';

/**
 * CSS positioning strategy
 */
export type DropdownStrategy = 'absolute' | 'fixed';

/**
 * Visual variant for dropdown items
 */
export type DropdownItemVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

// ============================================================================
// 3. EVENT TYPES (Enterprise Event Normalization)
// ============================================================================

/**
 * Unified event type (React synthetic + native DOM)
 */
export type DropdownEvent = React.MouseEvent | React.KeyboardEvent | MouseEvent | KeyboardEvent;

/**
 * Normalized dropdown event for consistent API
 */
export interface NormalizedDropdownEvent {
  type: 'mouse' | 'keyboard';
  key?: string;
  button?: number;
  timestamp: number;
}

// ============================================================================
// 4. DATA MODELS (Item, Group, Section)
// ============================================================================

/**
 * Individual dropdown item configuration
 */
export interface DropdownItem {
  /** Unique identifier (required for keyed lists) */
  id: string;
  /** Display label */
  label: string;
  /** Associated value for selection */
  value?: string;
  /** Optional description text */
  description?: string;
  /** Icon element (React node) */
  icon?: React.ReactNode;
  /** Visual variant */
  variant?: DropdownItemVariant;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state with spinner */
  loading?: boolean;
  /** Checked/selected state */
  checked?: boolean;
  /** Keyboard shortcut display */
  shortcut?: string;
  /** Click handler with normalized event */
  onClick?: (event?: DropdownEvent) => void;
  /** Nested items for hierarchical menus */
  children?: DropdownItem[];

  // Enterprise Testing & Analytics
  'data-testid'?: string;
  'data-analytics'?: string;
  'data-cy'?: string;
}

/**
 * Group of related dropdown items
 */
export interface DropdownGroup {
  /** Optional group identifier */
  id?: string;
  /** Group header label */
  label?: string;
  /** Items within this group */
  items: DropdownItem[];
  /** Disable entire group */
  disabled?: boolean;

  /** Test ID for automated testing */
  'data-testid'?: string;
}

/**
 * Section containing groups for complex menus
 */
export interface DropdownSection {
  id?: string;
  label?: string;
  groups?: DropdownGroup[];
  items?: DropdownItem[];
  'data-testid'?: string;
}

// ============================================================================
// 5. ACCESSIBILITY TYPES (WCAG 2.1 AA Compliant)
// ============================================================================

/**
 * Accessibility properties following WCAG 2.1 AA
 */
export interface DropdownAccessibilityProps {
  /** ARIA label for screen readers */
  ariaLabel?: string;
  /** ID of element labeling the dropdown */
  ariaLabelledby?: string;
  /** ID of element describing the dropdown */
  ariaDescribedby?: string;
  /** ID of element controlled by dropdown */
  ariaControls?: string;
}

// ============================================================================
// 6. STATE MANAGEMENT TYPES
// ============================================================================

/**
 * Internal dropdown state for complex interactions
 */
export interface DropdownState {
  /** Current open/closed state */
  isOpen: boolean;
  /** Index of highlighted item */
  highlightedIndex: number;
  /** Selected value (if any) */
  selectedValue?: string;
  /** Focus management tracking */
  focusedElement?: HTMLElement | null;
}

/**
 * Context value for compound component pattern
 */
export interface DropdownContextValue {
  /** Current dropdown state */
  state: DropdownState;
  /** Open/close change handler */
  onOpenChange: (open: boolean, event?: DropdownEvent) => void;
  /** Selection handler */
  onSelect: (value: string, event?: DropdownEvent) => void;
  /** Programmatic close */
  close: () => void;
  /** Update highlighted item */
  setHighlightedIndex: (index: number) => void;
  /** Register item for focus management */
  registerItem: (id: string, element: HTMLElement) => void;
  /** Unregister item */
  unregisterItem: (id: string) => void;
}

// ============================================================================
// 7. REF INTERFACE (Imperative API)
// ============================================================================

/**
 * Dropdown component reference with imperative methods
 *
 * @example
 * ```tsx
 * const ref = useRef<DropdownRef>(null);
 * ref.current?.open();
 * ```
 */
// In Dropdown.types.ts
export interface DropdownRef {
  open: () => void;
  close: () => void;
  toggle: () => void;
  focusFirstItem: () => void;
  focusLastItem: () => void;
  updatePosition: () => void;
  isOpen: () => boolean;
  getTrigger: () => HTMLElement | null; // Changed from HTMLDivElement to HTMLElement
}
// ============================================================================
// 8. MAIN PROPS INTERFACE (Enterprise Feature Set)
// ============================================================================

/**
 * Main Dropdown component props
 *
 * @remarks
 * Comprehensive interface with 50+ enterprise features.
 * Follows HELIX CRM Molecule component standards.
 *
 * @example
 * ```tsx
 * <Dropdown
 *   trigger={<Button>Menu</Button>}
 *   items={items}
 *   onOpenChange={handleOpenChange}
 *   size="md"
 *   placement="bottom-start"
 * />
 * ```
 */
export interface DropdownProps
  extends
    DropdownAccessibilityProps,
    Omit<
      React.HTMLAttributes<HTMLDivElement>,
      'children' | 'onChange' | 'title' | 'onSelect' | 'onClick'
    > {
  // ============ CORE PROPERTIES ============
  // Add these missing props:
  /** Show overlay backdrop */
  overlay?: boolean;
  /** Overlay custom class name */
  overlayClassName?: string;
  /** Overlay opacity (0-1) */
  overlayOpacity?: number;
  /** Whether overlay has blur effect */
  overlayBlur?: boolean;
  /** Overlay custom color */
  overlayColor?: string;

  /** Whether to render trigger as child */
  triggerAsChild?: boolean;
  /** Trigger custom class name */
  triggerClassName?: string;
  /** Whether trigger is disabled */
  triggerDisabled?: boolean;

  /** Content custom styles */
  contentStyle?: React.CSSProperties;

  /** Portal custom class name */
  portalClassName?: string;

  /** Animation types (fix this to match styles) */
  animation?: 'fade' | 'scale' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'none';

  /** Trigger element (required) */
  trigger: React.ReactNode;

  /** Controlled open state */
  open?: boolean;
  /** Default open state (uncontrolled) */
  defaultOpen?: boolean;
  /** Open state change handler */
  onOpenChange?: (open: boolean, event?: Event, meta?: NormalizedDropdownEvent) => void;

  // ============ CONTENT PROPERTIES ============

  /** Child components (compound pattern) */
  children?: React.ReactNode;
  /** Array of items (declarative API) */
  items?: DropdownItem[];
  /** Array of groups (organized items) */
  groups?: DropdownGroup[];
  /** Array of sections (complex menus) */
  sections?: DropdownSection[];

  // ============ SELECTION PROPERTIES ============

  /** Selected value (controlled) */
  value?: string;
  /** Default selected value (uncontrolled) */
  defaultValue?: string;
  /** Selection change handler */
  onChange?: (value: string, event?: DropdownEvent) => void;
  /** Close on item selection */
  closeOnSelect?: boolean;

  // ============ VISUAL PROPERTIES ============

  /** Visual variant */
  variant?: DropdownVariant;
  /** Size variant */
  size?: DropdownSize;
  /** Placement relative to trigger */
  placement?: DropdownPlacement;
  /** Content alignment */
  align?: DropdownAlign;
  /** Animation type */

  // ============ BEHAVIOR PROPERTIES ============

  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Close on Escape key */
  closeOnEscape?: boolean;
  /** Close on outside click */
  closeOnOutsideClick?: boolean;
  /** Close on scroll */
  closeOnScroll?: boolean;
  /** Prevent body scroll when open */
  preventScroll?: boolean;
  /** Trap focus within dropdown */
  lockFocus?: boolean;
  /** Auto-focus first item on open */
  autoFocus?: boolean;
  /** Modal behavior (traps focus) */
  modal?: boolean;
  /** Persistent (won't auto-close) */
  persistent?: boolean;

  // ============ POSITIONING PROPERTIES ============

  /** Positioning strategy */
  strategy?: DropdownStrategy;
  /** Offset from trigger */
  offset?: number;
  /** Collision boundary */
  collisionBoundary?: Element | Element[] | 'clippingAncestors';
  /** Collision padding */
  collisionPadding?: number;

  // ============ PORTAL PROPERTIES ============

  /** Render in portal */
  portal?: boolean;
  /** Portal container element */
  portalContainer?: HTMLElement | null;

  // ============ STYLING PROPERTIES ============

  /** Root class name */
  className?: string;
  /** Content container class name */
  contentClassName?: string;
  /** Maximum height */
  maxHeight?: string | number;
  /** Minimum width */
  minWidth?: string | number;
  /** Maximum width */
  maxWidth?: string | number;

  // ============ ACCESSIBILITY PROPERTIES ============

  /** ARIA role (separated to avoid conflict) */
  role?: 'menu' | 'listbox' | 'combobox';

  // ============ ENTERPRISE PROPERTIES ============

  /** Test ID for automated testing */
  'data-testid'?: string;
  /** Analytics tracking ID */
  'data-analytics'?: string;
  /** Cypress test ID */
  'data-cy'?: string;

  /** Validation state */
  validationState?: 'valid' | 'invalid' | 'warning';
  /** Validation message */
  validationMessage?: string;

  /** Component governance metadata */
  governance?: Partial<DropdownGovernance>;

  /** Transition duration in milliseconds */
  transitionDuration?: number;
  /** Transition timing function */
  transitionTimingFunction?: string;
  /** Whether to unmount when closed */
  unmountOnExit?: boolean;
  /** Skidding offset for positioning */
  skidding?: number;
  /** Boundary padding */
  boundaryPadding?: number;
}

// ============================================================================
// 9. COMPOUND COMPONENT PROPS (For Component Composition)
// ============================================================================

/**
 * Dropdown Trigger component props
 */
export interface DropdownTriggerProps extends React.HTMLAttributes<HTMLElement> {
  /** Render as child element */
  asChild?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Test ID */
  'data-testid'?: string;
}

/**
 * Dropdown Content component props
 */
export interface DropdownContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Placement side */
  side?: DropdownPlacement;
  /** Alignment */
  align?: DropdownAlign;
  /** Side offset */
  sideOffset?: number;
  /** Alignment offset */
  alignOffset?: number;
  /** Collision boundary */
  collisionBoundary?: Element | Element[] | 'clippingAncestors';
  /** Collision padding */
  collisionPadding?: number;
  /** Force mount (render always) */
  forceMount?: boolean;
  /** Test ID */
  'data-testid'?: string;
}

/**
 * Dropdown Item component props
 */
export interface DropdownItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Visual variant */
  variant?: DropdownItemVariant;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Checked state */
  checked?: boolean;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Icon element */
  icon?: React.ReactNode;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Selection handler */
  onSelect?: (event?: Event, meta?: NormalizedDropdownEvent) => void;
  /** Associated value */
  value?: string;
  /** Test ID */
  'data-testid'?: string;
  /** Analytics ID */
  'data-analytics'?: string;
  /** Cypress ID */
  'data-cy'?: string;
}

/**
 * Dropdown Group component props
 */
export interface DropdownGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Group label */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Test ID */
  'data-testid'?: string;
}

/**
 * Dropdown Separator component props
 */
export interface DropdownSeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  /** Test ID */
  'data-testid'?: string;
}

/**
 * Dropdown Label component props
 */
export interface DropdownLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Test ID */
  'data-testid'?: string;
}

/**
 * Dropdown Shortcut component props
 */
export interface DropdownShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Test ID */
  'data-testid'?: string;
}

/**
 * Dropdown Arrow component props
 */
export interface DropdownArrowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Arrow width */
  width?: number;
  /** Arrow height */
  height?: number;
  /** Test ID */
  'data-testid'?: string;
}

/**
 * Dropdown Submenu component props
 */
export interface DropdownSubmenuProps extends Omit<DropdownProps, 'trigger'> {
  /** Submenu label */
  label: string;
  /** Submenu icon */
  icon?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Open state change handler */
  onOpenChange?: (open: boolean) => void;
}

// ============================================================================
// 10. UTILITY TYPES & DEFAULTS
// ============================================================================

/**
 * Dropdown performance metrics
 */
export interface DropdownPerformanceMetrics {
  /** Initial render time (ms) */
  renderTime: number;
  /** Open animation duration (ms) */
  openAnimationTime: number;
  /** Close animation duration (ms) */
  closeAnimationTime: number;
  /** DOM node count */
  domNodes: number;
  /** Memory usage (KB) */
  memoryUsage: number;
}

/**
 * Validation rules for dropdown
 */
export interface DropdownValidationRules {
  /** Minimum items required */
  minItems?: number;
  /** Maximum items allowed */
  maxItems?: number;
  /** Required selection */
  required?: boolean;
  /** Custom validation function */
  validate?: (value: string | undefined) => string | undefined;
}

/**
 * Default dropdown props
 */
export const DEFAULT_DROPDOWN_PROPS: Partial<DropdownProps> = {
  size: 'md',
  placement: 'bottom-start',
  align: 'start',
  animation: 'fade',
  variant: 'primary',
  closeOnSelect: true,
  closeOnEscape: true,
  closeOnOutsideClick: true,
  closeOnScroll: false,
  preventScroll: false,
  lockFocus: true,
  autoFocus: false,
  modal: false,
  persistent: false,
  portal: true,
  offset: 4,
  collisionPadding: 8,
  strategy: 'absolute',
  role: 'menu',
  minWidth: 'var(--helix-dropdown-trigger-width, 120px)',
  maxHeight: 'var(--helix-dropdown-content-available-height, 300px)',
};

/**
 * Dropdown preset configurations
 */
export const DROPDOWN_PRESETS = {
  select: {
    name: 'Select',
    description: 'Single selection dropdown',
    props: {
      role: 'listbox',
      closeOnSelect: true,
      ariaControls: 'dropdown-listbox',
    } as Partial<DropdownProps>,
  },
  menu: {
    name: 'Menu',
    description: 'Action menu dropdown',
    props: {
      role: 'menu',
      closeOnSelect: true,
      ariaControls: 'dropdown-menu',
    } as Partial<DropdownProps>,
  },
  combobox: {
    name: 'Combobox',
    description: 'Searchable dropdown',
    props: {
      role: 'combobox',
      closeOnSelect: false,
      autoFocus: true,
      ariaControls: 'dropdown-combobox',
    } as Partial<DropdownProps>,
  },
} as const;

// ============================================================================
// 11. TYPE GUARDS (Enterprise-Grade)
// ============================================================================

/**
 * Type guard for React mouse events
 */
export function isReactMouseEvent(event: DropdownEvent): event is React.MouseEvent {
  return 'nativeEvent' in event && 'clientX' in event;
}

/**
 * Type guard for React keyboard events
 */
export function isReactKeyboardEvent(event: DropdownEvent): event is React.KeyboardEvent {
  return 'nativeEvent' in event && 'key' in event;
}

/**
 * Type guard for DOM mouse events
 */
export function isDomMouseEvent(event: unknown): event is MouseEvent {
  return event instanceof MouseEvent;
}

/**
 * Type guard for DOM keyboard events
 */
export function isDomKeyboardEvent(event: unknown): event is KeyboardEvent {
  return event instanceof KeyboardEvent;
}

/**
 * Normalize any dropdown event
 */
export function normalizeDropdownEvent(event?: DropdownEvent): NormalizedDropdownEvent | null {
  if (!event) return null;

  const isReact = 'nativeEvent' in event;
  const isMouse = isReactMouseEvent(event) || isDomMouseEvent(event);

  return {
    type: isMouse ? 'mouse' : 'keyboard',
    isReactEvent: isReact,
    isDomEvent: !isReact,
    event,
    timestamp: Date.now(),
    defaultPrevented: event.defaultPrevented,
  };
}

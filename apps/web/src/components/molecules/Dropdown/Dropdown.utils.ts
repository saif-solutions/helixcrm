// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dropdown\Dropdown.utils.ts

/**
 * Dropdown Component Utilities
 * 
 * Utility functions, type guards, and helper methods for the Dropdown component.
 * Enterprise-grade utilities following HELIX CRM standards.
 * 
 * @packageDocumentation
 * @module Components/Molecules/Dropdown/Utils
 * @version 2.0.0-beta.1
 */

import * as React from 'react';
import {
  DropdownEvent,
  DropdownItem,
  DropdownProps,
  NormalizedDropdownEvent,
} from './Dropdown.types';

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for React mouse events
 */
export function isReactMouseEvent(event: DropdownEvent): event is React.MouseEvent {
  return typeof event === 'object' && event !== null && 'nativeEvent' in event;
}

/**
 * Type guard for React keyboard events
 */
export function isReactKeyboardEvent(event: DropdownEvent): event is React.KeyboardEvent {
  return typeof event === 'object' && event !== null && 'nativeEvent' in event && 'key' in event;
}

/**
 * Type guard for DOM mouse events
 */
export function isDomMouseEvent(event: unknown): event is MouseEvent {
  const e = event as { type?: string; clientX?: number };
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    typeof e.type === 'string' &&
    e.type.startsWith('mouse') &&
    'clientX' in e
  );
}

/**
 * Type guard for DOM keyboard events
 */
export function isDomKeyboardEvent(event: unknown): event is KeyboardEvent {
  const e = event as { type?: string; key?: string };
  return (
    typeof event === 'object' &&
    event !== null &&
    'type' in event &&
    typeof e.type === 'string' &&
    e.type.startsWith('key') &&
    'key' in e
  );
}

// ============================================================================
// EVENT NORMALIZATION
// ============================================================================

/**
 * Create normalized dropdown event for consistent public API
 */
export function createNormalizedDropdownEvent(
  event: Event
): NormalizedDropdownEvent {
  return {
    type: event instanceof KeyboardEvent ? 'keyboard' : 'mouse',
    key: event instanceof KeyboardEvent ? event.key : undefined,
    button: event instanceof MouseEvent ? event.button : undefined,
    timestamp: Date.now(),
  };
}

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate unique IDs for dropdown elements
 */
export function generateDropdownIds(prefix: string = 'dropdown'): {
  dropdownId: string;
  triggerId: string;
  contentId: string;
  labelId?: string;
} {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).slice(2, 11);
  const unique = `${timestamp}-${randomStr}`;
  
  return {
    dropdownId: `${prefix}-${unique}`,
    triggerId: `${prefix}-trigger-${unique}`,
    contentId: `${prefix}-content-${unique}`,
  };
}

// ============================================================================
// PROP VALIDATION
// ============================================================================

/**
 * Validate dropdown props for standards compliance
 */
export function validateDropdownProps(props: DropdownProps): {
  warnings: string[];
  errors: string[];
  normalizedProps: Partial<DropdownProps>;
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const normalizedProps: Partial<DropdownProps> = { ...props };
  
  // Validate required props
  if (!props.trigger) {
    errors.push('Dropdown requires "trigger" prop');
  }
  
  // Validate content warnings
  if (!props.children && !props.items && !props.groups) {
    warnings.push('Dropdown has no content. Provide children, items, or groups.');
  }
  
  // Validate persistent dropdown behavior
  if (props.persistent) {
    if (props.closeOnEscape !== false) {
      warnings.push('Persistent dropdown should have closeOnEscape=false for consistent behavior');
      normalizedProps.closeOnEscape = false;
    }
    if (props.closeOnOutsideClick !== false) {
      warnings.push('Persistent dropdown should have closeOnOutsideClick=false for consistent behavior');
      normalizedProps.closeOnOutsideClick = false;
    }
  }
  
  // Remove animation validation since transitionDuration doesn't exist
  // if (props.animation === 'none' && props.transitionDuration) {
  //   warnings.push('transitionDuration is provided but animation is "none". Duration will be ignored.');
  // }
  
  return { warnings, errors, normalizedProps };
}

// ============================================================================
// DEFAULT ITEM GENERATION
// ============================================================================

/**
 * Create default dropdown items for common use cases
 */
export function createDefaultDropdownItems(
  type: 'user-menu' | 'actions' | 'context-menu' | 'file-menu' = 'actions'
): DropdownItem[] {
  const items: Record<string, DropdownItem[]> = {
    'user-menu': [
      {
        id: 'user-profile',
        label: 'Profile',
        onClick: () => {},
      },
      {
        id: 'user-settings',
        label: 'Settings',
        onClick: () => {},
      },
      {
        id: 'user-logout',
        label: 'Logout',
        variant: 'destructive',
        onClick: () => {},
      },
    ],
    'actions': [
      {
        id: 'action-edit',
        label: 'Edit',
        shortcut: '⌘E',
        onClick: () => {},
      },
      {
        id: 'action-delete',
        label: 'Delete',
        variant: 'destructive',
        shortcut: '⌘D',
        onClick: () => {},
      },
      {
        id: 'action-duplicate',
        label: 'Duplicate',
        shortcut: '⌘⇧D',
        onClick: () => {},
      },
    ],
    'context-menu': [
      {
        id: 'context-copy',
        label: 'Copy',
        shortcut: '⌘C',
        onClick: () => {},
      },
      {
        id: 'context-paste',
        label: 'Paste',
        shortcut: '⌘V',
        onClick: () => {},
      },
      {
        id: 'context-cut',
        label: 'Cut',
        shortcut: '⌘X',
        onClick: () => {},
      },
    ],
    'file-menu': [
      {
        id: 'file-new',
        label: 'New File',
        shortcut: '⌘N',
        onClick: () => {},
      },
      {
        id: 'file-open',
        label: 'Open',
        shortcut: '⌘O',
        onClick: () => {},
      },
      {
        id: 'file-save',
        label: 'Save',
        shortcut: '⌘S',
        onClick: () => {},
      },
    ],
  };
  
  return items[type] || items.actions;
}

// ============================================================================
// PERFORMANCE UTILITIES (Optional)
// ============================================================================

/**
 * Measure dropdown render performance
 * 
 * @internal
 */
export function measureDropdownPerformance(renderFn: () => void): {
  renderTime: number;
  memoryUsage: number;
} {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  renderFn();
  
  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  return {
    renderTime: endTime - startTime,
    memoryUsage: endMemory - startMemory,
  };
}

/**
 * Debounce function for dropdown events
 * 
 * @internal
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
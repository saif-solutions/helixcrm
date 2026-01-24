import * as React from 'react';
import { DropdownEvent } from './Dropdown.types';

// ============================================================================
// NORMALIZED EVENT
// ============================================================================

export interface NormalizedDropdownEvent {
  readonly type: 'mouse' | 'keyboard';
  readonly isReactEvent: boolean;
  readonly isDomEvent: boolean;
  readonly event: DropdownEvent;
  readonly timestamp: number;
  readonly defaultPrevented: boolean;
}

export type DropdownOpenChangeHandler = (
  open: boolean,
  event?: NormalizedDropdownEvent | null
) => void;

export type DropdownSelectHandler = (value: string, event?: NormalizedDropdownEvent | null) => void;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isReactEvent(
  event: DropdownEvent
): event is React.MouseEvent | React.KeyboardEvent {
  return typeof event === 'object' && event !== null && 'nativeEvent' in event;
}

export function isMouseEvent(event: DropdownEvent): boolean {
  if (isReactEvent(event)) return 'clientX' in event.nativeEvent;
  return 'clientX' in event;
}

export function isKeyboardEvent(event: DropdownEvent): boolean {
  if (isReactEvent(event)) return 'key' in event.nativeEvent;
  return 'key' in event;
}

// ============================================================================
// NORMALIZER
// ============================================================================

export function normalizeDropdownEvent(event: DropdownEvent): NormalizedDropdownEvent {
  const react = isReactEvent(event);
  const type = isMouseEvent(event) ? 'mouse' : 'keyboard';

  return {
    type,
    isReactEvent: react,
    isDomEvent: !react,
    event,
    timestamp: Date.now(),
    defaultPrevented: event.defaultPrevented,
  };
}

// Components
export { Dropdown } from './Dropdown';
export { Dropdown as default } from './Dropdown';

// Types
export type {
  DropdownProps,
  DropdownRef,
  DropdownItemProps,
  DropdownGroupProps,
  DropdownSeparatorProps,
  DropdownLabelProps,
  DropdownShortcutProps,
  DropdownItem,
  DropdownGroup,
  DropdownPlacement,
  DropdownAlign,
  DropdownSize,
  DropdownAnimation,
  DropdownItemVariant,
  DropdownEvent,
} from './Dropdown.types';

// Styles
export {
  dropdownTokens,
  dropdownClasses,
  dropdownZIndexClasses,
  defaultDropdownStyleProps,
  type DropdownAnimationPhaseMap,
  type DropdownTokens,
} from './Dropdown.styles';

// Utilities (public)
export {
  createDefaultDropdownItems,
  generateDropdownIds,
  createNormalizedDropdownEvent,
  isReactMouseEvent,
  isReactKeyboardEvent,
  isDomMouseEvent,
  isDomKeyboardEvent,
} from './Dropdown.utils';

// Deprecated alias
export { createDefaultDropdownItems as createDropdownItemsConfig } from './Dropdown.utils';

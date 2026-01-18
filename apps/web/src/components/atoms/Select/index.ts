// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Select\index.ts
// Barrel exports for Select component

// Re-export main component and hook
export { Select } from './Select';
export { useSelect } from './SelectContext';

// Re-export split components
export { SelectInput } from './SelectInput';
export { SelectMenu } from './SelectMenu';
export { SelectTags } from './SelectTags';

// Re-export types
export type {
  SelectProps,
  SelectRef,
  SelectOption,
  SelectOptionGroup,
  SelectVariant,
  SelectSize,
  SelectAccessibilityProps,
  SelectState,
  SelectContextValue,
  SelectKeyboardKey,
  SelectKeyboardHandlers, // Add this back
  SelectMode,
} from './Select.types';

// Re-export type utilities and functions
export {
  isArrayValue, // Add this back
  isOptionSelected,
  getSelectedOptions,
  filterOptionsByQuery,
  groupOptions,
  validateControlledUsage,
  getOptionTestId,
  getDisplayText,
  getCombinedDisplayText,
  isValidValue,
  generateAriaAttributes,
  createMemoizedFilter,
  shouldVirtualize,
  createSelectOption,
  createDefaultSelectOptions,
} from './Select.types';

// Re-export style utilities
export {
  selectTokens,
  selectClasses,
  getSelectClasses,
  getMenuClasses,
  getOptionClasses,
  getOptionGroupClasses,
  getIconClasses,
  getLoadingClasses,
  getTagClasses,
  getSelectTestId,
  getSelectAriaLabel,
  getVirtualizedStyles,
  getVirtualizedItemStyles,
  getItemHeightBySize,
  memoizedGetSelectClasses,
  defaultSelectStyleProps,
} from './Select.styles';

// Re-export context
export { SelectProvider } from './SelectContext';

// Re-export focus utilities
export { useFocusWithin, useActiveDescendant } from './SelectFocusManager';
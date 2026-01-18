import * as React from 'react';

/* ============================================================================
 * 1. Core Type Definitions
 * ========================================================================== */

/**
 * Shared value type for select component
 */
export type SelectValue = string | number | (string | number)[];

/**
 * Select option type
 */
export interface SelectOption {
  value: string | number;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
  tooltip?: string;
  metadata?: Record<string, any>;
  className?: string;
  'data-testid'?: string;
}

/**
 * Option group type for categorized options
 */
export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
  disabled?: boolean;
  role?: string;
  ariaLabel?: string;
}

/* ============================================================================
 * 2. Variant & Size Types
 * ========================================================================== */

/**
 * Visual variants
 */
export type SelectVariant = 
  | 'primary' 
  | 'secondary' 
  | 'outline' 
  | 'ghost' 
  | 'filled' 
  | 'minimal';

/**
 * Size variants
 */
export type SelectSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/* ============================================================================
 * 3. Props Interface
 * ========================================================================== */

/**
 * Main Select component props
 */
export interface SelectProps 
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'value' | 'defaultValue'> {
  
  // Core properties
  options: SelectOption[];
  value?: SelectValue;
  defaultValue?: SelectValue;
  onChange?: (value: SelectValue, option: SelectOption | SelectOption[] | undefined) => void;
  
  // Visual properties
  variant?: SelectVariant;
  size?: SelectSize;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  label?: string;
  helperText?: string;
  required?: boolean;
  icon?: React.ReactNode;
  
  // Dropdown properties
  maxMenuHeight?: string | number;
  minMenuWidth?: string | number;
  position?: 'top' | 'bottom' | 'auto';
  matchWidth?: boolean;
  ungroupedLabel?: string;
  
  // Virtualization properties
  virtualizationThreshold?: number;
  virtualize?: boolean;
  
  // Custom rendering
  renderOption?: (
    option: SelectOption,
    state: { isSelected: boolean; isFocused: boolean; isDisabled: boolean }
  ) => React.ReactNode;
  
  renderValue?: (
    selected: SelectOption[],
    displayText: string
  ) => React.ReactNode;
  
  // Styling
  className?: string;
  menuClassName?: string;
  optionClassName?: string;
  
  // Testing & analytics
  'data-testid'?: string;
  'data-analytics'?: string;
  'data-cy'?: string;
  
  // Form attributes
  name?: string;
  form?: string;
  
  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaControls?: string;
  ariaOwns?: string;
}

/* ============================================================================
 * 4. State & Context Types
 * ========================================================================== */

/**
 * Select state for internal management
 */
export interface SelectState {
  isOpen: boolean;
  focusedIndex: number;
  searchQuery: string;
  filteredOptions: SelectOption[];
  isSearching: boolean;
  ariaActiveDescendant?: string;
}

/**
 * Select ref type
 */
export type SelectRef = HTMLDivElement;

/**
 * Context type for compound components
 */
export interface SelectContextValue {
  variant: SelectVariant;
  size: SelectSize;
  disabled: boolean;
  multiple: boolean;
  selectedValues: (string | number)[];
  onOptionSelect: (option: SelectOption) => void;
  ariaExpanded: boolean;
  ariaControls: string;
  ariaActiveDescendant?: string;
  getOptionTestId: (option: SelectOption) => string;
}

/* ============================================================================
 * 5. Keyboard Navigation Types
 * ========================================================================== */

/**
 * Keyboard navigation key types with default actions
 */
export type SelectKeyboardKey = 
  | 'ArrowUp'    // Move focus up
  | 'ArrowDown'  // Move focus down
  | 'Enter'      // Select focused option
  | 'Escape'     // Close dropdown
  | 'Tab'        // Close dropdown and move focus
  | 'Space'      // Toggle dropdown / select
  | 'Home'       // Move to first option
  | 'End';       // Move to last option

/**
 * Controlled vs uncontrolled mode
 */
export type SelectMode = 'controlled' | 'uncontrolled';

/* ============================================================================
 * 6. Accessibility Types
 * ========================================================================== */

/**
 * Accessibility props with defaults
 */
export interface SelectAccessibilityProps {
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaControls?: string;
  ariaOwns?: string;
  ariaExpanded?: boolean;
  ariaActiveDescendant?: string;
  ariaSelected?: boolean;
  ariaLive?: 'polite' | 'assertive' | 'off';
  tabIndex?: number;
}

/* ============================================================================
 * 7. Utility Functions
 * ========================================================================== */

/**
 * Value & Selection Utilities
 */

export function isOptionSelected(
  option: SelectOption,
  selectedValue?: SelectValue
): boolean {
  if (!selectedValue) return false;
  
  if (Array.isArray(selectedValue)) {
    return selectedValue.some(val => val === option.value);
  }
  
  return option.value === selectedValue;
}

export function getSelectedOptions(
  value: SelectValue | undefined,
  options: SelectOption[]
): SelectOption | SelectOption[] | undefined {
  if (!value) return undefined;
  
  if (Array.isArray(value)) {
    return options.filter(option => value.some(v => v === option.value));
  }
  
  return options.find(option => option.value === value);
}

/**
 * Type guard to check if value is an array
 */
export function isArrayValue(value: any): value is (string | number)[] {
  return Array.isArray(value);
}

/**
 * Keyboard event handler mapping
 */
export type SelectKeyboardHandlers = Record<SelectKeyboardKey, (event: React.KeyboardEvent) => void>;

export function validateControlledUsage(
  value?: SelectValue,
  defaultValue?: SelectValue
): SelectMode {
  if (value !== undefined && defaultValue !== undefined) {
    console.error(
      '⚠️ Select Warning: Both `value` (controlled) and `defaultValue` (uncontrolled) provided. ' +
      'Select will use controlled mode. Remove `defaultValue` to suppress this warning.'
    );
    return 'controlled';
  }
  
  return value !== undefined ? 'controlled' : 'uncontrolled';
}

/**
 * Display Text Utilities
 */

export function getDisplayText(
  selected: SelectOption | SelectOption[] | undefined,
  placeholder: string = 'Select an option'
): string {
  if (!selected) return placeholder;
  
  if (Array.isArray(selected)) {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0].label;
    return `${selected.length} selected`;
  }
  
  return selected.label;
}

export function getCombinedDisplayText(
  selected: SelectOption | SelectOption[] | undefined,
  placeholder: string = 'Select an option'
): { text: string; hasCustomRender: boolean } {
  const displayText = getDisplayText(selected, placeholder);
  return { text: displayText, hasCustomRender: false };
}

/**
 * Option Filtering & Grouping Utilities
 */

export function filterOptionsByQuery(
  options: SelectOption[],
  query: string
): SelectOption[] {
  if (!query.trim()) return options;
  
  const lowerQuery = query.toLowerCase();
  return options.filter(option => 
    option.label.toLowerCase().includes(lowerQuery) ||
    (option.description && option.description.toLowerCase().includes(lowerQuery)) ||
    String(option.value).toLowerCase().includes(lowerQuery)
  );
}

export function createMemoizedFilter() {
  let cache: { query: string; options: SelectOption[]; result: SelectOption[] } | null = null;
  
  return function memoizedFilterOptionsByQuery(
    options: SelectOption[],
    query: string
  ): SelectOption[] {
    if (cache && cache.query === query && cache.options === options) {
      return cache.result;
    }
    
    const result = filterOptionsByQuery(options, query);
    cache = { query, options, result };
    return result;
  };
}

export function groupOptions(
  options: SelectOption[],
  ungroupedLabel: string = 'Other'
): SelectOptionGroup[] {
  const groups: Record<string, SelectOptionGroup> = {};
  
  options.forEach(option => {
    const groupName = option.group || 'ungrouped';
    
    if (!groups[groupName]) {
      groups[groupName] = {
        label: option.group || ungroupedLabel,
        options: [],
        disabled: false,
        role: 'group',
        ariaLabel: `${option.group || ungroupedLabel} group`
      };
    }
    
    groups[groupName].options.push(option);
  });
  
  // Calculate group disabled state
  Object.values(groups).forEach(group => {
    group.disabled = group.options.every(opt => opt.disabled);
  });
  
  return Object.values(groups);
}

/**
 * Virtualization Utilities
 */

export function shouldVirtualize(
  options: SelectOption[],
  virtualizationThreshold: number = 100,
  virtualize?: boolean
): boolean {
  if (virtualize !== undefined) return virtualize;
  return options.length > virtualizationThreshold;
}

/**
 * Testing & Accessibility Utilities
 */

export function getOptionTestId(
  option: SelectOption,
  prefix: string = 'select-option'
): string {
  return option['data-testid'] || 
    `${prefix}-${option.value}`.replace(/\s+/g, '-').toLowerCase();
}

export function generateAriaAttributes(
  props: Pick<SelectProps, 'ariaLabel' | 'ariaDescribedBy' | 'ariaControls' | 'ariaOwns'>,
  state: Pick<SelectState, 'isOpen' | 'ariaActiveDescendant'>,
  id: string
): SelectAccessibilityProps {
  return {
    role: 'combobox',
    ariaExpanded: state.isOpen,
    ariaControls: props.ariaControls || `${id}-menu`,
    ariaOwns: props.ariaOwns || `${id}-menu`,
    ariaActiveDescendant: state.ariaActiveDescendant,
    ariaLabel: props.ariaLabel,
    ariaDescribedBy: props.ariaDescribedBy,
    tabIndex: 0,
  };
}

/**
 * Validation Utilities
 */

export function isValidValue(
  value: SelectValue,
  options: SelectOption[]
): boolean {
  if (Array.isArray(value)) {
    return value.every(v => options.some(opt => opt.value === v));
  }
  
  return options.some(opt => opt.value === value);
}

/**
 * Factory Functions
 */

export function createSelectOption(
  overrides: Partial<SelectOption> = {}
): SelectOption {
  const value = overrides.value || `option-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    value,
    label: 'New Option',
    disabled: false,
    'data-testid': `select-option-${String(value)}`,
    ...overrides,
  };
}

export function createDefaultSelectOptions(count: number = 5): SelectOption[] {
  return Array.from({ length: count }, (_, i) => ({
    value: `value-${i + 1}`,
    label: `Option ${i + 1}`,
    description: i % 2 === 0 ? `Description for option ${i + 1}` : undefined,
    disabled: i === 2, // Third option is disabled
    'data-testid': `select-option-value-${String(i + 1)}`,
  }));
}

/* ============================================================================
 * 8. Normalization Utilities (NEW)
 * ========================================================================== */

/**
 * Normalize selected options to always return an array
 */
export function normalizeSelectedOptions(
  selected: SelectOption | SelectOption[] | undefined
): SelectOption[] {
  if (!selected) return [];
  if (Array.isArray(selected)) return selected;
  return [selected];
}

/**
 * Convert SelectValue to string array for consistent internal use
 */
export function valueToStringArray(value: SelectValue | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v));
  return [String(value)];
}

/**
 * Convert string array back to SelectValue based on multiple prop
 */
export function stringArrayToValue(values: string[], multiple: boolean): SelectValue {
  if (!multiple && values.length > 0) return values[0];
  return values;
}

/**
 * Check if two SelectValue arrays are equal
 */
export function areValuesEqual(
  value1: SelectValue | undefined,
  value2: SelectValue | undefined
): boolean {
  if (value1 === value2) return true;
  if (!value1 || !value2) return false;
  
  const arr1 = valueToStringArray(value1);
  const arr2 = valueToStringArray(value2);
  
  if (arr1.length !== arr2.length) return false;
  
  return arr1.every((val, index) => val === arr2[index]);
}

/**
 * Find option by value
 */
export function findOptionByValue(
  options: SelectOption[],
  value: string | number
): SelectOption | undefined {
  return options.find(option => option.value === value);
}

/**
 * Filter out invalid options from value
 */
export function validateAndFilterValues(
  values: SelectValue | undefined,
  options: SelectOption[]
): SelectValue {
  if (!values) return Array.isArray(values) ? [] : '';
  
  if (Array.isArray(values)) {
    return values.filter(val => 
      options.some(option => option.value === val)
    );
  }
  
  return options.some(option => option.value === values) ? values : '';
}
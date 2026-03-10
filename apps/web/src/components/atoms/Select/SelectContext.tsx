// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Select\SelectContext.tsx
import * as React from 'react';
import { SelectOption, SelectVariant, SelectSize } from './Select.types';

export interface SelectContextType {
  variant: SelectVariant;
  size: SelectSize;
  disabled: boolean;
  multiple: boolean;
  selectedValues: (string | number)[];
  // ✅ FIXED: Changed to onOptionSelect for consistent selection handling
  onOptionSelect: (option: SelectOption) => void;
  ariaExpanded: boolean;
  ariaControls: string;
  ariaActiveDescendant?: string;
  getOptionTestId: (option: SelectOption) => string;
}

// ✅ FIXED: Create context with proper default null value
const SelectContext = React.createContext<SelectContextType | null>(null);

// ✅ FIXED: Export context for direct usage if needed
export { SelectContext };

// ✅ FIXED: Enhanced hook with better error message and debug info
export const useSelect = (): SelectContextType => {
  const context = React.useContext(SelectContext);
  if (!context) {
    console.error(
      '❌ useSelect must be used within a Select component. ' +
        'Make sure your component is wrapped with <SelectProvider> or inside a <Select> component.'
    );
    throw new Error('useSelect must be used within a Select component');
  }
  return context;
};

// ✅ FIXED: Create separate provider component with better typing
interface SelectProviderProps {
  value: SelectContextType;
  children: React.ReactNode;
}

export const SelectProvider: React.FC<SelectProviderProps> = ({ value, children }) => {
  // ✅ FIXED: Add validation for required context values
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (!value.onOptionSelect) {
        console.warn('⚠️ SelectProvider: onOptionSelect is required in context value');
      }
      if (value.selectedValues === undefined) {
        console.warn('⚠️ SelectProvider: selectedValues is undefined');
      }
    }
  }, [value]);

  return <SelectContext.Provider value={value}>{children}</SelectContext.Provider>;
};

// ✅ FIXED: Helper hook for checking if option is selected
export const useSelectOption = (option: SelectOption) => {
  const context = useSelect();

  const isSelected = React.useMemo(() => {
    return context.selectedValues.includes(option.value);
  }, [context.selectedValues, option.value]);

  const isDisabled = React.useMemo(() => {
    return context.disabled || option.disabled;
  }, [context.disabled, option.disabled]);

  const handleSelect = React.useCallback(() => {
    if (!isDisabled) {
      context.onOptionSelect(option);
    }
  }, [context, option, isDisabled]);

  return {
    isSelected,
    isDisabled,
    handleSelect,
    variant: context.variant,
    size: context.size,
    testId: context.getOptionTestId(option),
    ariaSelected: isSelected,
    ariaDisabled: isDisabled,
  };
};

// ✅ FIXED: Helper hook for getting selected values as options
export const useSelectedOptions = (options: SelectOption[]) => {
  const context = useSelect();

  const selectedOptions = React.useMemo(() => {
    return options.filter((option) => context.selectedValues.includes(option.value));
  }, [options, context.selectedValues]);

  return selectedOptions;
};

// ✅ FIXED: Helper hook for keyboard navigation context
export const useSelectKeyboard = () => {
  const context = useSelect();

  const keyboardProps = React.useMemo(
    () => ({
      role: 'listbox' as const,
      'aria-multiselectable': context.multiple,
      'aria-expanded': context.ariaExpanded,
      'aria-activedescendant': context.ariaActiveDescendant,
      'aria-controls': context.ariaControls,
    }),
    [context]
  );

  return keyboardProps;
};

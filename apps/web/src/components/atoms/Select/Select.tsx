// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Select\Select.tsx
import * as React from 'react';

// Import types and utilities
import {
  SelectProps,
  SelectRef,
  SelectOption,
  SelectState,
  SelectKeyboardKey,
  SelectValue,
  getSelectedOptions,
  getCombinedDisplayText,
  validateControlledUsage,
  createMemoizedFilter,
  shouldVirtualize,
  normalizeSelectedOptions,
  valueToStringArray,
} from './Select.types';

// Import split components
import { SelectInput } from './SelectInput';
import { SelectMenu } from './SelectMenu';
import { SelectTags } from './SelectTags';
import { SelectProvider } from './SelectContext';

// Import focus management
import { useActiveDescendant } from './SelectFocusManager';

// Import styles
import { defaultSelectStyleProps, getItemHeightBySize } from './Select.styles';

/* ============================================================================
 * Custom Hooks for Select Logic
 * ========================================================================== */

/**
 * Hook for managing controlled/uncontrolled state
 */
function useSelectValue(
  controlledValue: SelectValue | undefined,
  defaultValue: SelectValue | undefined,
  multiple: boolean
) {
  const mode = React.useMemo(
    () => validateControlledUsage(controlledValue, defaultValue),
    [controlledValue, defaultValue]
  );

  const [internalValue, setInternalValue] = React.useState<SelectValue>(() => {
    if (mode === 'controlled') {
      return controlledValue ?? (multiple ? [] : '');
    }
    return defaultValue ?? (multiple ? [] : '');
  });

  // Sync with controlled value
  React.useEffect(() => {
    if (mode === 'controlled' && controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue, mode]);

  return { internalValue, setInternalValue, mode };
}

/**
 * Hook for managing select state
 */
function useSelectState(initialOptions: SelectOption[]) {
  const [state, setState] = React.useState<SelectState>({
    isOpen: false,
    focusedIndex: -1,
    searchQuery: '',
    filteredOptions: initialOptions,
    isSearching: false,
  });

  const updateState = React.useCallback((updates: Partial<SelectState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  return { state, updateState, setState };
}

/**
 * Hook for keyboard navigation
 */
function useKeyboardNavigation(
  state: SelectState,
  disabled: boolean,
  loading: boolean,
  searchable: boolean,
  onToggleOption: (option: SelectOption) => void,
  onToggleDropdown: () => void,
  onCloseDropdown: () => void,
  setState: React.Dispatch<React.SetStateAction<SelectState>>
) {
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || loading) return;

      const { filteredOptions } = state;
      const key = event.key as SelectKeyboardKey;

      // For searchable selects with open dropdown, only handle navigation keys
      if (searchable && state.isOpen) {
        // Allow navigation keys to be handled
        if (
          ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab', 'Space', 'Home', 'End'].includes(key)
        ) {
          // Continue with normal handling
        } else {
          // For other keys, let the search input handle them
          return;
        }
      }

      const actions: Record<SelectKeyboardKey, () => void> = {
        ArrowDown: () => {
          event.preventDefault();
          if (!state.isOpen) {
            onToggleDropdown();
            // Set focused index to 0 when opening with arrow down
            queueMicrotask(() => {
              setState((prev) => ({
                ...prev,
                focusedIndex: 0,
              }));
            });
          } else if (filteredOptions.length > 0) {
            const nextIndex =
              state.focusedIndex < 0 ? 0 : (state.focusedIndex + 1) % filteredOptions.length;
            setState((prev) => ({ ...prev, focusedIndex: nextIndex }));
          }
        },

        ArrowUp: () => {
          event.preventDefault();
          if (!state.isOpen) {
            onToggleDropdown();
            // Set focused index to last option when opening with arrow up
            queueMicrotask(() => {
              setState((prev) => ({
                ...prev,
                focusedIndex: filteredOptions.length > 0 ? filteredOptions.length - 1 : -1,
              }));
            });
          } else if (filteredOptions.length > 0) {
            const prevIndex =
              state.focusedIndex <= 0 ? filteredOptions.length - 1 : state.focusedIndex - 1;
            setState((prev) => ({ ...prev, focusedIndex: prevIndex }));
          }
        },

        Enter: () => {
          event.preventDefault();
          if (state.isOpen && state.focusedIndex >= 0) {
            const option = filteredOptions[state.focusedIndex];
            if (!option.disabled) {
              onToggleOption(option);
            }
          } else {
            onToggleDropdown();
          }
        },

        Space: () => {
          event.preventDefault();
          if (state.isOpen && state.focusedIndex >= 0) {
            const option = filteredOptions[state.focusedIndex];
            if (!option.disabled) {
              onToggleOption(option);
            }
          } else {
            onToggleDropdown();
          }
        },

        Escape: () => {
          event.preventDefault();
          onCloseDropdown();
        },

        Tab: () => {
          // Allow natural tab flow, just close dropdown
          if (state.isOpen) {
            setState((prev) => ({ ...prev, isOpen: false }));
          }
        },

        Home: () => {
          event.preventDefault();
          if (state.isOpen && filteredOptions.length > 0) {
            setState((prev) => ({ ...prev, focusedIndex: 0 }));
          }
        },

        End: () => {
          event.preventDefault();
          if (state.isOpen && filteredOptions.length > 0) {
            const lastIndex = filteredOptions.length - 1;
            setState((prev) => ({ ...prev, focusedIndex: lastIndex }));
          }
        },
      };

      if (actions[key]) {
        actions[key]();
      }
    },
    [
      state,
      disabled,
      loading,
      searchable,
      onToggleOption,
      onToggleDropdown,
      onCloseDropdown,
      setState,
    ]
  );

  return handleKeyDown;
}

/**
 * Hook for click outside detection
 */
function useClickOutside(
  containerRef: React.RefObject<HTMLDivElement | null>,
  menuRef: React.RefObject<HTMLDivElement | null>,
  searchInputRef: React.RefObject<HTMLInputElement | null>,
  isOpen: boolean,
  onClose: () => void
) {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const container = containerRef.current;
      const menu = menuRef.current;
      const searchInput = searchInputRef.current;

      if (
        container &&
        !container.contains(event.target as Node) &&
        menu &&
        !menu.contains(event.target as Node) &&
        searchInput &&
        !searchInput.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleFocusChange = () => {
      setTimeout(() => {
        const container = containerRef.current;
        const menu = menuRef.current;
        const searchInput = searchInputRef.current;
        const activeElement = document.activeElement;

        const isInComponent =
          (container && container.contains(activeElement)) ||
          (menu && menu.contains(activeElement)) ||
          (searchInput && searchInput.contains(activeElement));

        if (!isInComponent && isOpen) {
          onClose();
        }
      }, 10);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('focusin', handleFocusChange);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('focusin', handleFocusChange);
    };
  }, [isOpen, onClose, containerRef, menuRef, searchInputRef]);
}

/* ============================================================================
 * Main Select Component
 * ========================================================================== */

/**
 * Enterprise Select component for HELIX CRM
 */
export const Select = React.memo(
  React.forwardRef<SelectRef, SelectProps>((props, ref) => {
    // Destructure props with defaults
    const {
      options,
      value: controlledValue,
      defaultValue,
      onChange,
      variant = 'primary',
      size = 'md',
      placeholder = 'Select an option',
      disabled = false,
      loading = false,
      error = false,
      errorMessage,
      multiple = false,
      searchable = false,
      clearable = false,
      label,
      helperText,
      required = false,
      // icon removed - not used
      maxMenuHeight = defaultSelectStyleProps.maxMenuHeight,
      minMenuWidth = defaultSelectStyleProps.minMenuWidth,
      className,
      menuClassName,
      optionClassName,
      position = 'bottom',
      matchWidth = true,
      ungroupedLabel = 'Other',
      virtualizationThreshold = 100,
      virtualize,
      renderOption,
      renderValue,
      name,
      form,
      'data-testid': testId = 'select',
      'data-analytics': analyticsId,
      'data-cy': cyId,
      // ariaLabel removed - not used
      // ariaDescribedBy removed - not used
      // ariaControls removed - not used
      // ariaOwns removed - not used
      onFocus,
      onBlur,
      onKeyDown,
      ...divProps
    } = props;

    // Generate unique ID for accessibility
    const selectId = React.useId();

    // Refs
    const selectRef = React.useRef<HTMLDivElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // State management
    const { internalValue, setInternalValue, mode } = useSelectValue(
      controlledValue,
      defaultValue,
      multiple
    );

    const { state, updateState, setState } = useSelectState(options);

    // Memoized values - use normalized selected options
    const rawSelectedOptions = React.useMemo(
      () => getSelectedOptions(internalValue, options),
      [internalValue, options]
    );

    const selectedOptions = React.useMemo(
      () => normalizeSelectedOptions(rawSelectedOptions),
      [rawSelectedOptions]
    );

    const displayTextInfo = React.useMemo(() => {
      // If internalValue is empty (after clear), show placeholder
      if (
        !internalValue ||
        (Array.isArray(internalValue) && internalValue.length === 0) ||
        internalValue === ''
      ) {
        return { text: placeholder, hasCustomRender: false };
      }

      // Handle custom renderValue properly with normalized array
      if (renderValue && selectedOptions.length > 0) {
        const defaultDisplay = getCombinedDisplayText(selectedOptions, placeholder);
        // Pass normalized array and display text to renderValue
        const customRender = renderValue(selectedOptions, defaultDisplay.text);
        if (customRender) {
          return {
            text: customRender,
            hasCustomRender: true,
          };
        }
      }

      return getCombinedDisplayText(selectedOptions, placeholder);
    }, [internalValue, selectedOptions, placeholder, renderValue]);

    const ariaActiveDescendant = useActiveDescendant(
      state.focusedIndex,
      state.filteredOptions,
      testId
    );

    const memoizedFilter = React.useMemo(() => createMemoizedFilter(), []);

    const enableVirtualization = React.useMemo(
      () => shouldVirtualize(options, virtualizationThreshold, virtualize),
      [options, virtualizationThreshold, virtualize]
    );

    // Calculate overscan for virtualization
    const calculateOverscan = React.useCallback((maxHeight: string, itemHeight: number) => {
      const height = parseInt(maxHeight.replace('px', ''), 10) || 250;
      return Math.max(3, Math.floor(height / itemHeight / 2));
    }, []);

    const overscan = React.useMemo(
      () => calculateOverscan(String(maxMenuHeight), getItemHeightBySize(size)),
      [maxMenuHeight, size, calculateOverscan]
    );

    // Filter options when search changes
    React.useEffect(() => {
      if (!searchable || !state.searchQuery.trim()) {
        updateState({ filteredOptions: options });
        return;
      }

      const filtered = memoizedFilter(options, state.searchQuery);
      updateState({
        filteredOptions: filtered,
        focusedIndex: filtered.length > 0 ? 0 : -1,
      });
    }, [options, state.searchQuery, searchable, memoizedFilter, updateState]);

    // Clear search query when dropdown closes
    React.useEffect(() => {
      if (!state.isOpen) {
        updateState({ searchQuery: '', isSearching: false });
      }
    }, [state.isOpen, updateState]);

    /* ============================================================================
     * Event Handlers
     * ========================================================================== */

    // Toggle option selection - FIXED: Added all necessary dependencies
    const toggleOption = React.useCallback(
      (option: SelectOption) => {
        if (disabled || loading || option.disabled) return;

        if (multiple) {
          const currentValues = Array.isArray(internalValue) ? internalValue : [];
          const newValues = currentValues.includes(option.value)
            ? currentValues.filter((v) => v !== option.value)
            : [...currentValues, option.value];

          // Update internal state
          if (mode === 'uncontrolled') {
            setInternalValue(newValues);
          }

          // Call onChange with selected options
          const selected = getSelectedOptions(newValues, options);
          onChange?.(newValues, selected);

          // Update focusedIndex to the selected option
          setState((prev) => ({
            ...prev,
            focusedIndex: prev.filteredOptions.findIndex((o) => o.value === option.value),
          }));
        } else {
          const newValue = clearable && internalValue === option.value ? '' : option.value;

          // Update internal state
          if (mode === 'uncontrolled') {
            setInternalValue(newValue);
          }

          // Call onChange with selected option
          const selected = getSelectedOptions(newValue, options);
          onChange?.(newValue, selected);

          // Close dropdown for single select
          setState((prev) => ({
            ...prev,
            isOpen: false,
            searchQuery: '',
            focusedIndex: -1,
          }));
        }
      },
      [
        multiple,
        internalValue,
        disabled,
        loading,
        clearable,
        mode,
        options,
        onChange,
        setInternalValue,
        setState,
      ]
    );

    // Toggle dropdown - FIXED: Simplified dependencies
    const toggleDropdown = React.useCallback(() => {
      if (disabled || loading) return;

      const newIsOpen = !state.isOpen;

      updateState({
        isOpen: newIsOpen,
        focusedIndex: newIsOpen ? -1 : -1, // Don't auto-focus first option
        searchQuery: newIsOpen ? state.searchQuery : '',
      });
    }, [disabled, loading, state.isOpen, state.searchQuery, updateState]);

    // Close dropdown - FIXED: Added all necessary dependencies
    const closeDropdown = React.useCallback(() => {
      updateState({
        isOpen: false,
        searchQuery: '',
        focusedIndex: -1,
      });
    }, [updateState]);

    // Clear selection - FIXED: Added all necessary dependencies
    const handleClear = React.useCallback(
      (event: React.MouseEvent) => {
        event.stopPropagation();
        if (disabled || loading) return;

        const newValue = multiple ? [] : '';

        // Update internal state
        if (mode === 'uncontrolled') {
          setInternalValue(newValue);
        }

        // Call onChange with empty selection
        onChange?.(newValue, undefined);

        // Don't close dropdown on clear
      },
      [disabled, loading, multiple, mode, setInternalValue, onChange]
    );

    // Handle search input change
    const handleSearchChange = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        updateState({
          searchQuery: event.target.value,
          isSearching: true,
          focusedIndex: 0,
        });
      },
      [updateState]
    );

    // Handle option focus
    const handleOptionFocus = React.useCallback(
      (index: number) => {
        updateState({ focusedIndex: index });
      },
      [updateState]
    );

    // Keyboard navigation
    const handleKeyDown = useKeyboardNavigation(
      state,
      disabled,
      loading,
      searchable,
      toggleOption,
      toggleDropdown,
      closeDropdown,
      setState
    );

    // Combine keyboard handlers
    const combinedHandleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        handleKeyDown(event);
        onKeyDown?.(event);
      },
      [handleKeyDown, onKeyDown]
    );

    // Focus management
    const handleFocus = React.useCallback(
      (event: React.FocusEvent<HTMLDivElement>) => {
        onFocus?.(event);
        if (!state.isOpen && state.filteredOptions.length > 0) {
          updateState({ focusedIndex: 0 });
        }
      },
      [onFocus, state.isOpen, state.filteredOptions.length, updateState]
    );

    const handleBlur = React.useCallback(
      (event: React.FocusEvent<HTMLDivElement>) => {
        onBlur?.(event);
      },
      [onBlur]
    );

    // Click outside detection
    useClickOutside(containerRef, menuRef, searchInputRef, state.isOpen, closeDropdown);

    /* ============================================================================
     * Render Logic
     * ========================================================================== */

    // Render tags for multi-select
    const renderTags =
      multiple && selectedOptions.length > 0 ? (
        <SelectTags
          selectedOptions={selectedOptions}
          disabled={disabled}
          loading={loading}
          testId={testId}
          onRemove={toggleOption}
        />
      ) : null;

    // Combine refs
    React.useImperativeHandle(ref, () => {
      if (!selectRef.current) {
        throw new Error('Select ref not initialized');
      }
      return selectRef.current;
    });

    // Context value with onOptionSelect
    const contextValue = React.useMemo(
      () => ({
        variant,
        size,
        disabled,
        multiple,
        selectedValues: valueToStringArray(internalValue),
        onOptionSelect: toggleOption,
        ariaExpanded: state.isOpen,
        ariaControls: `${testId}-menu`,
        ariaActiveDescendant: ariaActiveDescendant,
        getOptionTestId: (option: SelectOption) => `${testId}-option-${String(option.value)}`,
      }),
      [
        variant,
        size,
        disabled,
        multiple,
        internalValue,
        toggleOption,
        state.isOpen,
        testId,
        ariaActiveDescendant,
      ]
    );

    // Convert SelectValue to string | number | string[] for SelectMenu
    const selectedValueForMenu: string | number | string[] = React.useMemo(() => {
      if (Array.isArray(internalValue)) {
        return internalValue.map((v) => String(v));
      }
      return internalValue as string | number;
    }, [internalValue]);

    // Safer hidden input value handling
    const hiddenInputValue = React.useMemo(() => {
      if (Array.isArray(internalValue)) {
        return internalValue
          .filter((v) => v != null)
          .map((v) => String(v))
          .join(',');
      }
      return internalValue != null ? String(internalValue) : '';
    }, [internalValue]);

    return (
      <SelectProvider value={contextValue}>
        <div
          ref={containerRef}
          className="relative w-full"
          data-analytics={analyticsId}
          data-cy={cyId}
          {...divProps}
        >
          <SelectInput
            ref={selectRef}
            variant={variant}
            size={size}
            disabled={disabled}
            loading={loading}
            error={error}
            isOpen={state.isOpen}
            placeholder={placeholder}
            clearable={clearable}
            multiple={multiple}
            selectedOptions={selectedOptions}
            displayText={displayTextInfo.text}
            hasCustomRender={displayTextInfo.hasCustomRender}
            renderValue={renderValue}
            renderTags={renderTags}
            className={className}
            testId={testId}
            selectId={selectId}
            label={label}
            required={required}
            helperText={helperText}
            errorMessage={errorMessage}
            ariaActiveDescendant={ariaActiveDescendant}
            ariaControls={`${testId}-menu`}
            onToggle={toggleDropdown}
            onClear={handleClear}
            onKeyDown={combinedHandleKeyDown as React.KeyboardEventHandler<Element>}
            onFocus={handleFocus as React.FocusEventHandler<Element>}
            onBlur={handleBlur as React.FocusEventHandler<Element>}
          />

          <SelectMenu
            isOpen={state.isOpen}
            options={options}
            filteredOptions={state.filteredOptions}
            searchQuery={state.searchQuery}
            searchable={searchable}
            multiple={multiple}
            disabled={disabled}
            size={size}
            position={position}
            maxMenuHeight={maxMenuHeight}
            minMenuWidth={minMenuWidth}
            matchWidth={matchWidth}
            ungroupedLabel={ungroupedLabel}
            enableVirtualization={enableVirtualization}
            virtualizationThreshold={virtualizationThreshold}
            selectedValue={selectedValueForMenu}
            focusedIndex={state.focusedIndex}
            testId={testId}
            overscan={overscan}
            menuClassName={menuClassName}
            optionClassName={optionClassName}
            renderOption={renderOption}
            onSearchChange={handleSearchChange}
            onOptionClick={toggleOption}
            onOptionFocus={handleOptionFocus}
            menuRef={menuRef}
            searchInputRef={searchInputRef}
          />

          {/* Hidden form input with proper value format */}
          {name && (
            <input
              type="hidden"
              name={name}
              value={hiddenInputValue}
              form={form}
              data-testid={`${testId}-hidden-input`}
            />
          )}
        </div>
      </SelectProvider>
    );
  })
);

Select.displayName = 'Select';

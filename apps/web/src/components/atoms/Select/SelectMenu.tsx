// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Select\SelectMenu.tsx
import * as React from 'react';
import { cn } from '../../../lib/utils';
import { 
  SelectOption, 
  SelectValue,
  groupOptions,
  SelectSize
} from './Select.types';
import { 
  getMenuClasses, 
  getOptionClasses,
  getOptionGroupClasses
} from './Select.styles';

export interface SelectMenuProps {
  isOpen: boolean;
  options: SelectOption[];
  filteredOptions: SelectOption[];
  searchQuery: string;
  searchable: boolean;
  multiple: boolean;
  disabled: boolean;
  size: SelectSize;
  position: 'top' | 'bottom' | 'auto';
  maxMenuHeight: string | number;
  minMenuWidth: string | number;
  matchWidth: boolean;
  ungroupedLabel: string;
  enableVirtualization: boolean;
  virtualizationThreshold: number;
  selectedValue: SelectValue;
  focusedIndex: number;
  testId: string;
  overscan: number;
  menuClassName?: string;
  optionClassName?: string;
  renderOption?: (
    option: SelectOption,
    state: { isSelected: boolean; isFocused: boolean; isDisabled: boolean }
  ) => React.ReactNode;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOptionClick: (option: SelectOption) => void;
  onOptionFocus: (index: number) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export const SelectMenu: React.FC<SelectMenuProps> = ({
  isOpen,
  options: _options,
  filteredOptions,
  searchQuery,
  searchable,
  multiple,
  disabled,
  size,
  position,
  maxMenuHeight,
  minMenuWidth,
  matchWidth,
  ungroupedLabel,
  enableVirtualization,
  virtualizationThreshold,
  selectedValue,
  focusedIndex,
  testId,
  overscan,
  menuClassName,
  optionClassName,
  renderOption,
  onSearchChange,
  onOptionClick,
  onOptionFocus,
  menuRef,
  searchInputRef,
}) => {
  // ✅ FIXED: Auto-focus search input when searchable dropdown opens
  React.useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchable, searchInputRef]);

  // ✅ FIXED: Handle virtualization with proper memoization
  const visibleOptions = React.useMemo(() => {
    if (enableVirtualization && filteredOptions.length > virtualizationThreshold) {
      const endIndex = Math.min(virtualizationThreshold + overscan, filteredOptions.length);
      return filteredOptions.slice(0, endIndex);
    }
    return filteredOptions;
  }, [enableVirtualization, filteredOptions, virtualizationThreshold, overscan]);

  // ✅ FIXED: Group options with proper memoization
  const groupedOptions = React.useMemo(() => 
    groupOptions(visibleOptions, ungroupedLabel),
    [visibleOptions, ungroupedLabel]
  );

  // ✅ FIXED: Menu classes with proper memoization
  const menuClasses = React.useMemo(() => 
    getMenuClasses(size, position, menuClassName),
    [size, position, menuClassName]
  );

  // ✅ FIXED: Always defined hooks (no conditional hooks)
  const getGroupClass = React.useMemo(() => 
    getOptionGroupClasses(false, ''),
    []
  );

  const searchInputClass = React.useMemo(() => 
    cn(
      'w-full bg-transparent border-none focus:outline-none focus:ring-0',
      'placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm',
      'px-0 py-0'
    ),
    []
  );

  // ✅ FIXED: Helper function to check if option is selected with proper typing
  const isSelected = React.useCallback((option: SelectOption): boolean => {
    if (!selectedValue) return false;
    
    if (Array.isArray(selectedValue)) {
      return selectedValue.some(val => String(val) === String(option.value));
    }
    
    return String(selectedValue) === String(option.value);
  }, [selectedValue]);

  // ✅ FIXED: Handle option click with proper event handling and cleanup
  const handleOptionClick = React.useCallback((option: SelectOption, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!option.disabled && !disabled) {
      onOptionClick(option);
    }
  }, [disabled, onOptionClick]);

  // ✅ FIXED: Handle option mouse enter with proper typing
  const handleOptionMouseEnter = React.useCallback((index: number) => {
    if (!disabled) {
      onOptionFocus(index);
    }
  }, [disabled, onOptionFocus]);

  // ✅ FIXED: Handle search input change
  const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event);
  }, [onSearchChange]);

  // ✅ FIXED: Handle search input key down for better UX
const handleSearchKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
  // For navigation keys, stop propagation and handle them in the parent
  if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
    event.preventDefault();
    event.stopPropagation();
    
    // If Enter is pressed and we have a focused option, select it
    if (event.key === 'Enter' && focusedIndex >= 0 && filteredOptions[focusedIndex]) {
      const option = filteredOptions[focusedIndex];
      if (!option.disabled && !disabled) {
        onOptionClick(option);
      }
    }
    // For other keys, let the parent handle them
  }
}, [focusedIndex, filteredOptions, disabled, onOptionClick]);


  // Early return AFTER all hooks
  if (!isOpen) return null;

  const menuStyle: React.CSSProperties = {
    maxHeight: typeof maxMenuHeight === 'number' ? `${maxMenuHeight}px` : maxMenuHeight,
    minWidth: typeof minMenuWidth === 'number' ? `${minMenuWidth}px` : minMenuWidth,
    width: matchWidth ? '100%' : undefined,
    position: 'absolute',
    zIndex: 50,
    top: position === 'top' ? 'auto' : '100%',
    bottom: position === 'top' ? '100%' : 'auto',
    marginTop: position === 'top' ? 0 : '0.25rem',
    marginBottom: position === 'top' ? '0.25rem' : 0,
  };

  // ✅ FIXED: Check if we have any options to show
  const hasOptions = filteredOptions.length > 0;

  return (
    <div
      ref={menuRef}
      role="listbox"
      aria-multiselectable={multiple}
      aria-labelledby={`${testId}-label`}
      data-testid={`${testId}-menu`}
      className={menuClasses}
      style={menuStyle}
      onMouseDown={(e) => e.preventDefault()} // Prevent stealing focus from input
    >
      {/* Search Input - Only show if searchable */}
      {searchable && (
        <div 
          className="w-full px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          data-testid={`${testId}-search-container`}
        >
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Type to search..."
            aria-label="Search options"
            aria-controls={`${testId}-menu`}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className={searchInputClass}
            data-testid={`${testId}-search`}
            onClick={(e) => e.stopPropagation()} // Prevent closing menu
          />
        </div>
      )}

      {/* Options Container */}
      <div 
        className="overflow-y-auto"
        style={{ maxHeight: 'calc(250px - 40px)' }} // Subtract search input height if present
        role="presentation"
        data-testid={`${testId}-options-container`}
      >
        {!hasOptions ? (
          <div 
            className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-sm"
            data-testid={`${testId}-no-options`}
          >
            {searchQuery ? 'No matches found' : 'No options available'}
          </div>
        ) : (
          groupedOptions.map((group, groupIndex) => (
            <React.Fragment key={`${group.label}-${groupIndex}`}>
              {/* Group Label - Only show if group has options */}
              {group.options.length > 0 && (
                <div
                  id={`group-${group.label}-${groupIndex}`}
                  aria-label={group.ariaLabel || group.label}
                  aria-labelledby={`group-${group.label}-${groupIndex}`}
                  role="group"
                  className={getGroupClass}
                  data-testid={`${testId}-group-${group.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {group.label}
                </div>
              )}

              {/* Group Options */}
              {group.options.map((option, index) => {
                const absoluteIndex = filteredOptions.findIndex((opt: SelectOption) => opt.value === option.value);
                const isOptionSelected = isSelected(option);
                const isOptionFocused = focusedIndex === absoluteIndex;
                const isOptionDisabled = option.disabled || disabled;

                // ✅ FIXED: Get option classes with all required parameters
                const optionClasses = getOptionClasses(
                  size,
                  isOptionSelected,
                  isOptionFocused,
                  isOptionDisabled,
                  cn(optionClassName, option.className)
                );

                return (
                  <div
                    key={`${option.value}-${index}`}
                    role="option"
                    aria-selected={isOptionSelected}
                    aria-disabled={isOptionDisabled}
                    aria-label={option.label}
                    id={`${testId}-option-${option.value}`}
                    data-testid={`${testId}-option-${option.value}`}
                    data-value={option.value}
                    data-selected={isOptionSelected}
                    data-focused={isOptionFocused}
                    data-disabled={isOptionDisabled}
                    className={optionClasses}
                    onClick={(event) => handleOptionClick(option, event)}
                    onMouseEnter={() => handleOptionMouseEnter(absoluteIndex)}
                    onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
                    tabIndex={isOptionDisabled ? -1 : 0}
                  >
                    {renderOption ? (
                      renderOption(option, {
                        isSelected: isOptionSelected,
                        isFocused: isOptionFocused,
                        isDisabled: isOptionDisabled,
                      })
                    ) : (
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {option.icon && (
                              <span 
                                className="flex-shrink-0"
                                data-testid={`${testId}-option-icon-${option.value}`}
                              >
                                {option.icon}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div 
                                className={cn(
                                  'block truncate',
                                  isOptionSelected 
                                    ? 'text-primary-700 dark:text-primary-300 font-medium' 
                                    : 'text-gray-900 dark:text-gray-100',
                                  isOptionDisabled && 'opacity-50'
                                )}
                                data-testid={`${testId}-option-label-${option.value}`}
                              >
                                {option.label}
                              </div>
                              {option.description && (
                                <div 
                                  className="block text-xs truncate mt-0.5"
                                  data-testid={`${testId}-option-description-${option.value}`}
                                >
                                  {option.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {multiple && (
                          <div className="flex-shrink-0 ml-2">
                            <input
                              type="checkbox"
                              checked={isOptionSelected}
                              disabled={isOptionDisabled}
                              aria-label={`Select ${option.label}`}
                              className={cn(
                                'h-4 w-4 rounded border-gray-300 dark:border-gray-600',
                                'text-primary-600 dark:text-primary-400',
                                'focus:ring-primary-500 dark:focus:ring-primary-400',
                                isOptionDisabled && 'opacity-50 cursor-not-allowed'
                              )}
                              onChange={() => {}} // Controlled by parent click
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isOptionDisabled) {
                                  handleOptionClick(option, e as any);
                                }
                              }}
                              readOnly
                              data-testid={`${testId}-option-checkbox-${option.value}`}
                            />
                          </div>
                        )}
                        {!multiple && isOptionSelected && (
                          <div className="flex-shrink-0 ml-2">
                            <svg 
                              className="w-5 h-5 text-primary-600 dark:text-primary-400" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              data-testid={`${testId}-option-checkmark-${option.value}`}
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M5 13l4 4L19 7" 
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}

        {/* Virtualization Indicator - Only show if virtualization is enabled and we have more options */}
        {enableVirtualization && filteredOptions.length > visibleOptions.length && (
          <div 
            className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700"
            data-testid={`${testId}-virtualization-indicator`}
          >
            Showing {visibleOptions.length} of {filteredOptions.length} options
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              (Scroll to load more)
            </div>
          </div>
        )}
      </div>

      {/* Loading State - If options are loading */}
      {filteredOptions.length === 0 && searchQuery && (
        <div 
          className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-sm"
          data-testid={`${testId}-searching`}
        >
          Searching...
        </div>
      )}
    </div>
  );
};

SelectMenu.displayName = 'SelectMenu';

export default SelectMenu;
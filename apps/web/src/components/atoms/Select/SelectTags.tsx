// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Select\SelectTags.tsx
import * as React from 'react';
import { SelectOption } from './Select.types';
import { getTagClasses, selectClasses } from './Select.styles';

interface SelectTagsProps {
  selectedOptions: SelectOption[];
  disabled?: boolean;
  loading?: boolean;
  testId?: string;
  onRemove: (option: SelectOption) => void;
}

export const SelectTags = React.memo(({
  selectedOptions,
  disabled = false,
  loading = false,
  testId = 'select',
  onRemove,
}: SelectTagsProps) => {
  
  if (!selectedOptions || !Array.isArray(selectedOptions) || selectedOptions.length === 0) {
    return null;
  }
  
  return (
    <div className={selectClasses.tags.container}>
      {selectedOptions.slice(0, 3).map((option) => (
        <div
          key={option.value}
          className={getTagClasses(true, option.className)}
          data-testid={`${testId}-tag-${option.value}`}
        >
          <span className="truncate">{option.label}</span>
          {!disabled && !loading && (
            <button
              type="button"
              className={selectClasses.tags.tag.remove}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(option);
              }}
              aria-label={`Remove ${option.label}`}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {selectedOptions.length > 3 && (
        <div className={getTagClasses(false)}>
          +{selectedOptions.length - 3} more
        </div>
      )}
    </div>
  );
});

SelectTags.displayName = 'SelectTags';
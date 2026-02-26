// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Select\SelectFocusManager.tsx
import * as React from 'react';

/**
 * Custom hook for robust focus management without setTimeout
 */
export function useFocusWithin(
  ref: React.RefObject<HTMLElement>,
  onFocusWithinChange?: (isFocusWithin: boolean) => void
) {
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocusIn = (_event: FocusEvent) => {
      if (element.contains(document.activeElement)) {
        onFocusWithinChange?.(true);
      }
    };

    const handleFocusOut = (_event: FocusEvent) => {
      // Use setTimeout to check after focus has moved
      setTimeout(() => {
        if (!element.contains(document.activeElement)) {
          onFocusWithinChange?.(false);
        }
      }, 0);
    };

    element.addEventListener('focusin', handleFocusIn);
    element.addEventListener('focusout', handleFocusOut);

    return () => {
      element.removeEventListener('focusin', handleFocusIn);
      element.removeEventListener('focusout', handleFocusOut);
    };
  }, [ref, onFocusWithinChange]);
}

/**
 * Hook to manage active descendant for better screen reader support
 */
export function useActiveDescendant(
  focusedIndex: number,
  options: Array<{ value: string | number }>,
  testId: string
): string | undefined {
  return React.useMemo(() => {
    if (focusedIndex >= 0 && focusedIndex < options.length) {
      const option = options[focusedIndex];
      return `${testId}-option-${option.value}`;
    }
    return undefined;
  }, [focusedIndex, options, testId]);
}

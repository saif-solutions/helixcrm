// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Input\index.ts

// ============================================================================
// Re-export all components
// ============================================================================
export {
  Input,
  TextInput,
  EmailInput,
  PasswordInput,
  NumberInput,
} from './Input';

// ============================================================================
// Re-export all types
// ============================================================================
export type {
  InputProps,
  InputRef,
  InputVariant,
  InputSize,
  InputAccessibilityProps,
  InputState,
  TextInputProps,
  EmailInputProps,
  PasswordInputProps,
  NumberInputProps,
  LabeledInputProps,
  IconPosition,
  EnhancedInputProps,
  InputValidationRule,
} from './Input.types';

// ============================================================================
// Re-export style utilities
// ============================================================================
export {
  inputTokens,
  getInputClasses,
  getIconContainerClasses,
  getWrapperClasses,
  getLabelClasses,
  getHelperClasses,
  generateInputId,
  getAriaDescribedBy,
} from './Input.styles';

// ============================================================================
// Re-export utility functions (type guards)
// ============================================================================
export {
  hasInputError,
  isInputRequired,
  getInputAccessibilityProps,
} from './Input.types';
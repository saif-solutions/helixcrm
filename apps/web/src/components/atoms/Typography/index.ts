// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Typography\index.ts

// ============================================================================
// Re-export all components
// ============================================================================
export {
  Typography,
  Display,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Body,
  BodySmall,
  Caption,
  Label,
  Code,
} from './Typography';

// ============================================================================
// Re-export all types
// ============================================================================
export type {
  TypographyProps,
  TypographyRef,
  TypographyElement,
  TypographyVariant,
  TypographyColor,
  TypographyWeight,
  TypographyAlign,
  DisplayProps,
  H1Props,
  H2Props,
  H3Props,
  H4Props,
  H5Props,
  H6Props,
  BodyProps,
  BodySmallProps,
  CaptionProps,
  LabelProps,
  CodeProps,
  TypographyAccessibilityProps,
} from './Typography.types';

// ============================================================================
// Re-export style utilities
// ============================================================================
export {
  typographyTokens,
  typographyClasses,
  getTypographyClasses,
  getLineClampStyles,
  getTypographyElement,
  getTypographyFontFamily,
  defaultTypographyProps,
  isMonospaceVariant,  // <-- MOVED FROM BELOW
} from './Typography.styles';

// ============================================================================
// Re-export utility functions
// ============================================================================
export {
  getTypographyRole,
  getTypographyAriaLevel,
  isTypographyHeading,
  isTypographyInline,
} from './Typography.types';
// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Icon\index.ts

// ============================================================================
// Re-export all components
// ============================================================================
export {
  Icon,
  CheckIcon,
  XIcon,
  LoadingIcon,
  InfoIcon,
  WarningIcon,
  ErrorIcon,
  StatusIcon,
  IconButton,
  IconGroup,
  IconProvider,
} from './Icon';

// ============================================================================
// Re-export all types
// ============================================================================
export type {
  IconProps,
  IconRef,
  IconSize,
  IconColor,
  CheckIconProps,
  XIconProps,
  LoadingIconProps,
  InfoIconProps,
  WarningIconProps,
  ErrorIconProps,
  StatusIconProps,
  IconDimensions,
  IconAccessibilityProps,
  IconAnimation,
  IconMetadata,
  IconPackConfig,
  IconContextValue,
} from './Icon.types';

// ============================================================================
// Re-export style utilities
// ============================================================================
export {
  iconTokens,
  iconClasses,
  getIconClasses,
  getSvgClasses,
  getBadgePositionClasses,
  getTooltipPositionClasses,
  defaultIconProps,
  defaultFallbackIconPath,
  iconPaths,
  getStrokeWidth,
  createIconSvg,
} from './Icon.styles';

// ============================================================================
// Re-export utility functions
// ============================================================================
export {
  getIconDimensions,
  hasIconChildren,
  shouldIconSpin,
  getStatusIconColor,
  isIconDecorative,
  getIconAccessibilityProps,
  getIconTransform,
  getIconClassNames,
  isValidBadge,
} from './Icon.types';

// ============================================================================
// Re-export hooks
// ============================================================================
export { useIconConfig } from './Icon';
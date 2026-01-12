// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Badge\index.ts
// ============================================================================
// Re-export all components
// ============================================================================
export {
  Badge,
  PrimaryBadge,
  SuccessBadge,
  ErrorBadge,
  WarningBadge,
} from './Badge';

// ============================================================================
// Re-export all types
// ============================================================================
export type {
  BadgeProps,
  BadgeRef,
  BadgeVariant,
  BadgeSize,
  BadgeShape,
  PrimaryBadgeProps,
  SuccessBadgeProps,
  ErrorBadgeProps,
  WarningBadgeProps,
  ClickableBadgeProps,
  IconBadgeProps,
  BadgeAccessibilityProps,
  BadgeTheme,
  BadgeState,
} from './Badge.types';

// ============================================================================
// Re-export style utilities
// ============================================================================
export {
  badgeTokens,
  badgeClasses,
  getBadgeClasses,
  getIconContainerClasses,
  defaultBadgeStyleProps,
} from './Badge.styles';

// ============================================================================
// Re-export utility functions
// ============================================================================
export {
  isBadgeClickable,
  hasBadgeIcon,
  getBadgeRole,
  getBadgeTabIndex,
} from './Badge.types';
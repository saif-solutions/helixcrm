// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Avatar\index.ts
// ============================================================================
// Re-export all components
// ============================================================================
export {
  Avatar,
  AvatarXS,
  AvatarSM,
  AvatarMD,
  AvatarLG,
} from './Avatar';

// ============================================================================
// Re-export all types
// ============================================================================
export type {
  AvatarProps,
  AvatarRef,
  AvatarSize,
  AvatarColor,
  AvatarShape,
  AvatarStatus,
  StatusPosition,
  AvatarXSProps,
  AvatarSMProps,
  AvatarMDProps,
  AvatarLGProps,
  ImageAvatarProps,
  FallbackAvatarProps,
  AvatarAccessibilityProps,
} from './Avatar.types';

// ============================================================================
// Re-export style utilities
// ============================================================================
export {
  avatarTokens,
  avatarClasses,
  getAvatarClasses,
  getImageClasses,
  getFallbackClasses,
  getStatusClasses,
  defaultAvatarStyleProps,
  getStatusAccessibilityLabel,
  getAvatarInitialsAttribute,
} from './Avatar.styles';

// ============================================================================
// Re-export utility functions
// ============================================================================
export {
  getAvatarInitials,
  hasAvatarImage,
  hasAvatarStatus,
} from './Avatar.types';
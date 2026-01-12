// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Alert\index.ts

// Re-export components
export { 
  Alert, 
  InfoAlert, 
  SuccessAlert, 
  ErrorAlert, 
  WarningAlert 
} from './Alert';

// Re-export types
export type { 
  AlertProps, 
  AlertRef,
  AlertVariant,
  AlertSize,
  InfoAlertProps,
  SuccessAlertProps,
  ErrorAlertProps,
  WarningAlertProps,
  AlertState,
  AlertDismissOptions,
  AlertAccessibilityProps
} from './Alert.types';

// Re-export type utilities
export {
  hasAlertTitle,
  hasAlertActions,
  isAlertDismissible,
  getAlertRole,
  getAlertAriaLive,
  getAlertIconSize,
  shouldAlertAnnounce
} from './Alert.types';

// Re-export style utilities
export { 
  alertTokens,
  alertClasses,
  getAlertContainerClasses,
  getAlertIconClasses,
  getVariantColorClasses,
  getAlertSizeDimensions,
  getDismissButtonClasses,
  hasAlertContent,
  defaultAlertProps
} from './Alert.styles';

// Re-export style types
export type { AlertStyleProps } from './Alert.styles';
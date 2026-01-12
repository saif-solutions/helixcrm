// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Avatar\Avatar.styles.ts
import { AvatarSize, AvatarColor, AvatarShape, AvatarStatus, StatusPosition } from './Avatar.types';

/**
 * Design tokens for Avatar component (following Tailwind CSS system)
 */
export const avatarTokens = {
  // Size tokens (width/height in pixels)
  size: {
    xs: 24,  // 6 * 4px
    sm: 32,  // 8 * 4px
    md: 40,  // 10 * 4px
    lg: 48,  // 12 * 4px
    xl: 64,  // 16 * 4px
  },
  
  // Font size tokens
  fontSize: {
    xs: '0.75rem',    // text-xs
    sm: '0.875rem',   // text-sm
    md: '1rem',       // text-base
    lg: '1.125rem',   // text-lg
    xl: '1.25rem',    // text-xl
  },
  
  // Status indicator size tokens
  statusSize: {
    xs: 6,   // 1.5 * 4px
    sm: 8,   // 2 * 4px
    md: 10,  // 2.5 * 4px
    lg: 12,  // 3 * 4px
    xl: 16,  // 4 * 4px
  },
};

/**
 * CSS class definitions for Avatar component
 */
export const avatarClasses = {
  // Base classes (applied to all avatars)
  base: [
    'relative',
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'select-none',
    'overflow-hidden',
  ].join(' '),
  
  // Size classes (width, height, font size)
  size: {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  },
  
  // Shape classes (border radius)
  shape: {
    circle: 'rounded-full',
    square: 'rounded',
    rounded: 'rounded-lg',
  },
  
  // Color classes (background and text colors for fallback)
  color: {
    primary: [
      'bg-primary-100',
      'dark:bg-primary-900',
      'text-primary-800',
      'dark:text-primary-200',
    ].join(' '),
    secondary: [
      'bg-secondary-100',
      'dark:bg-secondary-900',
      'text-secondary-800',
      'dark:text-secondary-200',
    ].join(' '),
    success: [
      'bg-success-100',
      'dark:bg-success-900',
      'text-success-800',
      'dark:text-success-200',
    ].join(' '),
    error: [
      'bg-error-100',
      'dark:bg-error-900',
      'text-error-800',
      'dark:text-error-200',
    ].join(' '),
    warning: [
      'bg-warning-100',
      'dark:bg-warning-900',
      'text-warning-800',
      'dark:text-warning-200',
    ].join(' '),
    info: [
      'bg-info-100',
      'dark:bg-info-900',
      'text-info-800',
      'dark:text-info-200',
    ].join(' '),
    gray: [
      'bg-gray-100',
      'dark:bg-gray-800',
      'text-gray-800',
      'dark:text-gray-200',
    ].join(' '),
  },
  
  // Image classes
  image: {
    base: 'object-cover w-full h-full',
  },
  
  // Fallback classes
  fallback: {
    base: 'flex items-center justify-center w-full h-full',
  },
  
  // Status indicator classes
  status: {
    // Base status classes
    base: [
      'absolute',
      'border-2',
      'border-white',
      'dark:border-gray-900',
      'rounded-full',
      'box-content',
    ].join(' '),
    
    // Status colors
    color: {
      online: 'bg-success-500',
      offline: 'bg-gray-400',
      away: 'bg-warning-500',
      busy: 'bg-error-500',
      none: 'hidden',
    },
    
    // Status sizes (matches avatar size proportionally)
    size: {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
    },
    
    // Status positions
    position: {
      'top-right': 'top-0 right-0',
      'top-left': 'top-0 left-0',
      'bottom-right': 'bottom-0 right-0',
      'bottom-left': 'bottom-0 left-0',
    },
  },
  
  // State classes
  state: {
    hasImage: 'bg-opacity-20',
    loading: 'animate-pulse',
    error: 'opacity-50',
  },
};

/**
 * Utility function to build Avatar container CSS classes
 */
export function getAvatarClasses(
  size: AvatarSize = 'md',
  shape: AvatarShape = 'circle',
  color: AvatarColor = 'primary',
  hasImage: boolean = false,
  className?: string
): string {
  const classes = [
    // Base classes
    avatarClasses.base,
    
    // Size
    avatarClasses.size[size],
    
    // Shape
    avatarClasses.shape[shape],
    
    // Color (only applied when no image)
    !hasImage && avatarClasses.color[color],
    
    // State
    hasImage && avatarClasses.state.hasImage,
    
    // Custom classes
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get image classes
 */
export function getImageClasses(shape: AvatarShape = 'circle', className?: string): string {
  const classes = [
    avatarClasses.image.base,
    avatarClasses.shape[shape],
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get fallback classes
 */
export function getFallbackClasses(className?: string): string {
  const classes = [
    avatarClasses.fallback.base,
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get status indicator classes
 */
export function getStatusClasses(
  status: AvatarStatus = 'none',
  size: AvatarSize = 'md',
  position: StatusPosition = 'bottom-right',
  className?: string
): string {
  const classes = [
    avatarClasses.status.base,
    avatarClasses.status.color[status],
    avatarClasses.status.size[size],
    avatarClasses.status.position[position],
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to check if status should be visible
 */
export function shouldShowStatus(status: AvatarStatus): boolean {
  return status !== 'none';
}

/**
 * Default style props for Avatar
 */
export const defaultAvatarStyleProps = {
  borderWidth: '2px',
  borderColor: 'white',
  transition: 'all 0.2s ease',
};

/**
 * Get accessibility label for status indicator
 */
export function getStatusAccessibilityLabel(status: AvatarStatus): string {
  const labels: Record<AvatarStatus, string> = {
    online: 'Online',
    offline: 'Offline',
    away: 'Away',
    busy: 'Busy',
    none: '',
  };
  
  return labels[status];
}

/**
 * Utility function to get data-initials attribute
 */
export function getAvatarInitialsAttribute(fallback?: string): string {
  if (!fallback) return '?';
  
  const words = fallback.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  } else if (words.length >= 2) {
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }
  
  return '?';
}
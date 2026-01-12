// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Avatar\Avatar.types.ts
import * as React from 'react';

/**
 * Main Avatar component props with comprehensive JSDoc
 */
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 
   * Avatar size
   * @default 'md'
   */
  size?: AvatarSize;
  
  /** 
   * Image source URL
   */
  src?: string;
  
  /** 
   * Alternative text for the image (accessibility)
   * @default 'Avatar'
   */
  alt?: string;
  
  /** 
   * Fallback text (initials) when no image is provided or image fails to load
   */
  fallback?: string;
  
  /** 
   * Background color when using fallback (no image)
   * @default 'primary'
   */
  color?: AvatarColor;
  
  /** 
   * Shape of the avatar
   * @default 'circle'
   */
  shape?: AvatarShape;
  
  /** 
   * Status indicator to show user availability
   * @default 'none'
   */
  status?: AvatarStatus;
  
  /** 
   * Position of the status indicator
   * @default 'bottom-right'
   */
  statusPosition?: StatusPosition;
  
  /** 
   * Custom CSS class name for the image element
   */
  imageClassName?: string;
  
  /** 
   * Custom CSS class name for the fallback element
   */
  fallbackClassName?: string;
  
  /** 
   * Custom CSS class name for the status indicator
   */
  statusClassName?: string;
  
  /** 
   * Data attribute for testing (testing-library)
   * @default 'avatar'
   */
  'data-testid'?: string;
  
  /** 
   * Data attribute for analytics tracking
   */
  'data-analytics'?: string;
  
  /** 
   * Data attribute for Cypress testing
   */
  'data-cy'?: string;
}

/**
 * Avatar size variants
 */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Avatar color variants (for fallback background)
 */
export type AvatarColor = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'gray';

/**
 * Avatar shape variants
 */
export type AvatarShape = 'circle' | 'square' | 'rounded';

/**
 * Avatar status variants (user availability)
 */
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy' | 'none';

/**
 * Status indicator position
 */
export type StatusPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

/**
 * Avatar ref type for forwardRef
 */
export type AvatarRef = HTMLDivElement;

/**
 * Props for predefined avatar size components
 */
export type AvatarXSProps = Omit<AvatarProps, 'size'>;
export type AvatarSMProps = Omit<AvatarProps, 'size'>;
export type AvatarMDProps = Omit<AvatarProps, 'size'>;
export type AvatarLGProps = Omit<AvatarProps, 'size'>;

/**
 * Utility type for avatar with image
 */
export type ImageAvatarProps = AvatarProps & {
  /** Required when using image */
  src: string;
  alt: string;
};

/**
 * Utility type for avatar with fallback only
 */
export type FallbackAvatarProps = AvatarProps & {
  /** Required when using fallback */
  fallback: string;
  src?: never;
};

/**
 * Type guard to check if avatar has image
 */
export function hasAvatarImage(props: Pick<AvatarProps, 'src'>): boolean {
  return !!props.src;
}

/**
 * Type guard to check if avatar should show status
 */
export function hasAvatarStatus(props: Pick<AvatarProps, 'status'>): boolean {
  return props.status !== 'none';
}

/**
 * Utility function to extract initials from fallback text
 */
export function getAvatarInitials(fallback?: string): string {
  if (!fallback) return '?';
  
  // Clean and split the fallback text
  const words = fallback.trim().split(/\s+/);
  
  // Extract first letters from first and last words
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  } else if (words.length >= 2) {
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }
  
  return '?';
}

/**
 * Accessibility props for Avatar
 */
export interface AvatarAccessibilityProps {
  /** ARIA role for the avatar */
  role?: 'img';
  
  /** ARIA label for the avatar */
  'aria-label'?: string;
  
  /** ARIA description for the avatar */
  'aria-describedby'?: string;
}
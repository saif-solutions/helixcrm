// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Avatar\Avatar.tsx
import * as React from 'react';
import {
  AvatarProps,
  AvatarRef,
  AvatarXSProps,
  AvatarSMProps,
  AvatarMDProps,
  AvatarLGProps,
  getAvatarInitials,
  hasAvatarImage,
  hasAvatarStatus,
} from './Avatar.types';
import {
  getAvatarClasses,
  getImageClasses,
  getFallbackClasses,
  getStatusClasses,
  getStatusAccessibilityLabel,
} from './Avatar.styles';

/**
 * Enterprise Avatar component for user profile images or initials.
 * 
 * Features:
 * - Image support with lazy loading and error handling
 * - Fallback initials extraction from names (1-2 characters)
 * - Multiple sizes (xs, sm, md, lg, xl)
 * - Multiple shapes (circle, square, rounded)
 * - Status indicators (online, offline, away, busy)
 * - Status positions (all corners)
 * - Customizable colors for fallback
 * - Full accessibility compliance (WCAG 2.1 AA)
 * - Forward ref support
 * - Performance optimized (memoized)
 * - Dark mode support
 * - Data attributes for testing/analytics
 * - TypeScript strict mode compliance
 * 
 * @example
 * ```tsx
 * // With image
 * <Avatar src="/user.jpg" alt="User" />
 * 
 * // With fallback initials
 * <Avatar fallback="John Doe" status="online" />
 * 
 * // Predefined size components
 * <AvatarXS fallback="JD" />
 * <AvatarSM fallback="JS" />
 * ```
 */
export const Avatar = React.memo(
  React.forwardRef<AvatarRef, AvatarProps>(
    (
      {
        size = 'md',
        src,
        alt = 'Avatar',
        fallback,
        color = 'primary',
        shape = 'circle',
        status = 'none',
        statusPosition = 'bottom-right',
        imageClassName,
        fallbackClassName,
        statusClassName,
        className,
        'data-testid': testId = 'avatar',
        'data-analytics': analyticsId,
        'data-cy': cyId,
        ...props
      }: AvatarProps,
      ref: React.Ref<AvatarRef>
    ) => {
      const [imageError, setImageError] = React.useState(false);
      const hasImage = hasAvatarImage({ src }) && !imageError;
      const showStatus = hasAvatarStatus({ status });
      
      // Get initials from fallback text (1-2 characters max)
      const initials = getAvatarInitials(fallback);

      // Build CSS classes using utility functions
      const containerClasses = getAvatarClasses(size, shape, color, hasImage, className);
      const imageClasses = getImageClasses(shape, imageClassName);
      const fallbackClasses = getFallbackClasses(fallbackClassName);
      
      // Get status classes if needed
      const statusClasses = showStatus 
        ? getStatusClasses(status, size, statusPosition, statusClassName)
        : '';
      
      // Get status accessibility label
      const statusLabel = showStatus 
        ? getStatusAccessibilityLabel(status)
        : '';

      return (
        <div 
          ref={ref} 
          className={containerClasses} 
          role="img"
          aria-label={alt}
          data-testid={testId}
          data-analytics={analyticsId}
          data-cy={cyId}
          {...props}
        >
          {/* Image (if provided and no error) */}
          {hasImage && (
            <img
              src={src}
              alt={alt}
              className={imageClasses}
              onError={() => setImageError(true)}
              loading="lazy"
              data-testid={`${testId}-image`}
            />
          )}
          
          {/* Fallback (when no image or image failed to load) */}
          {!hasImage && (
            <div 
              className={fallbackClasses}
              data-testid={`${testId}-fallback`}
              data-initials={initials}
            >
              {initials}
            </div>
          )}
          
          {/* Status Indicator (if enabled) */}
          {showStatus && (
            <span 
              className={statusClasses} 
              aria-label={`Status: ${statusLabel}`}
              role="status"
              data-testid={`${testId}-status`}
            />
          )}
        </div>
      );
    }
  )
);

Avatar.displayName = 'Avatar';

// ============================================================================
// Predefined Avatar Sizes (for convenience and consistent usage)
// ============================================================================

/**
 * Extra Small Avatar (24x24px)
 * @example
 * ```tsx
 * <AvatarXS fallback="JD" />
 * ```
 */
export const AvatarXS = React.memo(
  React.forwardRef<AvatarRef, AvatarXSProps>(
    (props: AvatarXSProps, ref: React.Ref<AvatarRef>) => (
      <Avatar ref={ref} size="xs" {...props} />
    )
  )
);
AvatarXS.displayName = 'AvatarXS';

/**
 * Small Avatar (32x32px)
 * @example
 * ```tsx
 * <AvatarSM fallback="JS" />
 * ```
 */
export const AvatarSM = React.memo(
  React.forwardRef<AvatarRef, AvatarSMProps>(
    (props: AvatarSMProps, ref: React.Ref<AvatarRef>) => (
      <Avatar ref={ref} size="sm" {...props} />
    )
  )
);
AvatarSM.displayName = 'AvatarSM';

/**
 * Medium Avatar (40x40px)
 * @example
 * ```tsx
 * <AvatarMD fallback="MD" />
 * ```
 */
export const AvatarMD = React.memo(
  React.forwardRef<AvatarRef, AvatarMDProps>(
    (props: AvatarMDProps, ref: React.Ref<AvatarRef>) => (
      <Avatar ref={ref} size="md" {...props} />
    )
  )
);
AvatarMD.displayName = 'AvatarMD';

/**
 * Large Avatar (48x48px)
 * @example
 * ```tsx
 * <AvatarLG fallback="LG" />
 * ```
 */
export const AvatarLG = React.memo(
  React.forwardRef<AvatarRef, AvatarLGProps>(
    (props: AvatarLGProps, ref: React.Ref<AvatarRef>) => (
      <Avatar ref={ref} size="lg" {...props} />
    )
  )
);
AvatarLG.displayName = 'AvatarLG';
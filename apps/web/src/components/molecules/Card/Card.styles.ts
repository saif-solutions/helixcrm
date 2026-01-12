// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Card\Card.styles.ts
import { CardVariant, CardSize } from './Card.types';

/**
 * Design tokens for Card component
 */
export const cardTokens = {
  // Spacing tokens (in rem units)
  spacing: {
    sm: '1rem',     // 16px
    md: '1.5rem',   // 24px
    lg: '2rem',     // 32px
  },
  
  // Color tokens (Tailwind color palette)
  colors: {
    background: {
      default: 'bg-white',
      transparent: 'bg-transparent',
    },
    border: {
      default: 'border-gray-200',
      outline: 'border-gray-300',
      none: 'border-0',
    },
    text: {
      title: 'text-gray-900',
      subtitle: 'text-gray-500',
    },
  },
  
  // Typography tokens
  typography: {
    title: 'text-lg font-semibold',
    subtitle: 'text-sm',
  },
  
  // Border radius tokens
  borderRadius: 'rounded-lg',
  
  // Border width tokens
  borderWidth: 'border',
  
  // Transition tokens
  transition: 'transition-all duration-200',
  
  // Shadow tokens
  shadow: {
    none: 'shadow-none',
    default: 'shadow',
    medium: 'shadow-md',
    large: 'shadow-lg',
  },
};

/**
 * CSS class definitions for Card component
 */
export const cardClasses = {
  // Base classes (always applied)
  base: 'rounded-lg transition-all duration-200',
  
  // Variant classes
  variant: {
    default: `${cardTokens.colors.background.default} ${cardTokens.borderWidth} ${cardTokens.colors.border.default}`,
    outline: `${cardTokens.colors.background.transparent} ${cardTokens.borderWidth} ${cardTokens.colors.border.outline}`,
    ghost: `${cardTokens.colors.background.transparent} ${cardTokens.colors.border.none} ${cardTokens.shadow.none}`,
    elevated: `${cardTokens.colors.background.default} ${cardTokens.borderWidth} ${cardTokens.colors.border.default} ${cardTokens.shadow.large}`,
  },
  
  // Size classes
  size: {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  },
  
  // Hover effects
  hover: {
    base: 'hover:shadow-md hover:border-gray-300',
    clickable: 'active:scale-[0.99]',
  },
  
  // Content classes
  content: 'flex-1',
  
  // Header classes
  header: 'mb-4',
  
  // Title classes
  title: `${cardTokens.typography.title} ${cardTokens.colors.text.title}`,
  
  // Subtitle classes
  subtitle: `${cardTokens.typography.subtitle} ${cardTokens.colors.text.subtitle} mt-1`,
  
  // Footer classes
  footer: 'mt-6 pt-4 border-t border-gray-100',
  
  // Actions classes
  actions: 'flex items-center gap-2',
  
  // Image classes
  image: {
    container: 'mb-4 -mx-6 -mt-6 first:rounded-t-lg overflow-hidden',
    image: 'w-full object-cover',
  },
  
  // Cursor classes
  cursor: {
    clickable: 'cursor-pointer',
    default: '',
  },
  
  // Accessibility classes
  accessibility: {
    focus: 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
    reducedMotion: 'motion-reduce:transition-none',
  },
};

/**
 * Utility function to build card container classes
 */
export function getCardContainerClasses(
  variant: CardVariant = 'default',
  size: CardSize = 'md',
  hoverable: boolean = false,
  clickable: boolean = false,
  className?: string
): string {
  const classes = [
    // Base classes
    cardClasses.base,
    
    // Variant classes
    cardClasses.variant[variant],
    
    // Size classes
    cardClasses.size[size],
    
    // Hover effects
    hoverable ? cardClasses.hover.base : '',
    clickable ? cardClasses.hover.clickable : '',
    
    // Cursor
    clickable ? cardClasses.cursor.clickable : cardClasses.cursor.default,
    
    // Accessibility
    cardClasses.accessibility.focus,
    cardClasses.accessibility.reducedMotion,
    
    // Custom classes
    className || '',
  ];
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to get variant specific classes
 */
export function getVariantClasses(variant: CardVariant): string {
  return cardClasses.variant[variant];
}

/**
 * Utility function to get size classes
 */
export function getSizeClasses(size: CardSize): string {
  return cardClasses.size[size];
}

/**
 * Utility function to get hover classes
 */
export function getHoverClasses(hoverable: boolean, clickable: boolean): string {
  const classes = [];
  
  if (hoverable) {
    classes.push(cardClasses.hover.base);
  }
  
  if (clickable) {
    classes.push(cardClasses.hover.clickable);
  }
  
  return classes.join(' ');
}

/**
 * Utility function to get cursor class
 */
export function getCursorClass(clickable: boolean): string {
  return clickable ? cardClasses.cursor.clickable : cardClasses.cursor.default;
}

/**
 * Utility function to get image container classes
 */
export function getImageContainerClasses(): string {
  return cardClasses.image.container;
}

/**
 * Utility function to get image classes
 */
export function getImageClasses(): string {
  return cardClasses.image.image;
}

/**
 * Default style props for Card
 */
export const defaultCardProps = {
  spacing: cardTokens.spacing.md,
  borderRadius: cardTokens.borderRadius,
  transition: cardTokens.transition,
};

export type CardStyleProps = typeof defaultCardProps;
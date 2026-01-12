// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Card\Card.types.ts
import * as React from 'react';

/**
 * Main Card component props with comprehensive JSDoc
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 
   * Card variant style
   * @default 'default'
   */
  variant?: CardVariant;
  
  /** 
   * Card size
   * @default 'md'
   */
  size?: CardSize;
  
  /** 
   * Whether card is hoverable (adds hover effects)
   */
  hoverable?: boolean;
  
  /** 
   * Whether card is clickable (adds cursor and role)
   */
  clickable?: boolean;
  
  /** 
   * Custom class name for content area
   */
  contentClassName?: string;
  
  /** 
   * Card title (optional - displayed in header)
   */
  title?: string;
  
  /** 
   * Card subtitle (optional - displayed under title)
   */
  subtitle?: string;
  
  /** 
   * Custom header content (overrides title/subtitle)
   */
  header?: React.ReactNode;
  
  /** 
   * Custom footer content
   */
  footer?: React.ReactNode;
  
  /** 
   * Card image configuration
   */
  image?: CardImage;
  
  /** 
   * Card actions (buttons, links, etc.)
   */
  actions?: React.ReactNode;
}

/**
 * Card visual variants
 */
export type CardVariant = 'default' | 'outline' | 'ghost' | 'elevated';

/**
 * Card size variants
 */
export type CardSize = 'sm' | 'md' | 'lg';

/**
 * Card image configuration
 */
export interface CardImage {
  /** Image source URL */
  src: string;
  /** Image alt text for accessibility */
  alt: string;
  /** Optional custom height */
  height?: string;
}

/**
 * Card ref type for forwardRef
 */
export type CardRef = HTMLDivElement;

/**
 * Card state for internal management
 */
export interface CardState {
  /** Whether card is currently hovered */
  isHovered: boolean;
  /** Whether card is currently focused (for clickable cards) */
  isFocused: boolean;
  /** Whether card is currently active (being clicked) */
  isActive: boolean;
}

/**
 * Sub-component props
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
export interface CardSubtitleProps extends React.HTMLAttributes<HTMLParagraphElement> {}
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Accessibility props for clickable cards
 */
export interface CardAccessibilityProps {
  /** ARIA role for clickable cards */
  role?: 'button' | 'link' | 'article';
  /** Tab index for keyboard navigation */
  tabIndex?: number;
  /** ARIA label for screen readers */
  'aria-label'?: string;
  /** ARIA description for additional context */
  'aria-describedby'?: string;
  /** Whether element is disabled */
  'aria-disabled'?: boolean;
}

/**
 * Type guard to check if card has header content
 */
export function hasCardHeader(props: Pick<CardProps, 'header' | 'title' | 'subtitle'>): boolean {
  return !!(props.header || props.title || props.subtitle);
}

/**
 * Type guard to check if card has footer content
 */
export function hasCardFooter(props: Pick<CardProps, 'footer' | 'actions'>): boolean {
  return !!(props.footer || props.actions);
}

/**
 * Type guard to check if card has image
 */
export function hasCardImage(props: Pick<CardProps, 'image'>): boolean {
  return !!props.image;
}

/**
 * Type guard to check if card is interactive
 */
export function isCardInteractive(props: Pick<CardProps, 'clickable' | 'hoverable'>): boolean {
  return !!(props.clickable || props.hoverable);
}

/**
 * Get appropriate ARIA role for card
 */
export function getCardRole(clickable: boolean): CardAccessibilityProps['role'] {
  return clickable ? 'button' : undefined;
}

/**
 * Get appropriate tab index for card
 */
export function getCardTabIndex(clickable: boolean): number | undefined {
  return clickable ? 0 : undefined;
}

/**
 * Get appropriate cursor style for card
 */
export function getCardCursor(clickable: boolean): string {
  return clickable ? 'cursor-pointer' : '';
}

/**
 * Check if card should have focus styles
 */
export function shouldCardFocus(clickable: boolean): boolean {
  return clickable;
}
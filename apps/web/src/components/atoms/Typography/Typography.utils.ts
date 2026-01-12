// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Typography\Typography.utils.ts
import { TypographyVariant, TypographyColor, TypographyWeight } from './Typography.types';

/**
 * Utility functions for common typography patterns
 */

/**
 * Get appropriate typography variant for a given content type
 */
export function getVariantForContentType(
  contentType: 'title' | 'subtitle' | 'body' | 'caption' | 'label' | 'code'
): TypographyVariant {
  switch (contentType) {
    case 'title': return 'h1';
    case 'subtitle': return 'h4';
    case 'body': return 'body';
    case 'caption': return 'caption';
    case 'label': return 'label';
    case 'code': return 'code';
    default: return 'body';
  }
}

/**
 * Get appropriate color for text based on context
 */
export function getColorForContext(
  context: 'default' | 'success' | 'error' | 'warning' | 'info' | 'muted'
): TypographyColor {
  switch (context) {
    case 'success': return 'success';
    case 'error': return 'error';
    case 'warning': return 'warning';
    case 'info': return 'info';
    case 'muted': return 'muted';
    default: return 'inherit';
  }
}

/**
 * Calculate appropriate line clamp for content length
 */
export function calculateOptimalLineClamp(
  text: string,
  maxCharactersPerLine: number = 80,
  maxLines: number = 3
): number {
  const estimatedLines = Math.ceil(text.length / maxCharactersPerLine);
  return Math.min(estimatedLines, maxLines);
}

/**
 * Generate typography classes for a given readability score
 */
export function getTypographyForReadability(
  score: 'low' | 'medium' | 'high'
): { size: string; weight: string; lineHeight: string } {
  switch (score) {
    case 'low':
      return {
        size: 'text-base',
        weight: 'font-normal',
        lineHeight: 'leading-relaxed',
      };
    case 'medium':
      return {
        size: 'text-lg',
        weight: 'font-medium',
        lineHeight: 'leading-normal',
      };
    case 'high':
      return {
        size: 'text-xl',
        weight: 'font-semibold',
        lineHeight: 'leading-snug',
      };
    default:
      return {
        size: 'text-base',
        weight: 'font-normal',
        lineHeight: 'leading-relaxed',
      };
  }
}

/**
 * Truncate text with ellipsis based on character count
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Format numbers with typography considerations
 */
export function formatNumberWithTypography(
  num: number,
  variant: 'short' | 'long' | 'currency' = 'short'
): { value: string; variant: TypographyVariant; weight: TypographyWeight } {
  let formattedValue: string;
  
  switch (variant) {
    case 'short':
      formattedValue = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(num);
      break;
    case 'currency':
      formattedValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
      break;
    case 'long':
    default:
      formattedValue = new Intl.NumberFormat('en-US').format(num);
      break;
  }
  
  return {
    value: formattedValue,
    variant: 'h2',
    weight: 'bold',
  };
}
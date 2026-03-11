import * as React from 'react';
import { IconRef, IconAccessibilityProps } from './Icon.types';

interface IconChildProps {
  children: React.ReactElement<{
    className?: string;
    'data-testid'?: string;
    [key: string]: unknown;
  }>;
  iconClasses: string;
  combinedStyle: React.CSSProperties;
  testId: string;
  analyticsId?: string;
  cyId?: string;
  handleClick: (e: React.MouseEvent<SVGSVGElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<SVGSVGElement>) => void;
  onMouseEnter?: React.MouseEventHandler<SVGSVGElement>;
  onMouseLeave?: React.MouseEventHandler<SVGSVGElement>;
  onFocus?: React.FocusEventHandler<SVGSVGElement>;
  onBlur?: React.FocusEventHandler<SVGSVGElement>;
  interactive: boolean;
  disabled: boolean;
  accessibilityProps: IconAccessibilityProps;
  additionalProps: Record<string, unknown>;
  renderBadge: () => React.ReactNode;
  renderLoadingOverlay: () => React.ReactNode;
  renderWithTooltip: (content: React.ReactNode) => React.ReactNode;
  ref: React.Ref<IconRef>;
}

// Helper to safely get string value
const getStringValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value === null || value === undefined) return '';
  return '';
};

export const IconChild = React.forwardRef<IconRef, IconChildProps>(
  (
    {
      children,
      iconClasses,
      combinedStyle,
      testId,
      analyticsId,
      cyId,
      handleClick,
      handleKeyDown,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      interactive,
      disabled,
      accessibilityProps,
      additionalProps,
      renderBadge,
      renderLoadingOverlay,
      renderWithTooltip,
    },
    ref
  ) => {
    // Build props for the cloned element
    const childProps: Record<string, unknown> = {
      className: `${iconClasses} ${getStringValue(children.props.className)}`.trim(),
      style: combinedStyle,
      ref,
      'data-testid': testId,
      'data-analytics': analyticsId,
      'data-cy': cyId,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      tabIndex: interactive && !disabled ? 0 : undefined,
      ...accessibilityProps,
      ...additionalProps,
    };

    // Copy all original props except ones we're overriding
    if (children.props && typeof children.props === 'object') {
      // eslint-disable-next-line react-hooks/refs
      Object.keys(children.props as object).forEach((key) => {
        // Don't override props we've already set
        if (!(key in childProps)) {
          childProps[key] = (children.props as Record<string, unknown>)[key];
        }
      });

      // Add data-testid from children if it exists and we haven't set it
      const childTestId = (children.props as Record<string, unknown>)['data-testid'];
      if (childTestId && !childProps['data-testid'] && typeof childTestId === 'string') {
        // eslint-disable-next-line react-hooks/refs
        childProps['data-testid'] = childTestId;
      }
    }

    const wrappedIcon = (
      <div className="relative inline-block">
        {React.cloneElement(children, childProps)}
        {renderBadge()}
        {renderLoadingOverlay()}
      </div>
    );

    return <>{renderWithTooltip(wrappedIcon)}</>;
  }
);

IconChild.displayName = 'IconChild';

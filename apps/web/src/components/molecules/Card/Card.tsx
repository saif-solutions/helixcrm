// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Card\Card.tsx
import * as React from 'react';
import { cn } from '../../../lib/utils';
import { 
  CardProps, 
  CardRef,
  CardHeaderProps,
  CardTitleProps,
  CardSubtitleProps,
  CardContentProps,
  CardFooterProps,
  CardActionsProps,
  hasCardHeader,
  hasCardFooter,
  hasCardImage,
  getCardRole,
  getCardTabIndex,
} from './Card.types';
import { 
  getCardContainerClasses,
  getImageContainerClasses,
  getImageClasses,
  cardClasses
} from './Card.styles';

/**
 * Card component for content containers.
 * Supports headers, footers, images, and actions.
 */
export const Card = React.forwardRef<CardRef, CardProps>(
  (
    {
      variant = 'default',
      size = 'md',
      hoverable = false,
      clickable = false,
      contentClassName,
      title,
      subtitle,
      header,
      footer,
      image,
      actions,
      className,
      children,
      ...props
    }: CardProps,
    ref: React.Ref<CardRef>
  ) => {
    // Get container classes using utility function
    const containerClasses = getCardContainerClasses(
      variant, 
      size, 
      hoverable, 
      clickable, 
      className
    );

    // Get content classes
    const contentClasses = cn(
      cardClasses.content,
      contentClassName
    );

    // Determine if card has header/footer/image
    const hasHeader = hasCardHeader({ header, title, subtitle });
    const hasFooter = hasCardFooter({ footer, actions });
    const hasImage = hasCardImage({ image });

    // Get accessibility attributes
    const cardRole = getCardRole(clickable);
    const cardTabIndex = getCardTabIndex(clickable);

    return (
      <div
        ref={ref}
        className={containerClasses}
        role={cardRole}
        tabIndex={cardTabIndex}
        data-variant={variant}
        data-size={size}
        data-hoverable={hoverable}
        data-clickable={clickable}
        {...props}
      >
        {/* Image */}
        {hasImage && image && (
          <div className={getImageContainerClasses()}>
            <img
              src={image.src}
              alt={image.alt}
              className={getImageClasses()}
              style={{ height: image.height || 'auto' }}
            />
          </div>
        )}

        {/* Header */}
        {hasHeader && (
          <div className={cardClasses.header}>
            {header ? (
              header
            ) : (
              <>
                {title && (
                  <h3 className={cardClasses.title}>
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className={cardClasses.subtitle}>
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div className={contentClasses}>
          {children}
        </div>

        {/* Footer */}
        {hasFooter && (
          <div className={cardClasses.footer}>
            <div className="flex items-center justify-between">
              <div>{footer}</div>
              {actions && (
                <div className={cardClasses.actions}>
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  CardHeaderProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardClasses.header, className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  CardTitleProps
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(cardClasses.title, className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardSubtitle = React.forwardRef<
  HTMLParagraphElement,
  CardSubtitleProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(cardClasses.subtitle, className)}
    {...props}
  />
));
CardSubtitle.displayName = 'CardSubtitle';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  CardContentProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardClasses.content, className)}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  CardFooterProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardClasses.footer, className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export const CardActions = React.forwardRef<
  HTMLDivElement,
  CardActionsProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardClasses.actions, className)}
    {...props}
  />
));
CardActions.displayName = 'CardActions';
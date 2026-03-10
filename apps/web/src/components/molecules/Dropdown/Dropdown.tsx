// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dropdown\Dropdown.tsx
import * as React from 'react';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../../../lib/utils';
import {
  DropdownProps,
  DropdownRef,
  DropdownItemProps,
  DropdownGroupProps,
  DropdownSeparatorProps,
  DropdownLabelProps,
  DropdownShortcutProps,
  NormalizedDropdownEvent,
} from './Dropdown.types';
import {
  dropdownTokens,
  dropdownClasses,
  dropdownZIndexClasses,
  defaultDropdownStyleProps,
} from './Dropdown.styles';
import {
  createNormalizedDropdownEvent,
  generateDropdownIds,
  createDefaultDropdownItems,
} from './Dropdown.utils';

// ============================================================================
// 1. DROPDOWN CONTEXT
// ============================================================================

interface DropdownContextValue {
  size: NonNullable<DropdownProps['size']>;
  closeOnSelect: boolean;
  open: boolean;
  onOpenChange: (open: boolean, event?: Event, meta?: NormalizedDropdownEvent) => void;
  portalContainer: HTMLElement | null;
  transitionDuration: number;
  ids: {
    dropdownId: string;
    triggerId: string;
    contentId: string;
    labelId?: string;
  };
}

const DropdownContext = React.createContext<DropdownContextValue | undefined>(undefined);

const useDropdownContext = () => {
  const context = React.useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a Dropdown.Root');
  }
  return context;
};

// ============================================================================
// 2. TYPE DEFINITIONS FOR COMPOUND COMPONENTS
// ============================================================================

// Define the main component type with compound components attached
interface DropdownComponent extends React.ForwardRefExoticComponent<
  DropdownProps & React.RefAttributes<DropdownRef>
> {
  Item: React.ForwardRefExoticComponent<DropdownItemProps & React.RefAttributes<HTMLDivElement>>;
  Group: React.ForwardRefExoticComponent<DropdownGroupProps & React.RefAttributes<HTMLDivElement>>;
  Separator: React.ForwardRefExoticComponent<
    DropdownSeparatorProps & React.RefAttributes<HTMLHRElement>
  >;
  Label: React.ForwardRefExoticComponent<DropdownLabelProps & React.RefAttributes<HTMLDivElement>>;
  Shortcut: React.ForwardRefExoticComponent<
    DropdownShortcutProps & React.RefAttributes<HTMLSpanElement>
  >;
  CheckboxItem: React.ForwardRefExoticComponent<
    DropdownItemProps & React.RefAttributes<HTMLDivElement> & { value?: string }
  >;
  RadioItem: React.ForwardRefExoticComponent<
    DropdownItemProps & React.RefAttributes<HTMLDivElement> & { value: string }
  >;
  RadioGroup: React.ForwardRefExoticComponent<
    DropdownRadioGroupProps & React.RefAttributes<HTMLDivElement>
  >;
  SubMenu: React.ForwardRefExoticComponent<
    DropdownSubMenuProps & React.RefAttributes<HTMLDivElement>
  >;
  createDefaultItems: typeof createDefaultDropdownItems;
}

interface DropdownSubMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

interface DropdownRadioGroupProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  'data-testid'?: string;
}

// Type for trigger element props
interface TriggerElementProps {
  className?: string;
  ref?: React.Ref<HTMLElement>;
  'aria-haspopup'?: 'menu' | boolean;
  'aria-expanded'?: boolean;
  'aria-disabled'?: boolean;
  'data-testid'?: string;
  id?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

// ============================================================================
// 3. MAIN DROPDOWN COMPONENT
// ============================================================================

const DropdownRoot = React.forwardRef<DropdownRef, DropdownProps>((props, ref) => {
  // ========================================================================
  // 3.1 DESTRUCTURE PROPS WITH DEFAULTS
  // ========================================================================
  const {
    // Core properties
    open: controlledOpen,
    onOpenChange,
    defaultOpen = false,

    // Content properties
    trigger,
    children,
    items = [],
    groups = [],

    // Visual properties
    size = 'md',
    placement = 'bottom-start',
    animation = 'scale',
    overlay = false,
    overlayClassName = '',
    overlayOpacity = 0.5,
    overlayBlur = true,
    overlayColor = 'black',

    // Behavior properties
    closeOnSelect = true,
    closeOnEscape = true,
    closeOnOutsideClick = true,
    lockFocus = true,
    autoFocus = false,
    modal = true,
    persistent = false,

    // Positioning properties
    offset = defaultDropdownStyleProps.offset,
    skidding = defaultDropdownStyleProps.skidding,
    collisionBoundary,
    collisionPadding = defaultDropdownStyleProps.collisionPadding,

    // Trigger properties
    triggerAsChild = true,
    triggerClassName = '',
    triggerDisabled = false,

    // Content properties
    contentClassName = '',
    contentStyle = {},
    maxHeight = defaultDropdownStyleProps.maxHeight,
    minWidth = defaultDropdownStyleProps.minWidth,
    maxWidth,

    // Portal properties
    portal = true,
    portalContainer = null,
    portalClassName = '',

    // Transition properties
    transitionDuration = defaultDropdownStyleProps.transitionDuration,
    transitionTimingFunction = 'ease-out',
    unmountOnExit = true,

    // Testing & analytics
    'data-testid': dataTestId = 'dropdown',
    'data-analytics': dataAnalytics,
    'data-cy': dataCy,

    // Accessibility
    ariaLabel,
    ariaLabelledby,
    ariaDescribedby,

      // Other HTML props - ADD THIS LINE
    ...restProps  
  } = props;

  // Filter out dir prop to avoid type conflicts with Radix
  const restPropsWithoutDir = restProps as Omit<typeof restProps, 'dir'> & 
    Partial<Record<string, unknown>>;

  // ========================================================================
  // 3.2 STATE & REFS
  // ========================================================================
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const triggerRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Generate unique IDs for accessibility
  const ids = React.useMemo(() => generateDropdownIds(dataTestId), [dataTestId]);

  // ========================================================================
  // 3.3 EVENT HANDLER
  // ========================================================================
  const handleOpenChange = React.useCallback(
    (newOpen: boolean, event?: Event) => {
      if (!isControlled) {
        setInternalOpen(newOpen);
      }

      // Call user-provided handler with event and normalized metadata
      if (onOpenChange) {
        const meta = event ? createNormalizedDropdownEvent(event) : undefined;
        onOpenChange(newOpen, event, meta);
      }
    },
    [isControlled, onOpenChange]
  );

  // ========================================================================
  // 3.4 REF API IMPLEMENTATION
  // ========================================================================
  React.useImperativeHandle(
    ref,
    () =>
      ({
        open: () => handleOpenChange(true),
        close: () => handleOpenChange(false),
        toggle: () => handleOpenChange(!open),
        focusFirstItem: () => {
          if (contentRef.current) {
            const firstItem = contentRef.current.querySelector<HTMLElement>(
              '[role="menuitem"]:not([disabled]), [role="menuitemradio"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])'
            );
            firstItem?.focus();
          }
        },
        focusLastItem: () => {
          if (contentRef.current) {
            const items = contentRef.current.querySelectorAll<HTMLElement>(
              '[role="menuitem"]:not([disabled]), [role="menuitemradio"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])'
            );
            items[items.length - 1]?.focus();
          }
        },
        updatePosition: () => {
          // Note: This is a placeholder as Radix handles positioning automatically
          console.warn(
            'Dropdown.updatePosition() is not supported. Radix UI handles positioning automatically.'
          );
        },
        isOpen: () => open,
        getTrigger: () => triggerRef.current,
      }) satisfies DropdownRef,
    [open, handleOpenChange]
  );

  // ========================================================================
  // 3.5 CONTEXT VALUE
  // ========================================================================
  const contextValue: DropdownContextValue = React.useMemo(
    () => ({
      size,
      closeOnSelect,
      open,
      onOpenChange: handleOpenChange,
      portalContainer,
      transitionDuration,
      ids,
    }),
    [size, closeOnSelect, open, handleOpenChange, portalContainer, transitionDuration, ids]
  );

  // ========================================================================
  // 3.6 HELPER FUNCTIONS
  // ========================================================================
  const handleRadixOpenChange = React.useCallback(
    (newOpen: boolean) => {
      handleOpenChange(newOpen);
    },
    [handleOpenChange]
  );

  // Map our placement to Radix's side and align
  const getRadixPlacement = () => {
    const [side, align] = placement.split('-');
    return {
      side: side as 'top' | 'bottom' | 'left' | 'right',
      align: align as 'start' | 'center' | 'end' | undefined,
    };
  };

  const { side, align } = getRadixPlacement();

  // Build portal container class
  const portalClass = cn(
    dropdownClasses.portal.base,
    portalClassName,
    dropdownZIndexClasses.dropdown
  );

  // Build overlay class
  const overlayClass = cn(
    'fixed inset-0',
    overlayBlur ? dropdownTokens.backdrop.md : '',
    overlayClassName
  );

  // Safely determine if we should use asChild
  const shouldUseAsChild = triggerAsChild && React.isValidElement(trigger);

  // Prepare trigger element with proper props
  let triggerNode: React.ReactNode;

  if (shouldUseAsChild) {
    // Cast trigger to ReactElement with proper props
    const triggerElement = trigger as React.ReactElement<TriggerElementProps>;
    const elementProps = triggerElement.props || {};

    // Clone the element with merged props
    // eslint-disable-next-line react-hooks/refs
    triggerNode = React.cloneElement(triggerElement, {
      'aria-haspopup': 'menu' as const,
      'aria-expanded': open,
      'aria-disabled': triggerDisabled,
      'data-testid': `${dataTestId}-trigger`,
      id: ids.triggerId,
      className: cn(
        dropdownClasses.trigger.base,
        triggerClassName,
        triggerDisabled && dropdownClasses.trigger.disabled,
        elementProps.className
      ),
      ref: (element: HTMLElement | null) => {
        // Update our ref
        triggerRef.current = element;

        // Call the original ref if it exists
        if (elementProps.ref) {
          if (typeof elementProps.ref === 'function') {
            elementProps.ref(element);
          } else if (elementProps.ref && 'current' in elementProps.ref) {
            (elementProps.ref as React.MutableRefObject<HTMLElement | null>).current = element;
          }
        }
      },
    });

  } else if (triggerAsChild && !React.isValidElement(trigger)) {
    // Fallback: wrap non-element trigger in a button
    triggerNode = (
      <button
        ref={triggerRef as React.Ref<HTMLButtonElement>}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-disabled={triggerDisabled}
        data-testid={`${dataTestId}-trigger`}
        id={ids.triggerId}
        className={cn(
          dropdownClasses.trigger.base,
          triggerClassName,
          triggerDisabled && dropdownClasses.trigger.disabled
        )}
      >
        {trigger}
      </button>
    );
  } else {
    // Direct rendering (asChild = false)
    triggerNode = trigger;
  }

  // Handle items/groups props
  const renderContentFromProps = () => {
    if (children) return children;

    // Use arrays directly without unnecessary copies
    const allItems = items;
    const allGroups = groups;

    return (
      <React.Fragment>
        {allGroups.map((group, groupIndex) => (
          <DropdownGroup
            key={group.id || `group-${groupIndex}`}
            label={group.label}
            data-testid={group['data-testid']}
          >
            {group.items.map((item, itemIndex) => {
              // Create a wrapper function that matches onSelect type
              const handleItemSelect = (event?: Event, meta?: NormalizedDropdownEvent) => {
                if (item.onClick) {
                  // Maintain backward compatibility by passing both event and meta
                  // @ts-expect-error - Temporary for backward compatibility until types are updated
                  item.onClick(event, meta);
                }
              };

              return (
                <DropdownItem
                  key={item.id || `item-${groupIndex}-${itemIndex}`}
                  variant={item.variant}
                  disabled={item.disabled}
                  loading={item.loading}
                  checked={item.checked}
                  shortcut={item.shortcut}
                  icon={item.icon}
                  onSelect={handleItemSelect}
                  data-testid={item['data-testid']}
                  data-analytics={item['data-analytics']}
                >
                  {item.label}
                </DropdownItem>
              );
            })}
          </DropdownGroup>
        ))}

        {allItems.map((item, index) => {
          // Create a wrapper function that matches onSelect type
          const handleItemSelect = (event?: Event, meta?: NormalizedDropdownEvent) => {
            if (item.onClick) {
              // Maintain backward compatibility by passing both event and meta
          // @ts-expect-error - Temporary for backward compatibility until types are updated
          item.onClick(event, meta);
            }
          };

          return (
            <DropdownItem
              key={item.id || `item-${index}`}
              variant={item.variant}
              disabled={item.disabled}
              loading={item.loading}
              checked={item.checked}
              shortcut={item.shortcut}
              icon={item.icon}
              onSelect={handleItemSelect}
              data-testid={item['data-testid']}
              data-analytics={item['data-analytics']}
            >
              {item.label}
            </DropdownItem>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <DropdownContext.Provider value={contextValue}>
      <DropdownPrimitive.Root
        open={open}
        onOpenChange={handleRadixOpenChange}
        defaultOpen={defaultOpen}
        modal={modal}
        data-testid={dataTestId}
        data-analytics={dataAnalytics}
        data-cy={dataCy}
        {...restPropsWithoutDir}
      >
        <DropdownPrimitive.Trigger asChild={shouldUseAsChild}>
          {triggerNode}
        </DropdownPrimitive.Trigger>

        {portal ? (
          <DropdownPrimitive.Portal container={portalContainer}>
            <div className={portalClass}>
              {/* Custom overlay */}
              {overlay && open && modal && (
                <div
                  className={overlayClass}
                  onClick={(e) => handleOpenChange(false, e.nativeEvent)}
                  style={{
                    backgroundColor: overlayColor,
                    opacity: overlayOpacity,
                    zIndex: dropdownTokens.zIndex.overlay,
                  }}
                  data-testid={`${dataTestId}-overlay`}
                />
              )}

              {/* Content */}
              <DropdownPrimitive.Content
                ref={contentRef}
                className={cn(
                  dropdownClasses.content.base,
                  dropdownClasses.content.size[size],
                  contentClassName,
                  dropdownClasses.animation[animation]?.enter,
                  dropdownClasses.accessibility.reducedMotion
                )}
                style={{
                  ...contentStyle,
                  maxHeight,
                  minWidth,
                  maxWidth,
                  zIndex: dropdownTokens.zIndex.dropdown,
                  animationDuration: `${transitionDuration}ms`,
                  animationTimingFunction: transitionTimingFunction,
                }}
                side={side}
                sideOffset={offset}
                align={align}
                alignOffset={skidding}
                collisionBoundary={collisionBoundary as Element | Element[] | undefined}
                collisionPadding={collisionPadding}
                sticky="partial"
                hideWhenDetached={!persistent}
                loop={lockFocus}
                onEscapeKeyDown={(e: Event) => {
                  if (!closeOnEscape) e.preventDefault();
                }}
                onInteractOutside={(e: Event) => {
                  if (!closeOnOutsideClick && !overlay) e.preventDefault();
                }}
                onCloseAutoFocus={(e: Event) => {
                  if (!autoFocus) e.preventDefault();
                }}
                onFocusOutside={(e: Event) => {
                  if (persistent) e.preventDefault();
                }}
                forceMount={unmountOnExit ? undefined : true}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledby || ids.triggerId}
                aria-describedby={ariaDescribedby}
                // Removed role prop to let Radix handle it internally
                data-testid={`${dataTestId}-content`}
              >
                {renderContentFromProps()}
              </DropdownPrimitive.Content>
            </div>
          </DropdownPrimitive.Portal>
        ) : (
          // Non-portal version
          open && (
            <DropdownPrimitive.Content
              ref={contentRef}
              className={cn(
                dropdownClasses.content.base,
                dropdownClasses.content.size[size],
                contentClassName,
                dropdownClasses.animation[animation]?.enter
              )}
              style={{
                ...contentStyle,
                maxHeight,
                minWidth,
                maxWidth,
                position: 'absolute',
                zIndex: dropdownTokens.zIndex.dropdown,
              }}
              side={side}
              sideOffset={offset}
              align={align}
              alignOffset={skidding}
              collisionBoundary={collisionBoundary as Element | Element[] | undefined}
              collisionPadding={collisionPadding}
              sticky="partial"
              hideWhenDetached={!persistent}
              loop={lockFocus}
              data-testid={`${dataTestId}-content`}
            >
              {renderContentFromProps()}
            </DropdownPrimitive.Content>
          )
        )}
      </DropdownPrimitive.Root>
    </DropdownContext.Provider>
  );
});

DropdownRoot.displayName = 'Dropdown';

// ============================================================================
// 4. COMPOUND COMPONENTS
// ============================================================================

// 4.1 Dropdown.Item
const DropdownItem = React.forwardRef<HTMLDivElement, DropdownItemProps>((props, ref) => {
  const {
    children,
    variant = 'default',
    disabled = false,
    loading = false,
    checked = false,
    shortcut,
    icon,
    iconPosition = 'left',
    onSelect,
    className = '',
    'data-testid': dataTestId = 'dropdown-item',
    'data-analytics': dataAnalytics,
    ...restProps
  } = props;

  const context = useDropdownContext();

  const handleSelect = React.useCallback(
    (event: Event) => {
      if (disabled || loading) {
        event.preventDefault();
        return;
      }

      if (onSelect) {
        // Pass both the native event and normalized metadata
        const meta = createNormalizedDropdownEvent(event);
        onSelect(event, meta);
      }

      if (context.closeOnSelect) {
        context.onOpenChange(false, event);
      }
    },
    [disabled, loading, onSelect, context]
  );

  const itemClass = cn(
    dropdownClasses.item.base,
    dropdownClasses.item.variant[variant],
    dropdownClasses.item.highlighted(variant),
    className,
    disabled ? dropdownTokens.colors.action.disabled : '',
    loading ? dropdownTokens.colors.action.loading : ''
  );

  return (
    <DropdownPrimitive.Item
      ref={ref}
      className={itemClass}
      disabled={disabled || loading}
      onSelect={handleSelect}
      data-testid={dataTestId}
      data-analytics={dataAnalytics}
      {...restProps}
    >
      {checked && (
        <DropdownPrimitive.ItemIndicator className={dropdownClasses.item.check}>
          <span className="h-2 w-2 rounded-full bg-current" />
        </DropdownPrimitive.ItemIndicator>
      )}

      {icon && iconPosition === 'left' && (
        <span
          className={cn(dropdownClasses.item.icon.base, dropdownClasses.item.icon.position.left)}
        >
          {icon}
        </span>
      )}

      <span className={dropdownClasses.item.label}>{children}</span>

      {icon && iconPosition === 'right' && (
        <span
          className={cn(dropdownClasses.item.icon.base, dropdownClasses.item.icon.position.right)}
        >
          {icon}
        </span>
      )}

      {shortcut && <span className={dropdownClasses.item.shortcut}>{shortcut}</span>}
    </DropdownPrimitive.Item>
  );
});

DropdownItem.displayName = 'Dropdown.Item';

// 4.2 Dropdown.Group
const DropdownGroup = React.forwardRef<HTMLDivElement, DropdownGroupProps>((props, ref) => {
  const {
    children,
    label,
    className = '',
    'data-testid': dataTestId = 'dropdown-group',
    ...restProps
  } = props;

  return (
    <DropdownPrimitive.Group
      ref={ref}
      className={cn(dropdownClasses.group.base, className)}
      data-testid={dataTestId}
      {...restProps}
    >
      {label && (
        <DropdownPrimitive.Label className={dropdownClasses.group.label}>
          {label}
        </DropdownPrimitive.Label>
      )}
      {children}
    </DropdownPrimitive.Group>
  );
});

DropdownGroup.displayName = 'Dropdown.Group';

// 4.3 Dropdown.Separator
const DropdownSeparator = React.forwardRef<HTMLHRElement, DropdownSeparatorProps>((props, ref) => {
  const { className = '', 'data-testid': dataTestId = 'dropdown-separator', ...restProps } = props;

  return (
    <DropdownPrimitive.Separator
      ref={ref}
      className={cn(dropdownClasses.separator.base, className)}
      data-testid={dataTestId}
      {...restProps}
    />
  );
});

DropdownSeparator.displayName = 'Dropdown.Separator';

// 4.4 Dropdown.Label
const DropdownLabel = React.forwardRef<HTMLDivElement, DropdownLabelProps>((props, ref) => {
  const {
    children,
    className = '',
    'data-testid': dataTestId = 'dropdown-label',
    ...restProps
  } = props;

  return (
    <DropdownPrimitive.Label
      ref={ref}
      className={cn(dropdownClasses.label.base, className)}
      data-testid={dataTestId}
      {...restProps}
    >
      {children}
    </DropdownPrimitive.Label>
  );
});

DropdownLabel.displayName = 'Dropdown.Label';

// 4.5 Dropdown.Shortcut
const DropdownShortcut = React.forwardRef<HTMLSpanElement, DropdownShortcutProps>((props, ref) => {
  const {
    children,
    className = '',
    'data-testid': dataTestId = 'dropdown-shortcut',
    ...restProps
  } = props;

  return (
    <span
      ref={ref}
      className={cn(dropdownClasses.item.shortcut, className)}
      data-testid={dataTestId}
      {...restProps}
    >
      {children}
    </span>
  );
});

DropdownShortcut.displayName = 'Dropdown.Shortcut';

// 4.6 Dropdown.CheckboxItem
interface CheckboxItemProps extends Omit<DropdownItemProps, 'checked'> {
  value?: string;
}

const DropdownCheckboxItem = React.forwardRef<HTMLDivElement, CheckboxItemProps>((props, ref) => {
  const {
    children,
    disabled = false,
    onSelect,
    className = '',
    'data-testid': dataTestId = 'dropdown-checkbox-item',
    value: _value, // eslint-disable-line @typescript-eslint/no-unused-vars
    ...restProps
  } = props;

  const context = useDropdownContext();

  const handleSelect = React.useCallback(
    (event: Event) => {
      if (disabled) {
        event.preventDefault();
        return;
      }

      if (onSelect) {
        // Pass both the native event and normalized metadata
        const meta = createNormalizedDropdownEvent(event);
        onSelect(event, meta);
      }

      if (context.closeOnSelect) {
        context.onOpenChange(false, event);
      }
    },
    [disabled, onSelect, context]
  );

  return (
    <DropdownPrimitive.CheckboxItem
      ref={ref}
      className={cn(dropdownClasses.checkboxItem.base, className)}
      disabled={disabled}
      onSelect={handleSelect}
      data-testid={dataTestId}
      {...restProps}
    >
      <DropdownPrimitive.ItemIndicator className={dropdownClasses.checkboxItem.indicator}>
        <span className="h-2 w-2 rounded-sm bg-current" />
      </DropdownPrimitive.ItemIndicator>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
});

DropdownCheckboxItem.displayName = 'Dropdown.CheckboxItem';

// 4.7 Dropdown.RadioItem
interface RadioItemProps extends Omit<DropdownItemProps, 'checked'> {
  value: string;
}

const DropdownRadioItem = React.forwardRef<HTMLDivElement, RadioItemProps>((props, ref) => {
  const {
    children,
    disabled = false,
    onSelect,
    className = '',
    'data-testid': dataTestId = 'dropdown-radio-item',
    value,
    ...restProps
  } = props;

  const context = useDropdownContext();

  const handleSelect = React.useCallback(
    (event: Event) => {
      if (disabled) {
        event.preventDefault();
        return;
      }

      if (onSelect) {
        // Pass both the native event and normalized metadata
        const meta = createNormalizedDropdownEvent(event);
        onSelect(event, meta);
      }

      if (context.closeOnSelect) {
        context.onOpenChange(false, event);
      }
    },
    [disabled, onSelect, context]
  );

  return (
    <DropdownPrimitive.RadioItem
      ref={ref}
      className={cn(dropdownClasses.radioItem.base, className)}
      disabled={disabled}
      onSelect={handleSelect}
      value={value}
      data-testid={dataTestId}
      {...restProps}
    >
      <DropdownPrimitive.ItemIndicator className={dropdownClasses.radioItem.indicator}>
        <span className="h-2 w-2 rounded-full bg-current" />
      </DropdownPrimitive.ItemIndicator>
      {children}
    </DropdownPrimitive.RadioItem>
  );
});

DropdownRadioItem.displayName = 'Dropdown.RadioItem';

// 4.8 Dropdown.RadioGroup
const DropdownRadioGroup = React.forwardRef<HTMLDivElement, DropdownRadioGroupProps>(
  (props, ref) => {
    const {
      children,
      value,
      onValueChange,
      className = '',
      'data-testid': dataTestId = 'dropdown-radio-group',
      ...restProps
    } = props;

    return (
      <DropdownPrimitive.RadioGroup
        ref={ref}
        value={value}
        onValueChange={onValueChange}
        className={cn(className)}
        data-testid={dataTestId}
        {...restProps}
      >
        {children}
      </DropdownPrimitive.RadioGroup>
    );
  }
);

DropdownRadioGroup.displayName = 'Dropdown.RadioGroup';

// 4.9 Dropdown.SubMenu
const DropdownSubMenu = React.forwardRef<HTMLDivElement, DropdownSubMenuProps>((props, ref) => {
  const {
    trigger,
    children,
    className = '',
    'data-testid': dataTestId = 'dropdown-submenu',
  } = props;

  return (
    <DropdownPrimitive.Sub>
      <DropdownPrimitive.SubTrigger
        ref={ref}
        className={cn(dropdownClasses.subMenu.trigger, className)}
        data-testid={dataTestId}
      >
        {trigger}
        <span className={dropdownClasses.subMenu.icon}>▶</span>
      </DropdownPrimitive.SubTrigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.SubContent
          className={cn(dropdownClasses.content.base, dropdownClasses.content.size.md)}
          sideOffset={8}
          alignOffset={-4}
        >
          {children}
        </DropdownPrimitive.SubContent>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Sub>
  );
});

DropdownSubMenu.displayName = 'Dropdown.SubMenu';

// ============================================================================
// 5. CREATE THE COMPOUND COMPONENT
// ============================================================================

export const Dropdown = Object.assign(DropdownRoot, {
  Item: DropdownItem,
  Group: DropdownGroup,
  Separator: DropdownSeparator,
  Label: DropdownLabel,
  Shortcut: DropdownShortcut,
  CheckboxItem: DropdownCheckboxItem,
  RadioItem: DropdownRadioItem,
  RadioGroup: DropdownRadioGroup,
  SubMenu: DropdownSubMenu,
  createDefaultItems: createDefaultDropdownItems,
}) as DropdownComponent;

// ============================================================================
// 6. EXPORT TYPES
// ============================================================================

export type {
  DropdownProps,
  DropdownRef,
  DropdownItemProps,
  DropdownGroupProps,
  DropdownSeparatorProps,
  DropdownLabelProps,
  DropdownShortcutProps,
  NormalizedDropdownEvent,
};

export { createDefaultDropdownItems };

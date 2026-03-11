// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dropdown\Dropdown.stories.tsx
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Dropdown, createDefaultDropdownItems } from './index';

const ControlledDropdownExample = (props: Story['args'] = {}) => {
  const [open, setOpen] = React.useState(false);

  // Destructure props outside useCallback
  const { onOpenChange } = props;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [onOpenChange] // Now only depends on onOpenChange, not the whole props object
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: STORY_CONSTANTS.spacing.medium,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', gap: STORY_CONSTANTS.spacing.small }}>
        <StoryButton onClick={() => setOpen(true)}>Open Programmatically</StoryButton>
        <StoryButton onClick={() => setOpen(false)}>Close Programmatically</StoryButton>
        <StoryButton onClick={() => setOpen(!open)}>Toggle</StoryButton>
      </div>

      <Dropdown
        {...props}
        open={open}
        onOpenChange={handleOpenChange}
        trigger={<StoryButton>Controlled Menu</StoryButton>}
      >
        <Dropdown.Item>Item 1</Dropdown.Item>
        <Dropdown.Item>Item 2</Dropdown.Item>
        <Dropdown.Item onSelect={() => setOpen(false)}>Close on Select</Dropdown.Item>
      </Dropdown>

      <p
        style={{
          color: STORY_CONSTANTS.colors.text.secondary,
          fontSize: '14px',
          fontFamily: 'monospace',
        }}
      >
        Current state: <strong>{open ? 'Open' : 'Closed'}</strong>
      </p>
    </div>
  );
};

export const ControlledDropdown: Story = {
  args: {
    // Explicitly set defaults to prevent control interference
    closeOnSelect: true,
    closeOnEscape: true,
    closeOnOutsideClick: true,
  },
  render: (args) => <ControlledDropdownExample {...args} />,
};

export const WithGroupsProp: Story = {
  args: {
    closeOnSelect: true,
  },
  render: (args) => {
    const groups = [
      {
        label: 'File Operations',
        items: [
          { id: 'new', label: 'New', onClick: action('New clicked') },
          { id: 'open', label: 'Open', onClick: action('Open clicked') },
          { id: 'save', label: 'Save', onClick: action('Save clicked') },
        ],
      },
      {
        label: 'Edit Operations',
        items: [
          { id: 'undo', label: 'Undo', onClick: action('Undo clicked') },
          { id: 'redo', label: 'Redo', onClick: action('Redo clicked') },
          { id: 'cut', label: 'Cut', onClick: action('Cut clicked'), disabled: true },
          { id: 'copy', label: 'Copy', onClick: action('Copy clicked') },
          { id: 'paste', label: 'Paste', onClick: action('Paste clicked') },
        ],
      },
    ];

    return (
      <Dropdown
        {...args}
        groups={groups}
        trigger={<StoryButton>Editor Menu (Groups Prop)</StoryButton>}
      />
    );
  },
};

// ============================================================================
// STORY UTILITIES & CONSTANTS
// ============================================================================

// Simple icon placeholder component (SVG-based, consistent across platforms)
const IconPlaceholder = ({
  size = 14,
  color = '#6B7280',
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="9" x2="15" y2="15" />
    <line x1="15" y1="9" x2="9" y2="15" />
  </svg>
);

const EditIcon = (props: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <IconPlaceholder {...props} />
);
const DeleteIcon = (props: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <IconPlaceholder color="#EF4444" {...props} />
);
const DuplicateIcon = (props: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <IconPlaceholder color="#3B82F6" {...props} />
);
const SettingsIcon = (props: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <IconPlaceholder color="#8B5CF6" {...props} />
);

// Storybook button with forwardRef support
const StoryButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, style, ...props }, ref) => (
  <button
    ref={ref}
    style={{
      padding: '8px 16px',
      background: '#3B82F6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 500,
      transition: 'background-color 200ms',
      ...style,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = '#2563EB';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = '#3B82F6';
    }}
    {...props}
  >
    {children}
  </button>
));

StoryButton.displayName = 'StoryButton';

// Story styling constants
const STORY_CONSTANTS = {
  spacing: {
    small: '8px',
    medium: '16px',
    large: '24px',
  },
  colors: {
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    destructive: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#8B5CF6',
    border: '#E5E7EB',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      inverse: '#FFFFFF',
    },
  },
  borderRadius: {
    small: '4px',
    medium: '6px',
    large: '8px',
  },
};

// ============================================================================
// STORY METADATA
// ============================================================================

const meta: Meta<typeof Dropdown> = {
  title: 'Components/Molecules/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# Dropdown Component

A flexible, accessible dropdown menu component with compound component pattern support.

## Features

- ✅ **Accessibility**: Full keyboard navigation, ARIA attributes, screen reader support
- ✅ **Compound Components**: Flexible composition with Item, Group, Separator, etc.
- ✅ **Dual API**: Support for both props-based and children-based content
- ✅ **Customization**: Multiple sizes, placements, animations, and variants
- ✅ **Enterprise Features**: Controlled/uncontrolled, event normalization, ref API

## Usage Examples

### Basic Usage
\`\`\`tsx
<Dropdown trigger={<Button>Menu</Button>}>
  <Dropdown.Item>Profile</Dropdown.Item>
  <Dropdown.Item>Settings</Dropdown.Item>
  <Dropdown.Item variant="destructive">Logout</Dropdown.Item>
</Dropdown>
\`\`\`

### With Items Prop
\`\`\`tsx
const items = [
  { label: 'Edit', onClick: () => {} },
  { label: 'Delete', variant: 'destructive', onClick: () => {} },
];

<Dropdown trigger={<Button>Actions</Button>} items={items} />
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Size variant of the dropdown',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    placement: {
      control: 'select',
      options: [
        'top',
        'bottom',
        'left',
        'right',
        'top-start',
        'top-end',
        'bottom-start',
        'bottom-end',
        'left-start',
        'left-end',
        'right-start',
        'right-end',
      ],
      description: 'Position relative to trigger',
      table: {
        defaultValue: { summary: 'bottom-start' },
      },
    },
    animation: {
      control: 'select',
      options: ['fade', 'scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'none'],
      description: 'Animation type for opening/closing',
      table: {
        defaultValue: { summary: 'scale' },
      },
    },
    closeOnSelect: {
      control: 'boolean',
      description: 'Close dropdown when item is selected',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    closeOnEscape: {
      control: 'boolean',
      description: 'Close dropdown when Escape key is pressed',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    closeOnOutsideClick: {
      control: 'boolean',
      description: 'Close dropdown when clicking outside',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    triggerDisabled: {
      control: 'boolean',
      description: 'Disable the trigger button',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    persistent: {
      control: 'boolean',
      description: 'Prevent closing when clicking outside or pressing escape',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    onOpenChange: {
      action: 'onOpenChange',
      description: 'Called when dropdown opens or closes',
    },
  },
  args: {
    trigger: <StoryButton>Open Menu</StoryButton>,
    size: 'md',
    placement: 'bottom-start',
    animation: 'scale',
    closeOnSelect: true,
    closeOnEscape: true,
    closeOnOutsideClick: true,
    triggerDisabled: false,
    persistent: false,
    onOpenChange: action('onOpenChange'),
  },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof Dropdown>;

// ============================================================================
// BASIC STORIES (Isolated args to prevent control leakage)
// ============================================================================

export const Default: Story = {
  render: (args) => (
    <Dropdown {...args}>
      <Dropdown.Item>Profile</Dropdown.Item>
      <Dropdown.Item>Settings</Dropdown.Item>
      <Dropdown.Separator />
      <Dropdown.Item variant="destructive">Logout</Dropdown.Item>
    </Dropdown>
  ),
};

export const WithIcons: Story = {
  args: {
    closeOnSelect: true,
    closeOnEscape: true,
    closeOnOutsideClick: true,
  },
  render: (args) => (
    <Dropdown {...args}>
      <Dropdown.Item icon={<EditIcon />} iconPosition="left">
        Edit
      </Dropdown.Item>
      <Dropdown.Item icon={<DuplicateIcon />} iconPosition="left">
        Duplicate
      </Dropdown.Item>
      <Dropdown.Item icon={<DeleteIcon />} iconPosition="left" variant="destructive">
        Delete
      </Dropdown.Item>
    </Dropdown>
  ),
};

export const WithShortcuts: Story = {
  args: {
    closeOnSelect: true,
  },
  render: (args) => (
    <Dropdown {...args}>
      <Dropdown.Item shortcut="⌘N">New File</Dropdown.Item>
      <Dropdown.Item shortcut="⌘O">Open</Dropdown.Item>
      <Dropdown.Item shortcut="⌘S">Save</Dropdown.Item>
      <Dropdown.Item shortcut="⌘⇧S">Save As...</Dropdown.Item>
      <Dropdown.Separator />
      <Dropdown.Item shortcut="⌘P">Print</Dropdown.Item>
    </Dropdown>
  ),
};

export const WithGroups: Story = {
  render: (args) => (
    <Dropdown {...args}>
      <Dropdown.Group label="File">
        <Dropdown.Item>New</Dropdown.Item>
        <Dropdown.Item>Open</Dropdown.Item>
        <Dropdown.Item>Save</Dropdown.Item>
      </Dropdown.Group>
      <Dropdown.Group label="Edit">
        <Dropdown.Item>Undo</Dropdown.Item>
        <Dropdown.Item>Redo</Dropdown.Item>
        <Dropdown.Separator />
        <Dropdown.Item>Cut</Dropdown.Item>
        <Dropdown.Item>Copy</Dropdown.Item>
        <Dropdown.Item>Paste</Dropdown.Item>
      </Dropdown.Group>
    </Dropdown>
  ),
};

// ============================================================================
// VARIANT STORIES
// ============================================================================

export const ItemVariants: Story = {
  args: {
    closeOnSelect: false, // Keep open to inspect variants
  },
  render: (args) => (
    <Dropdown {...args}>
      <Dropdown.Item variant="default">Default</Dropdown.Item>
      <Dropdown.Item variant="destructive">Destructive</Dropdown.Item>
      <Dropdown.Item variant="success">Success</Dropdown.Item>
      <Dropdown.Item variant="warning">Warning</Dropdown.Item>
      <Dropdown.Item variant="info">Info</Dropdown.Item>
    </Dropdown>
  ),
};

export const ItemStates: Story = {
  args: {
    closeOnSelect: false,
  },
  render: (args) => (
    <Dropdown {...args}>
      <Dropdown.Item>Enabled Item</Dropdown.Item>
      <Dropdown.Item disabled>Disabled Item</Dropdown.Item>
      <Dropdown.Item disabled shortcut="⌘D">
        Disabled with Shortcut
      </Dropdown.Item>
      <Dropdown.Item loading>Loading Item</Dropdown.Item>
      <Dropdown.Item checked>Checked Item</Dropdown.Item>
    </Dropdown>
  ),
};

// ============================================================================
// SIZE & PLACEMENT STORIES
// ============================================================================

export const SizeVariants: Story = {
  args: {
    closeOnSelect: true,
    closeOnEscape: true,
    closeOnOutsideClick: true,
  },
  render: (args) => (
    <div style={{ display: 'flex', gap: STORY_CONSTANTS.spacing.medium, flexWrap: 'wrap' }}>
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <Dropdown key={size} {...args} size={size} trigger={<StoryButton>Size {size}</StoryButton>}>
          <Dropdown.Item>Item 1</Dropdown.Item>
          <Dropdown.Item>Item 2</Dropdown.Item>
          <Dropdown.Item>Item 3</Dropdown.Item>
        </Dropdown>
      ))}
    </div>
  ),
};

export const PlacementVariants: Story = {
  args: {
    closeOnSelect: true,
    closeOnEscape: true,
    closeOnOutsideClick: true,
  },
  render: (args) => {
    const placements = [
      'top-start',
      'top',
      'top-end',
      'bottom-start',
      'bottom',
      'bottom-end',
    ] as const;

    return (
      <div
        style={{
          display: 'flex',
          gap: STORY_CONSTANTS.spacing.large,
          padding: '100px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {placements.map((placement) => (
          <div key={placement} style={{ textAlign: 'center' }}>
            <Dropdown
              {...args}
              placement={placement}
              trigger={<StoryButton>{placement}</StoryButton>}
            >
              <Dropdown.Item>Item 1</Dropdown.Item>
              <Dropdown.Item>Item 2</Dropdown.Item>
              <Dropdown.Item>Item 3</Dropdown.Item>
            </Dropdown>
          </div>
        ))}
      </div>
    );
  },
  parameters: {
    layout: 'fullscreen',
  },
};

// ============================================================================
// ANIMATION STORIES
// ============================================================================

export const AnimationVariants: Story = {
  args: {
    closeOnSelect: true,
    closeOnEscape: true,
    closeOnOutsideClick: true,
  },
  render: (args) => (
    <div style={{ display: 'flex', gap: STORY_CONSTANTS.spacing.medium, flexWrap: 'wrap' }}>
      {(
        ['fade', 'scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'none'] as const
      ).map((animation) => (
        <Dropdown
          key={animation}
          {...args}
          animation={animation}
          trigger={<StoryButton>Animation: {animation}</StoryButton>}
        >
          <Dropdown.Item>Item 1</Dropdown.Item>
          <Dropdown.Item>Item 2</Dropdown.Item>
          <Dropdown.Item>Item 3</Dropdown.Item>
        </Dropdown>
      ))}
    </div>
  ),
};

// ============================================================================
// BEHAVIOR STORIES (Explicit args to prevent control leakage)
// ============================================================================

export const PersistentDropdown: Story = {
  args: {
    persistent: true,
    closeOnEscape: false,
    closeOnOutsideClick: false,
  },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: STORY_CONSTANTS.spacing.medium }}>
      <p style={{ color: STORY_CONSTANTS.colors.text.secondary, fontSize: '14px' }}>
        This dropdown will not close automatically. You must close it via the "Close" button.
      </p>

      <Dropdown {...args} trigger={<StoryButton>Persistent Menu</StoryButton>}>
        <Dropdown.Label>Persistent Mode</Dropdown.Label>
        <Dropdown.Item>Item 1 (won't close menu)</Dropdown.Item>
        <Dropdown.Item>Item 2 (won't close menu)</Dropdown.Item>
        <Dropdown.Separator />
        <Dropdown.Item
          onSelect={() => {
            // Manual close example
            const trigger = document.querySelector('[data-testid^="dropdown"]') as HTMLElement;
            trigger?.click();
          }}
        >
          Click to manually close
        </Dropdown.Item>
      </Dropdown>
    </div>
  ),
};

export const NestedDropdown: Story = {
  args: {
    closeOnSelect: false,
  },
  render: (args) => (
    <Dropdown {...args}>
      <Dropdown.Item>Regular Item</Dropdown.Item>
      <Dropdown.Item>Another Item</Dropdown.Item>

      <Dropdown.SubMenu trigger="Submenu Item" data-testid="submenu-trigger">
        <Dropdown.Item>Submenu Item 1</Dropdown.Item>
        <Dropdown.Item>Submenu Item 2</Dropdown.Item>
        <Dropdown.Item>Submenu Item 3</Dropdown.Item>

        {/* Second level nesting */}
        <Dropdown.SubMenu trigger="Nested Again" data-testid="nested-submenu-trigger">
          <Dropdown.Item>Deep Item 1</Dropdown.Item>
          <Dropdown.Item>Deep Item 2</Dropdown.Item>
        </Dropdown.SubMenu>
      </Dropdown.SubMenu>

      <Dropdown.Item>Final Item</Dropdown.Item>
    </Dropdown>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of nested dropdown menus. Tests z-index stacking and focus management.',
      },
    },
  },
};

// ============================================================================
// PROPS API STORIES
// ============================================================================

export const WithItemsProp: Story = {
  args: {
    closeOnSelect: true,
  },
  render: (args) => {
    const items = createDefaultDropdownItems('user-menu');

    return (
      <Dropdown
        {...args}
        items={items}
        trigger={<StoryButton>User Menu (Items Prop)</StoryButton>}
      />
    );
  },
};

// ============================================================================
// REAL-WORLD EXAMPLES
// ============================================================================

export const UserMenu: Story = {
  args: {
    placement: 'bottom-end',
    size: 'md',
  },
  render: (args) => (
    <Dropdown
      {...args}
      trigger={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: STORY_CONSTANTS.spacing.small,
            padding: '8px 12px',
            border: `1px solid ${STORY_CONSTANTS.colors.border}`,
            borderRadius: STORY_CONSTANTS.borderRadius.medium,
            cursor: 'pointer',
            background: 'white',
            transition: 'border-color 200ms',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: STORY_CONSTANTS.colors.primary,
              color: STORY_CONSTANTS.colors.text.inverse,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
          >
            JD
          </div>
          <div style={{ fontSize: '14px' }}>
            John Doe
            <div style={{ fontSize: '12px', color: STORY_CONSTANTS.colors.text.secondary }}>
              Admin
            </div>
          </div>
        </div>
      }
    >
      <Dropdown.Item icon={<SettingsIcon />} iconPosition="left">
        Profile Settings
      </Dropdown.Item>
      <Dropdown.Item icon={<SettingsIcon />} iconPosition="left">
        Account Settings
      </Dropdown.Item>
      <Dropdown.Item icon={<SettingsIcon />} iconPosition="left">
        Billing
      </Dropdown.Item>
      <Dropdown.Separator />
      <Dropdown.Item icon={<SettingsIcon />} iconPosition="left">
        Documentation
      </Dropdown.Item>
      <Dropdown.Item icon={<SettingsIcon />} iconPosition="left">
        Support
      </Dropdown.Item>
      <Dropdown.Separator />
      <Dropdown.Item variant="destructive" icon={<SettingsIcon />} iconPosition="left">
        Logout
      </Dropdown.Item>
    </Dropdown>
  ),
};

// ============================================================================
// ACCESSIBILITY STORIES
// ============================================================================

export const KeyboardNavigation: Story = {
  args: {
    closeOnSelect: false, // Keep open for keyboard testing
    closeOnEscape: true,
  },
  render: (args) => (
    <div
      style={{
        padding: STORY_CONSTANTS.spacing.large,
        border: `2px dashed ${STORY_CONSTANTS.colors.border}`,
        borderRadius: STORY_CONSTANTS.borderRadius.medium,
      }}
      data-testid="keyboard-test-area"
    >
      <p
        style={{
          color: STORY_CONSTANTS.colors.text.secondary,
          fontSize: '14px',
          marginBottom: STORY_CONSTANTS.spacing.medium,
        }}
      >
        <strong>Test with keyboard only:</strong> Tab to focus, use Space/Enter to open, Arrow keys
        to navigate.
      </p>

      <Dropdown
        {...args}
        trigger={
          <StoryButton
            style={{ pointerEvents: 'auto' }}
            onKeyDown={(e) => {
              // Allow keyboard interaction
              e.stopPropagation();
            }}
          >
            Try Keyboard Navigation
          </StoryButton>
        }
      >
        <Dropdown.Item shortcut="⌘1">Item 1 (Cmd+1)</Dropdown.Item>
        <Dropdown.Item shortcut="⌘2">Item 2 (Cmd+2)</Dropdown.Item>
        <Dropdown.Item shortcut="⌘3">Item 3 (Cmd+3)</Dropdown.Item>
        <Dropdown.Separator />
        <Dropdown.Item disabled>Disabled Item</Dropdown.Item>
        <Dropdown.Item>Regular Item</Dropdown.Item>
      </Dropdown>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
## Keyboard Navigation Guide

- **Tab**: Focus the trigger button
- **Enter/Space**: Open/close dropdown when trigger is focused
- **Arrow Up/Down**: Navigate between items
- **Enter**: Select highlighted item
- **Escape**: Close dropdown
- **Shift+Tab**: Navigate backwards

## Screen Reader Support

- **aria-haspopup="menu"**: Indicates trigger opens a menu
- **aria-expanded**: Indicates open/closed state
- **role="menu"**: Identifies the dropdown content
- **role="menuitem"**: Identifies menu items
- **aria-disabled**: For disabled items
- **aria-checked**: For checked items
        `,
      },
    },
  },
};

// ============================================================================
// PERFORMANCE STORIES
// ============================================================================

export const ManyItems: Story = {
  args: {
    maxHeight: '300px',
    closeOnSelect: true,
  },
  render: (args) => {
    const manyItems = Array.from({ length: 50 }, (_, i) => ({
      id: `item-${i}`,
      label: `Item ${i + 1}`,
      onClick: action(`Item ${i + 1} clicked`),
    }));

    return (
      <Dropdown
        {...args}
        items={manyItems}
        trigger={<StoryButton>Dropdown with 50 Items</StoryButton>}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Dropdown efficiently handles large item lists with virtual scrolling support.',
      },
    },
  },
};

// ============================================================================
// CUSTOMIZATION STORIES
// ============================================================================

export const CustomStyles: Story = {
  args: {
    contentStyle: {
      border: '2px solid #8B5CF6',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #F3E8FF 0%, #FDF4FF 100%)',
      boxShadow: '0 10px 40px rgba(139, 92, 246, 0.15)',
    },
  },
  render: (args) => (
    <Dropdown
      {...args}
      trigger={
        <StoryButton
          style={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
          }}
        >
          Styled Menu
        </StoryButton>
      }
    >
      <Dropdown.Item
        style={{
          fontWeight: 'bold',
          color: '#7C3AED',
        }}
      >
        Bold Purple Item
      </Dropdown.Item>
      <Dropdown.Item
        style={{
          color: '#8B5CF6',
          fontStyle: 'italic',
        }}
      >
        Italic Purple Text
      </Dropdown.Item>
      <Dropdown.Item className="custom-item">Custom CSS Class Item</Dropdown.Item>
    </Dropdown>
  ),
};

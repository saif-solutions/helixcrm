// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Icon\Icon.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon, CheckIcon, XIcon, LoadingIcon, InfoIcon, WarningIcon, ErrorIcon, StatusIcon, IconButton, IconGroup } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'Atoms/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Enterprise-grade Icon component with comprehensive features including sizing, coloring, animations, badges, tooltips, and accessibility support.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'],
      description: 'Icon size',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    color: {
      control: 'select',
      options: ['current', 'primary', 'secondary', 'success', 'error', 'warning', 'info', 'muted', 'white', 'black'],
      description: 'Icon color',
      table: {
        defaultValue: { summary: 'current' },
      },
    },
    spin: {
      control: 'boolean',
      description: 'Spin animation (for loading states)',
    },
    pulse: {
      control: 'boolean',
      description: 'Pulse animation (for attention)',
    },
    interactive: {
      control: 'boolean',
      description: 'Make icon interactive with hover/focus states',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading overlay',
    },
    badge: {
      control: 'number',
      description: 'Badge count (0 hides badge)',
    },
    badgeColor: {
      control: 'select',
      options: ['primary', 'success', 'error', 'warning', 'info', 'muted'],
      description: 'Badge color',
    },
    tooltip: {
      control: 'text',
      description: 'Tooltip text',
    },
    flip: {
      control: 'select',
      options: ['horizontal', 'vertical', 'both', undefined],
      description: 'Flip icon direction',
    },
    rotate: {
      control: 'select',
      options: [0, 45, 90, 135, 180, 225, 270, 315],
      description: 'Rotate icon',
    },
    'aria-label': {
      control: 'text',
      description: 'Accessibility label for screen readers',
    },
  },
  args: {
    size: 'md',
    color: 'current',
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof Icon>;

// ============================================================================
// Basic Stories
// ============================================================================

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default icon with plus symbol. Use `aria-label` for accessibility when icon has meaning.',
      },
    },
  },
};

export const WithAccessibility: Story = {
  args: {
    'aria-label': 'Add new item',
  },
  parameters: {
    docs: {
      description: {
        story: 'Icon with accessibility label for screen readers. Always provide labels for meaningful icons.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-6 p-6 bg-gray-50 rounded-lg">
      <div className="text-sm font-medium text-gray-700">Icon Sizes</div>
      <div className="flex items-center justify-center gap-6">
        {(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const).map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <Icon size={size} aria-label={`${size} icon`} />
            <span className="text-xs text-gray-500">{size}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available icon sizes from extra small to extra large.',
      },
    },
  },
};

export const Colors: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 rounded-lg">
      {(['primary', 'success', 'error', 'warning', 'info', 'muted'] as const).map((color) => (
        <div key={color} className="flex flex-col items-center gap-2">
          <Icon color={color} size="lg" aria-label={`${color} icon`} />
          <span className="text-sm text-gray-700 capitalize">{color}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Standard color palette for different states and meanings.',
      },
    },
  },
};

// ============================================================================
// Enhanced Features Stories
// ============================================================================

export const WithAnimations: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 rounded-lg">
      <div className="text-sm font-medium text-gray-700">Animations</div>
      <div className="flex items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <Icon spin size="lg" aria-label="Spinning icon" />
          <span className="text-xs text-gray-500">Spin</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon pulse size="lg" aria-label="Pulsing icon" />
          <span className="text-xs text-gray-500">Pulse</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon spin pulse size="lg" aria-label="Spinning and pulsing icon" />
          <span className="text-xs text-gray-500">Both</span>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Animation states for loading, attention, or active states.',
      },
    },
  },
};

export const WithBadges: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 rounded-lg">
      <div className="text-sm font-medium text-gray-700">Badges & Notifications</div>
      <div className="flex items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <Icon badge={3} size="lg" aria-label="Icon with 3 notifications" />
          <span className="text-xs text-gray-500">Default (error)</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon badge={12} badgeColor="success" size="lg" aria-label="Icon with 12 success notifications" />
          <span className="text-xs text-gray-500">Success</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon badge={99} badgeColor="warning" badgePosition="top-left" size="lg" aria-label="Icon with 99+ warnings" />
          <span className="text-xs text-gray-500">99+ (top-left)</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon badge="!" badgeColor="info" badgePosition="bottom-right" size="lg" aria-label="Icon with important notification" />
          <span className="text-xs text-gray-500">Custom (bottom-right)</span>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Badges for notification counts or status indicators with customizable positions and colors.',
      },
    },
  },
};

export const InteractiveIcons: Story = {
  render: () => {
    const handleClick = () => alert('Icon clicked!');
    
    return (
      <div className="flex flex-col gap-6 p-6 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium text-gray-700">Interactive States</div>
        <div className="flex items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <Icon interactive onClick={handleClick} aria-label="Clickable icon" />
            <span className="text-xs text-gray-500">Clickable</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon interactive disabled aria-label="Disabled icon" />
            <span className="text-xs text-gray-500">Disabled</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon interactive loading aria-label="Loading icon" />
            <span className="text-xs text-gray-500">Loading</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 text-center">
          Hover over icons to see interactive states. Click the first icon for demo.
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive icons with hover states, loading indicators, and disabled states.',
      },
    },
  },
};

export const WithTooltips: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 rounded-lg">
      <div className="text-sm font-medium text-gray-700">Tooltips</div>
      <div className="flex items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <Icon tooltip="Add new item" aria-label="Add icon" />
          <span className="text-xs text-gray-500">Top (default)</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon tooltip="Navigate right" tooltipPosition="right" aria-label="Right icon" />
          <span className="text-xs text-gray-500">Right</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon tooltip="Important information below" tooltipPosition="bottom" aria-label="Info icon" />
          <span className="text-xs text-gray-500">Bottom</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon tooltip="Previous item" tooltipPosition="left" aria-label="Left icon" />
          <span className="text-xs text-gray-500">Left</span>
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center">
        Hover over icons to see tooltips in different positions.
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tooltips for additional context with customizable positioning.',
      },
    },
  },
};

export const Transforms: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 rounded-lg">
      <div className="text-sm font-medium text-gray-700">Transforms</div>
      <div className="grid grid-cols-3 gap-6">
        <div className="flex flex-col items-center gap-2">
          <Icon flip="horizontal" size="lg" aria-label="Flipped horizontally" />
          <span className="text-xs text-gray-500">Flip Horizontal</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon flip="vertical" size="lg" aria-label="Flipped vertically" />
          <span className="text-xs text-gray-500">Flip Vertical</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon flip="both" size="lg" aria-label="Flipped both ways" />
          <span className="text-xs text-gray-500">Flip Both</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon rotate={45} size="lg" aria-label="Rotated 45 degrees" />
          <span className="text-xs text-gray-500">45°</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon rotate={90} size="lg" aria-label="Rotated 90 degrees" />
          <span className="text-xs text-gray-500">90°</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Icon rotate={180} size="lg" aria-label="Rotated 180 degrees" />
          <span className="text-xs text-gray-500">180°</span>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Flip and rotate transforms for directional icons.',
      },
    },
  },
};

// ============================================================================
// Predefined Icon Stories
// ============================================================================

export const PredefinedIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 rounded-lg">
      <div className="text-sm font-medium text-gray-700">Common Icons</div>
      <div className="grid grid-cols-3 gap-6">
        <div className="flex flex-col items-center gap-2">
          <CheckIcon size="lg" aria-label="Check icon" />
          <span className="text-xs text-gray-500">Check (Success)</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <XIcon size="lg" aria-label="X icon" />
          <span className="text-xs text-gray-500">X (Error)</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <LoadingIcon size="lg" aria-label="Loading icon" />
          <span className="text-xs text-gray-500">Loading</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <InfoIcon size="lg" aria-label="Info icon" />
          <span className="text-xs text-gray-500">Info</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <WarningIcon size="lg" aria-label="Warning icon" />
          <span className="text-xs text-gray-500">Warning</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <ErrorIcon size="lg" aria-label="Error icon" />
          <span className="text-xs text-gray-500">Error</span>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Predefined icons for common use cases with appropriate colors.',
      },
    },
  },
};

export const StatusIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 rounded-lg">
      <div className="text-sm font-medium text-gray-700">Status Indicators</div>
      <div className="grid grid-cols-5 gap-4">
        {(['success', 'error', 'warning', 'info', 'neutral'] as const).map((status) => (
          <div key={status} className="flex flex-col items-center gap-2">
            <StatusIcon status={status} size="lg" aria-label={`${status} status`} />
            <span className="text-xs text-gray-500 capitalize">{status}</span>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-500 text-center">
        StatusIcon automatically picks the right icon and color based on status.
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Status-specific icons that automatically handle color and icon selection.',
      },
    },
  },
};

// ============================================================================
// Utility Component Stories
// ============================================================================

export const IconButtons: Story = {
  render: () => {
    const handleAction = (action: string) => alert(`${action} clicked!`);
    
    return (
      <div className="flex flex-col gap-6 p-6 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium text-gray-700">Icon Buttons</div>
        <div className="flex items-center justify-center gap-4">
          <IconButton onClick={() => handleAction('Add')} aria-label="Add">
            <Icon aria-label="Add icon" />
          </IconButton>
          
          <IconButton onClick={() => handleAction('Edit')} aria-label="Edit">
            <Icon tooltip="Edit item" aria-label="Edit icon" />
          </IconButton>
          
          <IconButton onClick={() => handleAction('Delete')} aria-label="Delete" disabled>
            <XIcon aria-label="Delete icon" />
          </IconButton>
          
          <IconButton onClick={() => handleAction('Save')} aria-label="Save">
            <CheckIcon aria-label="Save icon" />
          </IconButton>
          
          <IconButton onClick={() => handleAction('Refresh')} aria-label="Refresh">
            <LoadingIcon aria-label="Refresh icon" />
          </IconButton>
        </div>
        <div className="text-xs text-gray-500 text-center">
          IconButton wraps icons in accessible button elements with proper styling.
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'IconButton component for creating accessible, styled icon buttons.',
      },
    },
  },
};

export const IconGroups: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 rounded-lg">
      <div className="text-sm font-medium text-gray-700">Icon Groups</div>
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-500">Extra Small Spacing</span>
          <IconGroup spacing="xs">
            <Icon aria-label="Star icon" />
            <Icon aria-label="Star icon" />
            <Icon aria-label="Star icon" />
            <Icon aria-label="Star icon" />
            <Icon aria-label="Star icon" />
          </IconGroup>
        </div>
        
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-500">Small Spacing</span>
          <IconGroup spacing="sm">
            <Icon aria-label="Social icon" />
            <Icon aria-label="Social icon" />
            <Icon aria-label="Social icon" />
          </IconGroup>
        </div>
        
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-500">Medium Spacing (Default)</span>
          <IconGroup spacing="md">
            <CheckIcon aria-label="Feature 1" />
            <CheckIcon aria-label="Feature 2" />
            <CheckIcon aria-label="Feature 3" />
          </IconGroup>
        </div>
        
        <div className="flex flex-col gap-2">
          <span className="text-xs text-gray-500">Large Spacing</span>
          <IconGroup spacing="lg">
            <Icon badge={3} aria-label="Notifications" />
            <Icon interactive tooltip="Settings" aria-label="Settings" />
            <Icon interactive disabled aria-label="Disabled action" />
          </IconGroup>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Group icons with consistent spacing using IconGroup component.',
      },
    },
  },
};

// ============================================================================
// Usage Examples
// ============================================================================

export const UsageExamples: Story = {
  render: () => (
    <div className="space-y-8 max-w-2xl p-6 bg-gray-50 rounded-lg">
      <div>
        <h3 className="text-lg font-semibold mb-3">Form Field with Icons</h3>
        <div className="space-y-4 p-4 bg-white rounded border">
          <div className="flex items-center gap-2">
            <CheckIcon color="success" size="sm" />
            <span className="text-sm">Email format is valid</span>
          </div>
          
          <div className="flex items-center gap-2">
            <XIcon color="error" size="sm" />
            <span className="text-sm">Password must be 8+ characters</span>
          </div>
          
          <div className="flex items-center gap-2">
            <WarningIcon color="warning" size="sm" />
            <span className="text-sm">Username may be taken</span>
          </div>
          
          <div className="flex items-center gap-2">
            <LoadingIcon size="sm" />
            <span className="text-sm">Checking availability...</span>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Data Table Actions</h3>
        <div className="flex items-center gap-2 p-4 bg-white rounded border">
          <IconButton aria-label="Add row">
            <Icon aria-label="Add icon" />
          </IconButton>
          
          <IconButton aria-label="Edit selected">
            <Icon tooltip="Edit selected rows" aria-label="Edit icon" />
          </IconButton>
          
          <IconButton aria-label="Delete selected" disabled>
            <XIcon aria-label="Delete icon" />
          </IconButton>
          
          <div className="ml-auto">
            <IconButton aria-label="Refresh data">
              <LoadingIcon aria-label="Refresh icon" />
            </IconButton>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Notification Panel</h3>
        <div className="space-y-3 p-4 bg-white rounded border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon badge={3} badgeColor="error" aria-label="Unread messages" />
              <span className="text-sm font-medium">Messages</span>
            </div>
            <IconButton aria-label="Mark as read">
              <CheckIcon size="sm" />
            </IconButton>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon badge="!" badgeColor="warning" aria-label="Important alerts" />
              <span className="text-sm font-medium">Alerts</span>
            </div>
            <Icon interactive tooltip="View alerts" aria-label="View alerts" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon aria-label="System status" />
              <span className="text-sm font-medium">System</span>
            </div>
            <StatusIcon status="success" aria-label="System status good" />
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Real-world usage examples showing how icons can be combined in different scenarios.',
      },
    },
  },
};
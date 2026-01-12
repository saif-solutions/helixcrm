import { Badge, PrimaryBadge, SuccessBadge, ErrorBadge, WarningBadge } from './Badge';
import { CheckIcon, XIcon } from '../Icon/Icon';

export default {
  title: 'Atoms/Badge',
  component: Badge,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success', 'error', 'warning', 'info', 'outline'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
    },
    children: {
      control: 'text',
    },
  },
};

// Default badge
export const Default = {
  args: {
    children: 'Badge',
    variant: 'default',
    size: 'md',
  },
};

// All variants
export const Variants = () => (
  <div className="flex flex-wrap gap-2">
    <Badge variant="default">Default</Badge>
    <Badge variant="primary">Primary</Badge>
    <Badge variant="success">Success</Badge>
    <Badge variant="error">Error</Badge>
    <Badge variant="warning">Warning</Badge>
    <Badge variant="info">Info</Badge>
    <Badge variant="outline">Outline</Badge>
  </div>
);

// All sizes
export const Sizes = () => (
  <div className="flex items-center gap-2">
    <Badge size="xs">Extra Small</Badge>
    <Badge size="sm">Small</Badge>
    <Badge size="md">Medium</Badge>
    <Badge size="lg">Large</Badge>
  </div>
);

// All shapes
export const Shapes = () => (
  <div className="flex items-center gap-2">
    <Badge shape="square">Square</Badge>
    <Badge shape="rounded">Rounded</Badge>
    <Badge shape="pill">Pill</Badge>
  </div>
);

// With icons
export const WithIcons = () => (
  <div className="flex flex-wrap gap-2">
    <Badge leftIcon={<CheckIcon size="xs" />}>With Left Icon</Badge>
    <Badge rightIcon={<XIcon size="xs" />}>With Right Icon</Badge>
    <Badge leftIcon={<CheckIcon size="xs" />} rightIcon={<XIcon size="xs" />}>
      Both Icons
    </Badge>
        <Badge leftIcon={<CheckIcon size="xs" />}>Icon</Badge>
  </div>
);

// Predefined badge components
export const PredefinedBadges = () => (
  <div className="flex flex-wrap gap-2">
    <PrimaryBadge>Primary</PrimaryBadge>
    <SuccessBadge>Success</SuccessBadge>
    <ErrorBadge>Error</ErrorBadge>
    <WarningBadge>Warning</WarningBadge>
  </div>
);

// Clickable badges
export const ClickableBadges = () => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-wrap gap-2">
      <Badge clickable onClick={() => alert('Clicked!')}>
        Click Me
      </Badge>
      <Badge variant="primary" clickable>
        Primary Clickable
      </Badge>
      <Badge variant="success" clickable>
        Success Clickable
      </Badge>
    </div>
    
    <div className="text-sm text-gray-500">
      Clickable badges have hover effects and can be triggered
    </div>
  </div>
);

// Usage examples
export const UsageExamples = () => (
  <div className="space-y-6 max-w-md p-4 bg-gray-50 rounded-lg">
    <div>
      <h3 className="text-lg font-semibold mb-3">Status Indicators</h3>
      <div className="flex flex-wrap gap-2">
        <SuccessBadge leftIcon={<CheckIcon size="xs" />}>Active</SuccessBadge>
        <ErrorBadge leftIcon={<XIcon size="xs" />}>Inactive</ErrorBadge>
        <Badge variant="warning">Pending</Badge>
        <Badge variant="info">New</Badge>
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">Categories & Tags</h3>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Technology</Badge>
        <Badge variant="outline">Design</Badge>
        <Badge variant="outline" clickable>
          Marketing ×
        </Badge>
        <Badge variant="outline" clickable>
          Sales ×
        </Badge>
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">User Roles</h3>
      <div className="flex flex-wrap gap-2">
        <PrimaryBadge>Admin</PrimaryBadge>
        <SuccessBadge>Editor</SuccessBadge>
        <Badge variant="default">Viewer</Badge>
        <Badge variant="outline">Guest</Badge>
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">Priority Levels</h3>
      <div className="flex flex-wrap gap-2">
        <ErrorBadge size="sm">High</ErrorBadge>
        <WarningBadge size="sm">Medium</WarningBadge>
        <Badge variant="default" size="sm">Low</Badge>
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">Counters & Notifications</h3>
      <div className="flex flex-wrap gap-2">
        <Badge variant="primary" shape="pill">5</Badge>
        <Badge variant="error" shape="pill">99+</Badge>
        <Badge variant="success" shape="pill">New</Badge>
      </div>
    </div>
  </div>
);
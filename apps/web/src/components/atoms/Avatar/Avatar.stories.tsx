// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Avatar\Avatar.stories.tsx
import { Avatar, AvatarXS, AvatarSM, AvatarMD, AvatarLG } from './Avatar';

export default {
  title: 'Atoms/Avatar',
  component: Avatar,
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    shape: {
      control: 'select',
      options: ['circle', 'square', 'rounded'],
    },
    status: {
      control: 'select',
      options: ['online', 'offline', 'away', 'busy', 'none'],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'gray'],
    },
    statusPosition: {
      control: 'select',
      options: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'Enterprise Avatar component for user profile images or initials. Supports images with fallback, status indicators, multiple sizes/shapes, and full accessibility.',
      },
    },
  },
};

// Default avatar
export const Default = {
  args: {
    fallback: 'John Doe',
    size: 'md',
    shape: 'circle',
    color: 'primary',
  },
};

// With image
export const WithImage = () => (
  <div className="flex items-center gap-4 p-4">
    <Avatar
      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"
      alt="User Profile"
      data-testid="avatar-1"
    />
    <Avatar
      src="https://images.unsplash.com/photo-1494790108755-2616b786d4d1?w-400&h=400&fit=crop"
      alt="User Profile"
      shape="rounded"
      data-testid="avatar-2"
    />
  </div>
);

// All sizes
export const Sizes = () => (
  <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
    <Avatar size="xs" fallback="XS" data-testid="avatar-xs" />
    <Avatar size="sm" fallback="SM" data-testid="avatar-sm" />
    <Avatar size="md" fallback="MD" data-testid="avatar-md" />
    <Avatar size="lg" fallback="LG" data-testid="avatar-lg" />
    <Avatar size="xl" fallback="XL" data-testid="avatar-xl" />
  </div>
);

// Predefined size components
export const PredefinedSizes = () => (
  <div className="flex items-center gap-6 p-4">
    <AvatarXS fallback="XS" data-testid="avatar-xs" />
    <AvatarSM fallback="SM" data-testid="avatar-sm" />
    <AvatarMD fallback="MD" data-testid="avatar-md" />
    <AvatarLG fallback="LG" data-testid="avatar-lg" />
  </div>
);

// All shapes
export const Shapes = () => (
  <div className="flex items-center gap-6 p-4">
    <Avatar shape="circle" fallback="C" data-testid="avatar-circle" />
    <Avatar shape="square" fallback="S" data-testid="avatar-square" />
    <Avatar shape="rounded" fallback="R" data-testid="avatar-rounded" />
  </div>
);

// All colors
export const Colors = () => (
  <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
    <Avatar color="primary" fallback="P" data-testid="avatar-primary" />
    <Avatar color="secondary" fallback="S" data-testid="avatar-secondary" />
    <Avatar color="success" fallback="OK" data-testid="avatar-success" />
    <Avatar color="error" fallback="ER" data-testid="avatar-error" />
    <Avatar color="warning" fallback="WA" data-testid="avatar-warning" />
    <Avatar color="info" fallback="IN" data-testid="avatar-info" />
    <Avatar color="gray" fallback="GR" data-testid="avatar-gray" />
  </div>
);

// All status indicators
export const StatusIndicators = () => (
  <div className="space-y-6 p-4">
    <div className="flex items-center gap-8">
      <Avatar status="online" fallback="ON" data-testid="avatar-online" />
      <Avatar status="offline" fallback="OFF" data-testid="avatar-offline" />
      <Avatar status="away" fallback="AW" data-testid="avatar-away" />
      <Avatar status="busy" fallback="BS" data-testid="avatar-busy" />
    </div>
    
    <div className="text-sm text-gray-500">
      Status indicators show user availability with appropriate ARIA labels for accessibility.
    </div>
  </div>
);

// Status positions
export const StatusPositions = () => (
  <div className="space-y-6 p-4">
    <div className="grid grid-cols-2 gap-8">
      <div className="flex flex-col items-center gap-2">
        <Avatar status="online" statusPosition="top-left" fallback="TL" />
        <span className="text-xs text-gray-500">Top Left</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar status="online" statusPosition="top-right" fallback="TR" />
        <span className="text-xs text-gray-500">Top Right</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar status="online" statusPosition="bottom-left" fallback="BL" />
        <span className="text-xs text-gray-500">Bottom Left</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar status="online" statusPosition="bottom-right" fallback="BR" />
        <span className="text-xs text-gray-500">Bottom Right</span>
      </div>
    </div>
  </div>
);

// Fallback initials
export const FallbackInitials = () => (
  <div className="space-y-6 p-4">
    <div className="grid grid-cols-4 gap-4">
      <Avatar fallback="John Doe" data-testid="avatar-john" />
      <Avatar fallback="Jane Smith" data-testid="avatar-jane" />
      <Avatar fallback="Alex Johnson" data-testid="avatar-alex" />
      <Avatar fallback="Sam Wilson" data-testid="avatar-sam" />
      <Avatar fallback="Single" data-testid="avatar-single" />
      <Avatar fallback="" data-testid="avatar-empty" />
      <Avatar fallback="Alice Bob Charlie" data-testid="avatar-multi" />
    </div>
    
    <div className="text-sm text-gray-500">
      Automatically extracts initials from names (1-2 characters max). Shows "?" for empty fallback.
    </div>
  </div>
);

// Usage examples
export const UsageExamples = () => (
  <div className="space-y-8 p-6 bg-gray-50 rounded-lg max-w-2xl">
    <div>
      <h3 className="text-lg font-semibold mb-4">User List</h3>
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-3 bg-white rounded-lg shadow-sm">
          <Avatar 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"
            alt="John Doe"
            status="online"
            size="sm"
            data-testid="user-john"
          />
          <div className="flex-1">
            <p className="font-medium text-gray-900">John Doe</p>
            <p className="text-sm text-success-600">Online • Active now</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 p-3 bg-white rounded-lg shadow-sm">
          <Avatar 
            fallback="Jane Smith"
            color="success"
            status="away"
            size="sm"
            data-testid="user-jane"
          />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Jane Smith</p>
            <p className="text-sm text-warning-600">Away • Last seen 15 min ago</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 p-3 bg-white rounded-lg shadow-sm">
          <Avatar 
            fallback="Alex Johnson"
            color="warning"
            status="offline"
            size="sm"
            data-testid="user-alex"
          />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Alex Johnson</p>
            <p className="text-sm text-gray-500">Offline • Last seen 2 hours ago</p>
          </div>
        </div>
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-4">Team Avatars</h3>
      <div className="flex items-center -space-x-2">
        <Avatar size="sm" fallback="TM" color="primary" data-testid="team-1" />
        <Avatar size="sm" fallback="JD" color="success" data-testid="team-2" />
        <Avatar size="sm" fallback="JS" color="warning" data-testid="team-3" />
        <Avatar size="sm" fallback="+3" color="gray" data-testid="team-more" />
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Stacked avatars for team displays
      </p>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-4">Dark Mode Support</h3>
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-900 rounded-lg">
        <Avatar fallback="DM" color="primary" className="dark" />
        <Avatar fallback="DM" color="gray" className="dark" />
        <Avatar fallback="DM" color="success" className="dark" />
      </div>
      <p className="text-sm text-gray-500 mt-2">
        All colors have dark mode variants
      </p>
    </div>
  </div>
);

// Interactive playground
export const Playground = {
  args: {
    size: 'md',
    shape: 'circle',
    color: 'primary',
    status: 'online',
    statusPosition: 'bottom-right',
    fallback: 'Playground',
  },
};
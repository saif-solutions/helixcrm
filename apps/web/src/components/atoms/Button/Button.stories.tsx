import { Button, PrimaryButton, SecondaryButton, GhostButton, DangerButton } from './Button';

export default {
  title: 'Atoms/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'success', 'warning'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    children: {
      control: 'text',
    },
  },
};

// Default button
export const Default = {
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md',
  },
};

// All variants
export const Variants = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
    </div>
    
    <div className="text-sm text-gray-500 mt-2">
      Each variant has appropriate styling for its purpose
    </div>
  </div>
);

// All sizes
export const Sizes = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-end gap-4">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
    
    <div className="flex items-end gap-4">
      <Button size="xs" iconOnly>X</Button>
      <Button size="sm" iconOnly>S</Button>
      <Button size="md" iconOnly>M</Button>
      <Button size="lg" iconOnly>L</Button>
      <Button size="xl" iconOnly>XL</Button>
    </div>
  </div>
);

// With icons
export const WithIcons = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-4">
      <Button leftIcon={<span>←</span>}>Back</Button>
      <Button rightIcon={<span>→</span>}>Next</Button>
      <Button leftIcon={<span>✓</span>} rightIcon={<span>↗</span>}>
        Save & Continue
      </Button>
    </div>
    
    <div className="flex items-center gap-4">
      <Button iconOnly aria-label="Settings">
        <span>⚙</span>
      </Button>
      <Button iconOnly aria-label="Edit">
        <span>✏</span>
      </Button>
      <Button iconOnly aria-label="Delete">
        <span>🗑</span>
      </Button>
    </div>
  </div>
);

// States
export const States = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-4">
      <Button>Normal</Button>
      <Button loading>Loading</Button>
      <Button disabled>Disabled</Button>
    </div>
    
    <div className="flex items-center gap-4">
      <Button fullWidth>Full Width Button</Button>
    </div>
  </div>
);

// Predefined components
export const PredefinedButtons = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-4">
      <PrimaryButton>Primary Button</PrimaryButton>
      <SecondaryButton>Secondary Button</SecondaryButton>
      <GhostButton>Ghost Button</GhostButton>
      <DangerButton>Danger Button</DangerButton>
    </div>
    
    <div className="text-sm text-gray-500">
      These are pre-configured button components for consistent usage
    </div>
  </div>
);

// Usage examples
export const UsageExamples = () => (
  <div className="flex flex-col gap-6 p-4 bg-gray-50 rounded-lg">
    <div>
      <h3 className="text-lg font-semibold mb-2">Form Actions</h3>
      <div className="flex items-center gap-3">
        <PrimaryButton>Save Changes</PrimaryButton>
        <SecondaryButton>Cancel</SecondaryButton>
        <DangerButton>Delete Account</DangerButton>
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-2">Data Table Actions</h3>
      <div className="flex items-center gap-2">
        <Button size="sm" leftIcon={<span>✏</span>}>Edit</Button>
        <Button size="sm" variant="ghost" leftIcon={<span>👁</span>}>View</Button>
        <Button size="sm" variant="danger" leftIcon={<span>🗑</span>}>Delete</Button>
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-2">Navigation</h3>
      <div className="flex items-center gap-3">
        <Button variant="ghost" leftIcon={<span>←</span>}>Previous</Button>
        <Button variant="ghost" rightIcon={<span>→</span>}>Next</Button>
        <PrimaryButton rightIcon={<span>↗</span>}>Submit Application</PrimaryButton>
      </div>
    </div>
  </div>
);
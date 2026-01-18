// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dialog\Dialog.stories.tsx
import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
// import { fn } from '@storybook/test';
import { Dialog } from './Dialog';
import { Button } from '../../atoms/Button/Button';
import { Input } from '../../atoms/Input/Input';

// Mock dependencies for comprehensive stories
// Since Checkbox is in MVP roadmap, create a mock component
const MockCheckbox = ({ 
  checked, 
  onChange, 
  label 
}: { 
  checked: boolean; 
  onChange: (checked: boolean) => void; 
  label: string;
}) => (
  <label className="flex items-center space-x-2 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
    />
    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
  </label>
);

// Mock Card component for dashboard examples
const MockCard = ({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
    {children}
  </div>
);

// Type assertions for compound components (they exist in Dialog.tsx)
const DialogWithComponents = Dialog as typeof Dialog & {
  Header: React.ComponentType<any>;
  Body: React.ComponentType<any>;
  Footer: React.ComponentType<any>;
};

// Create typed versions of compound components
const DialogHeader = ({ 
  title, 
  description, 
  showCloseButton = true,
  children,
  ...props 
}: any) => (
  <div 
    className="flex items-start justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700"
    {...props}
  >
    <div className="flex-1">
      {title && (
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
      )}
      {description && (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
      {children}
    </div>
    {showCloseButton && (
      <button
        type="button"
        className="ml-4 flex-shrink-0 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Close dialog"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);

const DialogBody = ({ 
  children, 
  className = '',
  ...props 
}: any) => (
  <div 
    className={`px-6 py-4 ${className}`}
    {...props}
  >
    {children}
  </div>
);

const DialogFooter = ({ 
  children, 
  className = '',
  ...props 
}: any) => (
  <div 
    className={`flex items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700 ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Attach mock compound components
(DialogWithComponents as any).Header = DialogHeader;
(DialogWithComponents as any).Body = DialogBody;
(DialogWithComponents as any).Footer = DialogFooter;

// ============================================================================
// 1. METADATA & CONFIGURATION
// ============================================================================

const meta: Meta<typeof Dialog> = {
  title: 'Components/Molecules/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# Dialog Component

A fully accessible, enterprise-grade dialog/modal component for HELIX CRM with comprehensive features:

## 📋 Core Features
- **Multiple Variants**: Default, Alert, Confirm, Form, Success, Error, Warning
- **Responsive Sizes**: XS, SM, MD, LG, XL, Fullscreen
- **Flexible Positioning**: Center, Top, Bottom, Left, Right, Corners
- **Smooth Animations**: Fade, Slide, Scale, Directional slides, Shake
- **Compound Pattern**: Header, Body, Footer components
- **Nested Support**: Multiple levels with proper z-index stacking

## ♿ Accessibility
- **WCAG 2.1 AA compliant**
- **ARIA roles**: dialog, alertdialog with aria-modal="true"
- **Keyboard navigation**: Escape to close, Tab/Shift+Tab focus trap
- **Focus management**: Returns focus to triggering element
- **Screen reader support**: Background content hidden, proper announcements

## ⚡ Performance (MVP Standards)
- **Render time**: < 50ms
- **Bundle size**: < 15KB (molecule component)
- **Memory efficient**: Cleanup on unmount
- **Virtualization ready**: Scrollable content with optimization

## 🧪 Testing Coverage
- **Unit tests**: 80%+ coverage (Jest + Testing Library)
- **Accessibility**: axe-core compliance
- **Integration**: Full keyboard and mouse testing
- **Edge cases**: Empty, nested, persistent, dynamic content

## 🎨 Design Tokens
- Consistent with HELIX CRM design system
- Dark mode support
- Customizable tokens via Dialog.styles.ts
`,
      },
    },
    design: {
      type: 'figma',
      url: 'https://www.figma.com/file/HELIXCRM/Design-System/Dialog-Component',
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'aria-modal-true',
            enabled: true,
          },
          {
            id: 'aria-required-parent',
            enabled: true,
          },
          {
            id: 'aria-roles',
            enabled: true,
          },
        ],
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controls whether the dialog is open or closed',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    variant: {
      control: 'select',
      options: ['default', 'alert', 'confirm', 'form', 'success', 'error', 'warning'],
      description: 'Visual variant of the dialog',
      table: {
        type: { summary: 'DialogVariant' },
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'fullscreen'],
      description: 'Size of the dialog',
      table: {
        type: { summary: 'DialogSize' },
        defaultValue: { summary: 'md' },
      },
    },
    position: {
      control: 'select',
      options: ['center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
      description: 'Position of the dialog on screen',
      table: {
        type: { summary: 'DialogPosition' },
        defaultValue: { summary: 'center' },
      },
    },
    animation: {
      control: 'select',
      options: ['fade', 'slide', 'scale', 'none', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'shake'],
      description: 'Animation for dialog entry/exit',
      table: {
        type: { summary: 'DialogAnimation' },
        defaultValue: { summary: 'fade' },
      },
    },
    persistent: {
      control: 'boolean',
      description: 'Prevents dialog from closing (requires explicit action)',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    nested: {
      control: 'boolean',
      description: 'Indicates if dialog is nested inside another dialog',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    transitionDuration: {
      control: { type: 'range', min: 0, max: 1000, step: 50 },
      description: 'Animation duration in milliseconds',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '200' },
      },
    },
    onClose: {
      action: 'onClose',
      description: 'Callback when dialog is closed',
      table: {
        type: { summary: '(event?: DialogEvent) => void' },
      },
    },
  },
  args: {
    open: false,
    onClose: jest.fn(),
    title: 'Dialog Title',
    description: 'This is a dialog description that provides more context.',
    showCloseButton: true,
    closeOnOverlayClick: true,
    closeOnEscape: true,
    preventScroll: true,
    overlay: true,
    overlayBlur: false,
    portal: true,
    modal: true,
    variant: 'default',
    size: 'md',
    position: 'center',
    animation: 'fade',
    transitionDuration: 200,
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof Dialog>;

// ============================================================================
// 2. DEFAULT STORIES
// ============================================================================

export const Default: Story = {
  args: {
    open: true,
    title: 'Default Dialog',
    description: 'This is a standard dialog with default settings.',
    children: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          This is the main content area of the dialog. You can put any content here including forms, text, images, or other components.
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          The dialog supports rich content and can be customized based on your needs.
        </p>
        <div className="pt-4">
          <Button variant="primary">Action Button</Button>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic dialog with default settings. Use this for general purpose dialogs.',
      },
    },
  },
};

export const WithoutDescription: Story = {
  name: 'Default: Without Description',
  args: {
    open: true,
    title: 'Simple Dialog',
    description: undefined,
    children: (
      <div className="space-y-4">
        <p>Dialog content without description text.</p>
        <Button variant="primary">Continue</Button>
      </div>
    ),
  },
};

// ============================================================================
// 3. VARIANT STORIES
// ============================================================================

export const AlertVariant: Story = {
  name: 'Variant: Alert',
  args: {
    open: true,
    variant: 'alert',
    title: '⚠️ Critical Alert',
    description: 'This is an alert dialog for important messages.',
    children: (
      <div className="space-y-3">
        <p className="text-error-700 dark:text-error-300 font-medium">
          <strong>Critical Action Required:</strong> This action cannot be undone.
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Are you sure you want to proceed with this irreversible action?
        </p>
        <div className="pt-2">
          <Button variant="danger">Acknowledge & Fix</Button>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Alert dialogs for critical messages that require immediate attention. Uses visual indicators for urgency.',
      },
    },
  },
};

export const ConfirmVariant: Story = {
  name: 'Variant: Confirm',
  args: {
    open: true,
    variant: 'confirm',
    title: 'Confirmation Required',
    description: 'Please confirm your action before proceeding.',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          You are about to delete 5 customer records. This action will permanently remove:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
          <li>Customer contact information</li>
          <li>Order history</li>
          <li>Communication logs</li>
        </ul>
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline">Cancel</Button>
          <Button variant="danger">Delete Records</Button>
        </div>
      </div>
    ),
  },
};

export const FormVariant: Story = {
  name: 'Variant: Form',
  args: {
    open: true,
    variant: 'form',
    title: 'Edit Customer Details',
    description: 'Update the customer information in the form below.',
    children: (
      <form className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full Name
          </label>
          <Input id="name" placeholder="Enter full name" />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Address
          </label>
          <Input id="email" type="email" placeholder="customer@example.com" />
        </div>
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone Number
          </label>
          <Input id="phone" placeholder="(123) 456-7890" />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" type="button">Cancel</Button>
          <Button variant="primary" type="submit">Save Changes</Button>
        </div>
      </form>
    ),
  },
};

export const SuccessVariant: Story = {
  name: 'Variant: Success',
  args: {
    open: true,
    variant: 'success',
    title: '🎉 Success!',
    description: 'Your action was completed successfully.',
    children: (
      <div className="space-y-3">
        <p className="text-success-700 dark:text-success-300 font-medium">
          <strong>Customer profile has been updated successfully.</strong>
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          All changes have been saved and will be reflected immediately.
        </p>
        <div className="pt-2">
          <Button variant="primary">Continue</Button>
        </div>
      </div>
    ),
  },
};

export const ErrorVariant: Story = {
  name: 'Variant: Error',
  args: {
    open: true,
    variant: 'error',
    title: '❌ Error Occurred',
    description: 'There was a problem completing your request.',
    children: (
      <div className="space-y-3">
        <p className="text-error-700 dark:text-error-300 font-medium">
          <strong>Failed to save changes:</strong> Database connection timeout.
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Please try again in a few moments. If the problem persists, contact support.
        </p>
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline">Cancel</Button>
          <Button variant="danger">Retry</Button>
        </div>
      </div>
    ),
  },
};

export const WarningVariant: Story = {
  name: 'Variant: Warning',
  args: {
    open: true,
    variant: 'warning',
    title: '⚠️ Warning',
    description: 'Please review the following information carefully.',
    children: (
      <div className="space-y-3">
        <p className="text-warning-700 dark:text-warning-300 font-medium">
          <strong>Your storage is almost full (95% used).</strong>
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Consider upgrading your plan or deleting unused files to avoid service interruption.
        </p>
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline">Dismiss</Button>
          <Button variant="primary">Upgrade Plan</Button>
        </div>
      </div>
    ),
  },
};

// ============================================================================
// 4. SIZE STORIES
// ============================================================================

export const ExtraSmall: Story = {
  name: 'Size: Extra Small (xs)',
  args: {
    open: true,
    size: 'xs',
    title: 'Quick Action',
    children: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to proceed?
        </p>
        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="outline">No</Button>
          <Button size="sm" variant="primary">Yes</Button>
        </div>
      </div>
    ),
  },
};

export const Small: Story = {
  name: 'Size: Small (sm)',
  args: {
    open: true,
    size: 'sm',
    title: 'Notification',
    description: 'A small dialog for brief notifications.',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          Your preferences have been updated successfully.
        </p>
        <div className="pt-2">
          <Button variant="primary">Continue</Button>
        </div>
      </div>
    ),
  },
};

export const Medium: Story = {
  name: 'Size: Medium (md)',
  args: Default.args, // Reuse default
};

export const Large: Story = {
  name: 'Size: Large (lg)',
  args: {
    open: true,
    size: 'lg',
    title: 'Detailed Configuration',
    description: 'A larger dialog for complex configurations.',
    children: (
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          This dialog provides more space for complex forms or detailed content.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Setting 1
            </label>
            <Input placeholder="Value 1" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Setting 2
            </label>
            <Input placeholder="Value 2" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Setting 3
            </label>
            <Input placeholder="Value 3" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Setting 4
            </label>
            <Input placeholder="Value 4" />
          </div>
        </div>
      </div>
    ),
  },
};

export const ExtraLarge: Story = {
  name: 'Size: Extra Large (xl)',
  args: {
    open: true,
    size: 'xl',
    title: 'Data Analysis Report',
    description: 'Comprehensive report with multiple data visualizations.',
    children: (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <MockCard>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Sales Performance
            </h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>Q1: $125,000</p>
              <p>Q2: $145,000</p>
              <p>Q3: $165,000</p>
              <p>Q4: $185,000</p>
            </div>
          </MockCard>
          <MockCard>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Customer Growth
            </h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>New Customers: 245</p>
              <p>Churn Rate: 8.5%</p>
              <p>Retention: 91.5%</p>
              <p>Growth: +12%</p>
            </div>
          </MockCard>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>Extra large dialogs are ideal for dashboards, reports, and complex data visualization.</p>
        </div>
      </div>
    ),
  },
};

export const Fullscreen: Story = {
  name: 'Size: Fullscreen',
  args: {
    open: true,
    size: 'fullscreen',
    title: 'Fullscreen Dashboard',
    description: 'Maximum space for complex dashboards or editors.',
    children: (
      <div className="h-full space-y-4 overflow-y-auto">
        <div className="grid grid-cols-3 gap-4">
          <MockCard className="h-40">
            <h3 className="font-semibold mb-2">Sales Overview</h3>
            <p className="text-sm text-gray-600">Monthly performance metrics</p>
          </MockCard>
          <MockCard className="h-40">
            <h3 className="font-semibold mb-2">Customer Insights</h3>
            <p className="text-sm text-gray-600">Behavior analysis</p>
          </MockCard>
          <MockCard className="h-40">
            <h3 className="font-semibold mb-2">Revenue Trends</h3>
            <p className="text-sm text-gray-600">Quarterly projections</p>
          </MockCard>
        </div>
        <MockCard className="h-64">
          <h3 className="font-semibold text-lg mb-3">Main Content Area</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Fullscreen dialogs are useful for complex applications like dashboards, document editors, or media viewers.
            They provide maximum real estate while maintaining the benefits of the dialog pattern.
          </p>
        </MockCard>
      </div>
    ),
  },
};

// ============================================================================
// 5. POSITION STORIES
// ============================================================================

export const TopPosition: Story = {
  name: 'Position: Top',
  args: {
    open: true,
    position: 'top',
    title: 'Top Notification',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          This dialog appears at the top of the screen. Useful for notifications and alerts.
        </p>
        <div className="pt-2">
          <Button variant="primary">Acknowledge</Button>
        </div>
      </div>
    ),
  },
};

export const BottomPosition: Story = {
  name: 'Position: Bottom',
  args: {
    open: true,
    position: 'bottom',
    title: 'Bottom Sheet',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          This dialog appears at the bottom. Often used for mobile interfaces and action sheets.
        </p>
        <div className="pt-2">
          <Button variant="primary">Confirm</Button>
        </div>
      </div>
    ),
  },
};

export const LeftPosition: Story = {
  name: 'Position: Left',
  args: {
    open: true,
    position: 'left',
    title: 'Side Panel',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          This dialog slides in from the left. Useful for side panels, navigation drawers, or settings.
        </p>
        <div className="pt-2">
          <Button variant="primary">Apply Settings</Button>
        </div>
      </div>
    ),
  },
};

export const RightPosition: Story = {
  name: 'Position: Right',
  args: {
    open: true,
    position: 'right',
    title: 'Right Sidebar',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          This dialog slides in from the right. Common for settings panels, detail views, or quick actions.
        </p>
        <div className="pt-2">
          <Button variant="primary">Save Preferences</Button>
        </div>
      </div>
    ),
  },
};

export const TopLeftPosition: Story = {
  name: 'Position: Top Left',
  args: {
    open: true,
    position: 'top-left',
    title: 'Top Left Corner',
    children: (
      <p className="text-gray-600 dark:text-gray-400">
        Dialog positioned in the top-left corner. Good for notifications that shouldn't block main content.
      </p>
    ),
  },
};

export const BottomRightPosition: Story = {
  name: 'Position: Bottom Right',
  args: {
    open: true,
    position: 'bottom-right',
    title: 'Bottom Right Corner',
    children: (
      <p className="text-gray-600 dark:text-gray-400">
        Dialog positioned in the bottom-right corner. Common for chat widgets or help buttons.
      </p>
    ),
  },
};

// ============================================================================
// 6. ANIMATION STORIES
// ============================================================================

export const FadeAnimation: Story = {
  name: 'Animation: Fade',
  args: {
    open: true,
    animation: 'fade',
    title: 'Fade Animation',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          Dialog fades in and out smoothly. This is the default animation.
        </p>
        <div className="pt-2">
          <Button variant="primary">Continue</Button>
        </div>
      </div>
    ),
  },
};

export const SlideAnimation: Story = {
  name: 'Animation: Slide',
  args: {
    open: true,
    animation: 'slide',
    title: 'Slide Animation',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          Dialog slides up from the bottom. Provides a natural feeling of emergence.
        </p>
        <div className="pt-2">
          <Button variant="primary">Continue</Button>
        </div>
      </div>
    ),
  },
};

export const ScaleAnimation: Story = {
  name: 'Animation: Scale',
  args: {
    open: true,
    animation: 'scale',
    title: 'Scale Animation',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          Dialog scales from 95% to 100% size. Creates a subtle zoom effect.
        </p>
        <div className="pt-2">
          <Button variant="primary">Continue</Button>
        </div>
      </div>
    ),
  },
};

export const SlideUpAnimation: Story = {
  name: 'Animation: Slide Up',
  args: {
    open: true,
    animation: 'slide-up',
    title: 'Slide Up Animation',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          Dialog slides up from the bottom. Great for mobile interfaces.
        </p>
        <div className="pt-2">
          <Button variant="primary">Continue</Button>
        </div>
      </div>
    ),
  },
};

export const NoAnimation: Story = {
  name: 'Animation: None',
  args: {
    open: true,
    animation: 'none',
    title: 'No Animation',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          Dialog appears instantly without animation. Useful for performance-critical scenarios.
        </p>
        <div className="pt-2">
          <Button variant="primary">Continue</Button>
        </div>
      </div>
    ),
  },
};

// ============================================================================
// 7. STATE STORIES
// ============================================================================

export const PersistentDialog: Story = {
  name: 'State: Persistent',
  args: {
    open: true,
    persistent: true,
    title: '⚠️ Important Action Required',
    description: 'This dialog requires explicit confirmation.',
    closeOnEscape: false,
    closeOnOverlayClick: false,
    children: (
      <div className="space-y-3">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          You must acknowledge this message before proceeding.
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Try to close via Escape or overlay click - dialog will shake instead.
        </p>
        <div className="pt-4">
          <Button variant="primary">Acknowledge</Button>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Persistent dialogs prevent accidental closure and require explicit user action. They shake when users try to close them via escape or overlay click.',
      },
    },
  },
};

export const WithoutOverlay: Story = {
  name: 'State: Without Overlay',
  args: {
    open: true,
    overlay: false,
    title: 'Non-modal Dialog',
    description: 'This dialog does not have an overlay, allowing interaction with background content.',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          You can still interact with elements behind this dialog. Use cautiously as this can be confusing for users.
        </p>
        <div className="pt-2">
          <Button variant="primary">Continue</Button>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Dialogs without overlays are non-modal and allow interaction with background content. Use cautiously as they can be confusing for users.',
      },
    },
  },
};

export const WithoutPortal: Story = {
  name: 'State: Without Portal',
  args: {
    open: true,
    portal: false,
    title: 'Inline Dialog',
    description: 'This dialog renders inline instead of in a portal.',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          Rendered within the DOM hierarchy instead of at document body level. Useful for specific layout requirements.
        </p>
        <div className="pt-2">
          <Button variant="primary">Continue</Button>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Dialogs without portals render inline in the DOM hierarchy. Useful for specific layout requirements.',
      },
    },
  },
};

// ============================================================================
// 8. COMPOUND COMPONENT PATTERNS
// ============================================================================

export const CompoundComponents: Story = {
  name: 'Pattern: Compound Components',
  render: (args) => (
    <Dialog {...args}>
      <DialogHeader
        title="Compound Component Example"
        description="Using Dialog.Header, Dialog.Body, and Dialog.Footer separately"
        showCloseButton={true}
      />
      <DialogBody>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Compound components provide more control over the dialog structure.
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Each part (Header, Body, Footer) can be customized independently.
          </p>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Additional Field
            </label>
            <Input placeholder="Custom content here" />
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <div className="flex justify-end space-x-3">
          <Button variant="outline">Cancel</Button>
          <Button variant="primary">Save Changes</Button>
        </div>
      </DialogFooter>
    </Dialog>
  ),
  args: {
    open: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates using Dialog compound components (Header, Body, Footer) for maximum flexibility and control.',
      },
    },
  },
};

// ============================================================================
// 9. NESTED DIALOGS
// ============================================================================

const NestedDialogExample = () => {
  const [parentOpen, setParentOpen] = React.useState(true);
  const [childOpen, setChildOpen] = React.useState(false);
  const [grandchildOpen, setGrandchildOpen] = React.useState(false);

  return (
    <Dialog
      open={parentOpen}
      onClose={() => setParentOpen(false)}
      title="Level 1: Parent Dialog"
      description="This is the parent dialog containing nested dialogs."
      data-testid="dialog-level-1"
    >
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Click the button below to open a nested dialog.
        </p>
        <Button variant="primary" onClick={() => setChildOpen(true)}>
          Open Level 2 Dialog
        </Button>
        
        {/* Level 2 Dialog */}
        <Dialog
          open={childOpen}
          onClose={() => setChildOpen(false)}
          title="Level 2: Child Dialog"
          description="This dialog is nested inside the parent dialog."
          nested={true}
          nestedLevel={1}
          data-testid="dialog-level-2"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              This is the first nested dialog. Notice the proper z-index stacking.
            </p>
            <Button variant="primary" onClick={() => setGrandchildOpen(true)}>
              Open Level 3 Dialog
            </Button>
            
            {/* Level 3 Dialog */}
            <Dialog
              open={grandchildOpen}
              onClose={() => setGrandchildOpen(false)}
              title="Level 3: Grandchild Dialog"
              description="Deeply nested dialog (3 levels)."
              nested={true}
              nestedLevel={2}
              size="sm"
              data-testid="dialog-level-3"
            >
              <div className="space-y-3">
                <p className="text-gray-600 dark:text-gray-400">
                  This is a deeply nested dialog (3 levels).
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Notice the proper z-index stacking and focus isolation.
                </p>
                <div className="pt-2">
                  <Button variant="primary" onClick={() => setGrandchildOpen(false)}>
                    Close This Dialog
                  </Button>
                </div>
              </div>
            </Dialog>
          </div>
        </Dialog>
      </div>
    </Dialog>
  );
};

export const NestedDialogs: Story = {
  name: 'Pattern: Nested Dialogs',
  render: () => <NestedDialogExample />,
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates nested dialogs with proper z-index stacking and focus management. Each nested dialog increments the z-index automatically.',
      },
    },
  },
};

// ============================================================================
// 10. ACCESSIBILITY & FOCUS MANAGEMENT
// ============================================================================

const FocusReturnExample = () => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div className="space-y-4">
      <Button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        data-testid="trigger-button"
      >
        Open Dialog
      </Button>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        After closing, focus returns to this button.
      </p>
      
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        returnFocusRef={triggerRef as React.RefObject<HTMLElement>}
        title="Focus Return Test"
        data-testid="focus-dialog"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Press Escape or click close. Focus should return to the triggering button.
          </p>
          <Input placeholder="Test input for focus" />
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Confirm
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export const FocusReturn: Story = {
  name: 'Accessibility: Focus Return',
  render: () => <FocusReturnExample />,
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates proper focus management where focus returns to the triggering element when the dialog closes.',
      },
    },
  },
};

export const AlertDialogAria: Story = {
  name: 'Accessibility: Alert Dialog ARIA',
  args: {
    open: true,
    variant: 'alert',
    title: 'Critical System Alert',
    role: 'alertdialog',
    'aria-label': 'Critical system alert requiring immediate attention',
    'aria-describedby': 'alert-description',
    children: (
      <>
        <div id="alert-description" className="space-y-3">
          <p className="font-semibold text-error-700 dark:text-error-300">
            System maintenance required immediately.
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Database connection will be lost in 5 minutes if not addressed.
          </p>
        </div>
        <div className="mt-4 flex justify-end space-x-3">
          <Button variant="outline">Dismiss</Button>
          <Button variant="danger">Acknowledge & Fix</Button>
        </div>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates proper ARIA attributes for alert dialogs including role="alertdialog" and aria-describedby for screen readers.',
      },
    },
  },
};

// ============================================================================
// 11. FORM & VALIDATION STORIES
// ============================================================================

const FormValidationExample = (args: any) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    agree: false,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.includes('@')) newErrors.email = 'Valid email required';
    if (!formData.agree) newErrors.agree = 'Must agree to terms';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      args.onClose?.();
    }
  };

  return (
    <Dialog {...args}>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            User Registration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Complete all required fields
          </p>
        </div>
        
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Full Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter your name"
              className={errors.name ? 'border-error-500' : ''}
            />
            {errors.name && (
              <p className="text-error-600 text-sm">{errors.name}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address *
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="user@example.com"
              className={errors.email ? 'border-error-500' : ''}
            />
            {errors.email && (
              <p className="text-error-600 text-sm">{errors.email}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <MockCheckbox
              checked={formData.agree}
              onChange={(checked: boolean) => setFormData({ ...formData, agree: checked })}
              label="I agree to the terms and conditions"
            />
            {errors.agree && (
              <p className="text-error-600 text-sm">{errors.agree}</p>
            )}
          </div>
        </form>

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={args.onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Register
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export const FormValidation: Story = {
  name: 'Pattern: Form with Validation',
  render: (args) => <FormValidationExample {...args} />,
  args: {
    open: true,
    variant: 'form',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates form validation within a dialog with proper error handling and user feedback.',
      },
    },
  },
};

// ============================================================================
// 12. PERFORMANCE & STRESS TESTS
// ============================================================================

export const LargeFormPerformance: Story = {
  name: 'Performance: Large Form (50+ Fields)',
  args: {
    open: true,
    size: 'fullscreen',
    title: 'Bulk Data Entry',
    description: 'Performance test with many form fields',
    children: (
      <div className="h-full overflow-y-auto">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Field {i + 1}
              </label>
              <Input placeholder={`Value for field ${i + 1}`} />
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This dialog contains 50+ input fields. Performance should remain smooth.
            <br />
            <strong>Expected:</strong> Scroll performance &gt; 60fps, no input lag.
          </p>
        </div>
      </div>
    ),
  },
  parameters: {
    chromatic: { disable: true },
    docs: {
      description: {
        story: 'Stress test with large number of form fields. Verifies performance optimization and smooth scrolling.',
      },
    },
  },
};

// ============================================================================
// 13. EDGE CASES
// ============================================================================

export const EmptyDialog: Story = {
  name: 'Edge Case: Empty Content',
  args: {
    open: true,
    title: 'Empty Dialog',
    children: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Dialog with no content. Tests proper rendering and accessibility with minimal content.',
      },
    },
  },
};

export const VeryLongTitle: Story = {
  name: 'Edge Case: Very Long Title',
  args: {
    open: true,
    title: 'This is an extremely long dialog title that might wrap to multiple lines and needs proper handling with truncation or word breaking for responsive design considerations',
    description: 'Dialog with a very long title to test text wrapping and truncation behavior.',
    children: (
      <div className="space-y-3">
        <p className="text-gray-600 dark:text-gray-400">
          Content area with normal text. The title above should handle wrapping gracefully.
        </p>
        <div className="pt-2">
          <Button variant="primary">Continue</Button>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests dialog behavior with extremely long titles that may wrap or need truncation.',
      },
    },
  },
};

export const NoHeaderDialog: Story = {
  name: 'Edge Case: No Header',
  args: {
    open: true,
    title: undefined,
    description: undefined,
    showCloseButton: false,
    children: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Content Without Header
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This dialog doesn't have a header or close button in the header area.
        </p>
        <div className="pt-2">
          <Button variant="primary">Action</Button>
        </div>
      </div>
    ),
  },
};

export const FooterOnlyDialog: Story = {
  name: 'Edge Case: Footer Only',
  args: {
    open: true,
    title: undefined,
    description: undefined,
    showCloseButton: false,
    header: false,
    children: null,
    footer: {
      actions: [
        { label: 'Cancel', variant: 'outline' },
        { label: 'Proceed', variant: 'primary' },
      ],
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Dialog with only footer actions and no header or body content.',
      },
    },
  },
};

// ============================================================================
// 14. REAL-WORLD SCENARIOS
// ============================================================================

export const DeleteConfirmation: Story = {
  name: 'Real World: Delete Confirmation',
  args: {
    open: true,
    variant: 'alert',
    title: 'Delete Customer Record',
    description: 'This action cannot be undone.',
    children: (
      <div className="space-y-4">
        <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md p-4">
          <p className="text-error-700 dark:text-error-300 font-medium">
            You are about to delete:
          </p>
          <ul className="mt-2 space-y-1">
            <li className="text-error-600 dark:text-error-400">• Customer: John Smith</li>
            <li className="text-error-600 dark:text-error-400">• Email: john.smith@example.com</li>
            <li className="text-error-600 dark:text-error-400">• 5 associated orders</li>
            <li className="text-error-600 dark:text-error-400">• Communication history</li>
          </ul>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This will permanently remove all customer data from the system.
        </p>
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline">Cancel</Button>
          <Button variant="danger">Delete Permanently</Button>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Real-world delete confirmation dialog with detailed information and destructive action.',
      },
    },
  },
};

const MultiStepWizardExample = () => {
  const [step, setStep] = React.useState(1);
  const [formData, setFormData] = React.useState({
    step1: { name: '', email: '' },
    step2: { company: '', role: '' },
    step3: { plan: 'basic', agree: false },
  });

  const steps = [
    { number: 1, title: 'Personal Info' },
    { number: 2, title: 'Company Details' },
    { number: 3, title: 'Plan Selection' },
  ];

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Personal Information
            </h3>
            <Input
              placeholder="Full Name"
              value={formData.step1.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                ...formData,
                step1: { ...formData.step1, name: e.target.value }
              })}
            />
            <Input
              type="email"
              placeholder="Email Address"
              value={formData.step1.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                ...formData,
                step1: { ...formData.step1, email: e.target.value }
              })}
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Company Details
            </h3>
            <Input
              placeholder="Company Name"
              value={formData.step2.company}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                ...formData,
                step2: { ...formData.step2, company: e.target.value }
              })}
            />
            <Input
              placeholder="Your Role"
              value={formData.step2.role}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                ...formData,
                step2: { ...formData.step2, role: e.target.value }
              })}
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Select Plan
            </h3>
            <div className="space-y-2">
              {['basic', 'professional', 'enterprise'].map((plan) => (
                <MockCheckbox
                  key={plan}
                  checked={formData.step3.plan === plan}
                  onChange={() => setFormData({
                    ...formData,
                    step3: { ...formData.step3, plan }
                  })}
                  label={`${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`}
                />
              ))}
            </div>
            <MockCheckbox
              checked={formData.step3.agree}
              onChange={(checked: boolean) => setFormData({
                ...formData,
                step3: { ...formData.step3, agree: checked }
              })}
              label="I agree to the terms of service"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={true}
      onClose={jest.fn()}
      title="Multi-Step Onboarding"
      size="lg"
      data-testid="wizard-dialog"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex justify-between items-center">
          {steps.map((s) => (
            <div key={s.number} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= s.number ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {s.number}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {s.title}
              </span>
              {s.number < 3 && <div className="w-16 h-0.5 bg-gray-300 dark:bg-gray-600 mx-2"></div>}
            </div>
          ))}
        </div>

        {/* Step content */}
        {renderStep()}

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            Back
          </Button>
          <div className="space-x-3">
            <Button variant="outline" onClick={jest.fn()}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={step === 3 ? jest.fn() : handleNext}
            >
              {step === 3 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export const MultiStepWizard: Story = {
  name: 'Real World: Multi-Step Wizard',
  render: () => <MultiStepWizardExample />,
  parameters: {
    docs: {
      description: {
        story: 'Complex multi-step wizard dialog demonstrating sequential form completion with progress tracking.',
      },
    },
  },
};

// ============================================================================
// 15. DYNAMIC CONTENT & INTERACTIVITY
// ============================================================================

const DynamicContentDialog = () => {
  const [items, setItems] = React.useState(3);
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <Dialog
      open={true}
      onClose={jest.fn()}
      title="Dynamic Content Example"
      data-testid="dynamic-dialog"
    >
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          This dialog changes content dynamically.
        </p>
        
        <Button
          variant="outline"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
        
        {showDetails && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md space-y-2">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Additional Information:
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This content appears dynamically, changing the dialog height.
            </p>
          </div>
        )}
        
        <div className="pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Add items to increase height:
          </label>
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => setItems(Math.max(1, items - 1))}
            >
              Remove
            </Button>
            <Button
              size="sm"
              onClick={() => setItems(items + 1)}
            >
              Add
            </Button>
          </div>
          <div className="mt-2 space-y-1">
            {Array.from({ length: items }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Item {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export const DynamicContent: Story = {
  name: 'Interactive: Dynamic Content',
  render: () => <DynamicContentDialog />,
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates dialog with dynamic content that changes height and content based on user interactions.',
      },
    },
  },
};

// ============================================================================
// 16. SEMANTIC CLASSES DEMONSTRATION
// ============================================================================

export const SemanticClasses: Story = {
  name: 'Pattern: Semantic Class Names',
  args: {
    open: true,
    title: 'Semantic Class Example',
    className: 'dialog-elevated dialog-with-shadow',
    children: (
      <div className="dialog-content-padded">
        <p className="text-gray-600 dark:text-gray-400">
          This dialog uses semantic class names for better maintainability.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Classes like 'dialog-elevated' and 'dialog-content-padded' are defined in Dialog.styles.ts.
        </p>
        <div className="dialog-actions mt-4">
          <Button variant="outline">Cancel</Button>
          <Button variant="primary">Confirm</Button>
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates using semantic class names instead of raw Tailwind utilities for better maintainability and theming.',
      },
    },
  },
};
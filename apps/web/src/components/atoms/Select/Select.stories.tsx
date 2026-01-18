import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';
import { createDefaultSelectOptions, SelectOption } from './Select.types'; // Import SelectOption

// Icon components for consistent rendering
const EmailIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
  </svg>
);

const SmsIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
  </svg>
);

// Define interfaces that extend SelectOption
interface PlanOption extends SelectOption {
  metadata?: {
    price: string;
    users: number;
  };
}

interface CurrencyOption extends SelectOption {
  metadata?: {
    symbol: string;
  };
}

const meta: Meta<typeof Select> = {
  title: 'Components/Atoms/Select',
  component: Select,
  tags: ['autodocs'],
  // ... rest of meta configuration
};

export default meta;
type Story = StoryObj<typeof Select>;

/* ============================================================================
 * Basic Examples
 * ========================================================================== */

export const Default: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    placeholder: 'Select an option',
  },
};

export const WithLabel: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    label: 'Choose an option',
    helperText: 'Please select one option from the list',
  },
};

export const WithDefaultValue: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    defaultValue: 'value-2',
    label: 'Pre-selected option',
  },
};

export const Controlled: Story = {
  render: function Render() {
    const [value, setValue] = useState<string>('value-2');
    return (
      <Select
        options={createDefaultSelectOptions(5)}
        value={value}
        onChange={(newValue) => setValue(newValue as string)}
        label="Controlled Select"
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of controlled usage with React state',
      },
    },
  },
};

/* ============================================================================
 * Multiple Selection
 * ========================================================================== */

export const MultipleSelection: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    label: 'Multiple Selection',
    multiple: true,
    placeholder: 'Select multiple options',
  },
};

export const MultipleWithDefaultValues: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    label: 'Multiple with Defaults',
    multiple: true,
    defaultValue: ['value-1', 'value-3'],
    placeholder: 'Select multiple options',
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of multiple select with pre-selected values',
      },
    },
  },
};

/* ============================================================================
 * Variants
 * ========================================================================== */

export const Primary: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    variant: 'primary',
    label: 'Primary Variant',
  },
};

export const Outline: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    variant: 'outline',
    label: 'Outline Variant',
  },
};

export const Ghost: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    variant: 'ghost',
    label: 'Ghost Variant',
  },
};

export const Filled: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    variant: 'filled',
    label: 'Filled Variant',
  },
};

export const Minimal: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    variant: 'minimal',
    label: 'Minimal Variant',
  },
};

/* ============================================================================
 * Sizes
 * ========================================================================== */

export const ExtraSmall: Story = {
  args: {
    options: createDefaultSelectOptions(3),
    size: 'xs',
    label: 'Extra Small (xs)',
  },
};

export const Small: Story = {
  args: {
    options: createDefaultSelectOptions(3),
    size: 'sm',
    label: 'Small (sm)',
  },
};

export const Medium: Story = {
  args: {
    options: createDefaultSelectOptions(3),
    size: 'md',
    label: 'Medium (md)',
  },
};

export const Large: Story = {
  args: {
    options: createDefaultSelectOptions(3),
    size: 'lg',
    label: 'Large (lg)',
  },
};

export const ExtraLarge: Story = {
  args: {
    options: createDefaultSelectOptions(3),
    size: 'xl',
    label: 'Extra Large (xl)',
  },
};

/* ============================================================================
 * States
 * ========================================================================== */

export const Disabled: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    label: 'Disabled Select',
    disabled: true,
    defaultValue: 'value-2',
  },
};

export const Loading: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    label: 'Loading Select',
    loading: true,
  },
};

export const Error: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    label: 'Select with Error',
    error: true,
    errorMessage: 'This field is required',
  },
};

export const Required: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    label: 'Required Field',
    required: true,
    helperText: 'This field is required',
  },
};

/* ============================================================================
 * Features
 * ========================================================================== */

export const Searchable: Story = {
  args: {
    options: createDefaultSelectOptions(10),
    label: 'Searchable Select',
    searchable: true,
    placeholder: 'Type to search...',
  },
};

export const Clearable: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    label: 'Clearable Select',
    clearable: true,
    defaultValue: 'value-2',
  },
};

/* ============================================================================
 * Complex Examples
 * ========================================================================== */

export const WithGroups: Story = {
  args: {
    options: [
      { value: 'apple', label: 'Apple', group: 'Fruits' },
      { value: 'banana', label: 'Banana', group: 'Fruits' },
      { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
      { value: 'broccoli', label: 'Broccoli', group: 'Vegetables' },
      { value: 'bread', label: 'Bread' },
    ],
    label: 'Grouped Options',
    ungroupedLabel: 'Others',
  },
};

export const WithIcons: Story = {
  args: {
    options: [
      {
        value: 'email',
        label: 'Email',
        description: 'Send via email',
        icon: <EmailIcon />,
      },
      {
        value: 'sms',
        label: 'SMS',
        description: 'Send via text message',
        icon: <SmsIcon />,
      },
    ],
    label: 'With Icons',
  },
};

/* ============================================================================
 * Virtualization & Performance
 * ========================================================================== */

export const LargeDataset: Story = {
  args: {
    options: Array.from({ length: 100 }, (_, i) => ({
      value: `value-${i + 1}`,
      label: `Option ${i + 1}`,
      description: i % 3 === 0 ? `Description for option ${i + 1}` : undefined,
      disabled: i % 10 === 0,
    })),
    label: 'Large Dataset (100 items)',
    searchable: true,
    virtualizationThreshold: 50,
  },
  parameters: {
    docs: {
      description: {
        story: `
Demonstrates implicit virtualization for large option lists.

Virtualization is automatically enabled when the number of options exceeds \`virtualizationThreshold\` (default: 100).

In this example, we set \`virtualizationThreshold: 50\` so virtualization kicks in immediately.
`,
      },
    },
  },
};

/* ============================================================================
 * Custom Rendering
 * ========================================================================== */

export const CustomOptionRendering: Story = {
  args: {
    options: [
      { value: 'basic', label: 'Basic Plan', metadata: { price: '$10', users: 1 } },
      { value: 'pro', label: 'Pro Plan', metadata: { price: '$30', users: 5 } },
      { value: 'enterprise', label: 'Enterprise Plan', metadata: { price: '$100', users: 50 } },
    ] as PlanOption[],
    label: 'Custom Option Rendering',
    renderOption: (option: SelectOption, { isSelected, isFocused }) => {
      // Type assertion inside the function
      const planOption = option as PlanOption;
      return (
        <div className={`p-3 rounded ${isFocused ? 'bg-blue-50' : ''} ${isSelected ? 'border-l-4 border-blue-500' : ''}`}>
          <div className="font-medium">{planOption.label}</div>
          {planOption.metadata && (
            <div className="text-sm text-gray-500">
              <div>{planOption.metadata.price}/month</div>
              <div>Up to {planOption.metadata.users} users</div>
            </div>
          )}
        </div>
      );
    },
  },
};

export const CustomValueDisplay: Story = {
  args: {
    options: [
      { value: 'usd', label: 'US Dollar', metadata: { symbol: '$' } },
      { value: 'eur', label: 'Euro', metadata: { symbol: '€' } },
      { value: 'gbp', label: 'British Pound', metadata: { symbol: '£' } },
    ] as CurrencyOption[],
    label: 'Custom Value Display',
    renderValue: (selected: SelectOption[], displayText: string) => {
      // The component ALWAYS passes an array to renderValue
      // For single select, it's an array with one element
      // For multiple select, it's an array with multiple elements
      
      if (!selected || selected.length === 0) {
        return <span className="text-gray-500">{displayText}</span>;
      }
      
      if (selected.length > 1) {
        // Multiple selection
        const currencyOptions = selected as CurrencyOption[];
        const symbols = currencyOptions
          .map(s => s.metadata?.symbol)
          .filter(Boolean)
          .join(', ');
        
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{selected.length} selected</span>
            {symbols && <span className="text-gray-500">({symbols})</span>}
          </div>
        );
      }
      
      // Single selection
      const currencyOption = selected[0] as CurrencyOption;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{currencyOption.label}</span>
          {currencyOption.metadata?.symbol && (
            <span className="text-gray-500">({currencyOption.metadata.symbol})</span>
          )}
        </div>
      );
    },
  },
};

/* ============================================================================
 * Accessibility Examples
 * ========================================================================== */

export const FullAccessibility: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    label: 'Accessible Select',
    ariaLabel: 'Choose an option from the list',
    ariaDescribedBy: 'select-help',
    helperText: 'Use arrow keys to navigate, Enter to select',
  },
  parameters: {
    docs: {
      description: {
        story: 'Example with full accessibility attributes',
      },
    },
  },
};

/* ============================================================================
 * Edge Cases
 * ========================================================================== */

export const EmptyOptions: Story = {
  args: {
    options: [],
    label: 'Empty Select',
    placeholder: 'No options available',
  },
};

export const LongLabels: Story = {
  args: {
    options: [
      { value: '1', label: 'This is a very long option label that should be truncated properly' },
      { value: '2', label: 'Another option with a lengthy description that goes on and on' },
    ],
    label: 'Long Labels',
  },
};

export const ManyOptions: Story = {
  args: {
    options: createDefaultSelectOptions(25),
    label: 'Many Options',
    searchable: true,
    clearable: true,
  },
};

/* ============================================================================
 * Integration Examples
 * ========================================================================== */

export const InForm: Story = {
  render: () => {
    const [country, setCountry] = useState<string>('');
    const [languages, setLanguages] = useState<string[]>([]);
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      alert(`Country: ${country}\nLanguages: ${languages.join(', ')}`);
    };
    
    return (
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Country</label>
          <Select
            options={[
              { value: 'us', label: 'United States' },
              { value: 'ca', label: 'Canada' },
              { value: 'uk', label: 'United Kingdom' },
              { value: 'au', label: 'Australia' },
            ]}
            value={country}
            onChange={(value) => setCountry(value as string)}
            name="country"
            placeholder="Select country"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Languages</label>
          <Select
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
            ]}
            value={languages}
            onChange={(value) => setLanguages(value as string[])}
            multiple
            name="languages"
            placeholder="Select languages"
            helperText="You can select multiple languages"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Submit Form
        </button>
      </form>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of Select components in a form context with React state',
      },
    },
  },
};

/* ============================================================================
 * Position Examples
 * ========================================================================== */

export const TopPosition: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    label: 'Dropdown Above',
    position: 'top',
  },
  decorators: [
    (Story) => (
      <div className="pt-32">
        <Story />
      </div>
    ),
  ],
};

export const AutoPosition: Story = {
  args: {
    options: createDefaultSelectOptions(5),
    label: 'Auto Position',
    position: 'auto',
  },
  decorators: [
    (Story) => (
      <div className="h-64 flex items-end">
        <Story />
      </div>
    ),
  ],
};
import { Input, TextInput, EmailInput, PasswordInput, NumberInput } from './Input';

export default {
  title: 'Atoms/Input',
  component: Input,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'error', 'warning'],
    },
    size: { // Changed from inputSize to size
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    placeholder: {
      control: 'text',
    },
  },
};

// Default input
export const Default = {
  args: {
    placeholder: 'Enter text...',
    size: 'md', // Changed from inputSize to size
  },
};

// All variants
export const Variants = () => (
  <div className="flex flex-col gap-4 max-w-md">
    <Input placeholder="Default input" />
    <Input variant="success" placeholder="Success input" />
    <Input variant="error" placeholder="Error input" />
    <Input variant="warning" placeholder="Warning input" />
  </div>
);

// All sizes
export const Sizes = () => (
  <div className="flex flex-col gap-4 max-w-md">
    <Input size="sm" placeholder="Small input" /> {/* Changed inputSize to size */}
    <Input size="md" placeholder="Medium input" /> {/* Changed inputSize to size */}
    <Input size="lg" placeholder="Large input" /> {/* Changed inputSize to size */}
  </div>
);

// With icons
export const WithIcons = () => (
  <div className="flex flex-col gap-4 max-w-md">
    <Input 
      leftIcon={<span>🔍</span>} 
      placeholder="Search..." 
    />
    <Input 
      rightIcon={<span>@</span>} 
      placeholder="Username" 
    />
    <Input 
      leftIcon={<span>$</span>} 
      rightIcon={<span>USD</span>} 
      placeholder="Amount" 
    />
  </div>
);

// With labels and helper text
export const WithLabels = () => (
  <div className="flex flex-col gap-6 max-w-md">
    <Input 
      label="Email Address"
      placeholder="you@example.com"
      helperText="We'll never share your email."
    />
    
    <Input 
      label="Password"
      type="password"
      placeholder="Enter password"
      helperText="Must be at least 8 characters."
    />
    
    <Input 
      label="Username"
      placeholder="Choose a username"
      error="Username is already taken"
      required
    />
  </div>
);

// Predefined input types
export const InputTypes = () => (
  <div className="flex flex-col gap-4 max-w-md">
    <TextInput label="Text Input" placeholder="Enter text" />
    <EmailInput label="Email Input" placeholder="email@example.com" />
    <PasswordInput label="Password Input" placeholder="••••••••" />
    <NumberInput label="Number Input" placeholder="123" />
  </div>
);

// States
export const States = () => (
  <div className="flex flex-col gap-4 max-w-md">
    <Input placeholder="Normal input" />
    <Input placeholder="Disabled input" disabled />
    <Input placeholder="Readonly input" readOnly value="Readonly value" />
    <Input placeholder="Required field" required />
  </div>
);

// Usage examples
export const UsageExamples = () => (
  <div className="space-y-6 max-w-md p-4 bg-gray-50 rounded-lg">
    <div>
      <h3 className="text-lg font-semibold mb-3">Login Form</h3>
      <div className="space-y-4">
        <EmailInput 
          label="Email" 
          placeholder="you@example.com"
          required
          fullWidth
        />
        <PasswordInput 
          label="Password" 
          placeholder="Enter your password"
          required
          fullWidth
        />
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">Contact Form</h3>
      <div className="space-y-4">
        <TextInput 
          label="Full Name" 
          placeholder="John Doe"
          required
          fullWidth
        />
        <Input 
          label="Phone Number"
          leftIcon={<span>📞</span>}
          placeholder="(123) 456-7890"
          fullWidth
        />
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">Payment Form</h3>
      <div className="space-y-4">
        <Input 
          label="Card Number"
          leftIcon={<span>💳</span>}
          placeholder="1234 5678 9012 3456"
          fullWidth
        />
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Expiry Date"
            placeholder="MM/YY"
            fullWidth
          />
          <Input 
            label="CVV"
            placeholder="123"
            fullWidth
          />
        </div>
      </div>
    </div>
  </div>
);
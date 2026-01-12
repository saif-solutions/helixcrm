// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\FormField\FormField.stories.tsx
import { 
  FormField, 
  FormFieldGroup, 
  FormActions,
  TextFormField,
  EmailFormField,
  PasswordFormField,
  NumberFormField,
  TextareaFormField
} from './FormField';
import { Button } from '../../atoms/Button/Button';
import { Card } from '../Card/Card';

export default {
  title: 'Molecules/FormField',
  component: FormField,
  argTypes: {
    layout: {
      control: 'select',
      options: ['vertical', 'horizontal'],
    },
    required: {
      control: 'boolean',
    },
  },
};

// Default form field
export const Default = {
  args: {
    label: 'Username',
    name: 'username',
    placeholder: 'Enter your username',
    required: true,
    layout: 'vertical',
  },
};

// All field types
export const FieldTypes = () => (
  <div className="space-y-4 max-w-md">
    <TextFormField
      label="Full Name"
      name="fullName"
      placeholder="John Doe"
      required
    />
    
    <EmailFormField
      label="Email Address"
      name="email"
      placeholder="you@example.com"
      required
    />
    
    <PasswordFormField
      label="Password"
      name="password"
      placeholder="••••••••"
      required
    />
    
    <NumberFormField
      label="Age"
      name="age"
      placeholder="25"
      min={18}
      max={100}
    />
    
    <TextareaFormField
      label="Bio"
      name="bio"
      placeholder="Tell us about yourself..."
      rows={3}
    />
  </div>
);

// Validation states
export const ValidationStates = () => (
  <div className="space-y-4 max-w-md">
    <FormField
      label="Valid Field"
      name="valid"
      placeholder="This field is valid"
      helperText="Everything looks good!"
    />
    
    <FormField
      label="Error Field"
      name="error"
      placeholder="This field has an error"
      error="This field is required"
    />
    
    <FormField
      label="Success Field"
      name="success"
      placeholder="This field is successful"
      helperText="Great job!"
      variant="success"
    />
    
    <FormField
      label="Warning Field"
      name="warning"
      placeholder="This field has a warning"
      helperText="Please double-check this information"
      variant="warning"
    />
  </div>
);

// Layout variations
export const Layouts = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">Vertical Layout (Default)</h3>
      <div className="space-y-4 max-w-md">
        <FormField
          label="Username"
          name="username1"
          placeholder="Enter username"
          layout="vertical"
        />
        <FormField
          label="Email"
          name="email1"
          placeholder="Enter email"
          layout="vertical"
        />
      </div>
    </div>
    
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">Horizontal Layout</h3>
      <div className="space-y-4 max-w-2xl">
        <FormField
          label="Username"
          name="username2"
          placeholder="Enter username"
          layout="horizontal"
          labelWidth="100px"
        />
        <FormField
          label="Email Address"
          name="email2"
          placeholder="Enter email"
          layout="horizontal"
          labelWidth="100px"
        />
        <FormField
          label="Phone Number"
          name="phone"
          placeholder="(123) 456-7890"
          layout="horizontal"
          labelWidth="100px"
        />
      </div>
    </div>
  </div>
);

// Disabled and read-only states
export const States = () => (
  <div className="space-y-4 max-w-md">
    <FormField
      label="Enabled Field"
      name="enabled"
      placeholder="You can type here"
    />
    
    <FormField
      label="Disabled Field"
      name="disabled"
      placeholder="Cannot type here"
      disabled
      helperText="This field is disabled"
    />
    
    <FormField
      label="Read-only Field"
      name="readonly"
      value="Pre-filled value"
      readOnly
      helperText="This field is read-only"
    />
  </div>
);

// Using FormFieldGroup
export const FieldGroups = () => (
  <Card>
    <FormFieldGroup
      title="Personal Information"
      description="This information will be displayed publicly."
    >
      <TextFormField
        label="First Name"
        name="firstName"
        placeholder="John"
        required
      />
      
      <TextFormField
        label="Last Name"
        name="lastName"
        placeholder="Doe"
        required
      />
      
      <EmailFormField
        label="Email"
        name="email"
        placeholder="john@example.com"
        required
      />
    </FormFieldGroup>
    
    <FormFieldGroup
      title="Account Settings"
      description="Configure your account preferences."
    >
      <PasswordFormField
        label="New Password"
        name="newPassword"
        placeholder="Enter new password"
      />
      
      <PasswordFormField
        label="Confirm Password"
        name="confirmPassword"
        placeholder="Confirm new password"
      />
      
      <TextareaFormField
        label="Bio"
        name="bio"
        placeholder="Tell us about yourself..."
        rows={3}
        helperText="Brief description for your profile."
      />
    </FormFieldGroup>
    
    <FormActions>
      <Button variant="ghost">Cancel</Button>
      <Button>Save Changes</Button>
    </FormActions>
  </Card>
);

// Complete form example
export const CompleteFormExample = () => (
  <Card className="max-w-2xl">
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Form</h3>
    <p className="text-sm text-gray-500 mb-6">
      Please fill out all required fields to submit your inquiry.
    </p>
    
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextFormField
          label="First Name"
          name="firstName"
          placeholder="John"
          required
        />
        
        <TextFormField
          label="Last Name"
          name="lastName"
          placeholder="Doe"
          required
        />
      </div>
      
      <EmailFormField
        label="Email Address"
        name="email"
        placeholder="you@example.com"
        required
        helperText="We'll never share your email."
      />
      
      <TextFormField
        label="Phone Number"
        name="phone"
        placeholder="(123) 456-7890"
      />
      
      <TextFormField
        label="Subject"
        name="subject"
        placeholder="How can we help you?"
        required
      />
      
      <TextareaFormField
        label="Message"
        name="message"
        placeholder="Type your message here..."
        rows={5}
        required
        helperText="Please provide detailed information about your inquiry."
      />
      
      <TextFormField
        label="How did you hear about us?"
        name="source"
        placeholder="Select an option"
        required
        helperText="This helps us improve our marketing."
      />
    </div>
    
    <FormActions>
      <Button variant="ghost" type="button">
        Clear Form
      </Button>
      <Button type="submit">
        Submit Inquiry
      </Button>
    </FormActions>
  </Card>
);

// Real-world usage examples
export const UsageExamples = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-3">Login Form</h3>
      <Card className="max-w-md">
        <div className="space-y-4">
          <EmailFormField
            label="Email"
            name="loginEmail"
            placeholder="you@example.com"
            required
            fullWidth
          />
          
          <PasswordFormField
            label="Password"
            name="loginPassword"
            placeholder="••••••••"
            required
            fullWidth
          />
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
              <span className="ml-2 text-sm text-gray-700">Remember me</span>
            </label>
            
            <a href="#" className="text-sm text-primary-600 hover:text-primary-500">
              Forgot password?
            </a>
          </div>
          
          <Button fullWidth>
            Sign In
          </Button>
        </div>
      </Card>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">Registration Form</h3>
      <Card className="max-w-2xl">
        <FormFieldGroup
          title="Create Account"
          description="Join our platform to get started."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextFormField
              label="First Name"
              name="regFirstName"
              placeholder="John"
              required
            />
            
            <TextFormField
              label="Last Name"
              name="regLastName"
              placeholder="Doe"
              required
            />
          </div>
          
          <EmailFormField
            label="Email"
            name="regEmail"
            placeholder="you@example.com"
            required
          />
          
          <PasswordFormField
            label="Password"
            name="regPassword"
            placeholder="Create a password"
            required
            helperText="Must be at least 8 characters."
          />
          
          <PasswordFormField
            label="Confirm Password"
            name="regConfirmPassword"
            placeholder="Confirm your password"
            required
          />
          
          <TextFormField
            label="Company"
            name="company"
            placeholder="Your company name"
          />
          
          <TextareaFormField
            label="How will you use our platform?"
            name="useCase"
            placeholder="Briefly describe your intended use..."
            rows={3}
          />
        </FormFieldGroup>
        
        <FormActions>
          <Button variant="ghost">Cancel</Button>
          <Button>Create Account</Button>
        </FormActions>
      </Card>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">Billing Information</h3>
      <Card className="max-w-2xl">
        <FormFieldGroup
          title="Payment Details"
          description="Enter your billing information."
        >
          <TextFormField
            label="Card Number"
            name="cardNumber"
            placeholder="1234 5678 9012 3456"
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <TextFormField
              label="Expiry Date"
              name="expiry"
              placeholder="MM/YY"
              required
            />
            
            <TextFormField
              label="CVV"
              name="cvv"
              placeholder="123"
              required
            />
          </div>
          
          <TextFormField
            label="Name on Card"
            name="cardName"
            placeholder="John Doe"
            required
          />
          
          <TextFormField
            label="Billing Address"
            name="address"
            placeholder="123 Main St, City, State ZIP"
            required
          />
        </FormFieldGroup>
        
        <FormActions>
          <Button variant="ghost">Back</Button>
          <Button>Pay $49.99</Button>
        </FormActions>
      </Card>
    </div>
  </div>
);
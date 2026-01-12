// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Alert\Alert.stories.tsx
import { Alert, InfoAlert, SuccessAlert, ErrorAlert, WarningAlert } from './Alert';
import { Button } from '../../atoms/Button';

export default {
  title: 'Molecules/Alert',
  component: Alert,
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'error', 'warning'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

// Default alert
export const Default = {
  args: {
    title: 'Information',
    message: 'This is an informational alert message.',
    variant: 'info',
    size: 'md',
  },
};

// All variants
export const Variants = () => (
  <div className="space-y-4">
    <Alert
      variant="info"
      title="Information"
      message="This is an informational alert message."
    />
    
    <Alert
      variant="success"
      title="Success"
      message="Your action was completed successfully."
    />
    
    <Alert
      variant="error"
      title="Error"
      message="Something went wrong. Please try again."
    />
    
    <Alert
      variant="warning"
      title="Warning"
      message="This action cannot be undone."
    />
  </div>
);

// All sizes
export const Sizes = () => (
  <div className="space-y-4">
    <Alert
      size="sm"
      title="Small Alert"
      message="This is a small alert with compact spacing."
    />
    
    <Alert
      size="md"
      title="Medium Alert"
      message="This is a medium alert with standard spacing."
    />
    
    <Alert
      size="lg"
      title="Large Alert"
      message="This is a large alert with more spacious layout."
    />
  </div>
);

// With dismiss button
export const Dismissible = () => (
  <div className="space-y-4">
    <Alert
      title="Dismissible Alert"
      message="You can close this alert by clicking the X button."
      dismissible
    />
    
    <Alert
      variant="success"
      title="Important Update"
      message="Your profile has been updated successfully."
      dismissible
    />
    
    <Alert
      variant="warning"
      title="Session Expiring"
      message="Your session will expire in 5 minutes."
      dismissible
      onDismiss={() => alert('Alert dismissed!')}
    />
  </div>
);

// With actions
export const WithActions = () => (
  <div className="space-y-4">
    <Alert
      variant="info"
      title="New Feature Available"
      message="Check out our latest updates and improvements."
      actions={
        <>
          <Button size="sm" variant="primary">Learn More</Button>
          <Button size="sm" variant="ghost">Dismiss</Button>
        </>
      }
    />
    
    <Alert
      variant="error"
      title="Connection Lost"
      message="Your internet connection appears to be offline."
      actions={
        <Button size="sm" variant="primary">
          Reconnect
        </Button>
      }
    />
    
    <Alert
      variant="warning"
      title="Storage Almost Full"
      message="You've used 95% of your available storage."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary">Upgrade Plan</Button>
          <Button size="sm" variant="ghost">Clear Space</Button>
          <Button size="sm" variant="ghost">Learn More</Button>
        </div>
      }
    />
  </div>
);

// Without title
export const WithoutTitle = () => (
  <div className="space-y-4">
    <Alert
      variant="info"
      message="This is an alert without a title."
    />
    
    <Alert
      variant="success"
      message="Operation completed successfully."
    />
    
    <Alert
      variant="error"
      message="An unexpected error occurred."
    />
  </div>
);

// With custom icon
export const WithCustomIcon = () => (
  <div className="space-y-4">
    <Alert
      variant="info"
      title="Custom Icon"
      message="This alert uses a custom icon instead of the default."
      icon={
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      }
    />
    
    <Alert
      variant="success"
      title="Notification"
      message="You have new notifications."
      icon="🔔"
    />
  </div>
);

// Using children instead of message
export const WithChildrenContent = () => (
  <div className="space-y-4">
    <Alert
      variant="info"
      title="Complex Content"
    >
      <div className="space-y-2">
        <p>This alert uses children for more complex content structure.</p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Item one with more details</li>
          <li>Item two with additional information</li>
          <li>Item three explaining the process</li>
        </ul>
      </div>
    </Alert>
    
    <Alert variant="warning">
      <div className="space-y-2">
        <p className="font-medium">Important Security Notice</p>
        <p className="text-sm">
          Please update your password regularly and enable two-factor authentication for added security.
        </p>
      </div>
    </Alert>
  </div>
);

// Predefined alert components
export const PredefinedAlerts = () => (
  <div className="space-y-4">
    <InfoAlert
      title="System Information"
      message="The system will undergo maintenance tonight from 2 AM to 4 AM."
    />
    
    <SuccessAlert
      title="Payment Successful"
      message="Your payment of $49.99 has been processed successfully."
    />
    
    <ErrorAlert
      title="Login Failed"
      message="Invalid username or password. Please try again."
    />
    
    <WarningAlert
      title="Action Required"
      message="Please verify your email address to continue."
    />
  </div>
);

// Usage examples
export const UsageExamples = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-3">Form Validation</h3>
      <div className="space-y-4">
        <ErrorAlert
          title="Form Errors"
          message="Please fix the following errors before submitting:"
        >
          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
            <li>Email address is required</li>
            <li>Password must be at least 8 characters</li>
            <li>Phone number format is invalid</li>
          </ul>
        </ErrorAlert>
        
        <SuccessAlert
          title="Profile Updated"
          message="Your profile information has been saved successfully."
          dismissible
        />
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">System Notifications</h3>
      <div className="space-y-4">
        <WarningAlert
          title="Scheduled Maintenance"
          message="The application will be unavailable on Saturday, 10 PM - 2 AM for scheduled maintenance."
          dismissible
          actions={
            <Button size="sm" variant="ghost">
              View Details
            </Button>
          }
        />
        
        <InfoAlert
          title="New Feature"
          message="Try our new dark mode! It's easier on the eyes during late work sessions."
          actions={
            <Button size="sm" variant="primary">
              Enable Dark Mode
            </Button>
          }
        />
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">User Feedback</h3>
      <div className="space-y-4">
        <Alert
          variant="success"
          size="sm"
          message="File uploaded successfully."
          dismissible
        />
        
        <Alert
          variant="error"
          size="sm"
          message="Failed to delete item. Please try again."
          dismissible
        />
        
        <Alert
          variant="info"
          size="sm"
          message="Saving changes..."
          icon={
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          }
        />
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">Inline Form Alerts</h3>
      <div className="space-y-4">
        <Alert
          variant="warning"
          size="sm"
          title="Unsaved Changes"
          message="You have unsaved changes. Would you like to save before leaving?"
          actions={
            <>
              <Button size="xs" variant="primary">Save</Button>
              <Button size="xs" variant="ghost">Discard</Button>
            </>
          }
        />
        
        <Alert
          variant="info"
          size="sm"
          message="All fields marked with * are required."
        />
      </div>
    </div>
  </div>
);
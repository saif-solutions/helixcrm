// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Card\Card.stories.tsx
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardSubtitle, 
  CardContent, 
  CardFooter, 
  CardActions 
} from './Card';
import { Button } from '../../atoms/Button'; // Fixed import path

export default {
  title: 'Molecules/Card',
  component: Card,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'ghost', 'elevated'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

// Default card
export const Default = {
  args: {
    children: 'Card content goes here',
    variant: 'default',
    size: 'md',
  },
};

// All variants
export const Variants = () => (
  <div className="grid grid-cols-2 gap-4">
    <Card variant="default">
      <CardContent>Default Card</CardContent>
    </Card>
    
    <Card variant="outline">
      <CardContent>Outline Card</CardContent>
    </Card>
    
    <Card variant="ghost">
      <CardContent>Ghost Card</CardContent>
    </Card>
    
    <Card variant="elevated">
      <CardContent>Elevated Card</CardContent>
    </Card>
  </div>
);

// All sizes
export const Sizes = () => (
  <div className="space-y-4">
    <Card size="sm">
      <CardContent>Small Card</CardContent>
    </Card>
    
    <Card size="md">
      <CardContent>Medium Card</CardContent>
    </Card>
    
    <Card size="lg">
      <CardContent>Large Card</CardContent>
    </Card>
  </div>
);

// With title and subtitle
export const WithHeader = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardSubtitle>This is a card subtitle with additional information</CardSubtitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">
          Card content goes here. This could be any type of content like text, forms, or data.
        </p>
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle>Another Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">
          Card with just a title and no subtitle.
        </p>
      </CardContent>
    </Card>
  </div>
);

// With image
export const WithImage = () => (
  <Card
    image={{
      src: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=400&fit=crop',
      alt: 'Office workspace',
      height: '200px',
    }}
    title="Featured Workspace"
    subtitle="Modern office design inspiration"
  >
    <CardContent>
      <p className="text-gray-600">
        This card features a header image with title and subtitle overlay.
        Perfect for showcasing featured content.
      </p>
    </CardContent>
  </Card>
);

// With footer and actions
export const WithFooter = () => (
  <div className="space-y-4">
    <Card
      title="User Profile"
      subtitle="Manage your account settings"
    >
      <CardContent>
        <p className="text-gray-600">
          Update your profile information, password, and account settings.
        </p>
      </CardContent>
      <CardFooter>
        <CardActions>
          <Button variant="ghost">Cancel</Button>
          <Button>Save Changes</Button>
        </CardActions>
      </CardFooter>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle>Product Card</CardTitle>
        <CardSubtitle>$29.99/month</CardSubtitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-gray-600">
          <li>• 10 GB Storage</li>
          <li>• Unlimited Projects</li>
          <li>• Priority Support</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button fullWidth>Subscribe</Button>
      </CardFooter>
    </Card>
  </div>
);

// Interactive cards
export const InteractiveCards = () => (
  <div className="grid grid-cols-2 gap-4">
    <Card hoverable>
      <CardContent>
        <div className="text-center">
          <div className="text-2xl mb-2">👆</div>
          <p className="font-medium">Hoverable Card</p>
          <p className="text-sm text-gray-500">Hover over me</p>
        </div>
      </CardContent>
    </Card>
    
    <Card clickable onClick={() => alert('Card clicked!')}>
      <CardContent>
        <div className="text-center">
          <div className="text-2xl mb-2">🖱️</div>
          <p className="font-medium">Clickable Card</p>
          <p className="text-sm text-gray-500">Click me</p>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Using sub-components
export const WithSubComponents = () => (
  <Card>
    <CardHeader>
      <CardTitle>Using Sub-Components</CardTitle>
      <CardSubtitle>More control over card structure</CardSubtitle>
    </CardHeader>
    
    <CardContent>
      <p className="text-gray-600 mb-4">
        When you need more control over the card structure, you can use the individual sub-components.
      </p>
      
      <div className="bg-gray-50 p-4 rounded">
        <pre className="text-sm">
{`<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardSubtitle>Subtitle</CardSubtitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    <CardActions>
      <Button>Action</Button>
    </CardActions>
  </CardFooter>
</Card>`}
        </pre>
      </div>
    </CardContent>
    
    <CardFooter>
      <CardActions>
        <Button variant="ghost">Learn More</Button>
        <Button>Get Started</Button>
      </CardActions>
    </CardFooter>
  </Card>
);

// Usage examples
export const UsageExamples = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-3">Contact Cards</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card hoverable>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-800 font-bold">JD</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">John Doe</h4>
              <p className="text-sm text-gray-500">john@example.com</p>
              <p className="text-sm text-gray-500 mt-1">Product Manager</p>
            </div>
          </div>
        </Card>
        
        <Card hoverable>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center">
              <span className="text-success-800 font-bold">JS</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Jane Smith</h4>
              <p className="text-sm text-gray-500">jane@example.com</p>
              <p className="text-sm text-gray-500 mt-1">UX Designer</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">Dashboard Stats</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="outline" size="sm">
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-primary-600">1,234</div>
            <div className="text-sm text-gray-500">Total Users</div>
          </CardContent>
        </Card>
        
        <Card variant="outline" size="sm">
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-success-600">89%</div>
            <div className="text-sm text-gray-500">Growth Rate</div>
          </CardContent>
        </Card>
        
        <Card variant="outline" size="sm">
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-warning-600">$12.5K</div>
            <div className="text-sm text-gray-500">Revenue</div>
          </CardContent>
        </Card>
        
        <Card variant="outline" size="sm">
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-info-600">256</div>
            <div className="text-sm text-gray-500">Active Sessions</div>
          </CardContent>
        </Card>
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-semibold mb-3">Settings Panel</h3>
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardSubtitle>Manage how you receive notifications</CardSubtitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive updates via email</p>
            </div>
            <div className="w-12 h-6 bg-primary-600 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-gray-500">Receive browser notifications</p>
            </div>
            <div className="w-12 h-6 bg-gray-300 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">SMS Alerts</p>
              <p className="text-sm text-gray-500">Receive text messages</p>
            </div>
            <div className="w-12 h-6 bg-gray-300 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <CardActions>
            <Button variant="ghost">Reset</Button>
            <Button>Save Preferences</Button>
          </CardActions>
        </CardFooter>
      </Card>
    </div>
  </div>
);
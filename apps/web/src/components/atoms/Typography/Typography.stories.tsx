// D:\Projects-In-Hand\helixcrm\apps\web\src\components\atoms\Typography\Typography.stories.tsx
import { 
  Typography, 
  Display, 
  H1, 
  H2, 
  H3, 
  H4, 
  H5, 
  H6, 
  Body, 
  BodySmall, 
  Caption, 
  Label, 
  Code 
} from './Typography';
import { Card } from '../../molecules/Card/Card';

export default {
  title: 'Atoms/Typography',
  component: Typography,
  argTypes: {
    variant: {
      control: 'select',
      options: ['display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'bodySmall', 'caption', 'label', 'code', 'lead', 'subtitle'],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'muted', 'white', 'inherit'],
    },
    weight: {
      control: 'select',
      options: ['light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'],
    },
    align: {
      control: 'select',
      options: ['left', 'center', 'right', 'justify', 'start', 'end'],
    },
    children: {
      control: 'text',
    },
  },
};

// Basic story with controls
export const Default = {
  args: {
    children: 'Default body text',
    variant: 'body',
    color: 'inherit',
    weight: undefined,
    align: 'left',
    truncate: false,
    uppercase: false,
    italic: false,
    underline: false,
  },
};

// ==================== ALL VARIANTS SHOWCASE ====================

export const AllVariants = () => (
  <div className="space-y-8">
    <div>
      <Typography variant="h3" className="mb-4">Heading Variants</Typography>
      <div className="space-y-4 border-l-4 border-blue-100 pl-4">
        <Display>Display Heading</Display>
        <H1>Heading 1 - Main page title</H1>
        <H2>Heading 2 - Section title</H2>
        <H3>Heading 3 - Subsection title</H3>
        <H4>Heading 4 - Content group heading</H4>
        <H5>Heading 5 - Minor heading</H5>
        <H6>Heading 6 - Smallest heading</H6>
      </div>
    </div>

    <div>
      <Typography variant="h3" className="mb-4">Body Text Variants</Typography>
      <div className="space-y-4 border-l-4 border-green-100 pl-4">
        <Typography variant="lead">
          Lead paragraph - Larger body text for introductory content. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </Typography>
        <Body>
          Body text - Standard paragraph text. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
        </Body>
        <BodySmall>
          Small body text - For secondary content or captions. Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </BodySmall>
        <Typography variant="subtitle">
          Subtitle text - For section subtitles or metadata
        </Typography>
      </div>
    </div>

    <div>
      <Typography variant="h3" className="mb-4">Special Variants</Typography>
      <div className="space-y-4 border-l-4 border-purple-100 pl-4">
        <Caption>Caption text - For image captions, table footers, etc.</Caption>
        <Label>Form field label</Label>
        <Code>const example = "inline code snippet";</Code>
      </div>
    </div>
  </div>
);

// ==================== COLOR VARIATIONS ====================

export const ColorVariations = () => (
  <Card>
    <Typography variant="h3" className="mb-6">Color Variations</Typography>
    
    <div className="space-y-4">
      <Typography color="primary">Primary color - For main content</Typography>
      <Typography color="secondary">Secondary color - For less important content</Typography>
      <Typography color="success">Success color - For positive messages</Typography>
      <Typography color="error">Error color - For error messages</Typography>
      <Typography color="warning">Warning color - For warnings</Typography>
      <Typography color="info">Info color - For informational messages</Typography>
      <Typography color="muted">Muted color - For disabled or secondary text</Typography>
      <div className="bg-gray-800 p-4 rounded">
        <Typography color="white">White color - For text on dark backgrounds</Typography>
      </div>
      <Typography color="inherit">Inherit color - Takes color from parent</Typography>
    </div>
  </Card>
);

// ==================== WEIGHT VARIATIONS ====================

export const WeightVariations = () => (
  <Card>
    <Typography variant="h3" className="mb-6">Font Weight Variations</Typography>
    
    <div className="space-y-3">
      <Typography weight="light">Light weight (300)</Typography>
      <Typography weight="normal">Normal weight (400)</Typography>
      <Typography weight="medium">Medium weight (500)</Typography>
      <Typography weight="semibold">Semibold weight (600)</Typography>
      <Typography weight="bold">Bold weight (700)</Typography>
      <Typography weight="extrabold">Extrabold weight (800)</Typography>
      <Typography weight="black">Black weight (900)</Typography>
    </div>
    
    <div className="mt-6 pt-6 border-t">
      <Typography variant="h4" className="mb-4">Weight Override Examples</Typography>
      <div className="space-y-3">
        <Typography variant="h3" weight="light">H3 with Light weight</Typography>
        <Body weight="bold">Body text with Bold weight</Body>
        <Caption weight="semibold">Caption with Semibold weight</Caption>
      </div>
    </div>
  </Card>
);

// ==================== TEXT TRANSFORMATIONS ====================

export const TextTransformations = () => (
  <Card>
    <Typography variant="h3" className="mb-6">Text Transformations</Typography>
    
    <div className="space-y-4">
      <Typography uppercase>Uppercase text transformation</Typography>
      <Typography variant="subtitle">Default subtitle (already uppercase)</Typography>
      <Typography italic>Italic text style</Typography>
      <Typography underline>Underlined text decoration</Typography>
      <Typography uppercase italic underline>
        Combined: Uppercase + Italic + Underline
      </Typography>
    </div>
  </Card>
);

// ==================== ALIGNMENT VARIATIONS ====================

export const AlignmentVariations = () => (
  <Card>
    <Typography variant="h3" className="mb-6">Text Alignment</Typography>
    
    <div className="space-y-6">
      <div>
        <Typography variant="h6" className="mb-2">Left aligned (default)</Typography>
        <Typography align="left" className="border p-4">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </Typography>
      </div>
      
      <div>
        <Typography variant="h6" className="mb-2">Center aligned</Typography>
        <Typography align="center" className="border p-4">
          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </Typography>
      </div>
      
      <div>
        <Typography variant="h6" className="mb-2">Right aligned</Typography>
        <Typography align="right" className="border p-4">
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </Typography>
      </div>
      
      <div>
        <Typography variant="h6" className="mb-2">Justify aligned</Typography>
        <Typography align="justify" className="border p-4">
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
        </Typography>
      </div>
    </div>
  </Card>
);

// ==================== TRUNCATION & LINE CLAMP ====================

export const TruncationExamples = () => (
  <Card>
    <Typography variant="h3" className="mb-6">Truncation & Line Clamping</Typography>
    
    <div className="space-y-6">
      <div>
        <Typography variant="h6" className="mb-2">Single line truncation</Typography>
        <div className="w-64 border p-4">
          <Typography truncate>
            This is a very long text that will be truncated with an ellipsis when it exceeds the container width.
          </Typography>
        </div>
      </div>
      
      <div>
        <Typography variant="h6" className="mb-2">2-line clamp</Typography>
        <div className="w-64 border p-4">
          <Typography lineClamp={2}>
            This text will be limited to 2 lines. Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
            Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
          </Typography>
        </div>
      </div>
      
      <div>
        <Typography variant="h6" className="mb-2">3-line clamp</Typography>
        <div className="w-64 border p-4">
          <Typography lineClamp={3}>
            This text will be limited to 3 lines. Duis aute irure dolor in reprehenderit in voluptate velit 
            esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, 
            sunt in culpa qui officia deserunt mollit anim id est laborum.
          </Typography>
        </div>
      </div>
    </div>
  </Card>
);

// ==================== REAL-WORLD USAGE EXAMPLES ====================

export const UsageExamples = () => (
  <div className="space-y-8">
    {/* Article Example */}
    <Card>
      <Typography variant="h3" className="mb-4">Article Example</Typography>
      <Display className="mb-2">The Future of Web Development</Display>
      <Typography variant="subtitle" className="mb-6">Exploring trends and technologies in 2024</Typography>
      
      <Typography variant="lead" className="mb-4">
        Web development continues to evolve at a rapid pace, with new frameworks, tools, and methodologies emerging regularly.
      </Typography>
      
      <H2 className="mb-3">Modern Frontend Frameworks</H2>
      <Body className="mb-4">
        The landscape of frontend development has been dominated by React, Vue, and Angular for years. 
        However, newer frameworks like <Code>Svelte</Code> and <Code>SolidJS</Code> are gaining traction for their innovative approaches.
      </Body>
      
      <H3 className="mb-3">Performance Considerations</H3>
      <Body className="mb-4">
        With Core Web Vitals becoming ranking factors, performance optimization is more critical than ever. 
        Developers need to focus on metrics like <Label>Largest Contentful Paint (LCP)</Label>, <Label>First Input Delay (FID)</Label>, and <Label>Cumulative Layout Shift (CLS)</Label>.
      </Body>
      
      <Caption className="mt-4">
        Published on January 15, 2024 • 5 min read
      </Caption>
    </Card>

    {/* Form Example */}
    <Card>
      <Typography variant="h3" className="mb-6">Form Example</Typography>
      
      <div className="space-y-6">
        <div>
          <Label htmlFor="name" className="block mb-2">Full Name</Label>
          <input 
            id="name" 
            type="text" 
            className="w-full p-2 border rounded" 
            placeholder="Enter your name"
          />
          <Caption>Please enter your legal name as it appears on official documents.</Caption>
        </div>
        
        <div>
          <Label htmlFor="email" className="block mb-2">Email Address</Label>
          <input 
            id="email" 
            type="email" 
            className="w-full p-2 border rounded" 
            placeholder="you@example.com"
          />
          <Caption>We'll never share your email with anyone else.</Caption>
        </div>
        
        <div>
          <Label htmlFor="bio" className="block mb-2">Bio</Label>
          <textarea 
            id="bio" 
            className="w-full p-2 border rounded" 
            rows={3}
            placeholder="Tell us about yourself..."
          />
          <BodySmall>Brief description for your profile. Max 500 characters.</BodySmall>
        </div>
      </div>
    </Card>

    {/* Dashboard Example */}
    <Card>
      <Typography variant="h3" className="mb-6">Dashboard Metrics</Typography>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border rounded-lg p-4">
          <Typography variant="h6" color="muted" className="mb-2">Total Users</Typography>
          <Typography variant="h2" color="primary">12,847</Typography>
          <Typography variant="bodySmall" color="success">
            ↑ 12.5% from last month
          </Typography>
        </div>
        
        <div className="border rounded-lg p-4">
          <Typography variant="h6" color="muted" className="mb-2">Revenue</Typography>
          <Typography variant="h2" color="primary">$48,250</Typography>
          <Typography variant="bodySmall" color="success">
            ↑ 8.2% from last month
          </Typography>
        </div>
        
        <div className="border rounded-lg p-4">
          <Typography variant="h6" color="muted" className="mb-2">Conversion Rate</Typography>
          <Typography variant="h2" color="primary">3.2%</Typography>
          <Typography variant="bodySmall" color="error">
            ↓ 0.5% from last month
          </Typography>
        </div>
      </div>
    </Card>
  </div>
);

// ==================== ACCESSIBILITY EXAMPLE ====================

export const AccessibilityExample = () => (
  <Card>
    <Typography variant="h3" className="mb-6">Accessibility Features</Typography>
    
    <div className="space-y-4">
      <Typography variant="h4">Semantic HTML Elements</Typography>
      <Body>
        The Typography component automatically uses appropriate HTML elements based on the variant:
      </Body>
      
      <ul className="list-disc pl-5 space-y-2">
        <li><Code>Display</Code> and <Code>H1-H6</Code> use heading tags with proper aria-level</li>
        <li><Code>Body</Code> and <Code>BodySmall</Code> use paragraph tags</li>
        <li><Code>Label</Code> uses label tag with htmlFor support</li>
        <li><Code>Code</Code> uses code tag for screen readers</li>
        <li><Code>Caption</Code> uses span with appropriate role</li>
      </ul>
      
      <div className="mt-6 p-4 bg-blue-50 rounded">
        <Typography variant="h5" className="mb-2">Screen Reader Support</Typography>
        <BodySmall>
          All typography variants include proper ARIA attributes. Headings have correct aria-level, 
          and interactive elements have appropriate roles and labels.
        </BodySmall>
      </div>
    </div>
  </Card>
);

// ==================== RESPONSIVE EXAMPLE ====================

export const ResponsiveExample = () => (
  <Card>
    <Typography variant="h3" className="mb-6">Responsive Typography</Typography>
    
    <div className="space-y-4">
      <Body>
        The Typography component works well with responsive design patterns. 
        You can combine it with Tailwind's responsive utilities:
      </Body>
      
      <div className="border p-4">
        <Typography 
          className="
            text-sm 
            md:text-base 
            lg:text-lg 
            xl:text-xl
            font-normal 
            md:font-medium 
            lg:font-semibold
          "
        >
          This text changes size and weight at different breakpoints:
          <ul className="mt-2 list-disc pl-5">
            <li className="text-xs md:text-sm">Mobile: Small text, normal weight</li>
            <li className="text-xs md:text-sm">Tablet: Base text, medium weight</li>
            <li className="text-xs md:text-sm">Desktop: Large text, semibold weight</li>
            <li className="text-xs md:text-sm">Large Desktop: XL text, semibold weight</li>
          </ul>
        </Typography>
      </div>
      
      <Caption>
        Tip: Use Tailwind's responsive prefixes (sm:, md:, lg:, xl:) with custom className
      </Caption>
    </div>
  </Card>
);

// ==================== CUSTOMIZATION EXAMPLE ====================

export const CustomizationExample = () => (
  <Card>
    <Typography variant="h3" className="mb-6">Custom Styling Examples</Typography>
    
    <div className="space-y-6">
      <div>
        <Typography variant="h5" className="mb-2">With Custom Classes</Typography>
        <Typography 
          variant="h2" 
          className="
            bg-gradient-to-r from-blue-500 to-purple-500 
            bg-clip-text text-transparent
            animate-pulse
          "
        >
          Gradient Text with Animation
        </Typography>
      </div>
      
      <div>
        <Typography variant="h5" className="mb-2">Custom Line Height & Letter Spacing</Typography>
        <Typography 
          className="
            leading-loose 
            tracking-widest
            text-gray-700
          "
        >
          Text with loose line height and wide letter spacing for dramatic effect.
        </Typography>
      </div>
      
      <div>
        <Typography variant="h5" className="mb-2">Combined Effects</Typography>
        <Typography 
          variant="h3" 
          className="
            italic 
            font-black 
            text-red-600 
            drop-shadow-lg
            hover:text-red-700 
            hover:scale-105 
            transition-all 
            duration-300
            cursor-pointer
          "
        >
          Hover Me!
        </Typography>
      </div>
    </div>
  </Card>
);
import { 
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
  Code,
  Typography 
} from '../components/atoms/Typography';

export function TypographyExamplePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <H1 className="mb-8">Typography Design System</H1>
        
        <div className="card mb-8">
          <H2 className="mb-6">All Typography Variants</H2>
          <div className="space-y-6">
            <Display>Display Heading</Display>
            <H1>Heading 1</H1>
            <H2>Heading 2</H2>
            <H3>Heading 3</H3>
            <H4>Heading 4</H4>
            <H5>Heading 5</H5>
            <H6>Heading 6</H6>
            <Body>
              Body text - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </Body>
            <BodySmall>
              Small body text - Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </BodySmall>
            <Caption>Caption text for additional information</Caption>
            <Label>Form field label</Label>
            <Code>const example = "code snippet";</Code>
          </div>
        </div>

        <div className="card mb-8">
          <H2 className="mb-6">Color Variations</H2>
          <div className="space-y-4">
            <Typography color="primary">Primary color text</Typography>
            <Typography color="success">Success color text</Typography>
            <Typography color="error">Error color text</Typography>
            <Typography color="warning">Warning color text</Typography>
            <Typography color="info">Info color text</Typography>
            <Typography color="muted">Muted color text</Typography>
            <div className="bg-gray-800 p-4 rounded">
              <Typography color="white">White color text on dark background</Typography>
            </div>
          </div>
        </div>

        <div className="card mb-8">
          <H2 className="mb-6">Text Transformations</H2>
          <div className="space-y-4">
            <Typography uppercase>Uppercase text</Typography>
            <Typography italic>Italic text</Typography>
            <Typography underline>Underlined text</Typography>
            <Typography uppercase italic underline>
              Combined transformations
            </Typography>
            <Typography truncate className="max-w-md">
              This is a very long text that will be truncated with an ellipsis at the end when it doesn't fit in the container.
            </Typography>
            <Typography lineClamp={2} className="max-w-md">
              This text will be limited to 2 lines. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </Typography>
          </div>
        </div>

        <div className="card">
          <H2 className="mb-6">Real-world Example</H2>
          <div className="space-y-6">
            <H3>Article Title</H3>
            <div className="flex items-center space-x-4">
              <Typography color="muted">By John Doe</Typography>
              <Typography color="muted">•</Typography>
              <Typography color="muted">January 11, 2024</Typography>
            </div>
            
            <Body>
              This demonstrates how the typography system works together to create cohesive, accessible content. Each component maintains consistent spacing, color, and hierarchy.
            </Body>
            
            <H4>Key Benefits</H4>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <BodySmall>Consistent design language</BodySmall>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <BodySmall>Accessibility compliant</BodySmall>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <BodySmall>Responsive by default</BodySmall>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <BodySmall>Easy to maintain and update</BodySmall>
              </li>
            </ul>
            
            <Caption>
              This typography system is part of the HELIX CRM design system implementation.
            </Caption>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TypographyExamplePage;
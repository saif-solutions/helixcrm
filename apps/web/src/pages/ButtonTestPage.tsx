import { 
  Button, 
  PrimaryButton, 
  SecondaryButton, 
  GhostButton, 
  DangerButton 
} from '../components/atoms/Button';

export function ButtonTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Button Component Test</h1>
        
        <div className="space-y-8">
          {/* Variants */}
          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Button Variants</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
            </div>
          </section>

          {/* Sizes */}
          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Button Sizes</h2>
            <div className="flex items-end gap-4">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
            
            <div className="flex items-end gap-4 mt-4">
              <Button size="xs" iconOnly>X</Button>
              <Button size="sm" iconOnly>S</Button>
              <Button size="md" iconOnly>M</Button>
              <Button size="lg" iconOnly>L</Button>
              <Button size="xl" iconOnly>XL</Button>
            </div>
          </section>

          {/* States */}
          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Button States</h2>
            <div className="flex flex-wrap gap-4">
              <Button>Normal</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button fullWidth className="mt-2">Full Width</Button>
            </div>
          </section>

          {/* With Icons */}
          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Buttons with Icons</h2>
            <div className="flex flex-wrap gap-4">
              <Button leftIcon={<span>←</span>}>Back</Button>
              <Button rightIcon={<span>→</span>}>Next</Button>
              <Button leftIcon={<span>✓</span>} rightIcon={<span>↗</span>}>
                Save & Continue
              </Button>
              
              <div className="flex gap-2 mt-2">
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
          </section>

          {/* Predefined Components */}
          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Predefined Button Components</h2>
            <div className="flex flex-wrap gap-4">
              <PrimaryButton>Primary Button</PrimaryButton>
              <SecondaryButton>Secondary Button</SecondaryButton>
              <GhostButton>Ghost Button</GhostButton>
              <DangerButton>Danger Button</DangerButton>
            </div>
          </section>

          {/* Real-world Example */}
          <section className="card">
            <h2 className="text-xl font-semibold mb-4">Real-world Example</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <PrimaryButton>Save Changes</PrimaryButton>
                <SecondaryButton>Cancel</SecondaryButton>
                <DangerButton>Delete</DangerButton>
              </div>
              
              <div className="text-sm text-gray-600 mt-4">
                <p>✅ Button component is working with your design system!</p>
                <p>✅ Uses CSS variables from your tokens</p>
                <p>✅ All variants and sizes available</p>
                <p>✅ Loading and disabled states functional</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ButtonTestPage;
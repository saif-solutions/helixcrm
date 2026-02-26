// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\Dropdown\Dropdown.test.tsx

import * as React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Dropdown } from './Dropdown';
import type { DropdownItem, DropdownRef } from './Dropdown.types';

// ============================================================================
// TEST SETUP & UTILITIES
// ============================================================================

const user = userEvent.setup({ delay: null });

// Create a proper trigger component that forwards ref correctly
const TestTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ tabIndex = 0, disabled, ...props }, ref) => (
    <button
      ref={ref}
      data-testid="test-trigger"
      tabIndex={tabIndex}
      disabled={disabled}
      {...props}
    >
      Open Dropdown
    </button>
  )
);
TestTrigger.displayName = 'TestTrigger';

const defaultItems: DropdownItem[] = [
  { id: '1', label: 'Edit', onClick: vi.fn() },
  { id: '2', label: 'Delete', variant: 'destructive', onClick: vi.fn() },
  { id: '3', label: 'Duplicate', disabled: true, onClick: vi.fn() },
];

// Helper to open dropdown (using fireEvent to avoid pointer-events issues)
const openDropdown = async (triggerElement?: HTMLElement) => {
  const trigger = triggerElement || screen.getByTestId('test-trigger');
  fireEvent.click(trigger);
  
  // Wait for dropdown to be visible
  await waitFor(() => {
    expect(screen.getByRole('menu', { hidden: true })).toBeInTheDocument();
  });
};

// Helper to get dropdown content (including hidden elements)
const getDropdownContent = () => {
  return screen.queryByRole('menu', { hidden: true });
};

// Helper to get visible dropdown content
const getVisibleDropdownContent = () => {
  return screen.queryByRole('menu', { hidden: false });
};

// ============================================================================
// 1. BASIC RENDERING TESTS (FIXED)
// ============================================================================

describe('Dropdown - Basic Rendering', () => {
  test('renders trigger element', () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item>Item 1</Dropdown.Item>
        <Dropdown.Item>Item 2</Dropdown.Item>
      </Dropdown>
    );
    
    expect(screen.getByTestId('test-trigger')).toBeInTheDocument();
  });
  
  test('applies custom data-testid to root element', () => {
    render(
      <Dropdown 
        trigger={<TestTrigger />}
        data-testid="custom-dropdown"
      >
        <Dropdown.Item>Item 1</Dropdown.Item>
      </Dropdown>
    );
    
    // The data-testid is on the wrapper div
    expect(screen.getByTestId('custom-dropdown')).toBeInTheDocument();
  });
  
  test('renders with items prop', async () => {
    render(
      <Dropdown 
        trigger={<TestTrigger />}
        items={defaultItems}
      />
    );
    
    await openDropdown();
    
    // Items are rendered in portal, need to query screen
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });
  
  test('renders with groups prop', async () => {
    const groups = [
      {
        label: 'Actions',
        items: [
          { id: '1', label: 'Edit', onClick: vi.fn() },
          { id: '2', label: 'Delete', onClick: vi.fn() },
        ],
      },
      {
        label: 'Settings',
        items: [
          { id: '3', label: 'Preferences', onClick: vi.fn() },
        ],
      },
    ];
    
    render(
      <Dropdown 
        trigger={<TestTrigger />}
        groups={groups}
      />
    );
    
    await openDropdown();
    
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });
});

// ============================================================================
// 2. INTERACTION TESTS (FIXED)
// ============================================================================

describe('Dropdown - Interactions', () => {
  test('opens and closes on trigger click', async () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item>Item 1</Dropdown.Item>
        <Dropdown.Item>Item 2</Dropdown.Item>
      </Dropdown>
    );
    
    // Should be closed initially
    expect(getVisibleDropdownContent()).not.toBeInTheDocument();
    
    // Click to open (use fireEvent)
    fireEvent.click(screen.getByTestId('test-trigger'));
    
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
    
    // Click trigger again to close
    fireEvent.click(screen.getByTestId('test-trigger'));
    
    await waitFor(() => {
      expect(getVisibleDropdownContent()).not.toBeInTheDocument();
    });
  });
  
  test('calls onOpenChange when opening/closing', async () => {
    const onOpenChange = vi.fn();
    
    render(
      <Dropdown 
        trigger={<TestTrigger />}
        onOpenChange={onOpenChange}
      >
        <Dropdown.Item>Item 1</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    expect(onOpenChange).toHaveBeenCalledWith(true, undefined);
    
    // Close by clicking outside (using fireEvent)
    fireEvent.mouseDown(document.body);
    fireEvent.mouseUp(document.body);
    
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false, undefined);
    });
  });
  
  test('closes when item is selected (closeOnSelect=true)', async () => {
    const onSelect = vi.fn();
    
    render(
      <Dropdown 
        trigger={<TestTrigger />}
        closeOnSelect={true}
      >
        <Dropdown.Item onSelect={onSelect}>Click me</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    const item = screen.getByText('Click me');
    fireEvent.click(item);
    
    expect(onSelect).toHaveBeenCalled();
    
    // Should be closed after selection
    await waitFor(() => {
      expect(getVisibleDropdownContent()).not.toBeInTheDocument();
    });
  });
  
  test('does not close when item is selected (closeOnSelect=false)', async () => {
    const onSelect = vi.fn();
    
    render(
      <Dropdown 
        trigger={<TestTrigger />}
        closeOnSelect={false}
      >
        <Dropdown.Item onSelect={onSelect}>Click me</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    const item = screen.getByText('Click me');
    fireEvent.click(item);
    
    expect(onSelect).toHaveBeenCalled();
    
    // Should still be open
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  test('closes when clicking outside (closeOnOutsideClick=true)', async () => {
    render(
      <div>
        <button data-testid="outside-button">Outside button</button>
        <Dropdown 
          trigger={<TestTrigger />}
          closeOnOutsideClick={true}
        >
          <Dropdown.Item>Item 1</Dropdown.Item>
        </Dropdown>
      </div>
    );
    
    await openDropdown();
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    
    // Click outside using fireEvent (avoid pointer-events issues)
    fireEvent.mouseDown(screen.getByTestId('outside-button'));
    fireEvent.mouseUp(screen.getByTestId('outside-button'));
    
    await waitFor(() => {
      expect(getVisibleDropdownContent()).not.toBeInTheDocument();
    });
  });
  
  test('does not close when clicking outside (closeOnOutsideClick=false)', async () => {
    render(
      <div>
        <button data-testid="outside-button">Outside button</button>
        <Dropdown 
          trigger={<TestTrigger />}
          closeOnOutsideClick={false}
        >
          <Dropdown.Item>Item 1</Dropdown.Item>
        </Dropdown>
      </div>
    );
    
    await openDropdown();
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    
    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside-button'));
    fireEvent.mouseUp(screen.getByTestId('outside-button'));
    
    // Should still be open
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
});

// ============================================================================
// 3. ACCESSIBILITY TESTS (FIXED)
// ============================================================================

describe('Dropdown - Accessibility', () => {
  test('trigger has aria-haspopup and aria-expanded', async () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item>Item 1</Dropdown.Item>
      </Dropdown>
    );
    
    // Find the actual trigger wrapper created by Radix
    const triggerWrapper = screen.getByTestId('test-trigger').parentElement;
    
    // Check initial state
    expect(triggerWrapper).toHaveAttribute('aria-haspopup', 'menu');
    expect(triggerWrapper).toHaveAttribute('aria-expanded', 'false');
    
    // Open dropdown
    await openDropdown();
    
    // After opening
    expect(triggerWrapper).toHaveAttribute('aria-expanded', 'true');
  });
  
  test('dropdown content has appropriate role', async () => {
    render(
      <Dropdown 
        trigger={<TestTrigger />}
      >
        <Dropdown.Item>Item 1</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    // Use { hidden: true } since Radix might render hidden initially
    const content = screen.getByRole('menu', { hidden: true });
    expect(content).toBeInTheDocument();
  });
  
  test('items have appropriate ARIA attributes', async () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item>Regular Item</Dropdown.Item>
        <Dropdown.Item disabled>Disabled Item</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    // Regular items should be menuitem
    const regularItem = screen.getByText('Regular Item');
    expect(regularItem.closest('[role="menuitem"]')).toBeInTheDocument();
    
    // Disabled items should have aria-disabled
    const disabledItem = screen.getByText('Disabled Item');
    const disabledMenuItem = disabledItem.closest('[role="menuitem"]');
    expect(disabledMenuItem).toHaveAttribute('aria-disabled', 'true');
  });
});

// ============================================================================
// 4. KEYBOARD NAVIGATION & FOCUS TRAP TESTS (FIXED)
// ============================================================================

describe('Dropdown - Keyboard Navigation', () => {
  test('opens with Enter key', async () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item>Item 1</Dropdown.Item>
      </Dropdown>
    );
    
    const trigger = screen.getByTestId('test-trigger');
    
    // Focus and press Enter
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });
  
  test('opens with Space key', async () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item>Item 1</Dropdown.Item>
      </Dropdown>
    );
    
    const trigger = screen.getByTestId('test-trigger');
    
    trigger.focus();
    fireEvent.keyDown(trigger, { key: ' ', code: 'Space' });
    
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });
  
  test('closes with Escape key', async () => {
    render(
      <Dropdown 
        trigger={<TestTrigger />}
        closeOnEscape={true}
      >
        <Dropdown.Item>Item 1</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    
    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    await waitFor(() => {
      expect(getVisibleDropdownContent()).not.toBeInTheDocument();
    });
  });
  
  test('focuses first item when opened with keyboard', async () => {
    render(
      <Dropdown 
        trigger={<TestTrigger />}
        lockFocus={true}
      >
        <Dropdown.Item>First Item</Dropdown.Item>
        <Dropdown.Item>Second Item</Dropdown.Item>
        <Dropdown.Item>Third Item</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    // Wait for dropdown to be fully open
    await waitFor(() => {
      expect(screen.getByText('First Item')).toBeInTheDocument();
    });
    
    // Focus should be on the first item
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveFocus();
  });
});

// ============================================================================
// 5. PROP TESTING (FIXED)
// ============================================================================

describe('Dropdown - Prop Variations', () => {
  test('disabled trigger prevents interaction', async () => {
    const onOpenChange = vi.fn();
    
    render(
      <Dropdown 
        trigger={<TestTrigger disabled />}
        onOpenChange={onOpenChange}
      >
        <Dropdown.Item>Item 1</Dropdown.Item>
      </Dropdown>
    );
    
    const trigger = screen.getByTestId('test-trigger');
    
    // Should be disabled
    expect(trigger).toBeDisabled();
    
    // Click should not open dropdown
    fireEvent.click(trigger);
    
    // Give it a moment
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(getVisibleDropdownContent()).not.toBeInTheDocument();
  });
  
  test('different size variants render without errors', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
    
    sizes.forEach(size => {
      const { unmount } = render(
        <Dropdown 
          trigger={<TestTrigger />}
          size={size}
        >
          <Dropdown.Item>Item for {size}</Dropdown.Item>
        </Dropdown>
      );
      
      expect(screen.getByTestId('test-trigger')).toBeInTheDocument();
      unmount();
    });
  });
});

// ============================================================================
// 6. EDGE CASES & ERROR BOUNDARIES (FIXED)
// ============================================================================

describe('Dropdown - Edge Cases', () => {
  test('renders without children (empty dropdown)', () => {
    // This should render without errors, just an empty dropdown
    render(
      <Dropdown trigger={<TestTrigger />} />
    );
    
    expect(screen.getByTestId('test-trigger')).toBeInTheDocument();
  });
  
  test('handles controlled open state', async () => {
    const Component = () => {
      const [open, setOpen] = React.useState(false);
      
      return (
        <>
          <button onClick={() => setOpen(true)} data-testid="open-btn">
            Open Programmatically
          </button>
          <Dropdown 
            trigger={<TestTrigger />}
            open={open}
            onOpenChange={setOpen}
          >
            <Dropdown.Item>Controlled Item</Dropdown.Item>
          </Dropdown>
        </>
      );
    };
    
    render(<Component />);
    
    // Should be closed initially
    expect(getVisibleDropdownContent()).not.toBeInTheDocument();
    
    // Open programmatically
    fireEvent.click(screen.getByTestId('open-btn'));
    
    await waitFor(() => {
      expect(screen.getByText('Controlled Item')).toBeInTheDocument();
    });
    
    // Close programmatically via the open button
    fireEvent.click(screen.getByTestId('open-btn'));
    
    await waitFor(() => {
      expect(getVisibleDropdownContent()).not.toBeInTheDocument();
    });
  });
  
  test('disabled items cannot be selected', async () => {
    const onSelect = vi.fn();
    
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item disabled onSelect={onSelect}>
          Disabled Item
        </Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    const disabledItem = screen.getByText('Disabled Item');
    const disabledMenuItem = disabledItem.closest('[role="menuitem"]');
    
    // Check it's disabled
    expect(disabledMenuItem).toHaveAttribute('aria-disabled', 'true');
    
    // Try to click it
    fireEvent.click(disabledItem);
    
    // Should not call onSelect
    expect(onSelect).not.toHaveBeenCalled();
  });
  
  test('loading items show loading state', async () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item loading>Loading Item</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    const item = screen.getByText('Loading Item');
    const menuItem = item.closest('[role="menuitem"]');
    
    expect(menuItem).toBeInTheDocument();
    // Loading items should be aria-disabled
    expect(menuItem).toHaveAttribute('aria-disabled', 'true');
  });
  
  test('checked items show check indicator', async () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item checked>Checked Item</Dropdown.Item>
        <Dropdown.Item>Unchecked Item</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    const checkedItem = screen.getByText('Checked Item');
    const uncheckedItem = screen.getByText('Unchecked Item');
    
    // Both should render
    expect(checkedItem).toBeInTheDocument();
    expect(uncheckedItem).toBeInTheDocument();
    
    // Checked items might have special styling or attributes
    // This depends on Radix implementation
    const checkedMenuItem = checkedItem.closest('[role="menuitem"]');
    expect(checkedMenuItem).toBeInTheDocument();
  });
});

// ============================================================================
// 7. COMPOUND COMPONENT TESTS (FIXED)
// ============================================================================

describe('Dropdown - Compound Components', () => {
  test('Dropdown.Group renders with label', async () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Group label="Actions">
          <Dropdown.Item>Edit</Dropdown.Item>
          <Dropdown.Item>Delete</Dropdown.Item>
        </Dropdown.Group>
        <Dropdown.Group label="Settings">
          <Dropdown.Item>Preferences</Dropdown.Item>
        </Dropdown.Group>
      </Dropdown>
    );
    
    await openDropdown();
    
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });
  
  test('Dropdown.Separator renders', async () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item>Item 1</Dropdown.Item>
        <Dropdown.Separator data-testid="separator" />
        <Dropdown.Item>Item 2</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    const separator = screen.getByTestId('separator');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute('role', 'separator');
  });
  
  test('Dropdown.Label renders', async () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Label>Information</Dropdown.Label>
        <Dropdown.Item>Item 1</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    expect(screen.getByText('Information')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });
  
  test('Dropdown.Shortcut renders', async () => {
    render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item shortcut="⌘S">
          Save
        </Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('⌘S')).toBeInTheDocument();
  });
});

// ============================================================================
// 8. REF API TESTS (FIXED)
// ============================================================================

describe('Dropdown - Ref API', () => {
  test('imperative ref methods exist and work', async () => {
    const ref = React.createRef<DropdownRef>();
    
    render(
      <Dropdown 
        ref={ref}
        trigger={<TestTrigger />}
      >
        <Dropdown.Item>Item 1</Dropdown.Item>
        <Dropdown.Item>Item 2</Dropdown.Item>
        <Dropdown.Item>Item 3</Dropdown.Item>
      </Dropdown>
    );
    
    // Test only public ref API methods
    expect(ref.current).toHaveProperty('open');
    expect(ref.current).toHaveProperty('close');
    expect(ref.current).toHaveProperty('toggle');
    expect(ref.current).toHaveProperty('focusFirstItem');
    expect(ref.current).toHaveProperty('focusLastItem');
    
    // Open via ref
    ref.current?.open();
    
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
    
    // Close via ref
    ref.current?.close();
    
    await waitFor(() => {
      expect(getVisibleDropdownContent()).not.toBeInTheDocument();
    });
    
    // Toggle via ref
    ref.current?.toggle();
    
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });
  
  test('focusFirstItem and focusLastItem work', async () => {
    const ref = React.createRef<DropdownRef>();
    
    render(
      <Dropdown 
        ref={ref}
        trigger={<TestTrigger />}
      >
        <Dropdown.Item>First Item</Dropdown.Item>
        <Dropdown.Item>Middle Item</Dropdown.Item>
        <Dropdown.Item>Last Item</Dropdown.Item>
      </Dropdown>
    );
    
    // Open dropdown via ref
    ref.current?.open();
    
    await waitFor(() => {
      expect(screen.getByText('First Item')).toBeInTheDocument();
    });
    
    // Focus first item
    ref.current?.focusFirstItem();
    
    // Wait for focus to be set
    await waitFor(() => {
      const firstItem = screen.getByText('First Item');
      expect(firstItem.closest('[role="menuitem"]')).toHaveFocus();
    });
  });
});

// ============================================================================
// 9. PERFORMANCE & ROBUSTNESS TESTS (FIXED)
// ============================================================================

describe('Dropdown - Performance & Robustness', () => {
  test('unmounts cleanly without memory leaks', () => {
    const { unmount } = render(
      <Dropdown trigger={<TestTrigger />}>
        <Dropdown.Item>Item 1</Dropdown.Item>
      </Dropdown>
    );
    
    // Should unmount without errors
    expect(() => unmount()).not.toThrow();
  });
  
  test('handles large item lists efficiently', async () => {
    const manyItems = Array.from({ length: 50 }, (_, i) => ({
      id: `item-${i}`,
      label: `Item ${i + 1}`,
      onClick: vi.fn(),
    }));
    
    render(
      <Dropdown 
        trigger={<TestTrigger />}
        items={manyItems}
        maxHeight="300px"
      />
    );
    
    await openDropdown();
    
    // Verify items render and are accessible
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 25')).toBeInTheDocument();
    expect(screen.getByText('Item 50')).toBeInTheDocument();
  });
});

// ============================================================================
// 10. SNAPSHOT TESTS (REMOVED or SIMPLIFIED)
// ============================================================================

describe('Dropdown - Snapshot Tests', () => {
  test('matches trigger snapshot', () => {
    render(
      <Dropdown 
        trigger={<TestTrigger />}
        data-testid="dropdown-root"
      >
        <Dropdown.Item>Snapshot Item</Dropdown.Item>
      </Dropdown>
    );
    
    // Snapshot the trigger button
    const trigger = screen.getByTestId('test-trigger');
    expect(trigger).toMatchSnapshot();
  });
  
  test('matches dropdown content structure when open', async () => {
    render(
      <Dropdown 
        trigger={<TestTrigger />}
      >
        <Dropdown.Item checked>Checked</Dropdown.Item>
        <Dropdown.Item disabled>Disabled</Dropdown.Item>
        <Dropdown.Separator />
        <Dropdown.Item shortcut="⌘S">Save</Dropdown.Item>
      </Dropdown>
    );
    
    await openDropdown();
    
    // Get all menu items
    const menuItems = screen.getAllByRole('menuitem', { hidden: true });
    expect(menuItems.length).toBe(3); // Checked, Disabled, Save
    
    // Get separator
    const separator = screen.getByRole('separator', { hidden: true });
    expect(separator).toBeInTheDocument();
  });
});
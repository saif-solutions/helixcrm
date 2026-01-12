// D:\Projects-In-Hand\helixcrm\apps\web\src\components\molecules\FormField\FormField.test.tsx
import { render, screen } from '@testing-library/react';
import { 
  FormField, 
  FormFieldGroup, 
  FormActions,
  TextFormField,
  EmailFormField,
  PasswordFormField,
  TextareaFormField
} from './FormField';
import { Button } from '../../atoms/Button/Button';

describe('FormField Component', () => {
  test('renders form field with label', () => {
    render(<FormField label="Username" name="username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveAttribute('name', 'username');
  });

  test('renders required field with asterisk', () => {
    render(<FormField label="Email" name="email" required />);
    const label = screen.getByText('Email');
    // Check for required indicator (asterisk added via CSS pseudo-element)
    // Note: The actual class uses single quotes in the content property
    expect(label.className).toContain("after:content-['*']");
  });

  test('renders helper text', () => {
    render(
      <FormField 
        label="Password" 
        name="password" 
        helperText="Must be at least 8 characters" 
      />
    );
    expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Must be at least 8 characters')).toHaveClass('text-sm');
  });

  test('renders error message', () => {
    render(
      <FormField 
        label="Email" 
        name="email" 
        error="Email is required" 
      />
    );
    const error = screen.getByText('Email is required');
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass('text-red-600');
    expect(error).toHaveAttribute('role', 'alert');
  });

  test('sets aria-invalid when error exists', () => {
    render(
      <FormField 
        label="Field" 
        name="field" 
        error="Error message" 
      />
    );
    const input = screen.getByLabelText('Field');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  test('renders with vertical layout by default', () => {
    render(<FormField label="Test" name="test" />);
    const wrapper = screen.getByLabelText('Test').closest('.form-field');
    expect(wrapper).toHaveClass('space-y-2');
    expect(wrapper).not.toHaveClass('flex', 'items-start', 'gap-4');
  });

  test('renders with horizontal layout', () => {
    render(<FormField label="Test" name="test" layout="horizontal" />);
    const wrapper = screen.getByLabelText('Test').closest('.form-field');
    expect(wrapper).toHaveClass('flex', 'items-start', 'gap-4');
    expect(wrapper).not.toHaveClass('space-y-2');
  });

  test('applies label width in horizontal layout', () => {
    render(
      <FormField 
        label="Test" 
        name="test" 
        layout="horizontal" 
        labelWidth="150px" 
      />
    );
    const label = screen.getByText('Test');
    expect(label).toHaveStyle({ width: '150px', minWidth: '150px' });
  });

  test('forwards input props to underlying Input component', () => {
    render(
      <FormField 
        label="Search" 
        name="search" 
        placeholder="Search..." 
        disabled 
        readOnly 
      />
    );
    const input = screen.getByLabelText('Search');
    expect(input).toHaveAttribute('placeholder', 'Search...');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('readonly');
  });

  test('renders TextFormField component', () => {
    render(<TextFormField label="Name" name="name" />);
    const input = screen.getByLabelText('Name');
    expect(input).toHaveAttribute('type', 'text');
  });

  test('renders EmailFormField component', () => {
    render(<EmailFormField label="Email" name="email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('type', 'email');
  });

  test('renders PasswordFormField component', () => {
    render(<PasswordFormField label="Password" name="password" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  test('renders TextareaFormField component', () => {
    render(<TextareaFormField label="Bio" name="bio" />);
    const textarea = screen.getByLabelText('Bio');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('rows', '4');
  });

  test('renders FormFieldGroup component', () => {
    render(
      <FormFieldGroup title="Section" description="Description">
        <div data-testid="child">Child</div>
      </FormFieldGroup>
    );
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  test('renders FormActions component', () => {
    render(
      <FormActions>
        <Button>Submit</Button>
      </FormActions>
    );
    const actions = screen.getByText('Submit').closest('div');
    expect(actions).toHaveClass('flex', 'items-center', 'justify-end', 'gap-3', 'pt-6', 'border-t', 'border-gray-200');
  });

  test('applies custom wrapperClassName', () => {
    render(
      <FormField 
        label="Test" 
        name="test" 
        wrapperClassName="custom-wrapper" 
      />
    );
    const wrapper = screen.getByLabelText('Test').closest('.form-field');
    expect(wrapper).toHaveClass('custom-wrapper');
  });

  test('applies custom labelClassName', () => {
    render(
      <FormField 
        label="Test" 
        name="test" 
        labelClassName="custom-label" 
      />
    );
    const label = screen.getByText('Test');
    expect(label).toHaveClass('custom-label');
  });

  test('applies custom errorClassName', () => {
    render(
      <FormField 
        label="Test" 
        name="test" 
        error="Error" 
        errorClassName="custom-error" 
      />
    );
    const error = screen.getByText('Error');
    expect(error).toHaveClass('custom-error');
  });

  test('applies custom helperClassName', () => {
    render(
      <FormField 
        label="Test" 
        name="test" 
        helperText="Helper" 
        helperClassName="custom-helper" 
      />
    );
    const helper = screen.getByText('Helper');
    expect(helper).toHaveClass('custom-helper');
  });

  test('generates unique ids for accessibility', () => {
    render(
      <>
        <FormField label="Field1" name="field1" helperText="Help 1" />
        <FormField label="Field2" name="field2" helperText="Help 2" error="Error 2" />
      </>
    );
    
    const input1 = screen.getByLabelText('Field1');
    const input2 = screen.getByLabelText('Field2');
    
    expect(input1.id).toBe('field1-field');
    expect(input2.id).toBe('field2-field');
    
    const helper1 = screen.getByText('Help 1');
    const error2 = screen.getByText('Error 2');
    
    expect(helper1.id).toBe('field1-field-helper');
    expect(error2.id).toBe('field2-field-error');
    
    // Check aria-describedby
    expect(input1).toHaveAttribute('aria-describedby', 'field1-field-helper');
    expect(input2).toHaveAttribute('aria-describedby', 'field2-field-helper field2-field-error');
  });

  test('forwards ref to input element', () => {
    const ref = { current: null };
    render(<FormField ref={ref} label="Test" name="test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  test('forwards ref to textarea in TextareaFormField', () => {
    const ref = { current: null };
    render(<TextareaFormField ref={ref} label="Bio" name="bio" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  test('disables label when input is disabled', () => {
    render(<FormField label="Test" name="test" disabled />);
    const label = screen.getByText('Test');
    expect(label).toHaveClass('text-gray-400');
  });

  test('TextareaFormField applies error styling', () => {
    render(<TextareaFormField label="Bio" name="bio" error="Required" />);
    const textarea = screen.getByLabelText('Bio');
    expect(textarea).toHaveClass('border-red-300');
    expect(textarea.className).toContain('focus:border-red-500');
    expect(textarea.className).toContain('focus:ring-red-500');
  });

  test('TextareaFormField applies success styling', () => {
    render(<TextareaFormField label="Bio" name="bio" variant="success" />);
    const textarea = screen.getByLabelText('Bio');
    expect(textarea).toHaveClass('border-emerald-300');
    expect(textarea.className).toContain('focus:border-emerald-500');
    expect(textarea.className).toContain('focus:ring-emerald-500');
  });

  test('renders with variant prop', () => {
    render(
      <FormField 
        label="Test" 
        name="test" 
        variant="warning" 
        helperText="Warning message"
      />
    );
    const helper = screen.getByText('Warning message');
    expect(helper).toHaveClass('text-amber-600');
  });

  test('renders textarea with custom rows', () => {
    render(
      <TextareaFormField 
        label="Description" 
        name="description" 
        rows={6}
      />
    );
    const textarea = screen.getByLabelText('Description');
    expect(textarea).toHaveAttribute('rows', '6');
  });

  test('TextareaFormField respects disabled prop', () => {
    render(
      <TextareaFormField 
        label="Comments" 
        name="comments" 
        disabled
        value="Disabled text"
      />
    );
    const textarea = screen.getByLabelText('Comments');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveValue('Disabled text');
  });

  test('FormFieldGroup applies custom className', () => {
    const { container } = render(
      <FormFieldGroup 
        title="Section" 
        description="Description"
        className="custom-group"
      >
        <div>Child</div>
      </FormFieldGroup>
    );
    
    // Find the wrapper by its base classes
    const group = container.querySelector('div.space-y-6');
    expect(group).toBeInTheDocument();
    expect(group).toHaveClass('custom-group');
    
    // Also verify it has other expected classes
    expect(group).toHaveClass('p-6');
    expect(group).toHaveClass('bg-gray-50');
    
    // Verify content
    expect(screen.getByText('Section')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  test('FormActions applies custom className', () => {
    render(
      <FormActions className="custom-actions">
        <Button>Submit</Button>
      </FormActions>
    );
    const actions = screen.getByText('Submit').closest('div');
    expect(actions).toHaveClass('custom-actions');
  });
});
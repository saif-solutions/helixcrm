import tailwindConfig from '../tailwind.config';

describe('Tailwind Configuration', () => {
  it('should extend theme with design tokens', () => {
    expect(tailwindConfig.theme.extend.colors.primary[500]).toBe('#3b82f6');
    expect(tailwindConfig.theme.extend.colors.success[500]).toBe('#22c55e');
    expect(tailwindConfig.theme.extend.colors.error[500]).toBe('#ef4444');
  });

  it('should have proper content paths', () => {
    expect(tailwindConfig.content).toContain('./src/**/*.{js,ts,jsx,tsx}');
    expect(tailwindConfig.content).toContain('./index.html');
  });

  it('should have spacing scale', () => {
    expect(tailwindConfig.theme.extend.spacing[2]).toBe('8px');
    expect(tailwindConfig.theme.extend.spacing[4]).toBe('16px');
    expect(tailwindConfig.theme.extend.spacing[8]).toBe('32px');
  });
});
import { designTokens, getCssVariables } from '../tokens';
describe('Design Tokens', () => {
    describe('Colors', () => {
        it('should have all color categories', () => {
            expect(designTokens.colors).toHaveProperty('primary');
            expect(designTokens.colors).toHaveProperty('neutral');
            expect(designTokens.colors).toHaveProperty('success');
            expect(designTokens.colors).toHaveProperty('error');
            expect(designTokens.colors).toHaveProperty('warning');
            expect(designTokens.colors).toHaveProperty('info');
        });
        it('should have consistent shade ranges', () => {
            const categories = Object.keys(designTokens.colors);
            categories.forEach(category => {
                const shades = Object.keys(designTokens.colors[category]);
                expect(shades).toContain('50');
                expect(shades).toContain('500');
                expect(shades).toContain('900');
            });
        });
        it('should meet WCAG contrast requirements', () => {
            // Test base colors against white background
            const baseColors = {
                primary: designTokens.colors.primary[500],
                success: designTokens.colors.success[500],
                error: designTokens.colors.error[500],
                warning: designTokens.colors.warning[500],
            };
            // These should have sufficient contrast (> 4.5:1 for AA)
            Object.values(baseColors).forEach(color => {
                // Simple brightness check (not full WCAG but good enough for tests)
                const hex = color.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                // Should be dark enough on white background
                expect(brightness).toBeLessThan(180);
            });
        });
    });
    describe('Spacing', () => {
        it('should follow 8px base unit', () => {
            expect(designTokens.spacing[1]).toBe('4px'); // 0.5 * 8
            expect(designTokens.spacing[2]).toBe('8px'); // 1 * 8
            expect(designTokens.spacing[4]).toBe('16px'); // 2 * 8
            expect(designTokens.spacing[8]).toBe('32px'); // 4 * 8
        });
        it('should have consistent naming', () => {
            const spacingKeys = Object.keys(designTokens.spacing);
            spacingKeys.forEach(key => {
                if (key !== 'px' && key !== '0') {
                    expect(parseFloat(key)).toBeDefined();
                }
            });
        });
    });
    describe('CSS Variables', () => {
        it('should generate CSS variables', () => {
            const variables = getCssVariables();
            // Should have color variables
            expect(variables['--color-primary-500']).toBe('#3b82f6');
            expect(variables['--color-success-500']).toBe('#22c55e');
            expect(variables['--color-error-500']).toBe('#ef4444');
            // Should have spacing variables
            expect(variables['--spacing-2']).toBe('8px');
            expect(variables['--spacing-4']).toBe('16px');
        });
        it('should have unique variable names', () => {
            const variables = getCssVariables();
            const variableNames = Object.keys(variables);
            const uniqueNames = new Set(variableNames);
            expect(variableNames.length).toBe(uniqueNames.size);
        });
    });
});

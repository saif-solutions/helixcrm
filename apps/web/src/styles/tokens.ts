// Enhanced Design Tokens for HELIX CRM
// Enterprise-grade design system tokens

// Color palette following WCAG AA contrast standards
export const colors = {
    // Primary brand color
    primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6', // Base primary
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
    },
    // Neutral grayscale
    neutral: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
    },
    // Semantic colors
    success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e', // Base success
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
    },
    error: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444', // Base error
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
    },
    warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b', // Base warning
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
    },
    info: {
        50: '#ecfeff',
        100: '#cffafe',
        200: '#a5f3fc',
        300: '#67e8f9',
        400: '#22d3ee',
        500: '#06b6d4', // Base info
        600: '#0891b2',
        700: '#0e7490',
        800: '#155e75',
        900: '#164e63',
    },
} as const;

// Spacing scale (8px base unit)
export const spacing = {
    px: '1px',
    0: '0',
    0.5: '2px', // 0.25rem
    1: '4px', // 0.25rem
    1.5: '6px', // 0.375rem
    2: '8px', // 0.5rem
    2.5: '10px', // 0.625rem
    3: '12px', // 0.75rem
    3.5: '14px', // 0.875rem
    4: '16px', // 1rem
    5: '20px', // 1.25rem
    6: '24px', // 1.5rem
    7: '28px', // 1.75rem
    8: '32px', // 2rem
    9: '36px', // 2.25rem
    10: '40px', // 2.5rem
    11: '44px', // 2.75rem
    12: '48px', // 3rem
    14: '56px', // 3.5rem
    16: '64px', // 4rem
    20: '80px', // 5rem
    24: '96px', // 6rem
    28: '112px', // 7rem
    32: '128px', // 8rem
    36: '144px', // 9rem
    40: '160px', // 10rem
    44: '176px', // 11rem
    48: '192px', // 12rem
    52: '208px', // 13rem
    56: '224px', // 14rem
    60: '240px', // 15rem
    64: '256px', // 16rem
    72: '288px', // 18rem
    80: '320px', // 20rem
    96: '384px', // 24rem
} as const;

// Typography scale
export const typography = {
    fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
    },
    fontSize: {
        xs: '0.75rem', // 12px
        sm: '0.875rem', // 14px
        base: '1rem', // 16px
        lg: '1.125rem', // 18px
        xl: '1.25rem', // 20px
        '2xl': '1.5rem', // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem', // 36px
        '5xl': '3rem', // 48px
    },
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
    lineHeight: {
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
    },
} as const;

// Border radius scale
export const borderRadius = {
    none: '0',
    sm: '2px',
    base: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    '3xl': '24px',
    full: '9999px',
} as const;

// Shadows
export const shadows = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
} as const;

// Z-index scale
export const zIndex = {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
} as const;

// Animation tokens
export const animation = {
    duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
    },
    easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    },
    keyframes: {
        fadeIn: {
            from: { opacity: 0 },
            to: { opacity: 1 },
        },
        slideInFromTop: {
            from: { transform: 'translateY(-10px)', opacity: 0 },
            to: { transform: 'translateY(0)', opacity: 1 },
        },
        slideInFromBottom: {
            from: { transform: 'translateY(10px)', opacity: 0 },
            to: { transform: 'translateY(0)', opacity: 1 },
        },
    },
} as const;

// Breakpoints for responsive design
export const breakpoints = {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
} as const;

// Export all tokens as a single object
export const designTokens = {
    colors,
    spacing,
    typography,
    borderRadius,
    shadows,
    zIndex,
    animation,
    breakpoints,
};

// Type definitions for better TypeScript support
type ColorScale = keyof typeof colors;
type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type SpacingKey = keyof typeof spacing;
type FontSizeKey = keyof typeof typography.fontSize;

// Helper function to get CSS variable format
export function getCssVariables(): Record<string, string> {
    const variables: Record<string, string> = {};
    
    // Convert colors to CSS variables
    Object.entries(colors).forEach(([category, shades]) => {
        Object.entries(shades).forEach(([shade, value]) => {
            variables[`--color-${category}-${shade}`] = value;
        });
    });
    
    // Convert spacing to CSS variables
    Object.entries(spacing).forEach(([key, value]) => {
        variables[`--spacing-${key}`] = value;
    });
    
    // Convert typography to CSS variables
    Object.entries(typography.fontSize).forEach(([key, value]) => {
        variables[`--font-size-${key}`] = value;
    });
    
    // Convert borderRadius to CSS variables
    Object.entries(borderRadius).forEach(([key, value]) => {
        variables[`--radius-${key}`] = value;
    });
    
    return variables;
}

// Utility function to get color value
export function getColor(scale: ColorScale, shade: ColorShade): string | undefined {
    return colors[scale]?.[shade];
}

// Utility function to get spacing value
export function getSpacing(size: SpacingKey): string | undefined {
    return spacing[size];
}

// Utility function to get font size
export function getFontSize(size: FontSizeKey): string | undefined {
    return typography.fontSize[size];
}

// Generate CSS variable declarations as a string for injection
export function getCssVariablesString(): string {
    const variables = getCssVariables();
    return Object.entries(variables)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n  ');
}

// Common color combinations for UI components
export const colorCombinations = {
    primary: {
        background: colors.primary[50],
        text: colors.primary[700],
        border: colors.primary[200],
    },
    success: {
        background: colors.success[50],
        text: colors.success[700],
        border: colors.success[200],
    },
    error: {
        background: colors.error[50],
        text: colors.error[700],
        border: colors.error[200],
    },
    warning: {
        background: colors.warning[50],
        text: colors.warning[700],
        border: colors.warning[200],
    },
    neutral: {
        background: colors.neutral[50],
        text: colors.neutral[700],
        border: colors.neutral[200],
    },
};

// Common text styles
export const textStyles = {
    heading1: {
        fontSize: typography.fontSize['4xl'],
        fontWeight: typography.fontWeight.bold,
        lineHeight: typography.lineHeight.tight,
    },
    heading2: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.semibold,
        lineHeight: typography.lineHeight.tight,
    },
    heading3: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.semibold,
        lineHeight: typography.lineHeight.snug,
    },
    bodyLarge: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.normal,
        lineHeight: typography.lineHeight.relaxed,
    },
    body: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.normal,
        lineHeight: typography.lineHeight.normal,
    },
    bodySmall: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.normal,
        lineHeight: typography.lineHeight.normal,
    },
    caption: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.normal,
        lineHeight: typography.lineHeight.normal,
    },
};

// Common spacing patterns
export const spacingPatterns = {
    container: {
        padding: spacing[6],
        margin: spacing[0],
    },
    card: {
        padding: spacing[6],
        gap: spacing[4],
    },
    form: {
        gap: spacing[4],
        padding: spacing[4],
    },
    button: {
        paddingX: spacing[4],
        paddingY: spacing[2],
        gap: spacing[2],
    },
    input: {
        paddingX: spacing[3],
        paddingY: spacing[2],
    },
};

// Default theme configuration
export const defaultTheme = {
    colors: {
        primary: colors.primary[500],
        background: '#ffffff', // Fixed: Use literal value instead of colors.neutral[0]
        surface: '#ffffff',
        text: colors.neutral[900],
        textSecondary: colors.neutral[600],
        border: colors.neutral[200],
        success: colors.success[500],
        error: colors.error[500],
        warning: colors.warning[500],
        info: colors.info[500],
    },
    typography: {
        fontFamily: typography.fontFamily.sans.join(', '),
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.normal,
        lineHeight: typography.lineHeight.normal,
    },
    spacing: {
        unit: spacing[1], // 4px
        section: spacing[8], // 32px
        container: spacing[6], // 24px
    },
    borderRadius: {
        small: borderRadius.sm,
        medium: borderRadius.md,
        large: borderRadius.lg,
    },
    shadows: {
        low: shadows.sm,
        medium: shadows.base,
        high: shadows.md,
    },
};

// Export everything for easy import
export default {
    colors,
    spacing,
    typography,
    borderRadius,
    shadows,
    zIndex,
    animation,
    breakpoints,
    designTokens,
    getCssVariables,
    getColor,
    getSpacing,
    getFontSize,
    getCssVariablesString,
    colorCombinations,
    textStyles,
    spacingPatterns,
    defaultTheme,
};
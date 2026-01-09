import { jsx as _jsx } from "react/jsx-runtime";
export const LoadingSpinner = ({ size = 'md', color = 'primary', className = '', }) => {
    const sizeClasses = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-3',
        lg: 'h-12 w-12 border-4',
        xl: 'h-16 w-16 border-4',
    };
    const colorClasses = {
        primary: 'border-neutral-200 border-t-primary-500',
        neutral: 'border-neutral-200 border-t-neutral-600',
        white: 'border-white/30 border-t-white',
    };
    return (_jsx("div", { "data-testid": "loading-spinner", className: `
        rounded-full animate-spin
        ${sizeClasses[size]}
        ${colorClasses[color]}
        ${className}
      `, role: "status", "aria-label": "Loading" }));
};

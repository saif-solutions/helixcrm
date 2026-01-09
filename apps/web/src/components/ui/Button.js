import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Button Component
 * Accessible, consistent button with variants and states
 */
import React from 'react';
import { cn } from '../../lib/utils';
export const Button = React.forwardRef(({ variant = 'default', size = 'default', className = '', children, disabled, loading = false, ...props }, ref) => {
    const isDisabled = disabled || loading;
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    const variants = {
        default: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus-visible:ring-gray-400',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
        ghost: 'hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400',
        link: 'text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-500',
    };
    const sizes = {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-sm',
        lg: 'h-12 rounded-md px-8',
        icon: 'h-10 w-10',
    };
    return (_jsx("button", { ref: ref, className: cn(baseStyles, variants[variant], sizes[size], className), disabled: isDisabled, ...props, children: loading ? (_jsxs(_Fragment, { children: [_jsxs("svg", { className: "mr-2 h-4 w-4 animate-spin", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Loading..."] })) : (children) }));
});
Button.displayName = 'Button';

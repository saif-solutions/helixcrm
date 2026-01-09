import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Input Component
 * Accessible input field with consistent styling
 */
import React from 'react';
import { cn } from '../../lib/utils';
export const Input = React.forwardRef(({ className = '', error = false, type = 'text', ...props }, ref) => {
    return (_jsx("input", { type: type, className: cn('flex h-10 w-full rounded-md border px-3 py-2 text-sm', 'focus:outline-none focus:ring-2 focus:ring-offset-2', error
            ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500', 'disabled:cursor-not-allowed disabled:opacity-50', className), ref: ref, ...props }));
});
Input.displayName = 'Input';

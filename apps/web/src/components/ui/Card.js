import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils';
export const Card = ({ children, className = '', ...props }) => {
    return (_jsx("div", { className: cn('bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden', className), ...props, children: children }));
};
export const CardHeader = ({ children, className = '', ...props }) => {
    return (_jsx("div", { className: cn('px-6 py-4 border-b border-gray-200', className), ...props, children: children }));
};
export const CardTitle = ({ children, className = '', ...props }) => {
    return (_jsx("h3", { className: cn('text-lg font-semibold text-gray-900', className), ...props, children: children }));
};
export const CardContent = ({ children, className = '', ...props }) => {
    return (_jsx("div", { className: cn('px-6 py-4', className), ...props, children: children }));
};
export const CardFooter = ({ children, className = '', ...props }) => {
    return (_jsx("div", { className: cn('px-6 py-4 border-t border-gray-200', className), ...props, children: children }));
};

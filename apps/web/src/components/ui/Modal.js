import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Modal Component
 * Accessible modal dialog for forms and confirmations
 */
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';
export const Modal = ({ isOpen, onClose, title, children, size = 'md', showCloseButton = true, }) => {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
    if (!isOpen)
        return null;
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-full mx-4',
    };
    return (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black/50 transition-opacity", onClick: onClose, "aria-hidden": "true" }), _jsx("div", { className: "flex min-h-full items-center justify-center p-4", children: _jsxs("div", { className: cn('relative w-full bg-white rounded-lg shadow-xl transition-all', sizeClasses[size]), onClick: (e) => e.stopPropagation(), children: [(title || showCloseButton) && (_jsxs("div", { className: "flex items-center justify-between border-b px-6 py-4", children: [title && (_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: title })), showCloseButton && (_jsx(Button, { variant: "ghost", size: "icon", onClick: onClose, className: "h-8 w-8", "aria-label": "Close modal", children: _jsx(X, { className: "h-4 w-4" }) }))] })), _jsx("div", { className: "p-6", children: children })] }) })] }));
};

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
const typeConfig = {
    success: {
        icon: CheckCircleIcon,
        iconColor: 'text-success-600',
        bgColor: 'bg-success-50',
        borderColor: 'border-success-200',
        textColor: 'text-success-900',
    },
    error: {
        icon: ExclamationCircleIcon,
        iconColor: 'text-error-600',
        bgColor: 'bg-error-50',
        borderColor: 'border-error-200',
        textColor: 'text-error-900',
    },
    warning: {
        icon: ExclamationTriangleIcon,
        iconColor: 'text-warning-600',
        bgColor: 'bg-warning-50',
        borderColor: 'border-warning-200',
        textColor: 'text-warning-900',
    },
    info: {
        icon: InformationCircleIcon,
        iconColor: 'text-info-600',
        bgColor: 'bg-info-50',
        borderColor: 'border-info-200',
        textColor: 'text-info-900',
    },
};
export const Toast = ({ id, title, description, type, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);
    const config = typeConfig[type];
    const Icon = config.icon;
    const handleDismiss = () => {
        setIsExiting(true);
        // Wait for exit animation to complete
        setTimeout(() => {
            onDismiss();
        }, 150);
    };
    // Auto-dismiss on mouse leave if user hasn't hovered
    const [hasHovered, setHasHovered] = useState(false);
    useEffect(() => {
        if (!hasHovered) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, 5000); // Auto-dismiss after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [hasHovered]);
    return (_jsxs("div", { "data-testid": `toast-${id}`, className: `
        relative p-4 rounded-lg border shadow-lg transform transition-all duration-150
        ${config.bgColor} ${config.borderColor}
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        hover:shadow-xl transition-shadow
      `, onMouseEnter: () => setHasHovered(true), onMouseLeave: () => setHasHovered(false), role: "alert", "aria-live": "polite", "aria-atomic": "true", children: [_jsxs("div", { className: "flex items-start", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx(Icon, { className: `h-5 w-5 ${config.iconColor}`, "aria-hidden": "true" }) }), _jsxs("div", { className: "ml-3 flex-1", children: [_jsx("h3", { className: `text-sm font-medium ${config.textColor}`, children: title }), description && (_jsx("div", { className: `mt-1 text-sm ${config.textColor}`, children: _jsx("p", { children: description }) }))] }), _jsx("div", { className: "ml-4 flex-shrink-0 flex", children: _jsxs("button", { type: "button", className: `inline-flex rounded-md ${config.textColor} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`, onClick: handleDismiss, "aria-label": "Dismiss notification", children: [_jsx("span", { className: "sr-only", children: "Close" }), _jsx(XMarkIcon, { className: "h-5 w-5", "aria-hidden": "true" })] }) })] }), !hasHovered && (_jsx("div", { className: "absolute bottom-0 left-0 right-0 h-1 bg-current opacity-20", children: _jsx("div", { className: "h-full bg-current transition-all duration-5000 ease-linear", style: { width: isExiting ? '0%' : '100%' } }) }))] }));
};

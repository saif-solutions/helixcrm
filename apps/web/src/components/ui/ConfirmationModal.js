import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, description, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'destructive', isLoading = false, }) => {
    const handleConfirm = () => {
        onConfirm();
    };
    const isDestructive = variant === 'destructive';
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, size: "sm", showCloseButton: false, children: _jsxs("div", { className: "p-6", children: [_jsx("div", { className: `flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${isDestructive ? 'bg-red-100' : 'bg-blue-100'}`, children: _jsx(AlertTriangle, { className: `h-6 w-6 ${isDestructive ? 'text-red-600' : 'text-blue-600'}` }) }), _jsx("h3", { className: "text-lg font-semibold text-center text-gray-900 mb-2", children: title }), _jsx("p", { className: "text-sm text-gray-600 text-center mb-6", children: description }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsx(Button, { variant: "outline", onClick: onClose, disabled: isLoading, className: "flex-1", children: cancelText }), _jsx(Button, { variant: isDestructive ? 'destructive' : 'default', onClick: handleConfirm, disabled: isLoading, loading: isLoading, className: "flex-1", children: confirmText })] })] }) }));
};

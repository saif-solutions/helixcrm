import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Search } from 'lucide-react';
export const EmptyState = ({ title, message, actionLabel, onAction, icon, }) => {
    const defaultIcon = icon || _jsx(Search, { className: "h-12 w-12 text-gray-300 mb-4" });
    return (_jsx(Card, { className: "py-12", children: _jsxs("div", { className: "flex flex-col items-center justify-center text-center", children: [_jsx("div", { className: "mb-4 text-gray-400", children: defaultIcon }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: title }), _jsx("p", { className: "text-gray-600 max-w-sm mb-6", children: message }), actionLabel && onAction && (_jsx(Button, { onClick: onAction, children: actionLabel }))] }) }));
};

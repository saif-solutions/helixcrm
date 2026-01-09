import { jsx as _jsx } from "react/jsx-runtime";
import { ToastProvider } from './ui/Toast';
export const ToastProviderWrapper = ({ children }) => {
    return _jsx(ToastProvider, { children: children });
};

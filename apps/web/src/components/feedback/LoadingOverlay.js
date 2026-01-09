import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const LoadingOverlay = ({ isLoading, message = 'Loading...', fullScreen = false, transparent = false, }) => {
    if (!isLoading)
        return null;
    const overlayClasses = [
        'fixed inset-0 z-overlay',
        'flex items-center justify-center',
        'backdrop-blur-sm transition-opacity duration-200',
        transparent ? 'bg-white/50' : 'bg-white/90',
        fullScreen ? '' : 'bg-opacity-90',
    ].join(' ');
    const contentClasses = [
        'flex flex-col items-center justify-center',
        'p-8 rounded-lg',
        fullScreen ? '' : 'bg-white shadow-xl border border-neutral-200',
    ].join(' ');
    return (_jsx("div", { "data-testid": "loading-overlay", className: overlayClasses, role: "status", "aria-live": "polite", "aria-label": "Loading content", children: _jsxs("div", { className: contentClasses, children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "h-12 w-12 rounded-full border-4 border-neutral-200 border-t-primary-500 animate-spin" }), _jsx("div", { className: "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border-2 border-transparent border-t-primary-300 animate-spin" })] }), message && (_jsx("p", { className: "mt-4 text-sm font-medium text-neutral-700", children: message })), _jsxs("div", { className: "mt-2 flex space-x-1", children: [_jsx("div", { className: "h-2 w-2 bg-primary-500 rounded-full animate-bounce", style: { animationDelay: '0ms' } }), _jsx("div", { className: "h-2 w-2 bg-primary-500 rounded-full animate-bounce", style: { animationDelay: '150ms' } }), _jsx("div", { className: "h-2 w-2 bg-primary-500 rounded-full animate-bounce", style: { animationDelay: '300ms' } })] })] }) }));
};

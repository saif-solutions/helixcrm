import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
export class ErrorBoundary extends Component {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                hasError: false,
                error: null,
                errorInfo: null,
            }
        });
        Object.defineProperty(this, "handleReset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                this.setState({
                    hasError: false,
                    error: null,
                    errorInfo: null,
                });
                // Log reset action
                console.log('ErrorBoundary was reset by user');
            }
        });
        Object.defineProperty(this, "handleReload", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                window.location.reload();
            }
        });
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({
            error,
            errorInfo,
        });
        // Log error to error reporting service
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }
    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }
            // Default error UI
            return (_jsx("div", { "data-testid": "error-boundary", className: "min-h-screen flex items-center justify-center bg-neutral-50 p-4", children: _jsx("div", { className: "max-w-lg w-full bg-white rounded-lg shadow-lg border border-neutral-200 p-8", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-100", children: _jsx(ExclamationCircleIcon, { className: "h-6 w-6 text-error-600", "aria-hidden": "true" }) }), _jsx("h2", { className: "mt-4 text-lg font-semibold text-neutral-900", children: "Something went wrong" }), _jsx("p", { className: "mt-2 text-sm text-neutral-600", children: "We apologize for the inconvenience. An error occurred while rendering this page." }), _jsxs("details", { className: "mt-4 text-left", children: [_jsx("summary", { className: "text-sm font-medium text-neutral-700 cursor-pointer hover:text-neutral-900", children: "Error Details" }), _jsxs("div", { className: "mt-2 p-3 bg-neutral-50 rounded border border-neutral-200", children: [_jsx("code", { className: "text-xs font-mono text-neutral-700 break-all", children: this.state.error?.toString() }), this.state.errorInfo && (_jsxs("div", { className: "mt-2", children: [_jsx("p", { className: "text-xs font-medium text-neutral-600", children: "Component Stack:" }), _jsx("pre", { className: "text-xs font-mono text-neutral-700 mt-1 whitespace-pre-wrap", children: this.state.errorInfo.componentStack })] }))] })] }), _jsxs("div", { className: "mt-6 flex flex-col sm:flex-row gap-3 justify-center", children: [_jsx("button", { type: "button", onClick: this.handleReset, className: "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500", children: "Try Again" }), _jsx("button", { type: "button", onClick: this.handleReload, className: "inline-flex items-center justify-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500", children: "Reload Page" })] }), _jsx("p", { className: "mt-6 text-xs text-neutral-500", children: "If the problem persists, please contact support with the error details above." })] }) }) }));
        }
        return this.props.children;
    }
}

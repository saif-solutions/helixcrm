import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { LoadingOverlay } from '../LoadingOverlay';
import { LoadingSpinner } from '../LoadingSpinner';
describe('LoadingOverlay', () => {
    it('should not render when isLoading is false', () => {
        const { container } = render(_jsx(LoadingOverlay, { isLoading: false }));
        expect(container.firstChild).toBeNull();
    });
    it('should render when isLoading is true', () => {
        render(_jsx(LoadingOverlay, { isLoading: true }));
        expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
    });
    it('should display custom message', () => {
        render(_jsx(LoadingOverlay, { isLoading: true, message: "Processing data..." }));
        expect(screen.getByText('Processing data...')).toBeInTheDocument();
    });
    it('should have full screen styling when fullScreen is true', () => {
        render(_jsx(LoadingOverlay, { isLoading: true, fullScreen: true }));
        const overlay = screen.getByTestId('loading-overlay');
        expect(overlay).toHaveClass('fixed inset-0');
        expect(overlay).toHaveClass('backdrop-blur-sm');
    });
    it('should have transparent background when transparent is true', () => {
        render(_jsx(LoadingOverlay, { isLoading: true, transparent: true }));
        const overlay = screen.getByTestId('loading-overlay');
        expect(overlay).toHaveClass('bg-white/50');
    });
    it('should have opaque background when transparent is false', () => {
        render(_jsx(LoadingOverlay, { isLoading: true, transparent: false }));
        const overlay = screen.getByTestId('loading-overlay');
        expect(overlay).toHaveClass('bg-white/90');
    });
});
describe('LoadingSpinner', () => {
    it('should render with default props', () => {
        render(_jsx(LoadingSpinner, {}));
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveClass('h-8 w-8');
        expect(spinner).toHaveClass('border-primary-500');
        expect(spinner).toHaveClass('animate-spin');
    });
    it('should render different sizes', () => {
        const { rerender } = render(_jsx(LoadingSpinner, { size: "sm" }));
        expect(screen.getByTestId('loading-spinner')).toHaveClass('h-4 w-4');
        rerender(_jsx(LoadingSpinner, { size: "lg" }));
        expect(screen.getByTestId('loading-spinner')).toHaveClass('h-12 w-12');
        rerender(_jsx(LoadingSpinner, { size: "xl" }));
        expect(screen.getByTestId('loading-spinner')).toHaveClass('h-16 w-16');
    });
    it('should render different colors', () => {
        const { rerender } = render(_jsx(LoadingSpinner, { color: "neutral" }));
        expect(screen.getByTestId('loading-spinner')).toHaveClass('border-neutral-600');
        rerender(_jsx(LoadingSpinner, { color: "white" }));
        expect(screen.getByTestId('loading-spinner')).toHaveClass('border-white');
    });
    it('should accept custom className', () => {
        render(_jsx(LoadingSpinner, { className: "custom-class" }));
        expect(screen.getByTestId('loading-spinner')).toHaveClass('custom-class');
    });
    it('should have accessibility attributes', () => {
        render(_jsx(LoadingSpinner, {}));
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    });
});

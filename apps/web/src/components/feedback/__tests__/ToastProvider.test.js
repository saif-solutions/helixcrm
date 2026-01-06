import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastProvider';
// Test component that uses the toast hook
const TestComponent = () => {
    const toast = useToast();
    return (_jsxs("div", { children: [_jsx("button", { onClick: () => toast.success('Success!', 'Operation completed successfully'), children: "Show Success" }), _jsx("button", { onClick: () => toast.error('Error!', 'Something went wrong'), children: "Show Error" }), _jsx("button", { onClick: () => toast.info('Info', 'Here is some information'), children: "Show Info" }), _jsx("button", { onClick: () => toast.warning('Warning', 'This is a warning'), children: "Show Warning" })] }));
};
describe('ToastProvider', () => {
    it('should render children and provide toast context', () => {
        render(_jsx(ToastProvider, { children: _jsx(TestComponent, {}) }));
        expect(screen.getByText('Show Success')).toBeInTheDocument();
        expect(screen.getByText('Show Error')).toBeInTheDocument();
        expect(screen.getByText('Show Info')).toBeInTheDocument();
        expect(screen.getByText('Show Warning')).toBeInTheDocument();
    });
    it('should show a success toast when triggered', async () => {
        render(_jsx(ToastProvider, { children: _jsx(TestComponent, {}) }));
        // Click the success button
        fireEvent.click(screen.getByText('Show Success'));
        // Wait for toast to appear
        await waitFor(() => {
            expect(screen.getByText('Success!')).toBeInTheDocument();
            expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
        });
        // Check toast type styling
        const toast = screen.getByTestId(/toast-/);
        expect(toast).toHaveClass('bg-success-50');
        expect(toast).toHaveClass('border-success-200');
    });
    it('should show an error toast when triggered', async () => {
        render(_jsx(ToastProvider, { children: _jsx(TestComponent, {}) }));
        fireEvent.click(screen.getByText('Show Error'));
        await waitFor(() => {
            expect(screen.getByText('Error!')).toBeInTheDocument();
            expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        });
        const toast = screen.getByTestId(/toast-/);
        expect(toast).toHaveClass('bg-error-50');
        expect(toast).toHaveClass('border-error-200');
    });
    it('should dismiss toast when close button is clicked', async () => {
        render(_jsx(ToastProvider, { children: _jsx(TestComponent, {}) }));
        fireEvent.click(screen.getByText('Show Success'));
        await waitFor(() => {
            expect(screen.getByText('Success!')).toBeInTheDocument();
        });
        // Find and click the close button
        const closeButton = screen.getByLabelText('Dismiss notification');
        fireEvent.click(closeButton);
        // Toast should disappear with animation
        await waitFor(() => {
            expect(screen.queryByText('Success!')).not.toBeInTheDocument();
        }, { timeout: 200 });
    });
    it('should auto-dismiss toast after duration', async () => {
        jest.useFakeTimers();
        render(_jsx(ToastProvider, { children: _jsx(TestComponent, {}) }));
        fireEvent.click(screen.getByText('Show Success'));
        await waitFor(() => {
            expect(screen.getByText('Success!')).toBeInTheDocument();
        });
        // Fast-forward time by 6 seconds (more than auto-dismiss duration)
        act(() => {
            jest.advanceTimersByTime(6000);
        });
        await waitFor(() => {
            expect(screen.queryByText('Success!')).not.toBeInTheDocument();
        });
        jest.useRealTimers();
    });
    it('should not auto-dismiss when hovered', async () => {
        jest.useFakeTimers();
        render(_jsx(ToastProvider, { children: _jsx(TestComponent, {}) }));
        fireEvent.click(screen.getByText('Show Success'));
        await waitFor(() => {
            expect(screen.getByText('Success!')).toBeInTheDocument();
        });
        // Hover over the toast
        const toast = screen.getByTestId(/toast-/);
        fireEvent.mouseEnter(toast);
        // Fast-forward time
        act(() => {
            jest.advanceTimersByTime(6000);
        });
        // Toast should still be visible
        expect(screen.getByText('Success!')).toBeInTheDocument();
        // Leave hover and fast-forward again
        fireEvent.mouseLeave(toast);
        act(() => {
            jest.advanceTimersByTime(6000);
        });
        // Now it should be gone
        await waitFor(() => {
            expect(screen.queryByText('Success!')).not.toBeInTheDocument();
        });
        jest.useRealTimers();
    });
    it('should throw error when useToast is used outside provider', () => {
        // Suppress console error for this test
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
        expect(() => {
            render(_jsx(TestComponent, {}));
        }).toThrow('useToast must be used within a ToastProvider');
        consoleError.mockRestore();
    });
});

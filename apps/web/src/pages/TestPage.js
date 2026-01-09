import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAuth } from '../hooks/useAuth';
export const TestPage = () => {
    // This should work if hooks are working
    const { user, token } = useAuth();
    return (_jsxs("div", { style: { padding: '20px', fontFamily: 'Arial' }, children: [_jsx("h1", { children: "Minimal Test Page" }), _jsx("p", { children: "Testing React hooks..." }), _jsxs("div", { style: { background: '#f0f0f0', padding: '10px', margin: '10px 0' }, children: [_jsxs("p", { children: ["User: ", user ? 'Logged in' : 'Not logged in'] }), _jsxs("p", { children: ["Token: ", token ? 'Present' : 'Missing'] })] }), _jsx("p", { children: "If this page loads without \"Invalid hook call\" error, then hooks work." }), _jsx("p", { children: "If it shows error, there's a React configuration issue." })] }));
};

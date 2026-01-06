import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/feedback/ToastProvider';
const AuthContext = createContext(undefined);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { success, error } = useToast();
    // Check for existing token on mount
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setIsLoading(false);
                    return;
                }
                // Verify token with backend
                const response = await fetch(`${API_URL}/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                }
                else {
                    // Token is invalid, clear it
                    localStorage.removeItem('token');
                }
            }
            catch (err) {
                console.error('Auth check failed:', err);
                localStorage.removeItem('token');
            }
            finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);
    const login = useCallback(async (email, password) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            localStorage.setItem('token', data.token);
            setUser(data.user);
            success('Login successful', 'Welcome back!');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            error('Login failed', message);
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    }, [success, error]);
    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch(`${API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            }
        }
        catch (err) {
            console.error('Logout error:', err);
        }
        finally {
            localStorage.removeItem('token');
            setUser(null);
            setIsLoading(false);
            success('Logged out', 'You have been successfully logged out');
        }
    }, [success]);
    const register = useCallback(async (email, password, organizationName) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, organizationName }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }
            localStorage.setItem('token', data.token);
            setUser(data.user);
            success('Registration successful', 'Welcome to HelixCRM!');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Registration failed';
            error('Registration failed', message);
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    }, [success, error]);
    return (_jsx(AuthContext.Provider, { value: { user, isLoading, login, logout, register }, children: children }));
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
const AuthContext = createContext(undefined);
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    useEffect(() => {
        const storedToken = localStorage.getItem('helix_token');
        const storedUser = localStorage.getItem('helix_user');
        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
            }
            catch (error) {
                localStorage.removeItem('helix_token');
                localStorage.removeItem('helix_user');
            }
        }
        setIsLoading(false);
    }, []);
    const login = async (email, password, rememberMe = false) => {
        try {
            const response = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            if (!response.ok) {
                throw new Error('Login failed');
            }
            const data = await response.json();
            if (rememberMe) {
                localStorage.setItem('helix_token', data.access_token);
                localStorage.setItem('helix_user', JSON.stringify(data.user));
            }
            else {
                sessionStorage.setItem('helix_token', data.access_token);
                sessionStorage.setItem('helix_user', JSON.stringify(data.user));
            }
            setToken(data.access_token);
            setUser(data.user);
            navigate('/dashboard');
        }
        catch (error) {
            throw error;
        }
    };
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('helix_token');
        localStorage.removeItem('helix_user');
        sessionStorage.removeItem('helix_token');
        sessionStorage.removeItem('helix_user');
        navigate('/login');
    };
    const value = {
        user,
        token,
        login,
        logout,
        isLoading
    };
    return (_jsx(AuthContext.Provider, { value: value, children: children }));
};

import React, { createContext, useContext, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:3000";

interface AuthContextType {
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("helixcrm_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    
    const { access_token, user: userData } = response.data;
    
    // Store token
    localStorage.setItem("helixcrm_token", access_token);
    localStorage.setItem("helixcrm_user", JSON.stringify(userData));
    
    // Set default auth header
    axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("helixcrm_token");
    localStorage.removeItem("helixcrm_user");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

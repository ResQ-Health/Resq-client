import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface User {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    user_type: string;
    is_admin: boolean;
    email_verified: boolean;
    created_at: string;
    profile_picture?: {
        url: string;
    };
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const queryClient = useQueryClient();

    useEffect(() => {
        // Check for existing token on app load
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(userData);
            } catch (error) {
                // Clear invalid data
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    // Listen for user update events from profile updates
    useEffect(() => {
        const handleUserUpdate = (event: CustomEvent) => {
            const updatedUser = event.detail;
            setUser(updatedUser);
        };

        window.addEventListener('userUpdated', handleUserUpdate as EventListener);
        return () => {
            window.removeEventListener('userUpdated', handleUserUpdate as EventListener);
        };
    }, []);

    const login = (newToken: string, userData: User) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        // Clear React Query cache
        queryClient.clear();
        
        // Clear all user-specific localStorage items
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('bookingDraft');
        localStorage.removeItem('justLoggedIn');
        localStorage.removeItem('onboarding_completed');
        
        // Clear all receipt sent flags (they follow pattern: receipt_sent_${appointmentId})
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('receipt_sent_')) {
                localStorage.removeItem(key);
            }
        });
        
        // Clear state
        setToken(null);
        setUser(null);
    };

    const updateUser = (userData: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    const value = {
        user,
        token,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token && !!user,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 
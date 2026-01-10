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
    is_onboarding_complete?: boolean;
    onboarding_missing_sections?: string[];
    // Some backend responses use provider.profile_complete instead of is_onboarding_complete
    provider?: {
        id?: string;
        profile_complete?: boolean;
        [key: string]: unknown;
    };
    // Some responses may place profile_complete at root (legacy)
    profile_complete?: boolean;
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
                const userData: User = JSON.parse(storedUser);
                // Normalize onboarding flag for providers so routing works consistently
                const normalizedUser: User = {
                    ...userData,
                    is_onboarding_complete:
                        userData.is_onboarding_complete ??
                        userData.provider?.profile_complete ??
                        userData.profile_complete,
                };
                setToken(storedToken);
                setUser(normalizedUser);
                // Keep localStorage normalized as well (helps PublicRoute on reload)
                localStorage.setItem('user', JSON.stringify(normalizedUser));
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
        // Normalize onboarding flag for providers (backend may return provider.profile_complete)
        const normalizedUser: User = {
            ...userData,
            is_onboarding_complete:
                userData.is_onboarding_complete ??
                userData.provider?.profile_complete ??
                userData.profile_complete,
        };
        setToken(newToken);
        setUser(normalizedUser);
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
    };

    const logout = () => {
        // Clear React Query cache
        queryClient.clear();

        // Clear all user-specific localStorage items
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('patientProfile');
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
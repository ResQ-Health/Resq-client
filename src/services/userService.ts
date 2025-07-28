import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

// Types
export interface User {
    id: string;
    full_name: string;
    email: string;
    user_type: string;
    phone_number?: string;
    created_at?: string;
    updated_at?: string;
}

export interface UserResponse {
    success: boolean;
    message: string;
    data: User;
}

// API functions
export const fetchUser = async (): Promise<UserResponse> => {
    const response = await apiClient.get('/api/v1/auth/me');
    return response.data;
};

// React Query hooks
export const useUser = () => {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: ['user'],
        queryFn: fetchUser,
        enabled: isAuthenticated, // Only fetch if authenticated
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
    });
}; 
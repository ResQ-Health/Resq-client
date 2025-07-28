import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS } from '../config/api';
import toast from 'react-hot-toast';

// Types
export interface RegisterRequest {
    full_name: string;
    email: string;
    password: string;
    phone_number: string;
    user_type: 'Patient' | 'Provider';
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface VerifyRequest {
    email: string;
    verification_code: string;
}

export interface RegisterResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        full_name: string;
        email: string;
        phone_number: string;
        user_type: string;
        is_admin: boolean;
        email_verified: boolean;
        created_at: string;
        token: string;
    };
}

export interface LoginResponse {
    success: boolean;
    data: {
        id: string;
        full_name: string;
        email: string;
        phone_number: string;
        user_type: string;
        is_admin: boolean;
        email_verified: boolean;
        created_at: string;
        token: string;
    };
}

export interface VerifyResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        full_name: string;
        email: string;
        phone_number: string;
        user_type: string;
        is_admin: boolean;
        email_verified: boolean;
        created_at: string;
        token: string;
    };
}

export interface AuthError {
    message: string;
    errors?: Record<string, string[]>;
}

// API functions
export const registerUser = async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
        return response.data;
    } catch (error: any) {
        console.error('Registration error details:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            response: error.response?.data,
            isNetworkError: !error.response,
        });

        // Re-throw the error for React Query to handle
        throw error;
    }
};

export const loginUser = async (data: LoginRequest): Promise<LoginResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, data);
        return response.data;
    } catch (error: any) {
        console.error('Login error details:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            response: error.response?.data,
            isNetworkError: !error.response,
        });

        // Re-throw the error for React Query to handle
        throw error;
    }
};

export const verifyEmail = async (data: VerifyRequest): Promise<VerifyResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY, data);
        return response.data;
    } catch (error: any) {
        console.error('Verification error details:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            response: error.response?.data,
            isNetworkError: !error.response,
        });

        // Re-throw the error for React Query to handle
        throw error;
    }
};

// React Query hooks
export const useRegister = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: registerUser,
        onSuccess: (data) => {
            // Store token and user data if provided
            if (data.data?.token) {
                localStorage.setItem('authToken', data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data));
            }

            // Invalidate and refetch user data
            queryClient.invalidateQueries({ queryKey: ['user'] });

            toast.success('Registration successful! Please check your email for verification.');
        },
        onError: (error: any) => {
            console.error('Registration mutation error:', error);

            let errorMessage = 'Registration failed. Please try again.';

            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timeout: The server is taking too long to respond. Please try again.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage);
        },
    });
};

export const useLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: loginUser,
        onSuccess: (data) => {
            // Store token and user data
            if (data.data?.token) {
                localStorage.setItem('authToken', data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data));
            }

            // Invalidate and refetch user data
            queryClient.invalidateQueries({ queryKey: ['user'] });

            toast.success('Login successful!');
        },
        onError: (error: any) => {
            console.error('Login mutation error:', error);

            let errorMessage = 'Login failed. Please try again.';

            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timeout: The server is taking too long to respond. Please try again.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            } else if (error.response?.status === 400) {
                errorMessage = 'Please check your email and password format.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage);
        },
    });
};

export const useVerifyEmail = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: verifyEmail,
        onSuccess: (data) => {
            // Store token and user data if provided
            if (data.data?.token) {
                localStorage.setItem('authToken', data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data));
            }

            // Invalidate and refetch user data
            queryClient.invalidateQueries({ queryKey: ['user'] });

            toast.success('Email verified successfully!');
        },
        onError: (error: any) => {
            console.error('Verification mutation error:', error);

            let errorMessage = 'Email verification failed. Please try again.';

            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection and try again.';
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timeout: The server is taking too long to respond. Please try again.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage);
        },
    });
}; 
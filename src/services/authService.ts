import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS } from '../config/api';
import toast from 'react-hot-toast';

// Types
export interface RegisterRequest {
    full_name: string;
    email: string;
    password: string;
    phone_number?: string;
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

export interface VerifyOTPRequest {
    email: string;
    otp: string;
}

export interface ResendOTPRequest {
    email: string;
}

export interface ResendOTPResponse {
    success: boolean;
    message?: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ForgotPasswordResponse {
    success: boolean;
    message?: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

export interface ResetPasswordResponse {
    success: boolean;
    message?: string;
    data?: {
        token?: string;
    };
}

export interface ChangePasswordRequest {
    oldPassword?: string;
    newPassword: string;
}

export interface ChangePasswordResponse {
    success: boolean;
    message?: string;
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
        // Patient onboarding flags (new API)
        onboarding_missing_sections?: string[];
        // Provider onboarding flags / details (optional because patient login won't include these)
        is_onboarding_complete?: boolean;
        profile_complete?: boolean;
        provider?: {
            id?: string;
            profile_complete?: boolean;
            provider_name?: string;
            work_email?: string;
            work_phone?: string;
            [key: string]: any;
        };
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

export interface OAuthLoginRequest {
    idToken: string;
    provider: 'google' | 'facebook' | 'apple';
    email?: string;
    name?: string;
    photoURL?: string;
    phoneNumber?: string;
}

export interface OAuthLoginResponse {
    success: boolean;
    data: {
        id: string;
        email: string;
        token: string;
        full_name?: string;
        phone_number?: string;
        user_type?: string;
        email_verified?: boolean;
        [key: string]: any;
    };
}

export interface AuthError {
    message: string;
    errors?: Record<string, string[]>;
}

// API functions
export const registerUser = async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.PATIENT.AUTH.REGISTER, data);
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
        const response = await apiClient.post(API_ENDPOINTS.PATIENT.AUTH.LOGIN, data);
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
        const response = await apiClient.post(API_ENDPOINTS.COMMON.AUTH.VERIFY_EMAIL, data);
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

export const verifyOTP = async (data: VerifyOTPRequest): Promise<VerifyResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.COMMON.AUTH.VERIFY_OTP, data);
        return response.data;
    } catch (error: any) {
        console.error('OTP verification error details:', {
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

export const resendOTP = async (data: ResendOTPRequest): Promise<ResendOTPResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.COMMON.AUTH.RESEND_OTP, data);
        return response.data;
    } catch (error: any) {
        console.error('Resend OTP error details:', {
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

export const forgotPassword = async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.COMMON.AUTH.FORGOT_PASSWORD, data);
        return response.data;
    } catch (error: any) {
        console.error('Forgot password error details:', {
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

export const resetPassword = async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.COMMON.AUTH.RESET_PASSWORD, data);
        return response.data;
    } catch (error: any) {
        console.error('Reset password error details:', {
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

export const changePassword = async (data: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.COMMON.AUTH.CHANGE_PASSWORD, data);
        return response.data;
    } catch (error: any) {
        console.error('Change password error details:', {
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

export const oauthLogin = async (data: OAuthLoginRequest): Promise<OAuthLoginResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.COMMON.AUTH.OAUTH_LOGIN, data);
        return response.data;
    } catch (error: any) {
        console.error('OAuth login error details:', {
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

// New function to get user profile
export const getUserProfile = async (): Promise<any> => {
    try {
        // Check user type from local storage to determine endpoint
        const storedUser = localStorage.getItem('user');
        let endpoint: string = API_ENDPOINTS.COMMON.AUTH.ME;

        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                const userType = user.user_type?.toLowerCase();
                if (userType === 'provider' || userType === 'diagnosticprovider') {
                    endpoint = API_ENDPOINTS.PROVIDER.PROFILE.ME;
                }
            } catch (e) {
                // Fallback to default endpoint if JSON parse fails
            }
        }

        const response = await apiClient.get(endpoint);
        return response.data;
    } catch (error: any) {
        console.error('Get user profile error details:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            response: error.response?.data,
            isNetworkError: !error.response,
        });
        throw error;
    }
};

export const useGetUserProfile = () => {
    return useQuery({
        queryKey: ['userProfile'],
        queryFn: getUserProfile,
        enabled: !!localStorage.getItem('authToken'),
        staleTime: 5 * 60 * 1000,
    });
};

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

export const useVerifyOTP = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: verifyOTP,
        onSuccess: (data) => {
            // Store token and user data if provided
            if (data.data?.token) {
                localStorage.setItem('authToken', data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data));
            }

            // Invalidate and refetch user data
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
        onError: (error: any) => {
            console.error('OTP verification mutation error:', error);
        },
    });
};

export const useResendOTP = () => {
    return useMutation({
        mutationFn: resendOTP,
        onSuccess: () => {
            // Toast notification handled by component
        },
        onError: (error: any) => {
            console.error('Resend OTP mutation error:', error);
            // Error handling remains for fallback
        },
    });
};

export const useForgotPassword = () => {
    return useMutation({
        mutationFn: forgotPassword,
        onSuccess: (data: ForgotPasswordResponse) => {
            // Use the API response message if available, otherwise use the spec message
            const successMessage = data?.message || 
                'If an account with that email exists, a password reset link has been sent.';
            toast.success(successMessage);
        },
        onError: (error: any) => {
            console.error('Forgot password mutation error:', error);

            let errorMessage = 'Failed to send reset link. Please try again.';

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

export const useResetPassword = () => {
    return useMutation({
        mutationFn: resetPassword,
        onSuccess: () => {
            toast.success('Password has been reset successfully!');
        },
        onError: (error: any) => {
            console.error('Reset password mutation error:', error);

            let errorMessage = 'Failed to reset password. Please try again.';

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

export const useChangePassword = () => {
    return useMutation({
        mutationFn: changePassword,
        onSuccess: () => {
            toast.success('Password changed successfully!');
        },
        onError: (error: any) => {
            console.error('Change password mutation error:', error);

            let errorMessage = 'Failed to change password. Please check your old password and try again.';

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

export const useOAuthLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: oauthLogin,
        onSuccess: (data) => {
            // Store token and user data immediately
            if (data.data?.token) {
                localStorage.setItem('authToken', data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data));

                // Ensure token is set in axios defaults for immediate use
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
            }

            // Invalidate and refetch user data
            queryClient.invalidateQueries({ queryKey: ['user'] });

            // Don't show success toast here - navigation will handle the flow
            // User will be taken to verification page, just like normal registration
        },
        onError: (error: any) => {
            console.error('OAuth login mutation error:', error);

            let errorMessage = 'OAuth login failed. Please try again.';

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

export const deleteAccount = async (): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await apiClient.delete(API_ENDPOINTS.COMMON.AUTH.ME);
        return response.data;
    } catch (error: any) {
        console.error('Delete account error details:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            response: error.response?.data,
        });
        throw error;
    }
};

export const useDeleteAccount = () => {
    return useMutation({
        mutationFn: deleteAccount,
        onSuccess: () => {
            // Clear storage and redirect
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/';
            toast.success('Account deleted successfully');
        },
        onError: (error: any) => {
            console.error('Delete account mutation error:', error);
            toast.error(error.response?.data?.message || 'Failed to delete account');
        },
    });
};

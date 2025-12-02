import axios from 'axios';

// API Configuration
export const API_BASE_URL = import.meta.env.DEV ? '' : 'https://server-16pz.onrender.com';

// Create axios instance with default config
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Debug logging in development (excluding sensitive headers)
        if (import.meta.env.DEV) {
            const safeHeaders = { ...config.headers };
            // Redact Authorization header for security
            if (safeHeaders.Authorization) {
                safeHeaders.Authorization = 'Bearer [REDACTED]';
            }
            console.log('API Request:', {
                method: config.method,
                url: config.url,
                baseURL: config.baseURL,
                fullURL: `${config.baseURL}${config.url}`,
                headers: safeHeaders,
            });
        }

        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
    (response) => {
        // Debug logging in development
        if (import.meta.env.DEV) {
            console.log('API Response:', {
                status: response.status,
                statusText: response.statusText,
                url: response.config.url,
                data: response.data,
            });
        }
        return response;
    },
    (error) => {
        // Enhanced error logging
        console.error('API Error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            method: error.config?.method,
            response: error.response?.data,
        });

        // Only redirect on 401 errors for authenticated requests (not login/register)
        if (error.response?.status === 401) {
            const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
            const isBookingEndpoint = error.config?.url?.includes('/appointments/book');

            // Don't redirect for login/register errors or booking errors (allow guest flow), let the component handle them
            if (!isAuthEndpoint && !isBookingEndpoint) {
                localStorage.removeItem('authToken');
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

// API endpoints
export const API_ENDPOINTS = {
    AUTH: {
        REGISTER: '/api/v1/auth/register',
        LOGIN: '/api/v1/auth/login',
        VERIFY: '/api/v1/auth/verify',
        VERIFY_OTP: '/api/v1/auth/verify-otp',
        RESEND_OTP: '/api/v1/auth/resend-otp',
        FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
        RESET_PASSWORD: '/api/v1/auth/reset-password',
        LOGOUT: '/api/v1/auth/logout',
        OAUTH_LOGIN: '/api/v1/auth/oauth/login',
    },
} as const; 
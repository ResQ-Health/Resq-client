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
            const url = error.config?.url || '';
            const isAuthEndpoint =
                url.includes('/auth/login') ||
                url.includes('/auth/register') ||
                url.includes('/auth/provider/login') ||
                url.includes('/providers/register');

            const isBookingEndpoint = url.includes('/appointments/book');

            // Don't redirect for login/register errors or booking errors (allow guest flow), let the component handle them
            if (!isAuthEndpoint && !isBookingEndpoint) {
                localStorage.removeItem('authToken');
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

// API endpoints grouped by User Role
export const API_ENDPOINTS = {
    // Shared Authentication & Utilities (Common)
    COMMON: {
        AUTH: {
            VERIFY_EMAIL: '/api/v1/auth/verify',
            VERIFY_OTP: '/api/v1/auth/verify-otp',
            RESEND_OTP: '/api/v1/auth/resend-otp',
            FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
            RESET_PASSWORD: '/api/v1/auth/reset-password',
            LOGOUT: '/api/v1/auth/logout',
            ME: '/api/v1/auth/me', // User Profile (Shared)
            OAUTH_LOGIN: '/api/v1/auth/oauth/login',
        },
    },

    // Patient-Specific Endpoints
    PATIENT: {
        AUTH: {
            REGISTER: '/api/v1/auth/register',
            LOGIN: '/api/v1/auth/login',
        },
        APPOINTMENTS: {
            GET_ALL: '/api/v1/appointments/patient',
            BOOK: '/api/v1/appointments/book',
            DELETE: (id: string) => `/api/v1/appointments/${id}`,
        },
        PROVIDERS: {
            GET_ALL: '/api/v1/providers/all', // Patients searching for providers
            AVAILABILITY: (id: string) => `/api/v1/providers/${id}/availability`,
        },
        PAYMENTS: {
            INITIALIZE: '/api/v1/payments/initialize',
            RECEIPT: (id: string) => `/api/v1/payments/receipt/${id}`,
            SEND_RECEIPT: '/api/v1/payments/receipt/send',
        },
        REVIEWS: {
            CREATE: '/api/v1/reviews',
            LIKE: (id: string) => `/api/v1/reviews/${id}/like`,
            SAVE: (id: string) => `/api/v1/reviews/${id}/save`,
        },
        FAVORITES: {
            TOGGLE: '/api/v1/auth/favorites/providers/toggle',
            STATUS: (id: string) => `/api/v1/auth/favorites/providers/${id}/status`,
        }
    },

    // Provider-Specific Endpoints
    PROVIDER: {
        AUTH: {
            REGISTER: '/api/v1/providers/register',
            LOGIN: '/api/v1/auth/provider/login',
        },
        DASHBOARD: {
            STATS: '/api/v1/providers/me/dashboard-stats',
        },
        PROFILE: {
            ME: '/api/v1/providers/profile/me',
            PROFILE_PICTURE: '/api/v1/providers/me/profile-picture',
            WORKING_HOURS: '/api/v1/providers/me/working-hours',
        },
        APPOINTMENTS: {
            CREATE: '/api/v1/appointments', // Provider creating appointment manually
            GET_ALL: '/api/v1/providers/appointments',
        },
        PATIENTS: {
            GET_ALL: '/api/v1/providers/patients',
            CREATE: '/api/v1/providers/patients',
            UPDATE: '/api/v1/providers/patients',
        },
        SERVICES: {
            GET_ALL: '/api/v1/providers/services',
            CREATE: '/api/v1/providers/services',
            UPDATE: (id: string) => `/api/v1/providers/services/${id}`,
            DELETE: (id: string) => `/api/v1/providers/services/${id}`,
        }
    }
} as const;

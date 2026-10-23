import axios from 'axios';

// API Configuration:
// When running locally with Vite dev server proxy, API requests use relative paths ('').
// In production builds, requests point to the backend API server (configured via VITE_API_URL or staging fallback).
const getApiBaseUrl = (): string => {
    const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

    // 1. Explicit environment variable override (ignore if accidentally set to marketing landing domain)
    if (envUrl && envUrl !== 'https://resqhealth.africa' && envUrl !== 'https://www.resqhealth.africa') {
        return envUrl;
    }

    // 2. Local development: use relative path for Vite proxy
    if (import.meta.env.DEV) {
        return '';
    }

    // 3. Browser runtime check: if running on localhost, use relative path for local proxy
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return '';
    }

    // 4. Fallback for production deployment: point to the active backend API server
    return 'https://resq-client.vercel.app';
};

export const API_BASE_URL = getApiBaseUrl();

// Doctor / Clinician Referral System URL
// Staging URL: https://resq-health-referral-system.vercel.app
// Can be customized via VITE_DOCTOR_REFERRAL_URL in production environment variables
export const DOCTOR_REFERRAL_URL =
    import.meta.env.VITE_DOCTOR_REFERRAL_URL ||
    'https://resq-health-referral-system.vercel.app';

// Create axios instance with default config
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    timeout: 15000, // 15 seconds
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
            CHANGE_PASSWORD: '/api/v1/auth/change-password',
            LOGOUT: '/api/v1/auth/logout',
            ME: '/api/v1/auth/me', // User Profile (Shared)
            OAUTH_LOGIN: '/api/v1/auth/oauth/login',
        },
        LOCATIONS: {
            COUNTRIES: '/api/v1/locations/countries',
            STATES: '/api/v1/locations/states',
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
            CONFIRM_PAYMENT: (id: string) => `/api/v1/appointments/${id}/confirm-payment`,
            CLAIM_REFERRAL: '/api/v1/appointments/claim-referral',
        },
        PROVIDERS: {
            GET_ALL: '/api/v1/providers/all', // Patients searching for providers
            AVAILABILITY: (id: string) => `/api/v1/providers/${id}/availability`,
            REPORTS: {
                CREATE: (providerId: string) => `/api/v1/providers/${providerId}/reports`,
            },
        },
        PAYMENTS: {
            INITIALIZE: '/api/v1/payments/initialize', // For booking payments
            CONFIRM_APPOINTMENT: '/api/v1/payments/confirm-appointment',
            RECEIPT: (id: string) => `/api/v1/payments/receipt/${id}`,
            SEND_RECEIPT: '/api/v1/payments/receipt/send',
            METHODS: {
                GET_ALL: '/api/v1/payments/methods',
                INITIALIZE: '/api/v1/payments/methods/initialize', // For saving cards
                VERIFY: '/api/v1/payments/methods/verify',
            }
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
            NOTIFICATION_SETTINGS: '/api/v1/providers/me/notification-settings',
            COMPLETE_ONBOARDING: '/api/v1/providers/onboard/complete',
            AUTO_CONFIRM: '/api/v1/providers/me/auto-confirm',
        },
        ADDRESS: {
            UPDATE: '/api/v1/providers/me/address',
        },
        REQUEST_TO_BOOK: '/api/v1/providers/me/request-to-book',
        APPOINTMENTS: {
            CREATE: '/api/v1/appointments', // Provider creating appointment manually
            GET_ALL: '/api/v1/providers/appointments',
            GET_PENDING: '/api/v1/providers/appointments/pending',
            UPDATE_STATUS: (id: string) => `/api/v1/appointments/${id}/confirm`, // User specified this endpoint structure
            UPDATE_DELIVERY_STATUS: (id: string) => `/api/v1/appointments/${id}/status`,
            ACCEPT_ALL: '/api/v1/providers/appointments/pending/accept-all',
            REJECT_ALL: '/api/v1/providers/appointments/pending/reject-all',
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
        },
        PAYMENTS: {
            GET_BANKS: '/api/v1/providers/banks',
            VERIFY_ACCOUNT: '/api/v1/providers/bank-account/verify',
            SAVE_ACCOUNT: '/api/v1/providers/bank-account',
            TRANSACTIONS: '/api/v1/providers/me/transactions',
        },
        REPORTS: {
            GET_ALL: '/api/v1/providers/me/reports',
        },
        REVIEWS: {
            GET_ALL: '/api/v1/providers/me/reviews',
        },
        SUPPORT: {
            TICKETS: '/api/v1/providers/me/support/tickets',
            TICKET: (ticketId: string) => `/api/v1/providers/me/support/tickets/${ticketId}`,
            MESSAGES: (ticketId: string) => `/api/v1/providers/me/support/tickets/${ticketId}/messages`,
        }
    }
} as const;

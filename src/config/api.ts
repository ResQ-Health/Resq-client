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
        return config;
    },
    (error) => {
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
        PROFILE: {
            UPDATE: '/api/v1/auth/profile',
            UPLOAD_PICTURE: '/api/v1/auth/profile/picture',
        },
        APPOINTMENTS: {
            GET_ALL: '/api/v1/appointments/patient',
            BOOK: '/api/v1/appointments/book',
            DELETE: (id: string) => `/api/v1/appointments/${id}`,
        },
        PROVIDERS: {
            GET_ALL: '/api/v1/providers/all', // Patients searching for providers
            AVAILABILITY: (id: string) => `/api/v1/providers/${id}/availability`,
            REPORTS: {
                CREATE: (providerId: string) => `/api/v1/providers/${providerId}/reports`,
            },
        },
        PAYMENTS: {
            INITIALIZE: '/api/v1/payments/initialize',
            RECEIPT: (id: string) => `/api/v1/payments/receipt/${id}`,
            SEND_RECEIPT: '/api/v1/payments/receipt/send',
            METHODS: {
                GET_ALL: '/api/v1/payments/methods',
                INITIALIZE: '/api/v1/payments/methods/initialize',
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
            ADD: '/api/v1/auth/favorites/providers',
            REMOVE: '/api/v1/auth/favorites/providers',
            CHECK: '/api/v1/auth/favorites/providers/check',
        }
    },

    // Provider-Specific Endpoints
    PROVIDER: {
        AUTH: {
            REGISTER: '/api/v1/providers/register',
            LOGIN: '/api/v1/auth/provider/login',
        },
        PROFILE: {
            ME: '/api/v1/providers/me',
            UPDATE: '/api/v1/providers/profile',
            ADDRESS: '/api/v1/providers/profile/address',
            UPDATE_ADDRESS: '/api/v1/providers/profile/address',
            UPDATE_NOTIFICATIONS: '/api/v1/providers/profile/notifications',
            WORKING_HOURS: '/api/v1/providers/profile/working-hours',
            UPDATE_WORKING_HOURS: '/api/v1/providers/profile/working-hours',
            PROFILE_PICTURE: '/api/v1/providers/profile/picture',
            COMPLETE_ONBOARDING: '/api/v1/providers/profile/complete-onboarding',
            NOTIFICATION_SETTINGS: '/api/v1/providers/profile/notification-settings',
            AUTO_CONFIRM: '/api/v1/providers/profile/auto-confirm',
        },
        DASHBOARD: {
            STATS: '/api/v1/providers/dashboard/stats',
            RECENT_ACTIVITY: '/api/v1/providers/dashboard/recent-activity',
            UPCOMING_APPOINTMENTS: '/api/v1/providers/dashboard/upcoming-appointments',
        },
        APPOINTMENTS: {
            GET_ALL: '/api/v1/appointments/provider',
            DETAILS: (id: string) => `/api/v1/appointments/${id}`,
            UPDATE_STATUS: (id: string) => `/api/v1/appointments/${id}/status`,
            CREATE: '/api/v1/appointments',
        },
        PATIENTS: {
            GET_ALL: '/api/v1/providers/patients',
            DETAILS: (id: string) => `/api/v1/providers/patients/${id}`,
            CREATE: '/api/v1/providers/patients',
            UPDATE: (id: string) => `/api/v1/providers/patients/${id}`,
        },
        SERVICES: {
            GET_ALL: '/api/v1/services',
            CREATE: '/api/v1/services',
            UPDATE: (id: string) => `/api/v1/services/${id}`,
            DELETE: (id: string) => `/api/v1/services/${id}`,
            TOGGLE_STATUS: (id: string) => `/api/v1/services/${id}/status`,
        },
        PAYMENTS: {
            GET_ALL: '/api/v1/payments/provider',
            STATS: '/api/v1/payments/provider/stats',
            WITHDRAW: '/api/v1/payments/withdraw',
            BANKS: '/api/v1/payments/banks',
            RESOLVE_ACCOUNT: '/api/v1/payments/resolve-account',
            GET_BANKS: '/api/v1/payments/banks',
            VERIFY_ACCOUNT: '/api/v1/payments/resolve-account',
            SAVE_ACCOUNT: '/api/v1/payments/account',
            TRANSACTIONS: '/api/v1/payments/transactions',
        },
        REPORTS: {
            GET_ALL: '/api/v1/providers/reports',
        },
        REVIEWS: {
            GET_ALL: '/api/v1/providers/reviews',
        },
        SUPPORT: {
            CONTACT: '/api/v1/support/contact',
            TICKET: (id: string) => `/api/v1/support/ticket/${id}`,
            TICKETS: (id: string) => `/api/v1/support/tickets/${id}`,
            MESSAGES: (id: string) => `/api/v1/support/messages/${id}`,
        },
    },
} as const;

export default apiClient;

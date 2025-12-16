import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS } from '../config/api';
import toast from 'react-hot-toast';
import { LoginRequest, LoginResponse } from './authService';

// Provider Dashboard Stats
export interface ProviderDashboardRevenueByMonthItem {
    year: number;
    month: number; // 1-12
    month_name: string;
    amount: number;
    count: number;
    period: string; // e.g. "January 2023"
}

export interface ProviderDashboardRevenueByServiceItem {
    // Backend field names may vary, so we support common ones
    service_id?: string;
    service_name?: string;
    name?: string;
    service?: string;
    amount: number;
    count?: number;
}

export interface ProviderDashboardTopServiceItem {
    id?: string;
    service_id?: string;
    name?: string;
    service_name?: string;
    count?: number;
    amount?: number;
}

export type ProviderDashboardPatientVisits =
    | number
    | {
        male?: number;
        female?: number;
        total?: number;
        male_change_pct?: number;
        female_change_pct?: number;
    };

export interface ProviderDashboardStatsData {
    overview: {
        total: {
            total_appointments: number;
            completed_appointments: number;
            upcoming_appointments: number;
            cancelled_appointments: number;
        };
        monthly: {
            total_appointments: number;
            completed_appointments: number;
            upcoming_appointments: number;
            cancelled_appointments: number;
        };
        weekly: {
            total_appointments: number;
            completed_appointments: number;
            upcoming_appointments: number;
            cancelled_appointments: number;
        };
        user_stats?: {
            total_unique_patients: number;
            new_patients_this_month: number;
            demographics: {
                male: number;
                female: number;
                other: number;
                unknown: number;
            };
        };
    };
    financials: {
        total_revenue: number;
        first_payment_date?: string;
        last_payment_date?: string;
        revenue_by_month: ProviderDashboardRevenueByMonthItem[];
        revenue_by_service?: {
            total: ProviderDashboardRevenueByServiceItem[];
            monthly: ProviderDashboardRevenueByServiceItem[];
            weekly: ProviderDashboardRevenueByServiceItem[];
        };
    };
    patient_visits?: {
        total: number;
        monthly: number;
        weekly: number;
    };
    top_services?: {
        total: ProviderDashboardTopServiceItem[];
        monthly: ProviderDashboardTopServiceItem[];
        weekly: ProviderDashboardTopServiceItem[];
    };
}

export interface ProviderDashboardStatsResponse {
    success: boolean;
    data: ProviderDashboardStatsData;
}

export const fetchProviderDashboardStats = async (): Promise<ProviderDashboardStatsResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.PROVIDER.DASHBOARD.STATS);
    return res.data as ProviderDashboardStatsResponse;
};

export const useProviderDashboardStats = () => {
    return useQuery({
        queryKey: ['providerDashboardStats'],
        queryFn: fetchProviderDashboardStats,
        staleTime: 30 * 1000,
    });
};

export interface ProviderAddress {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
}

export interface ProviderRatings {
    average: number;
    count: number;
}

export interface ProviderItem {
    id: string; // short id from API sample
    _id?: string; // mongo id
    provider_name: string;
    work_phone?: string;
    address?: ProviderAddress;
    ratings?: ProviderRatings;
    logo?: string | null;
    banner_image_url?: string | null;
    [key: string]: any;
}

export interface ProvidersAllResponse {
    success: boolean;
    count: number;
    total: number;
    pagination: {
        page: number;
        limit: number;
        pages: number;
    };
    data: ProviderItem[];
}

export const fetchAllProviders = async (): Promise<ProvidersAllResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.PATIENT.PROVIDERS.GET_ALL);
    return response.data as ProvidersAllResponse;
};

export const useAllProviders = () => {
    return useQuery({
        queryKey: ['providers', 'all'],
        queryFn: fetchAllProviders,
    });
};

// Availability types
export interface ProviderAvailabilitySlot {
    date: string; // ISO date e.g. 2025-02-20
    times: string[]; // e.g. ["10:00 AM", "12:30 PM"]
    service?: string; // optional service name or id
}

export interface ProviderAvailabilityResponse {
    success: boolean;
    data: ProviderAvailabilitySlot[];
}

// Fetch provider availability by provider id and optional service/month
export const fetchProviderAvailability = async (
    providerId: string,
    params?: { service?: string; month?: number; year?: number }
): Promise<ProviderAvailabilityResponse> => {
    // Try API endpoint if available, otherwise synthesize from working_hours
    try {
        const query = new URLSearchParams();
        if (params?.service) query.append('service', params.service);
        if (typeof params?.month === 'number') query.append('month', String(params.month));
        if (typeof params?.year === 'number') query.append('year', String(params.year));
        
        const endpoint = API_ENDPOINTS.PATIENT.PROVIDERS.AVAILABILITY(providerId);
        const url = query.toString() ? `${endpoint}?${query.toString()}` : endpoint;
        
        const res = await apiClient.get(url);
        return res.data as ProviderAvailabilityResponse;
    } catch (err) {
        // Fallback: derive simple slots using provider working hours from providers/all
        const all = await fetchAllProviders();
        const provider = (all.data || []).find((p: any) => p.id === providerId || p._id === providerId);
        const today = new Date();
        const month = typeof params?.month === 'number' ? params!.month : today.getMonth();
        const year = typeof params?.year === 'number' ? params!.year : today.getFullYear();

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const workingHours: any[] = provider?.working_hours || [];
        const dayName = (d: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d];

        const result: ProviderAvailabilitySlot[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const wh = workingHours.find((w) => (w.day || '').toLowerCase() === dayName(date.getDay()).toLowerCase());
            if (!wh || !wh.isAvailable || !wh.startTime || !wh.endTime) continue;

            // Generate every 60 minutes between start/end as simple demo slots
            const times: string[] = [];
            const toMinutes = (t: string) => {
                const [time, mer] = t.split(' ');
                const [hh, mm] = time.split(':').map(Number);
                let h = hh % 12;
                if ((mer || '').toUpperCase().startsWith('P')) h += 12;
                return h * 60 + (mm || 0);
            };
            const fmt = (m: number) => {
                const h24 = Math.floor(m / 60);
                const mm = m % 60;
                const mer = h24 >= 12 ? 'pm' : 'am';
                let h = h24 % 12; if (h === 0) h = 12;
                const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                return `${h}:${pad(mm)} ${mer}`;
            };
            const start = toMinutes(wh.startTime);
            const end = toMinutes(wh.endTime);
            for (let m = start; m + 30 <= end; m += 60) {
                times.push(fmt(m));
            }
            if (times.length) {
                result.push({ date: date.toISOString().split('T')[0], times });
            }
        }

        return { success: true, data: result };
    }
};

export const useProviderAvailability = (
    providerId: string | undefined,
    params?: { service?: string; month?: number; year?: number }
) => {
    return useQuery({
        queryKey: ['providerAvailability', providerId, params?.service, params?.month, params?.year],
        queryFn: () => fetchProviderAvailability(providerId!, params),
        enabled: !!providerId,
        staleTime: 60 * 1000,
    });
};

// Appointment creation
export interface CreateAppointmentRequest {
    provider_id: string;
    service: string; // service name or id
    date: string; // ISO date
    time: string; // human readable time, backend will parse
}

export interface CreateAppointmentResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export const createAppointment = async (payload: CreateAppointmentRequest): Promise<CreateAppointmentResponse> => {
    const res = await apiClient.post(API_ENDPOINTS.PROVIDER.APPOINTMENTS.CREATE, payload);
    return res.data as CreateAppointmentResponse;
};

export const useCreateAppointment = () => {
    return useMutation({
        mutationFn: createAppointment,
    });
};

// Fetch Provider Appointments
export interface ProviderAppointment {
    _id: string;
    id: string; // appointment_id
    patient_id: string;
    provider_id: string;
    service_id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: string;
    service_name: string;
    patient_name: string;
    patient_email: string;
    patient_phone: string;
    patient_dob: string;
    patient_gender: string;
    patient_address: string;
    formData: {
        forWhom: string;
        visitedBefore: boolean;
        identificationNumber: string;
        comments: string;
        communicationPreference: string;
        patientName?: string;
        patientEmail?: string;
        patientPhone?: string;
        patientAddress?: string;
        patientGender?: string;
        patientDOB?: string;
    };
    payment: {
        status: string;
        amount: number;
        paystackReference?: string;
        paidAt?: string;
    };
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ProviderAppointmentsResponse {
    success: boolean;
    data: ProviderAppointment[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export const fetchProviderAppointments = async (page = 1, limit = 100): Promise<ProviderAppointmentsResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.PROVIDER.APPOINTMENTS.GET_ALL, {
        params: { page, limit }
    });
    return res.data as ProviderAppointmentsResponse;
};

export const useProviderAppointments = (page = 1, limit = 100) => {
    return useQuery({
        queryKey: ['providerAppointments', page, limit],
        queryFn: () => fetchProviderAppointments(page, limit),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};


// Booking API (pre-payment)
export interface BookAppointmentRequest {
    providerId: string;
    serviceId: string;
    date: string; // YYYY-MM-DD
    start_time: string; // e.g. "11:00 AM"
    end_time: string; // e.g. "11:30 AM"
    formData: {
        forWhom: string; // "Self" | "Other"
        visitedBefore: boolean;
        identificationNumber: string;
        comments?: string;
        communicationPreference?: string;
        // Patient details for "Someone else" booking
        patientName?: string;
        patientEmail?: string;
        patientPhone?: string;
        patientAddress?: string;
        patientGender?: string;
        patientDOB?: string;
    };
    notes?: string;
}

export interface BookedAppointment {
    id: string;
    provider_name?: string;
    patient_name?: string;
    service?: { id?: string; name?: string; category?: string; price?: number } | null;
    date?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    payment?: { status?: string; amount?: number };
}

export interface BookAppointmentResponse {
    success: boolean;
    message?: string;
    data?: { appointment: BookedAppointment };
}

export const bookAppointment = async (payload: BookAppointmentRequest): Promise<BookAppointmentResponse> => {
    const res = await apiClient.post(API_ENDPOINTS.PATIENT.APPOINTMENTS.BOOK, payload);
    return res.data as BookAppointmentResponse;
};

export const useBookAppointment = () => {
    return useMutation({
        mutationFn: bookAppointment,
    });
};

// Payments
export interface InitializePaymentRequest {
    appointmentId: string;
    amount: number;
    email: string;
}

export interface InitializePaymentResponse {
    success: boolean;
    message?: string;
    data?: {
        authorization_url?: string;
        reference?: string;
        access_code?: string;
    };
}

export const initializePayment = async (payload: InitializePaymentRequest): Promise<InitializePaymentResponse> => {
    // Use VITE_APP_URL from environment variables if defined (e.g. set in Vercel or .env),
    // otherwise fallback to window.location.origin for local development or if not set.
    const publicUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    // Ensure we don't have double slashes if env var has trailing slash
    const base = String(publicUrl).replace(/\/$/, '');
    const res = await apiClient.post(API_ENDPOINTS.PATIENT.PAYMENTS.INITIALIZE, {
        ...payload,
        callback_url: `${base}/payment/callback`,
    });
    return res.data as InitializePaymentResponse;
};

export const useInitializePayment = () => {
    return useMutation({
        mutationFn: initializePayment,
    });
};

// Payment Receipt
// IMPORTANT: The patient data in the receipt should use the ACTUAL patient information
// that was provided in the booking form, NOT generic "Guest User" data.
// - If user is logged in and booking for "Self", use their profile data
// - If user is guest and booking for "Self", use the data they filled in the form (patientName, patientEmail, etc. from formData)
// - If booking for "Other", use the patient details from formData (patientName, patientEmail, etc.)
export interface PaymentReceiptData {
    patient: {
        name: string; // Should be actual patient name from form, not "Guest User"
        email: string; // Should be actual email from form, not generated guest email
        mobile_number?: string; // From patientPhone in formData
        address?: string; // From patientAddress in formData
        gender?: string; // From patientGender in formData
        date_of_birth?: string; // ISO date string - From patientDOB in formData
    };
    appointment: {
        location: {
            street: string;
            city: string;
            state: string;
            country: string;
            postal_code: string;
        };
        type: string;
        date: string;
        time: string;
        booking_id: string;
    };
    payment_summary: {
        payment_method: string;
        service_cost: string;
        coupon: string;
        total: string;
    };
}

export interface PaymentReceiptResponse {
    success: boolean;
    data: PaymentReceiptData;
}

export const fetchPaymentReceipt = async (appointmentId: string): Promise<PaymentReceiptResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.PATIENT.PAYMENTS.RECEIPT(appointmentId));
    return res.data as PaymentReceiptResponse;
};

export const usePaymentReceipt = (appointmentId: string | undefined) => {
    return useQuery({
        queryKey: ['paymentReceipt', appointmentId],
        queryFn: () => fetchPaymentReceipt(appointmentId!),
        enabled: !!appointmentId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Send receipt via email
export interface SendReceiptRequest {
    appointmentId: string;
    pdf?: File | Blob; // Optional PDF file
}

export interface SendReceiptResponse {
    success: boolean;
    message?: string;
}

export const sendReceiptEmail = async (payload: SendReceiptRequest): Promise<SendReceiptResponse> => {
    const formData = new FormData();
    formData.append('appointmentId', payload.appointmentId);

    if (payload.pdf) {
        formData.append('pdf', payload.pdf, 'receipt.pdf');
    }

    // Increased timeout for PDF generation + email sending (60 seconds)
    const res = await apiClient.post(API_ENDPOINTS.PATIENT.PAYMENTS.SEND_RECEIPT, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds timeout for PDF + email sending
    });

    return res.data as SendReceiptResponse;
};
// Reviews
export interface CreateReviewRequest {
    provider_id: string;
    rating: number;
    comment: string;
}

export interface ReviewItem {
    id?: string;
    _id?: string;
    provider_id: string;
    patient_id?: string;
    patient_name?: string;
    rating: number;
    comment: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateReviewResponse {
    success: boolean;
    message?: string;
    data?: ReviewItem;
}

export const createReview = async (payload: CreateReviewRequest): Promise<CreateReviewResponse> => {
    const res = await apiClient.post(API_ENDPOINTS.PATIENT.REVIEWS.CREATE, payload);
    return res.data as CreateReviewResponse;
};

// Like/Unlike Review
export interface LikeReviewResponse {
    success: boolean;
    message?: string;
    data?: {
        likes: any[];
        dislikes: any[];
    };
}

export const likeReview = async (reviewId: string): Promise<LikeReviewResponse> => {
    const res = await apiClient.post(API_ENDPOINTS.PATIENT.REVIEWS.LIKE(reviewId), {});
    return res.data as LikeReviewResponse;
};

// Save/Unsave Review
export interface SaveReviewResponse {
    success: boolean;
    message?: string;
    data?: {
        saved_by: any[];
    };
}

export const saveReview = async (reviewId: string): Promise<SaveReviewResponse> => {
    const res = await apiClient.post(API_ENDPOINTS.PATIENT.REVIEWS.SAVE(reviewId), {});
    return res.data as SaveReviewResponse;
};

// --- New Provider Registration Logic ---

export interface ProviderRegisterRequest {
    provider_name: string;
    work_email: string;
    work_phone: string;
    password: string;
    user_type?: string; // Optional, defaults to 'DiagnosticProvider'
}

export interface ProviderRegisterResponse {
    success: boolean;
    data: {
        email: string;
        message: string;
    };
    message: string;
}

export const registerProvider = async (data: ProviderRegisterRequest): Promise<ProviderRegisterResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.PROVIDER.AUTH.REGISTER, data);
        return response.data;
    } catch (error: any) {
        console.error('Provider registration error details:', {
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

export const useRegisterProvider = () => {
    return useMutation({
        mutationFn: registerProvider,
        onSuccess: (data) => {
            toast.success('Registration initiated. Please check your email.');
        },
        onError: (error: any) => {
            console.error('Provider registration mutation error:', error);

            let errorMessage = 'Registration failed. Please try again.';

            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Network error: Unable to connect to the server.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast.error(errorMessage);
        },
    });
};

// New Provider Profile Fetch Logic
export const getProviderProfile = async (): Promise<any> => {
    try {
        const response = await apiClient.get(API_ENDPOINTS.PROVIDER.PROFILE.ME);
        return response.data;
    } catch (error: any) {
        console.error('Get provider profile error details:', {
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

export const useProviderProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: getProviderProfile,
    });
};

export const uploadProviderProfilePicture = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('profile_picture', file);

    try {
        const response = await apiClient.put(API_ENDPOINTS.PROVIDER.PROFILE.PROFILE_PICTURE, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error: any) {
         console.error('Upload provider profile picture error:', error);
         throw error;
    }
};

export const useUploadProviderProfilePicture = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: uploadProviderProfilePicture,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            toast.success('Profile picture updated successfully');
        },
        onError: (error: any) => {
            console.error('Provider profile picture upload error:', error);
            let errorMessage = 'Failed to upload profile picture.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        },
    });
};

// Update Provider Profile (Administrative Details)
export interface UpdateProviderProfileRequest {
    fullname?: string;
    email?: string; // read-only usually, but included in sample
    phone?: string;
    about?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        postal_code?: string;
    };
    services?: string[];
    social_links?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
    };
    accreditations?: Array<{
        name: string;
        issuing_body: string;
        year: number;
    }>;
    policy?: string;
}

export const updateProviderProfile = async (data: UpdateProviderProfileRequest): Promise<any> => {
    try {
        const response = await apiClient.put('/api/v1/providers/me', data);
        return response.data;
    } catch (error: any) {
        console.error('Update provider profile error:', error);
        throw error;
    }
};

export const useUpdateProviderProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateProviderProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            toast.success('Profile updated successfully');
        },
        onError: (error: any) => {
             console.error('Update profile mutation error:', error);
             let errorMessage = 'Failed to update profile.';
             if (error.response?.data?.message) {
                 errorMessage = error.response.data.message;
             }
             toast.error(errorMessage);
        }
    });
};

// Update Provider Working Hours
export interface WorkingHourItem {
    day: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
}

export interface UpdateWorkingHoursRequest {
    working_hours: WorkingHourItem[];
}

export const updateProviderWorkingHours = async (data: UpdateWorkingHoursRequest): Promise<any> => {
    try {
        const response = await apiClient.put(API_ENDPOINTS.PROVIDER.PROFILE.WORKING_HOURS, data);
        return response.data;
    } catch (error: any) {
        console.error('Update working hours error:', error);
        throw error;
    }
};

export const useUpdateProviderWorkingHours = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateProviderWorkingHours,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] }); // or whatever key is used for the profile
            toast.success('Working hours updated successfully');
        },
        onError: (error: any) => {
             console.error('Update working hours mutation error:', error);
             let errorMessage = 'Failed to update working hours.';
             if (error.response?.data?.message) {
                 errorMessage = error.response.data.message;
             }
             toast.error(errorMessage);
        }
    });
};

// Update Notification Settings
export interface UpdateNotificationSettingsRequest {
    notification_settings: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
}

export const updateProviderNotificationSettings = async (data: UpdateNotificationSettingsRequest): Promise<any> => {
    try {
        const response = await apiClient.put('/api/v1/providers/me/notification-settings', data);
        return response.data;
    } catch (error: any) {
        console.error('Update notification settings error:', error);
        throw error;
    }
};

export const useUpdateProviderNotificationSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateProviderNotificationSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            toast.success('Notification settings updated successfully');
        },
        onError: (error: any) => {
             console.error('Update notification settings mutation error:', error);
             let errorMessage = 'Failed to update notification settings.';
             if (error.response?.data?.message) {
                 errorMessage = error.response.data.message;
             }
             toast.error(errorMessage);
        }
    });
};

// --- Provider Login Logic ---

export const loginProvider = async (data: LoginRequest): Promise<LoginResponse> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.PROVIDER.AUTH.LOGIN, data);
        return response.data;
    } catch (error: any) {
        console.error('Provider login error details:', {
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

export const useProviderLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: loginProvider,
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
            console.error('Provider login mutation error:', error);

            let errorMessage = 'Login failed. Please try again.';

            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Network error: Unable to connect to the server.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Invalid email or password. Please check your credentials.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            toast.error(errorMessage);
        },
    });
};

// Provider Patients
export interface ProviderPatient {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    date_of_birth: string;
    gender: string;
    identification_number?: string;
    registered: string;
    last_appointment: string | null;
    next_appointment: string | null;
}

export interface ProviderPatientsResponse {
    success: boolean;
    data: ProviderPatient[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export const fetchProviderPatients = async (page = 1, limit = 10, search?: string): Promise<ProviderPatientsResponse> => {
    const params: any = { page, limit };
    if (search) {
        params.search = search;
    }
    const res = await apiClient.get(API_ENDPOINTS.PROVIDER.PATIENTS.GET_ALL, {
        params
    });
    return res.data as ProviderPatientsResponse;
};

export const useProviderPatients = (page = 1, limit = 10, search?: string) => {
    return useQuery({
        queryKey: ['providerPatients', page, limit, search],
        queryFn: () => fetchProviderPatients(page, limit, search),
        staleTime: 5 * 60 * 1000, // 5 minutes
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new search results
    });
};

// Create/Update Patient
export interface CreatePatientRequest {
    full_name: string;
    email: string;
    phone_number: string;
    date_of_birth: string; // YYYY-MM-DD
    gender: string;
    address: string;
    city: string;
    state: string;
    notes?: string;
}

export interface UpdatePatientRequest extends CreatePatientRequest {
    id: string; // Patient ID for update
}

export interface CreatePatientResponse {
    success: boolean;
    message?: string;
    data?: ProviderPatient;
}

export const createPatient = async (payload: CreatePatientRequest): Promise<CreatePatientResponse> => {
    const res = await apiClient.post(API_ENDPOINTS.PROVIDER.PATIENTS.CREATE, payload);
    return res.data as CreatePatientResponse;
};

export const updatePatient = async (payload: UpdatePatientRequest): Promise<CreatePatientResponse> => {
    const res = await apiClient.post(API_ENDPOINTS.PROVIDER.PATIENTS.UPDATE, payload);
    return res.data as CreatePatientResponse;
};

export const useCreatePatient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPatient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['providerPatients'] });
            toast.success('Patient created successfully');
        },
        onError: (error: any) => {
            console.error('Create patient error:', error);
            let errorMessage = 'Failed to create patient.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        },
    });
};

export const useUpdatePatient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updatePatient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['providerPatients'] });
            toast.success('Patient updated successfully');
        },
        onError: (error: any) => {
            console.error('Update patient error:', error);
            let errorMessage = 'Failed to update patient.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        },
    });
};

// Services Management
export interface ProviderServiceItem {
    id: string; // The public ID (e.g. "UkFH7ckwgi")
    _id: string; // The internal MongoDB ID
    provider_id: string;
    category: string;
    name: string;
    description: string;
    uses: string;
    price: number;
    metadata?: {
        preparation?: string;
        report_time?: string;
        equipment_needed?: string[];
    };
    created_at: string;
    updated_at: string;
    durationMins?: number; // Optional, UI helper, might not be in API yet or could be added to metadata
}

export interface ProviderServicesResponse {
    success: boolean;
    count: number;
    data: ProviderServiceItem[];
}

export interface CreateServiceRequest {
    name: string;
    category: string; // 'scans', 'tests', 'consultation'
    description: string;
    price: number;
    uses?: string;
}

export interface UpdateServiceRequest {
    id: string;
    price?: number;
    description?: string;
    name?: string;
    category?: string;
    uses?: string;
}

export const fetchProviderServices = async (): Promise<ProviderServicesResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.PROVIDER.SERVICES.GET_ALL);
    return res.data as ProviderServicesResponse;
};

export const useProviderServices = () => {
    return useQuery({
        queryKey: ['providerServices'],
        queryFn: fetchProviderServices,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const createProviderService = async (payload: CreateServiceRequest): Promise<any> => {
    const res = await apiClient.post(API_ENDPOINTS.PROVIDER.SERVICES.CREATE, payload);
    return res.data;
};

export const useCreateProviderService = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createProviderService,
        onMutate: async (newServiceData) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['providerServices'] });

            // Snapshot the previous value
            const previousServices = queryClient.getQueryData<ProviderServicesResponse>(['providerServices']);

            // Optimistically update to the new value
            queryClient.setQueryData<ProviderServicesResponse>(['providerServices'], (old) => {
                if (!old) return old;
                
                // Create a temporary mock object
                const optimisticService: ProviderServiceItem = {
                    id: `temp-${Date.now()}`,
                    _id: `temp-${Date.now()}`,
                    provider_id: 'current-user', // This will be replaced by backend
                    name: newServiceData.name,
                    category: newServiceData.category,
                    description: newServiceData.description,
                    price: newServiceData.price,
                    uses: newServiceData.uses || newServiceData.description, // Fallback
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    metadata: {} 
                };

                return {
                    ...old,
                    data: [optimisticService, ...old.data],
                    count: old.count + 1
                };
            });

            // Return a context object with the snapshotted value
            return { previousServices };
        },
        onError: (err, newService, context) => {
            console.error('Create service error:', err);
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousServices) {
                queryClient.setQueryData(['providerServices'], context.previousServices);
            }
            
            let errorMessage = 'Failed to create service.';
            if ((err as any).response?.data?.message) {
                errorMessage = (err as any).response.data.message;
            }
            toast.error(errorMessage);
        },
        onSettled: () => {
            // Always refetch after error or success to ensure data is in sync
            queryClient.invalidateQueries({ queryKey: ['providerServices'] });
        },
        onSuccess: () => {
            toast.success('Service created successfully');
        }
    });
};

export const updateProviderService = async (payload: UpdateServiceRequest): Promise<any> => {
    const { id, ...data } = payload;
    const res = await apiClient.put(API_ENDPOINTS.PROVIDER.SERVICES.UPDATE(id), data);
    return res.data;
};

export const useUpdateProviderService = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateProviderService,
        onMutate: async (updatedServiceData) => {
            await queryClient.cancelQueries({ queryKey: ['providerServices'] });
            const previousServices = queryClient.getQueryData<ProviderServicesResponse>(['providerServices']);

            queryClient.setQueryData<ProviderServicesResponse>(['providerServices'], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    data: old.data.map((service) => {
                        // Check against both id and _id to be safe
                        if (service.id === updatedServiceData.id || service._id === updatedServiceData.id) {
                            return {
                                ...service,
                                ...updatedServiceData,
                                // Maintain existing fields that are not in the update payload
                                updated_at: new Date().toISOString()
                            } as ProviderServiceItem;
                        }
                        return service;
                    })
                };
            });

            return { previousServices };
        },
        onError: (err, newService, context) => {
            console.error('Update service error:', err);
            if (context?.previousServices) {
                queryClient.setQueryData(['providerServices'], context.previousServices);
            }
            let errorMessage = 'Failed to update service.';
            if ((err as any).response?.data?.message) {
                errorMessage = (err as any).response.data.message;
            }
            toast.error(errorMessage);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['providerServices'] });
        },
        onSuccess: () => {
            toast.success('Service updated successfully');
        }
    });
};

export const deleteProviderService = async (id: string): Promise<any> => {
    const res = await apiClient.delete(API_ENDPOINTS.PROVIDER.SERVICES.DELETE(id));
    return res.data;
};

export const useDeleteProviderService = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteProviderService,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['providerServices'] });
            const previousServices = queryClient.getQueryData<ProviderServicesResponse>(['providerServices']);

            queryClient.setQueryData<ProviderServicesResponse>(['providerServices'], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    data: old.data.filter((s) => s.id !== id && s._id !== id),
                    count: Math.max(0, old.count - 1)
                };
            });

            return { previousServices };
        },
        onError: (err, id, context) => {
            console.error('Delete service error:', err);
            if (context?.previousServices) {
                queryClient.setQueryData(['providerServices'], context.previousServices);
            }
            let errorMessage = 'Failed to delete service.';
            if ((err as any).response?.data?.message) {
                errorMessage = (err as any).response.data.message;
            }
            toast.error(errorMessage);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['providerServices'] });
        },
        onSuccess: () => {
            toast.success('Service deleted successfully');
        }
    });
};

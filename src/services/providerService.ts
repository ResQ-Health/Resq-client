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

// Provider -> View My Reviews (with summary)
export interface ProviderReviewPatient {
    id?: string;
    _id?: string;
    name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    phone_number?: string;
    profile_picture?: {
        url?: string;
    } | null;
}

export interface ProviderReviewItem {
    id?: string;
    _id?: string;
    rating: number;
    comment: string;
    created_at: string;
    likes_count: number;
    saved_count: number;
    patient?: ProviderReviewPatient | null;
}

export interface ProviderReviewsSummary {
    average: number;
    count: number;
    breakdown: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

export interface ProviderReviewsResponse {
    success: boolean;
    data: {
        summary: ProviderReviewsSummary;
        reviews: ProviderReviewItem[];
    };
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface FetchProviderReviewsParams {
    page?: number;
    limit?: number;
    rating?: number; // exact rating 1-5
}

export const fetchProviderReviews = async (params: FetchProviderReviewsParams): Promise<ProviderReviewsResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.PROVIDER.REVIEWS.GET_ALL, { params });
    return res.data as ProviderReviewsResponse;
};

export const useProviderReviews = (params: FetchProviderReviewsParams) => {
    return useQuery({
        queryKey: ['providerReviews', params],
        queryFn: () => fetchProviderReviews(params),
        staleTime: 5 * 60 * 1000, // reduce refetches when navigating back
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        placeholderData: (prev) => prev,
    });
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

// Cached Provider Profile Query (avoid refetching on every mount)
export const useProviderProfileQuery = () => {
    return useQuery({
        queryKey: ['providerProfileMe'],
        queryFn: getProviderProfile,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
    });
};

// Provider Support Tickets
export type ProviderSupportTicketStatus = 'open' | 'reviewing' | 'pending' | 'resolved' | 'closed' | string;
export type ProviderSupportTicketCategory =
    | 'Payments'
    | 'Appointments'
    | 'Profile & verification'
    | 'Services'
    | 'Technical issue'
    | 'Other'
    | string;

export interface ProviderSupportTicketListItem {
    ticket_id: string;
    category: ProviderSupportTicketCategory;
    subject: string;
    status: ProviderSupportTicketStatus;
    created_at: string;
    updated_at?: string;
    messages_count?: number;
    last_message?: string;
    last_message_at?: string;
}

export interface ProviderSupportTicketsListResponse {
    success: boolean;
    data: {
        tickets: ProviderSupportTicketListItem[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    };
}

export interface FetchProviderSupportTicketsParams {
    page?: number;
    limit?: number;
    status?: ProviderSupportTicketStatus;
}

export const fetchProviderSupportTickets = async (
    params: FetchProviderSupportTicketsParams
): Promise<ProviderSupportTicketsListResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.PROVIDER.SUPPORT.TICKETS, { params });
    return res.data as ProviderSupportTicketsListResponse;
};

export const useProviderSupportTickets = (params: FetchProviderSupportTicketsParams) => {
    return useQuery({
        queryKey: ['providerSupportTickets', params],
        queryFn: () => fetchProviderSupportTickets(params),
        staleTime: 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        placeholderData: (prev) => prev,
    });
};

export interface ProviderSupportTicketMessageItem {
    id: string;
    sender_role: 'provider' | 'support' | 'admin' | string;
    sender_id?: string;
    message: string;
    attachments?: string[];
    created_at: string;
}

export interface ProviderSupportTicketDetails {
    ticket_id: string;
    provider_id?: string;
    category: ProviderSupportTicketCategory;
    subject: string;
    status: ProviderSupportTicketStatus;
    created_at: string;
    updated_at?: string;
    messages: ProviderSupportTicketMessageItem[];
}

export interface ProviderSupportTicketDetailsResponse {
    success: boolean;
    data: ProviderSupportTicketDetails;
}

export const fetchProviderSupportTicket = async (ticketId: string): Promise<ProviderSupportTicketDetailsResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.PROVIDER.SUPPORT.TICKET(ticketId));
    return res.data as ProviderSupportTicketDetailsResponse;
};

export const useProviderSupportTicket = (ticketId?: string) => {
    return useQuery({
        queryKey: ['providerSupportTicket', ticketId],
        queryFn: () => fetchProviderSupportTicket(String(ticketId)),
        enabled: !!ticketId,
        staleTime: 15 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        placeholderData: (prev) => prev,
    });
};

export interface CreateProviderSupportTicketRequest {
    category: ProviderSupportTicketCategory;
    subject: string;
    message: string;
    attachments?: string[]; // JSON mode
    attachment_files?: File[]; // multipart mode
}

export interface CreateProviderSupportTicketResponse {
    success: boolean;
    message?: string;
    data: {
        ticket_id: string;
        status: ProviderSupportTicketStatus;
        created_at: string;
    };
}

export const createProviderSupportTicket = async (
    payload: CreateProviderSupportTicketRequest
): Promise<CreateProviderSupportTicketResponse> => {
    // If files were provided, use multipart; otherwise JSON.
    if (payload.attachment_files && payload.attachment_files.length) {
        const formData = new FormData();
        formData.append('category', String(payload.category));
        formData.append('subject', payload.subject);
        formData.append('message', payload.message);
        payload.attachment_files.slice(0, 5).forEach((f) => formData.append('attachments', f));
        const res = await apiClient.post(API_ENDPOINTS.PROVIDER.SUPPORT.TICKETS, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data as CreateProviderSupportTicketResponse;
    }

    const res = await apiClient.post(API_ENDPOINTS.PROVIDER.SUPPORT.TICKETS, {
        category: payload.category,
        subject: payload.subject,
        message: payload.message,
        attachments: payload.attachments || [],
    });
    return res.data as CreateProviderSupportTicketResponse;
};

export const useCreateProviderSupportTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createProviderSupportTicket,
        onSuccess: (data) => {
            toast.success(data?.message || 'Support ticket created successfully');
            queryClient.invalidateQueries({ queryKey: ['providerSupportTickets'] });
        },
        onError: (error: any) => {
            const msg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                'Failed to create support ticket.';
            toast.error(msg);
        },
    });
};

export interface ReplyProviderSupportTicketRequest {
    ticketId: string;
    message: string;
    attachments?: string[]; // JSON mode
    attachment_files?: File[]; // multipart mode
}

export interface ReplyProviderSupportTicketResponse {
    success: boolean;
    message?: string;
    data: {
        ticket_id: string;
        status: ProviderSupportTicketStatus;
        updated_at: string;
    };
}

export const replyProviderSupportTicket = async (
    payload: ReplyProviderSupportTicketRequest
): Promise<ReplyProviderSupportTicketResponse> => {
    if (payload.attachment_files && payload.attachment_files.length) {
        const formData = new FormData();
        formData.append('message', payload.message);
        payload.attachment_files.slice(0, 5).forEach((f) => formData.append('attachments', f));
        const res = await apiClient.post(API_ENDPOINTS.PROVIDER.SUPPORT.MESSAGES(payload.ticketId), formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data as ReplyProviderSupportTicketResponse;
    }

    const res = await apiClient.post(API_ENDPOINTS.PROVIDER.SUPPORT.MESSAGES(payload.ticketId), {
        message: payload.message,
        attachments: payload.attachments || [],
    });
    return res.data as ReplyProviderSupportTicketResponse;
};

export const useReplyProviderSupportTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: replyProviderSupportTicket,
        onSuccess: (data, vars) => {
            toast.success(data?.message || 'Message sent successfully');
            queryClient.invalidateQueries({ queryKey: ['providerSupportTicket', vars.ticketId] });
            queryClient.invalidateQueries({ queryKey: ['providerSupportTickets'] });
        },
        onError: (error: any) => {
            const msg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                'Failed to send message.';
            toast.error(msg);
        },
    });
};

// Full Provider Profile Update (multipart/form-data)
export interface UpdateProviderFullProfileFields {
    full_name?: string;
    email?: string;
    phone_number?: string;
    provider_name?: string;
    work_email?: string;
    work_phone?: string;
    about?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    profile_picture?: File;
    banner_image?: File;
    logo?: File;
    gallery?: File[]; // up to 10
    // Can be sent as array or JSON string (backend supports both)
    accreditations?: unknown[] | string;
}

export interface UpdateProviderFullProfileResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export const updateProviderFullProfile = async (
    payload: UpdateProviderFullProfileFields
): Promise<UpdateProviderFullProfileResponse> => {
    const formData = new FormData();

    const appendIfDefined = (key: string, value: unknown) => {
        if (value === undefined) return;
        if (value === null) return;
        formData.append(key, String(value));
    };

    appendIfDefined('full_name', payload.full_name);
    appendIfDefined('email', payload.email);
    appendIfDefined('phone_number', payload.phone_number);
    appendIfDefined('provider_name', payload.provider_name);
    appendIfDefined('work_email', payload.work_email);
    appendIfDefined('work_phone', payload.work_phone);
    appendIfDefined('about', payload.about);
    appendIfDefined('street', payload.street);
    appendIfDefined('city', payload.city);
    appendIfDefined('state', payload.state);
    appendIfDefined('country', payload.country);
    appendIfDefined('postal_code', payload.postal_code);
    appendIfDefined('website', payload.website);
    appendIfDefined('instagram', payload.instagram);
    appendIfDefined('facebook', payload.facebook);
    appendIfDefined('twitter', payload.twitter);
    if (payload.accreditations !== undefined) {
        const v =
            typeof payload.accreditations === 'string'
                ? payload.accreditations
                : JSON.stringify(payload.accreditations);
        formData.append('accreditations', v);
    }

    if (payload.profile_picture) formData.append('profile_picture', payload.profile_picture);
    if (payload.banner_image) formData.append('banner_image', payload.banner_image);
    if (payload.logo) formData.append('logo', payload.logo);
    if (payload.gallery?.length) {
        payload.gallery.slice(0, 10).forEach((f) => formData.append('gallery', f));
    }

    const res = await apiClient.put(API_ENDPOINTS.PROVIDER.PROFILE.ME, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as UpdateProviderFullProfileResponse;
};

export const useUpdateProviderFullProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateProviderFullProfile,
        onSuccess: (data) => {
            toast.success(data?.message || 'Provider profile updated successfully');
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        },
        onError: (error: any) => {
            const msg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                'Failed to update profile.';
            toast.error(msg);
        },
    });
};

// Locations (Public) - Country -> State dropdowns
export interface LocationCountry {
    name: string;
    code: string;
}

export interface LocationsCountriesResponse {
    success: boolean;
    data: LocationCountry[];
}

export interface LocationState {
    name: string;
    code: string;
}

export interface LocationsStatesResponse {
    success: boolean;
    data: LocationState[];
}

export const fetchCountries = async (): Promise<LocationsCountriesResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.COMMON.LOCATIONS.COUNTRIES);
    return res.data as LocationsCountriesResponse;
};

export const useCountries = () => {
    return useQuery({
        queryKey: ['locationsCountries'],
        queryFn: fetchCountries,
        staleTime: 24 * 60 * 60 * 1000,
    });
};

export const fetchStates = async (params: { country?: string; country_code?: string }): Promise<LocationsStatesResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.COMMON.LOCATIONS.STATES, { params });
    return res.data as LocationsStatesResponse;
};

export const useStates = (params: { country?: string; country_code?: string }) => {
    return useQuery({
        queryKey: ['locationsStates', params],
        queryFn: () => fetchStates(params),
        enabled: !!(params.country || params.country_code),
        staleTime: 24 * 60 * 60 * 1000,
    });
};

// Provider address update (Provider-only)
export interface UpdateProviderAddressRequest {
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
}

export interface UpdateProviderAddressResponse {
    success: boolean;
    message?: string;
    data?: {
        address?: UpdateProviderAddressRequest;
    };
}

export const updateProviderAddress = async (
    payload: UpdateProviderAddressRequest
): Promise<UpdateProviderAddressResponse> => {
    const res = await apiClient.put(API_ENDPOINTS.PROVIDER.ADDRESS.UPDATE, payload);
    return res.data as UpdateProviderAddressResponse;
};

export const useUpdateProviderAddress = () => {
    return useMutation({
        mutationFn: updateProviderAddress,
        onSuccess: (data) => {
            toast.success(data?.message || 'Address updated successfully');
        },
        onError: (error: any) => {
            const msg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                'Failed to update address.';
            toast.error(msg);
        },
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

// Complete Onboarding
export const completeOnboarding = async (): Promise<any> => {
    try {
        const response = await apiClient.post(API_ENDPOINTS.PROVIDER.PROFILE.COMPLETE_ONBOARDING);
        return response.data;
    } catch (error: any) {
        console.error('Complete onboarding error:', error);
        throw error;
    }
};

export const useCompleteOnboarding = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: completeOnboarding,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            // Update local user data if needed
            const currentUser = localStorage.getItem('user');
            if (currentUser) {
                const parsedUser = JSON.parse(currentUser);
                // Assuming the backend returns the updated profile/user object
                const updatedUser = { ...parsedUser, ...data.data };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                queryClient.setQueryData(['user'], updatedUser);
            }
        },
        onError: (error: any) => {
            console.error('Complete onboarding mutation error:', error);
            let errorMessage = 'Failed to complete onboarding.';
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
        const response = await apiClient.put(API_ENDPOINTS.PROVIDER.PROFILE.NOTIFICATION_SETTINGS, data);
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

// Bank and Payouts
export interface BankItem {
    id: number;
    name: string;
    slug: string;
    code: string;
    longcode: string;
    gateway: string;
    pay_with_bank: boolean;
    active: boolean;
    is_deleted: boolean;
    country: string;
    currency: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}

export interface BanksResponse {
    success: boolean;
    message: string;
    data: BankItem[];
}

export const fetchBanks = async (): Promise<BanksResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.PROVIDER.PAYMENTS.GET_BANKS);
    return res.data as BanksResponse;
};

export const useBanks = () => {
    return useQuery({
        queryKey: ['banks'],
        queryFn: fetchBanks,
        staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    });
};

export interface VerifyBankAccountRequest {
    account_number: string;
    bank_code: string;
}

export interface VerifyBankAccountResponse {
    success: boolean;
    message: string;
    data: {
        account_number: string;
        account_name: string;
        bank_id: number;
    };
}

export const verifyBankAccount = async (payload: VerifyBankAccountRequest): Promise<VerifyBankAccountResponse> => {
    const res = await apiClient.post(API_ENDPOINTS.PROVIDER.PAYMENTS.VERIFY_ACCOUNT, payload);
    return res.data as VerifyBankAccountResponse;
};

export const useVerifyBankAccount = () => {
    return useMutation({
        mutationFn: verifyBankAccount,
    });
};

export interface SaveBankAccountRequest {
    account_number: string;
    account_name: string;
    bank_code: string;
    bank_name: string;
}

export const saveBankAccount = async (payload: SaveBankAccountRequest): Promise<any> => {
    const res = await apiClient.put(API_ENDPOINTS.PROVIDER.PAYMENTS.SAVE_ACCOUNT, payload);
    return res.data;
};

export const useSaveBankAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveBankAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            toast.success('Bank details saved successfully');
        },
        onError: (error: any) => {
            console.error('Save bank account error:', error);
            let errorMessage = 'Failed to save bank details.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        }
    });
};

// Provider Transactions (Payments)
export type ProviderTransactionPaymentStatus = 'success' | 'failed' | 'pending' | string;

export interface ProviderTransactionPatient {
    id?: string;
    _id?: string;
    full_name?: string;
    name?: string;
    email?: string;
    phone_number?: string;
    phone?: string;
}

export interface ProviderTransactionService {
    id?: string;
    _id?: string;
    name?: string;
    category?: string;
    price?: number;
}

export interface ProviderTransactionPayment {
    amount?: number;
    status?: ProviderTransactionPaymentStatus;
    method?: string;
    channel?: string;
    payment_method?: string;
    paystack_reference?: string;
    reference?: string;
    paidAt?: string;
    paid_at?: string;
    created_at?: string;
}

export interface ProviderTransaction {
    id?: string;
    _id?: string;
    appointment_id?: string;
    provider_id?: string;
    appointment?: {
        date?: string;
        start_time?: string;
        end_time?: string;
        status?: string;
    };
    created_at?: string;
    updated_at?: string;
    paid_at?: string;
    patient?: ProviderTransactionPatient;
    patient_info?: ProviderTransactionPatient;
    service?: ProviderTransactionService;
    service_info?: ProviderTransactionService;
    payment?: ProviderTransactionPayment;
    amount?: number;
    status?: string;
    metadata?: Record<string, unknown>;
}

export interface ProviderTransactionsSummaryByServiceItem {
    service_id?: string;
    service_name?: string;
    name?: string;
    total_amount: number;
    total_count: number;
}

export interface ProviderTransactionsSummary {
    total_amount: number;
    total_count: number;
    by_service?: ProviderTransactionsSummaryByServiceItem[];
}

export interface ProviderTransactionsResponse {
    success: boolean;
    data: {
        transactions: ProviderTransaction[];
        summary: ProviderTransactionsSummary;
    };
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface FetchProviderTransactionsParams {
    page?: number;
    limit?: number;
    service_id?: string;
    start_date?: string; // YYYY-MM-DD
    end_date?: string; // YYYY-MM-DD
    search?: string;
}

export const fetchProviderTransactions = async (
    params: FetchProviderTransactionsParams
): Promise<ProviderTransactionsResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.PROVIDER.PAYMENTS.TRANSACTIONS, {
        params,
    });
    return res.data as ProviderTransactionsResponse;
};

export const useProviderTransactions = (params: FetchProviderTransactionsParams) => {
    const queryClient = useQueryClient();
    return useQuery({
        queryKey: ['providerTransactions', params],
        queryFn: () => fetchProviderTransactions(params),
        staleTime: 2 * 60 * 1000, // reduce refetches when navigating back
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        placeholderData: (prev) => prev,
    });
};

// Provider Reports
export type ProviderReportStatus = 'open' | 'pending' | 'resolved' | 'closed' | string;

export interface ProviderReportPatientBasic {
    id?: string;
    _id?: string;
    name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    phone_number?: string;
}

export interface ProviderReportItem {
    id?: string;
    _id?: string;
    report_id?: string;
    category?: string;
    status?: ProviderReportStatus;
    title?: string;
    description?: string;
    message?: string;
    anonymous?: boolean;
    patient: ProviderReportPatientBasic | null;
    created_at?: string;
    updated_at?: string;
}

export interface ProviderReportsResponse {
    success: boolean;
    data: ProviderReportItem[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface FetchProviderReportsParams {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
}

export const fetchProviderReports = async (params: FetchProviderReportsParams): Promise<ProviderReportsResponse> => {
    const res = await apiClient.get(API_ENDPOINTS.PROVIDER.REPORTS.GET_ALL, { params });
    return res.data as ProviderReportsResponse;
};

export const useProviderReports = (params: FetchProviderReportsParams) => {
    return useQuery({
        queryKey: ['providerReports', params],
        queryFn: () => fetchProviderReports(params),
        staleTime: 30 * 1000,
        placeholderData: (prev) => prev,
    });
};

// Patient -> Report Provider
export type ProviderReportCategory =
    | 'Service quality'
    | 'Fraud/Scam'
    | 'Abuse/Harassment'
    | 'No show'
    | 'Other';

export interface ReportProviderRequest {
    category?: ProviderReportCategory;
    message: string;
    anonymous?: boolean;
}

export interface ReportProviderResponse {
    success: boolean;
    message?: string;
    data?: any;
}

export const reportProvider = async (
    providerId: string,
    payload: ReportProviderRequest
): Promise<ReportProviderResponse> => {
    const res = await apiClient.post(API_ENDPOINTS.PATIENT.PROVIDERS.REPORTS.CREATE(providerId), payload);
    return res.data as ReportProviderResponse;
};

export const useReportProvider = () => {
    return useMutation({
        mutationFn: ({ providerId, payload }: { providerId: string; payload: ReportProviderRequest }) =>
            reportProvider(providerId, payload),
        onSuccess: (data) => {
            toast.success(data?.message || 'Report submitted successfully');
        },
        onError: (error: any) => {
            // Backend enforces: must have appointment + spam guard (1 open/reviewing per provider per 24h)
            const msg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                'Failed to submit report. Please try again.';
            toast.error(msg);
        },
    });
};

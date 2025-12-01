import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../config/api';

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
    const response = await apiClient.get('/api/v1/providers/all');
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
        const url = query.toString()
            ? `/api/v1/providers/${providerId}/availability?${query.toString()}`
            : `/api/v1/providers/${providerId}/availability`;
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
    const res = await apiClient.post('/api/v1/appointments', payload);
    return res.data as CreateAppointmentResponse;
};

export const useCreateAppointment = () => {
    return useMutation({
        mutationFn: createAppointment,
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
    const res = await apiClient.post('/api/v1/appointments/book', payload);
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
    // Prefer an explicit public URL if provided (e.g., for production),
    // otherwise fall back to the current origin (works for Vite dev and prod).
    const publicUrl = (import.meta as any)?.env?.VITE_PUBLIC_URL || window.location.origin;
    const base = String(publicUrl).replace(/\/$/, '');
    const res = await apiClient.post('/api/v1/payments/initialize', {
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
    const res = await apiClient.get(`/api/v1/payments/receipt/${appointmentId}`);
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
    const res = await apiClient.post('/api/v1/payments/receipt/send', formData, {
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
    const res = await apiClient.post('/api/v1/reviews', payload);
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
    const res = await apiClient.post(`/api/v1/reviews/${reviewId}/like`, {});
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
    const res = await apiClient.post(`/api/v1/reviews/${reviewId}/save`, {});
    return res.data as SaveReviewResponse;
};




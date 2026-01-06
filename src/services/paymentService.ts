import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS } from '../config/api';
import toast from 'react-hot-toast';

// Types
export interface PaymentMethod {
    id: string;
    type: string;
    last4: string;
    brand: string;
    expiry_month: number;
    expiry_year: number;
    is_default?: boolean;
}

export interface GetPaymentMethodsResponse {
    success: boolean;
    data: PaymentMethod[];
}

export interface InitializePaymentMethodRequest {
    payment_provider?: 'paystack' | 'flutterwave';
}

export interface InitializePaymentMethodResponse {
    success: boolean;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}

export interface VerifyPaymentMethodRequest {
    reference: string;
}

export interface VerifyPaymentMethodResponse {
    success: boolean;
    message: string;
    data?: PaymentMethod;
}

// API Functions
export const getPaymentMethods = async (): Promise<GetPaymentMethodsResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.PATIENT.PAYMENTS.METHODS.GET_ALL);
    return response.data;
};

export const initializePaymentMethod = async (data: InitializePaymentMethodRequest): Promise<InitializePaymentMethodResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.PATIENT.PAYMENTS.METHODS.INITIALIZE, data);
    return response.data;
};

export const verifyPaymentMethod = async (data: VerifyPaymentMethodRequest): Promise<VerifyPaymentMethodResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.PATIENT.PAYMENTS.METHODS.VERIFY, data);
    return response.data;
};

// Hooks
export const usePaymentMethods = () => {
    return useQuery({
        queryKey: ['paymentMethods'],
        queryFn: getPaymentMethods,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useInitializePaymentMethod = () => {
    return useMutation({
        mutationFn: initializePaymentMethod,
        onError: (error: any) => {
            console.error('Initialize payment method error:', error);
            toast.error(error.response?.data?.message || 'Failed to initialize payment setup');
        },
    });
};

export const useVerifyPaymentMethod = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: verifyPaymentMethod,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
            toast.success('Payment method added successfully');
        },
        onError: (error: any) => {
            console.error('Verify payment method error:', error);
            toast.error(error.response?.data?.message || 'Failed to verify payment method');
        },
    });
};


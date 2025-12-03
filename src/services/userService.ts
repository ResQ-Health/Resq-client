import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiClient } from '../config/api';
import toast from 'react-hot-toast';

// Types for the API
export interface PersonalDetails {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
}

export interface ContactDetails {
    email_address: string;
    phone_number: string;
}

export interface LocationDetails {
    address: string;
    city: string;
    state: string;
}

export interface EmergencyContact {
    first_name: string;
    last_name: string;
    phone_number: string;
    relationship_to_you: string;
}

export interface NextOfKin {
    first_name: string;
    last_name: string;
    phone_number: string;
    relationship_to_you: string;
}

export interface FavoriteProvider {
    _id?: string;
    id: string;
    provider_name: string;
    work_email?: string;
    work_phone?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        postal_code?: string;
    };
    services?: any[];
    ratings?: {
        average?: number;
        count?: number;
    };
    logo?: string;
    banner_image_url?: string;
    [key: string]: any; // Allow other provider fields
}

export interface Metadata {
    emergency_contact: EmergencyContact;
    next_of_kin: NextOfKin;
    same_as_emergency_contact: boolean;
    favorite_providers?: FavoriteProvider[];
}

export interface ProfilePicture {
    url: string;
}

export interface PatientProfileData {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    user_type: string;
    email_verified: boolean;
    created_at: string;
    profile_picture: ProfilePicture;
    personal_details: PersonalDetails;
    contact_details: ContactDetails;
    location_details: LocationDetails;
}

export interface PatientProfileRequest {
    personal_details: PersonalDetails;
    contact_details: ContactDetails;
    location_details: LocationDetails;
    metadata: Metadata;
}

export interface PatientProfileResponse {
    success: boolean;
    data: PatientProfileData;
    metadata: Metadata;
    message?: string;
}

// Appointment types
export interface Appointment {
    id: string;
    provider_id: string;
    provider_name: string;
    patient_id: string;
    service: {
        id: string;
        name: string;
        category: string;
        price: number;
        description?: string;
    } | null;
    date: string;
    start_time: string;
    end_time: string;
    appointment_date: string;
    appointment_time: string;
    status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no-show';
    rating?: number;
    notes?: string;
    contact: {
        name: string;
        email: string;
        phone: string;
        address: string;
        gender: string;
        dob: string;
        bookingType?: 'Self' | 'Other' | string; // Can be nested in contact object
        communicationPreference?: string; // Can be nested in contact object
    };
    bookingType?: 'Self' | 'Other' | string; // Can be at appointment level or nested
    communicationPreference?: string; // Can be at appointment level or nested
    payment: {
        status?: string; // Payment status (completed, pending, etc.)
        amount: number;
        paidAt?: string;
        paystackReference?: string;
        receipt?: any;
    };
    created_at: string;
    updated_at: string;
}

export interface PatientAppointmentsResponse {
    success: boolean;
    data: Appointment[];
    message?: string;
}

// API functions
export const getPatientProfile = async (): Promise<PatientProfileResponse> => {
    const response = await apiClient.get('/api/v1/auth/me');

    // Handle case where API returns different structure or empty data
    const data = response.data;

    // If the API doesn't return the expected structure, provide defaults
    if (!data.data) {
        return {
            success: true,
            data: {
                id: '',
                full_name: '',
                email: '',
                phone_number: '',
                user_type: '',
                email_verified: false,
                created_at: '',
                profile_picture: { url: '' },
                personal_details: {
                    first_name: '',
                    last_name: '',
                    date_of_birth: '',
                    gender: '',
                },
                contact_details: {
                    email_address: '',
                    phone_number: '',
                },
                location_details: {
                    address: '',
                    city: '',
                    state: '',
                },
            },
            metadata: {
                emergency_contact: {
                    first_name: '',
                    last_name: '',
                    phone_number: '',
                    relationship_to_you: '',
                },
                next_of_kin: {
                    first_name: '',
                    last_name: '',
                    phone_number: '',
                    relationship_to_you: '',
                },
                same_as_emergency_contact: false,
            },
        };
    }

    return data;
};

export const updatePatientProfile = async (data: PatientProfileRequest): Promise<PatientProfileResponse> => {
    const response = await apiClient.put('/api/v1/auth/me', data);
    return response.data;
};

export const uploadProfilePicture = async (file: File): Promise<PatientProfileResponse> => {
    const formData = new FormData();
    formData.append('profile_picture', file);

    const response = await apiClient.put('/api/v1/auth/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const getPatientAppointments = async (): Promise<PatientAppointmentsResponse> => {
    const response = await apiClient.get('/api/v1/appointments/patient');
    return response.data;
};

export const deleteAppointment = async (appointmentId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/api/v1/appointments/${appointmentId}`, {
        data: { reason: 'user_request' }
    });
    return response.data;
};

// Favorite providers
export interface ToggleFavoriteResponse {
    success: boolean;
    message: string;
    data?: {
        is_favorite: boolean;
    };
}

export const toggleFavoriteProvider = async (providerId: string): Promise<ToggleFavoriteResponse> => {
    const response = await apiClient.post('/api/v1/auth/favorites/providers/toggle', {
        provider_id: providerId
    });
    return response.data;
};

export const checkFavoriteStatus = async (providerId: string): Promise<{ success: boolean; data: { is_favorite: boolean } }> => {
    const response = await apiClient.get(`/api/v1/auth/favorites/providers/${providerId}/status`);
    return response.data;
};

// React Query hooks
export const usePatientProfile = () => {
    return useQuery({
        queryKey: ['patientProfile'],
        queryFn: getPatientProfile,
        // Only run when a token is available to ensure Authorization header is sent
        enabled: !!localStorage.getItem('authToken'),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
};

export const useUpdatePatientProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updatePatientProfile,
        onMutate: async (newProfileData) => {
            // Snapshot the previous value
            const previousProfile = queryClient.getQueryData(['patientProfile']);

            // Optimistically update to the new value
            const currentData = queryClient.getQueryData(['patientProfile']) as PatientProfileResponse | undefined;
            queryClient.setQueryData(['patientProfile'], {
                success: true,
                data: {
                    ...currentData?.data,
                    personal_details: newProfileData.personal_details,
                    contact_details: newProfileData.contact_details,
                    location_details: newProfileData.location_details,
                },
                metadata: newProfileData.metadata,
                message: 'Profile updated successfully!',
            });

            // Return a context object with the snapshotted value
            return { previousProfile };
        },
        onSuccess: () => {
            // Keep the optimistic update, just show success message
            // The optimistic update already shows the user's changes
            toast.success('Profile updated successfully!');
        },
        onError: (error: any, _newProfileData, context) => {
            console.error('Profile update error:', error);

            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousProfile) {
                queryClient.setQueryData(['patientProfile'], context.previousProfile);
            }

            let errorMessage = 'Failed to update profile';

            if (error.response?.status === 400) {
                errorMessage = error.response.data?.message || 'Invalid data provided';
            } else if (error.response?.status === 401) {
                errorMessage = 'Unauthorized. Please login again.';
            } else if (error.response?.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.code === 'NETWORK_ERROR') {
                errorMessage = 'Network error. Please check your connection.';
            }

            toast.error(errorMessage);
        },
        onSettled: () => {
            // Don't refetch - let the optimistic update stay
            // Only refetch if there was an error to ensure data consistency
        },
    });
};

export const useUploadProfilePicture = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: uploadProfilePicture,
        onMutate: async (newFile: File) => {
            const previousProfile = queryClient.getQueryData(['patientProfile']);
            const optimisticUrl = URL.createObjectURL(newFile);

            // Optimistically update cached profile picture
            const currentData = queryClient.getQueryData(['patientProfile']) as PatientProfileResponse | undefined;
            if (currentData?.data) {
                queryClient.setQueryData(['patientProfile'], {
                    ...currentData,
                    data: {
                        ...currentData.data,
                        profile_picture: { url: optimisticUrl },
                    },
                });
            }

            return { previousProfile, optimisticUrl };
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['patientProfile'], data);
            toast.success('Profile picture updated');
        },
        onError: (error: any, _newFile, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(['patientProfile'], context.previousProfile);
            }
            toast.error('Failed to upload profile picture');
            console.error('Upload error:', error);
        },
    });
};

export const usePatientAppointments = () => {
    const isAuthenticated = !!localStorage.getItem('authToken');

    return useQuery({
        queryKey: ['patientAppointments'],
        queryFn: getPatientAppointments,
        enabled: isAuthenticated, // Only run query if user is authenticated
        staleTime: Infinity, // Data never becomes stale automatically - only refetch manually or on page reload
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnMount: false, // Don't refetch on component mount if data exists
        refetchOnReconnect: false, // Don't refetch on reconnect
        refetchInterval: false, // Disable automatic polling
        retry: (failureCount, error) => {
            // Don't retry on authentication errors
            if (error instanceof AxiosError && error.response?.status === 401) {
                return false;
            }
            // Retry up to 2 times for other errors
            return failureCount < 2;
        },
    });
};

export const useDeleteAppointment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteAppointment,
        onSuccess: () => {
            // Invalidate and refetch appointments to get updated data
            queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
            toast.success('Appointment deleted successfully');
        },
        onError: (error: any) => {
            console.error('Delete appointment error:', error);

            let errorMessage = 'Failed to delete appointment';

            if (error.response?.status === 400) {
                errorMessage = error.response.data?.message || 'Invalid request';
            } else if (error.response?.status === 401) {
                errorMessage = 'Unauthorized. Please login again.';
            } else if (error.response?.status === 404) {
                errorMessage = 'Appointment not found';
            } else if (error.response?.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.code === 'NETWORK_ERROR') {
                errorMessage = 'Network error. Please check your connection.';
            }

            toast.error(errorMessage);
        },
    });
};

export const useToggleFavoriteProvider = () => {
    return useMutation({
        mutationFn: toggleFavoriteProvider,
        onSuccess: (data) => {
            // Don't show toast for instant updates - just log success
            console.log('Favorite toggled successfully:', data.message);
        },
        onError: (error: any) => {
            console.error('Toggle favorite error:', error);

            let errorMessage = 'Failed to update favorite status';

            if (error.response?.status === 400) {
                errorMessage = error.response.data?.message || 'Invalid request';
            } else if (error.response?.status === 401) {
                errorMessage = 'Unauthorized. Please login again.';
            } else if (error.response?.status === 404) {
                errorMessage = 'Provider not found';
            } else if (error.response?.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.code === 'NETWORK_ERROR') {
                errorMessage = 'Network error. Please check your connection.';
            }

            toast.error(errorMessage);
        },
    });
};

export const useFavoriteStatus = (providerId: string | undefined) => {
    return useQuery({
        queryKey: ['favoriteStatus', providerId],
        queryFn: () => checkFavoriteStatus(providerId!),
        enabled: !!providerId && !!localStorage.getItem('authToken'),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
};
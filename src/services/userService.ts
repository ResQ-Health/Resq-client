import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { API_ENDPOINTS } from '../config/api';
import { toast } from 'react-hot-toast';

export interface FavoriteProvider {
    provider_id: string;
    // Add other fields as necessary
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

export interface NotificationSettings {
    email: boolean;
    push: boolean;
    sms: boolean;
}

export interface Metadata {
    emergency_contact?: EmergencyContact;
    next_of_kin?: NextOfKin;
    same_as_emergency_contact?: boolean;
    favorite_providers?: FavoriteProvider[];
    notification_settings?: NotificationSettings;
}

export interface ProfilePicture {
    url: string;
}

export interface PatientProfileData {
    id: string;
    full_name: string;
    email: string;
    email_verified: boolean;
    phone_number: string;
    user_type: string;
    personal_details?: any;
    contact_details?: any;
    location_details?: any;
    location?: any;
    profile_picture?: ProfilePicture | string;
}

export interface PatientProfileResponse {
    success: boolean;
    message: string;
    data: PatientProfileData;
    metadata: Metadata;
}

export interface UpdatePatientProfileResponse {
    success: boolean;
    message: string;
    data: PatientProfileData;
    metadata: Metadata;
}

export interface PatientProfileRequest {
    personal_details?: any;
    contact_details?: any;
    location_details?: any;
    metadata?: Metadata;
}

// Appointment types
export interface Appointment {
    id: string;
    providerId: string;
    providerName?: string;
    provider_name?: string; // Add provider_name for compatibility
    providerImage?: string;
    serviceName: string;
    date: string; // ISO date string
    time: string; // Replaces start_time/end_time
    start_time?: string; // Added for compatibility
    end_time?: string; // Added for compatibility
    status: 'upcoming' | 'completed' | 'cancelled' | 'pending' | 'confirmed' | 'rejected' | 'no-show'; // Added other statuses
    amount: number;
    paymentStatus: 'paid' | 'unpaid' | 'pending';
    paidAt?: string;
    location?: string;
    bookingType?: string; // Added for compatibility
    service?: { 
        name: string; 
        duration: number; 
        price: number; 
        category?: string; // Added category
    }; 
    contact?: { 
        name?: string; // Added name to contact
        phone: string; 
        email: string;
        address?: string;
        gender?: string;
        dob?: string;
        bookingType?: string;
        communicationPreference?: string;
    }; 
    payment?: { 
        amount: number; 
        status: string; 
        method: string; 
        date: string; 
        paidAt?: string; // Added paidAt to payment object
    }; 
}

export interface PatientAppointmentsResponse {
    success: boolean;
    data: Appointment[];
    message?: string;
}

// API functions
export const getPatientProfile = async (): Promise<PatientProfileResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.COMMON.AUTH.ME);

    // Handle case where API returns different structure or empty data
    const data = response.data;

    // If the API doesn't return the expected structure, provide defaults
    if (!data.data) {
        return {
            success: true,
            message: 'Profile fetched successfully',
            data: {
                id: '',
                full_name: '',
                email: '',
                phone_number: '',
                user_type: '',
                email_verified: false,
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

export const updatePatientProfile = async (data: PatientProfileRequest): Promise<UpdatePatientProfileResponse> => {
    const response = await apiClient.put(API_ENDPOINTS.PATIENT.PROFILE.UPDATE, data);
    return response.data;
};

export const addFavoriteProvider = async (providerId: string): Promise<any> => {
    const response = await apiClient.post(`${API_ENDPOINTS.PATIENT.FAVORITES.ADD}/${providerId}`);
    return response.data;
};

export const removeFavoriteProvider = async (providerId: string): Promise<any> => {
    const response = await apiClient.delete(`${API_ENDPOINTS.PATIENT.FAVORITES.REMOVE}/${providerId}`);
    return response.data;
};

export const checkFavoriteStatus = async (providerId: string): Promise<any> => {
    const response = await apiClient.get(`${API_ENDPOINTS.PATIENT.FAVORITES.CHECK}/${providerId}`);
    return response.data;
};

export const uploadProfilePicture = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    const response = await apiClient.post(API_ENDPOINTS.PATIENT.PROFILE.UPLOAD_PICTURE, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getPatientAppointments = async (): Promise<PatientAppointmentsResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.PATIENT.APPOINTMENTS.GET_ALL);
    return response.data;
};

export const deleteAppointment = async (appointmentId: string): Promise<any> => {
    const response = await apiClient.delete(API_ENDPOINTS.PATIENT.APPOINTMENTS.DELETE(appointmentId));
    return response.data;
};

// React Query hooks
export const usePatientProfile = () => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');
    let isPatient = true;
    
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const type = user.user_type?.toLowerCase();
            if (type === 'provider' || type === 'diagnosticprovider') {
                isPatient = false;
            }
        } catch (e) {
            console.error('Error parsing user from local storage', e);
        }
    }

    return useQuery({
        queryKey: ['patientProfile'],
        queryFn: getPatientProfile,
        // Only run when a token is available AND user is NOT a provider
        enabled: !!token && isPatient,
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
            if (currentData) {
                queryClient.setQueryData(['patientProfile'], {
                    ...currentData,
                    data: {
                        ...currentData.data,
                        personal_details: newProfileData.personal_details || currentData.data.personal_details,
                        contact_details: newProfileData.contact_details || currentData.data.contact_details,
                        location_details: newProfileData.location_details || currentData.data.location_details,
                    },
                    metadata: newProfileData.metadata || currentData.metadata,
                    message: 'Profile updated successfully!',
                });
            }

            // Return a context object with the snapshotted value
            return { previousProfile };
        },
        onSuccess: (data) => {
            // Update AuthContext and localStorage with new user data
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    const updatedUser = {
                        ...user,
                        full_name: data.data.full_name,
                        // Add other fields as necessary
                        is_onboarding_complete: true // Assuming update implies completion or maintenance of completion
                    };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                } catch (e) {
                    console.error('Error updating local storage user', e);
                }
            }
            
            queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
        onError: (err, newTodo, context: any) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(['patientProfile'], context.previousProfile);
            }
            toast.error('Failed to update profile');
        },
    });
};

export const useUploadProfilePicture = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: uploadProfilePicture,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
            toast.success('Profile picture updated successfully');
        },
        onError: () => {
            toast.error('Failed to upload profile picture');
        },
    });
};

export const useAddFavoriteProvider = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addFavoriteProvider,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
            queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
            toast.success('Provider added to favorites');
        },
        onError: () => {
            toast.error('Failed to add provider to favorites');
        },
    });
};

export const useRemoveFavoriteProvider = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removeFavoriteProvider,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
            queryClient.invalidateQueries({ queryKey: ['patientProfile'] });
            toast.success('Provider removed from favorites');
        },
        onError: () => {
            toast.error('Failed to remove provider from favorites');
        },
    });
};

export const useCheckFavoriteStatus = (providerId: string) => {
    return useQuery({
        queryKey: ['favoriteStatus', providerId],
        queryFn: () => checkFavoriteStatus(providerId),
        enabled: !!providerId,
    });
};

export const usePatientAppointments = () => {
    return useQuery({
        queryKey: ['patientAppointments'],
        queryFn: getPatientAppointments,
    });
};

export const useDeleteAppointment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteAppointment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patientAppointments'] });
            toast.success('Appointment deleted successfully');
        },
        onError: () => {
            toast.error('Failed to delete appointment');
        },
    });
};

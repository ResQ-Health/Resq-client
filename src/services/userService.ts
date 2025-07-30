import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export interface Metadata {
    emergency_contact: EmergencyContact;
    next_of_kin: NextOfKin;
    same_as_emergency_contact: boolean;
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

// React Query hooks
export const usePatientProfile = () => {
    return useQuery({
        queryKey: ['patientProfile'],
        queryFn: getPatientProfile,
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
        onSuccess: (data) => {
            // Keep the optimistic update, just show success message
            // The optimistic update already shows the user's changes
            toast.success('Profile updated successfully!');
        },
        onError: (error: any, newProfileData, context) => {
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
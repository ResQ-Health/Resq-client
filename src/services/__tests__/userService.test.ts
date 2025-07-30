import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getPatientProfile, updatePatientProfile } from '../userService';
import { apiClient } from '../../config/api';

// Mock the API client
vi.mock('../../config/api', () => ({
    apiClient: {
        get: vi.fn(),
        put: vi.fn(),
    },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const mockApiClient = apiClient as any;

describe('userService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getPatientProfile', () => {
        it('should fetch patient profile successfully', async () => {
            const mockResponse = {
                success: true,
                data: {
                    id: '-2R9hQGZpp',
                    full_name: 'John Doe',
                    email: 'john@example.com',
                    phone_number: '1234567890',
                    user_type: 'Patient',
                    email_verified: true,
                    created_at: '2025-04-30T17:28:04.480Z',
                    profile_picture: {
                        url: '',
                    },
                    personal_details: {
                        first_name: 'John',
                        last_name: 'Doe',
                        date_of_birth: '1990-01-15',
                        gender: 'Male',
                    },
                    contact_details: {
                        email_address: 'john@example.com',
                        phone_number: '1234567890',
                    },
                    location_details: {
                        address: '123 Main St',
                        city: 'Lagos',
                        state: 'Lagos',
                    },
                },
                metadata: {
                    emergency_contact: {
                        first_name: 'Jane',
                        last_name: 'Doe',
                        phone_number: '0987654321',
                        relationship_to_you: 'Spouse',
                    },
                    next_of_kin: {
                        first_name: 'Bob',
                        last_name: 'Doe',
                        phone_number: '1122334455',
                        relationship_to_you: 'Sibling',
                    },
                    same_as_emergency_contact: false,
                },
            };

            mockApiClient.get.mockResolvedValue({ data: mockResponse });

            const result = await getPatientProfile();

            expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/auth/me');
            expect(result).toEqual(mockResponse);
        });

        it('should handle API errors', async () => {
            const error = new Error('Network error');
            mockApiClient.get.mockRejectedValue(error);

            await expect(getPatientProfile()).rejects.toThrow('Network error');
        });
    });

    describe('updatePatientProfile', () => {
        it('should update patient profile successfully', async () => {
            const mockRequest = {
                personal_details: {
                    first_name: 'John',
                    last_name: 'Doe',
                    date_of_birth: '1990-01-15',
                    gender: 'Male',
                },
                contact_details: {
                    email_address: 'john@example.com',
                    phone_number: '1234567890',
                },
                location_details: {
                    address: '123 Main St',
                    city: 'Lagos',
                    state: 'Lagos',
                },
                metadata: {
                    emergency_contact: {
                        first_name: 'Jane',
                        last_name: 'Doe',
                        phone_number: '0987654321',
                        relationship_to_you: 'Spouse',
                    },
                    next_of_kin: {
                        first_name: 'Bob',
                        last_name: 'Doe',
                        phone_number: '1122334455',
                        relationship_to_you: 'Sibling',
                    },
                    same_as_emergency_contact: false,
                },
            };

            const mockResponse = {
                success: true,
                data: {
                    id: '-2R9hQGZpp',
                    full_name: 'John Doe',
                    email: 'john@example.com',
                    phone_number: '1234567890',
                    user_type: 'Patient',
                    email_verified: true,
                    created_at: '2025-04-30T17:28:04.480Z',
                    profile_picture: {
                        url: '',
                    },
                    personal_details: mockRequest.personal_details,
                    contact_details: mockRequest.contact_details,
                    location_details: mockRequest.location_details,
                },
                metadata: mockRequest.metadata,
                message: 'Profile updated successfully',
            };

            mockApiClient.put.mockResolvedValue({ data: mockResponse });

            const result = await updatePatientProfile(mockRequest);

            expect(mockApiClient.put).toHaveBeenCalledWith('/api/v1/auth/me', mockRequest);
            expect(result).toEqual(mockResponse);
        });

        it('should handle API errors', async () => {
            const error = new Error('Network error');
            mockApiClient.put.mockRejectedValue(error);

            const mockRequest = {
                personal_details: { first_name: 'John', last_name: 'Doe', date_of_birth: '1990-01-15', gender: 'Male' },
                contact_details: { email_address: 'john@example.com', phone_number: '1234567890' },
                location_details: { address: '123 Main St', city: 'Lagos', state: 'Lagos' },
                metadata: {
                    emergency_contact: { first_name: 'Jane', last_name: 'Doe', phone_number: '0987654321', relationship_to_you: 'Spouse' },
                    next_of_kin: { first_name: 'Bob', last_name: 'Doe', phone_number: '1122334455', relationship_to_you: 'Sibling' },
                    same_as_emergency_contact: false,
                },
            };

            await expect(updatePatientProfile(mockRequest)).rejects.toThrow('Network error');
        });
    });
}); 
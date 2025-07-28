import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest'
import { loginUser, registerUser, verifyEmail } from '../authService'
import { apiClient } from '../../config/api'

// Mock the API client
vi.mock('../../config/api', () => ({
    apiClient: {
        post: vi.fn(),
    },
    API_ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/v1/auth/login',
            REGISTER: '/api/v1/auth/register',
            VERIFY: '/api/v1/auth/verify',
        },
    },
}))

const mockApiClient = apiClient as Mocked<typeof apiClient>

describe('Auth Service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('loginUser', () => {
        it('should make a POST request to login endpoint', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        token: 'mock-token',
                        email_verified: true,
                        id: '123',
                        full_name: 'Test User',
                        email: 'test@example.com',
                        phone_number: '1234567890',
                        user_type: 'Patient',
                        is_admin: false,
                        created_at: '2025-01-01T00:00:00.000Z',
                    },
                },
            }

            mockApiClient.post.mockResolvedValue(mockResponse)

            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            }

            const result = await loginUser(loginData)

            expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', loginData)
            expect(result).toEqual(mockResponse.data)
        })

        it('should throw error on login failure', async () => {
            const mockError = {
                response: {
                    status: 401,
                    data: {
                        message: 'Invalid email or password',
                    },
                },
            }

            mockApiClient.post.mockRejectedValue(mockError)

            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword',
            }

            await expect(loginUser(loginData)).rejects.toThrow()
        })
    })

    describe('registerUser', () => {
        it('should make a POST request to register endpoint', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        token: 'mock-token',
                        email_verified: false,
                        id: '123',
                        full_name: 'Test User',
                        email: 'test@example.com',
                        phone_number: '1234567890',
                        user_type: 'Patient',
                        is_admin: false,
                        created_at: '2025-01-01T00:00:00.000Z',
                    },
                },
            }

            mockApiClient.post.mockResolvedValue(mockResponse)

            const registerData = {
                full_name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                phone_number: '1234567890',
                user_type: 'Patient' as const,
            }

            const result = await registerUser(registerData)

            expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/register', registerData)
            expect(result).toEqual(mockResponse.data)
        })

        it('should throw error on registration failure', async () => {
            const mockError = {
                response: {
                    status: 400,
                    data: {
                        message: 'Email already exists',
                    },
                },
            }

            mockApiClient.post.mockRejectedValue(mockError)

            const registerData = {
                full_name: 'Test User',
                email: 'existing@example.com',
                password: 'password123',
                phone_number: '1234567890',
                user_type: 'Patient' as const,
            }

            await expect(registerUser(registerData)).rejects.toThrow()
        })
    })

    describe('verifyEmail', () => {
        it('should make a POST request to verify endpoint', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        token: 'mock-token',
                        email_verified: true,
                        id: '123',
                        full_name: 'Test User',
                        email: 'test@example.com',
                        phone_number: '1234567890',
                        user_type: 'Patient',
                        is_admin: false,
                        created_at: '2025-01-01T00:00:00.000Z',
                    },
                },
            }

            mockApiClient.post.mockResolvedValue(mockResponse)

            const verifyData = {
                email: 'test@example.com',
                verification_code: '123456',
            }

            const result = await verifyEmail(verifyData)

            expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/auth/verify', verifyData)
            expect(result).toEqual(mockResponse.data)
        })

        it('should throw error on verification failure', async () => {
            const mockError = {
                response: {
                    status: 400,
                    data: {
                        message: 'Invalid verification code',
                    },
                },
            }

            mockApiClient.post.mockRejectedValue(mockError)

            const verifyData = {
                email: 'test@example.com',
                verification_code: '000000',
            }

            await expect(verifyEmail(verifyData)).rejects.toThrow()
        })
    })
}) 
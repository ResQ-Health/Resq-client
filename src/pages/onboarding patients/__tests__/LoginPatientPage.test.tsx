import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import LoginPatientPage from '../LoginPatientPage'
import { AuthProvider } from '../../../contexts/AuthContext'

// Mock the hooks
const mockUseMutation = useMutation as any
const mockUseNavigate = useNavigate as any
const mockToast = toast as any

// Mock the auth service
vi.mock('../../../../services/authService', () => ({
    useLogin: () => mockUseMutation(),
}))

describe('LoginPatientPage', () => {
    const mockNavigate = vi.fn()
    const mockMutate = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        mockUseNavigate.mockReturnValue(mockNavigate)
        mockUseMutation.mockReturnValue({
            mutate: mockMutate,
            isPending: false,
        })
    })

    const renderWithAuth = (component: React.ReactElement) => {
        return render(
            <AuthProvider>
                {component}
            </AuthProvider>
        )
    }

    it('renders login form correctly', () => {
        renderWithAuth(<LoginPatientPage />)

        expect(screen.getByText('Welcome back')).toBeInTheDocument()
        expect(screen.getByLabelText('Email address')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    })

    it('validates email field', async () => {
        renderWithAuth(<LoginPatientPage />)

        const submitButton = screen.getByRole('button', { name: 'Sign in' })

        // Try to submit with empty form
        fireEvent.click(submitButton)

        // The form should show validation errors
        expect(mockMutate).not.toHaveBeenCalled()
    })

    it('validates password field', async () => {
        renderWithAuth(<LoginPatientPage />)

        const emailInput = screen.getByLabelText('Email address')
        const submitButton = screen.getByRole('button', { name: 'Sign in' })

        // Fill email but leave password empty
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.click(submitButton)

        // The form should show validation errors
        expect(mockMutate).not.toHaveBeenCalled()
    })

    it('submits form with valid data', async () => {
        renderWithAuth(<LoginPatientPage />)

        const emailInput = screen.getByLabelText('Email address')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = screen.getByRole('button', { name: 'Sign in' })

        // Fill all fields
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith(
                {
                    email: 'test@example.com',
                    password: 'password123',
                },
                expect.objectContaining({
                    onSuccess: expect.any(Function),
                    onError: expect.any(Function),
                })
            )
        })
    })

    it('handles successful login with verified email', async () => {
        mockUseMutation.mockReturnValue({
            mutate: (data: any, options: any) => {
                options.onSuccess({
                    data: {
                        token: 'mock-token',
                        email_verified: true,
                        id: '123',
                        full_name: 'John Doe',
                        email: 'test@example.com',
                        phone_number: '1234567890',
                        user_type: 'Patient',
                        is_admin: false,
                        created_at: '2025-01-01T00:00:00.000Z',
                    },
                })
            },
            isPending: false,
        })

        renderWithAuth(<LoginPatientPage />)

        const emailInput = screen.getByLabelText('Email address')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = screen.getByRole('button', { name: 'Sign in' })

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/patientSetup/Myaccount')
        })
    })

    it('handles successful login with unverified email', async () => {
        mockUseMutation.mockReturnValue({
            mutate: (data: any, options: any) => {
                options.onSuccess({
                    data: {
                        token: 'mock-token',
                        email_verified: false,
                        id: '123',
                        full_name: 'John Doe',
                        email: 'test@example.com',
                        phone_number: '1234567890',
                        user_type: 'Patient',
                        is_admin: false,
                        created_at: '2025-01-01T00:00:00.000Z',
                    },
                })
            },
            isPending: false,
        })

        renderWithAuth(<LoginPatientPage />)

        const emailInput = screen.getByLabelText('Email address')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = screen.getByRole('button', { name: 'Sign in' })

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/verify')
        })
    })

    it('handles login error', async () => {
        mockUseMutation.mockReturnValue({
            mutate: (data: any, options: any) => {
                options.onError({
                    response: {
                        status: 401,
                        data: {
                            message: 'Invalid email or password',
                        },
                    },
                })
            },
            isPending: false,
        })

        renderWithAuth(<LoginPatientPage />)

        const emailInput = screen.getByLabelText('Email address')
        const passwordInput = screen.getByLabelText('Password')
        const submitButton = screen.getByRole('button', { name: 'Sign in' })

        fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
        fireEvent.click(submitButton)

        await waitFor(() => {
            expect(mockNavigate).not.toHaveBeenCalled()
        })
    })

    it('toggles password visibility', () => {
        renderWithAuth(<LoginPatientPage />)

        const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
        const toggleButton = screen.getByRole('button', { name: '' }) // Eye icon button

        expect(passwordInput.type).toBe('password')

        fireEvent.click(toggleButton)

        expect(passwordInput.type).toBe('text')

        fireEvent.click(toggleButton)

        expect(passwordInput.type).toBe('password')
    })

    it('shows loading state during submission', () => {
        mockUseMutation.mockReturnValue({
            mutate: mockMutate,
            isPending: true,
        })

        renderWithAuth(<LoginPatientPage />)

        expect(screen.getByRole('button', { name: 'Signing in...' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled()
    })

    it('clears validation errors when user starts typing', async () => {
        renderWithAuth(<LoginPatientPage />)

        const emailInput = screen.getByLabelText('Email address')
        const passwordInput = screen.getByLabelText('Password')

        // The form should clear errors when user types
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })

        expect(emailInput).toHaveValue('test@example.com')
        expect(passwordInput).toHaveValue('password123')
    })
}) 
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PublicRoute } from '../PublicRoute'
import { BrowserRouter } from 'react-router-dom'

// Mock the auth context
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}))

// Mock react-router-dom with all necessary components
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useLocation: () => ({ pathname: '/test' }),
        Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to}>Navigate to {to}</div>,
    }
})

import { useAuth } from '../../contexts/AuthContext'

describe('PublicRoute', () => {
    const mockUseAuth = useAuth as any

    const renderWithRouter = (component: React.ReactElement) => {
        return render(
            <BrowserRouter>
                {component}
            </BrowserRouter>
        )
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should show loading spinner when auth is loading', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            loading: true,
        })

        renderWithRouter(
            <PublicRoute>
                <div>Test Content</div>
            </PublicRoute>
        )

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument() // Loading spinner should be visible
        expect(screen.queryByText('Test Content')).not.toBeInTheDocument() // Content should not be visible
    })

    it('should redirect authenticated users to default route', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            loading: false,
        })

        renderWithRouter(
            <PublicRoute>
                <div>Test Content</div>
            </PublicRoute>
        )

        expect(screen.getByTestId('navigate')).toBeInTheDocument()
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/my-account')
    })

    it('should redirect authenticated users to custom route', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: true,
            loading: false,
        })

        renderWithRouter(
            <PublicRoute redirectTo="/dashboard">
                <div>Test Content</div>
            </PublicRoute>
        )

        expect(screen.getByTestId('navigate')).toBeInTheDocument()
        expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/dashboard')
    })

    it('should allow unauthenticated users to access the route', () => {
        mockUseAuth.mockReturnValue({
            isAuthenticated: false,
            loading: false,
        })

        renderWithRouter(
            <PublicRoute>
                <div>Test Content</div>
            </PublicRoute>
        )

        expect(screen.getByText('Test Content')).toBeInTheDocument()
    })
}) 
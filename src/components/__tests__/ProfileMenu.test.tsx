import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ProfileMenu } from '../ProfileMenu'
import { BrowserRouter } from 'react-router-dom'

// Mock the hooks
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: vi.fn(),
    }
})

import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

describe('ProfileMenu', () => {
    const mockNavigate = vi.fn()
    const mockLogout = vi.fn()
    const mockOnClose = vi.fn()

    // Mock the hooks
    const mockUseAuth = useAuth as any
    const mockUseNavigate = useNavigate as any

    const renderWithRouter = (component: React.ReactElement) => {
        return render(
            <BrowserRouter>
                {component}
            </BrowserRouter>
        )
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockUseNavigate.mockReturnValue(mockNavigate)
        mockUseAuth.mockReturnValue({
            user: {
                full_name: 'John Doe',
                email: 'john@example.com'
            },
            logout: mockLogout
        })
    })

    it('renders profile menu when open', () => {
        renderWithRouter(
            <ProfileMenu isOpen={true} onClose={mockOnClose} />
        )

        expect(screen.getByText('Profile')).toBeInTheDocument()
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('john@example.com')).toBeInTheDocument()
        expect(screen.getByText('JD')).toBeInTheDocument() // User initials
    })

    it('shows user initials correctly', () => {
        mockUseAuth.mockReturnValue({
            user: {
                full_name: 'Alice Smith',
                email: 'alice@example.com'
            },
            logout: mockLogout
        })

        renderWithRouter(
            <ProfileMenu isOpen={true} onClose={mockOnClose} />
        )

        expect(screen.getByText('AS')).toBeInTheDocument() // Alice Smith initials
    })

    it('shows fallback initial when no name', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            logout: mockLogout
        })

        renderWithRouter(
            <ProfileMenu isOpen={true} onClose={mockOnClose} />
        )

        expect(screen.getByText('U')).toBeInTheDocument() // Fallback initial
    })

    it('handles logout correctly', () => {
        renderWithRouter(
            <ProfileMenu isOpen={true} onClose={mockOnClose} />
        )

        const logoutButton = screen.getByText('Logout')
        fireEvent.click(logoutButton)

        expect(mockLogout).toHaveBeenCalled()
        expect(mockNavigate).toHaveBeenCalledWith('/')
        expect(mockOnClose).toHaveBeenCalled()
    })

    it('navigates to my account when clicked', () => {
        renderWithRouter(
            <ProfileMenu isOpen={true} onClose={mockOnClose} />
        )

        const myAccountButton = screen.getByText('My Account')
        fireEvent.click(myAccountButton)

        expect(mockNavigate).toHaveBeenCalledWith('/my-account')
        expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes menu when close button is clicked', () => {
        renderWithRouter(
            <ProfileMenu isOpen={true} onClose={mockOnClose} />
        )

        const closeButton = screen.getByRole('button', { name: /close menu/i })
        fireEvent.click(closeButton)

        expect(mockOnClose).toHaveBeenCalled()
    })

    it('does not render when closed', () => {
        renderWithRouter(
            <ProfileMenu isOpen={false} onClose={mockOnClose} />
        )

        // The menu should be rendered but not visible (off-screen)
        expect(screen.getByText('Profile')).toBeInTheDocument()
        expect(screen.getByText('John Doe')).toBeInTheDocument()

        // Check that the menu has the correct transform class (off-screen)
        const menuElement = screen.getByText('Profile').closest('div[class*="translate-x-full"]')
        expect(menuElement).toBeInTheDocument()
    })

    it('shows all menu items', () => {
        renderWithRouter(
            <ProfileMenu isOpen={true} onClose={mockOnClose} />
        )

        expect(screen.getByText('My Account')).toBeInTheDocument()
        expect(screen.getByText('Booking History')).toBeInTheDocument()
        expect(screen.getByText('Favourites')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
    })
}) 
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    redirectTo?: string;
    allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requireAuth = true,
    redirectTo = '/login',
    allowedRoles,
}) => {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (loading) {
        return <LoadingSpinner />;
    }

    // If authentication is required and user is not authenticated
    if (requireAuth && !isAuthenticated) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // Role-based authorization check
    if (requireAuth && isAuthenticated && allowedRoles && allowedRoles.length > 0) {
        const userType = user?.user_type || 'Patient';
        const isAllowed = allowedRoles.some(
            (role) => role.toLowerCase() === userType.toLowerCase()
        );

        if (!isAllowed) {
            const isProvider =
                userType.toLowerCase() === 'diagnosticprovider' ||
                userType.toLowerCase() === 'provider' ||
                userType.toLowerCase() === 'clinician';

            // Send to their proper section
            return <Navigate to={isProvider ? '/provider/dashboard' : '/booking-history'} replace />;
        }
    }

    // If authentication is not required and user is authenticated
    if (!requireAuth && isAuthenticated) {
        return <Navigate to="/booking-history" replace />;
    }

    return <>{children}</>;
}; 